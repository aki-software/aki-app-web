# 🛠️ Registro de Deuda Técnica (Technical Debt Log)

Este documento centraliza el registro de decisiones arquitectónicas temporales, atajos técnicos tomados por necesidades del negocio, y deudas pendientes que requieren refactorización en el monorepo de **A.kit Platform**.

---

## 🔑 1. Desvío del Sistema de Colas de Mails a Envíos In-Process (InMemory Fallback)

### 📅 Fecha de Registro
* **Fecha**: 26 de Mayo, 2026
* **Estado**: Mitigado (Hotfix aplicado)
* **Gravedad**: ⚠️ Media-Alta (Afecta robustez y resiliencia de notificaciones críticas)

---

### 📝 1.1 Contexto y Síntomas del Problema

El proyecto cuenta con notificaciones críticas por correo electrónico:
*   Activación de cuentas institucionales (`AccountActivationNotifierService`)
*   Restablecimiento de contraseñas de seguridad (`PasswordResetNotifierService`)
*   Envío de códigos de acceso / vouchers de compra (`VoucherNotifierService`)

El diseño original utiliza la interfaz de colas asíncronas `QUEUE_ADAPTER`. Si el sistema detecta variables de entorno para Redis (`REDIS_URL` o `REDIS_HOST`), activa por defecto el adaptador de colas persistentes **BullMQ** (`BullMQQueueAdapter`) para procesar los correos asíncronamente en segundo plano.

**El Bug de Raíz**:
En todo el backend de la API **no existe ningún Worker/Consumidor de BullMQ** implementado. Al configurarse Redis en los entornos de producción, staging o desarrollo local (usado para rate-limiting y caché), la aplicación automáticamente encolaba los correos asíncronamente en Redis... pero **nunca se procesaban ni enviaban** porque ningún Worker leía la cola `akit-jobs`.

---

### 🚀 1.2 Parche / Mitigación Implementada (Hotfix)

Para restaurar el servicio de inmediato sin agregar complejidad de infraestructura, se acotó la activación de BullMQ.

*   **Archivo modificado**: [common.module.ts](file:///c:/Dev/Personal/A.kit/akit-platform/apps/api/src/common/common.module.ts)
*   **Cambio**: El adaptador de colas `BullMQQueueAdapter` ahora está estrictamente condicionado por la variable de entorno `process.env.ENABLE_BULLMQ === 'true'`.
*   **Comportamiento actual**: Si no está activado explícitamente, el `QUEUE_ADAPTER` hace fallback al `InMemoryQueueAdapter`, el cual procesa todos los correos de forma **inline e in-process** (en memoria dentro del mismo hilo asíncrono de Node.js).

---

### ⚠️ 1.3 Deuda Técnica Heredada

1.  **Vulnerabilidad a Reestartos (Crash-Loss)**: Como los trabajos se ejecutan en memoria, si el contenedor de la API sufre un crash, se reinicia o se despliega una nueva versión mientras hay correos en cola de envío, esos trabajos se perderán por completo sin posibilidad de reintento.
2.  **Riesgo de Bloqueo de Event Loop**: Si bien Node.js gestiona los sockets asíncronamente, despachar múltiples envíos de correo en masa (`SMTP` o llamadas `HTTP Resend` en ráfaga) de forma in-process consume CPU y recursos del mismo hilo de la API, pudiendo aumentar la latencia de respuesta HTTP para los usuarios concurrentes.

---

### 🎯 1.4 Solución Correcta (Diseño Definitivo a Futuro)

La solución correcta para migrar al esquema de colas asíncronas seguras requiere dos pasos:

#### Paso A: Implementar el Worker en la API
Debemos crear un Consumidor asíncrono en `apps/api/src/common/jobs/workers/` que se instancie de forma segura y escuche la cola `akit-jobs` usando el procesador nativo de BullMQ.

Ejemplo de implementación:
```typescript
import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Worker } from 'bullmq';
import { JobDispatcherService } from '../../services/job-dispatcher.service.js';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailQueueWorker implements OnModuleInit, OnModuleDestroy {
  private worker: Worker;
  private readonly logger = new Logger(EmailQueueWorker.name);

  constructor(
    private readonly dispatcher: JobDispatcherService,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit() {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    const enableBullMq = this.configService.get<string>('ENABLE_BULLMQ') === 'true';
    
    if (!redisUrl || !enableBullMq) {
      return;
    }

    this.logger.log('Starting BullMQ Consumer Worker for queue: akit-jobs');

    this.worker = new Worker(
      'akit-jobs',
      async (job) => {
        this.logger.log(`Processing background job ${job.id} of type ${job.name}`);
        await this.dispatcher.dispatch(job.name as any, job.data);
      },
      {
        connection: { url: redisUrl },
        concurrency: 5, // Límite de tareas simultáneas por proceso
      }
    );

    this.worker.on('failed', (job, err) => {
      this.logger.error(`Background job ${job?.id} failed with error: ${err.message}`);
    });
  }

  async onModuleDestroy() {
    if (this.worker) {
      await this.worker.close();
    }
  }
}
```

#### Paso B: Configuración del Entorno
1. Registrar `EmailQueueWorker` en los `providers` del modulo `CommonModule` en `apps/api/src/common/common.module.ts`.
2. Establecer la variable de entorno `ENABLE_BULLMQ=true` en los entornos correspondientes (Render / Docker) para habilitar el flujo completo de Productor ➔ Redis ➔ Consumidor.
