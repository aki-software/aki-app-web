# A.kit Platform — Manual de Usuario y Operación del Sistema Web

**Versión del Documento:** 1.0  
**Fecha:** Septiembre 2026  
**Destinatarios:** Administradores del Sistema, Directivos de Instituciones Educativas y Profesionales de Orientación Vocacional.

---

## 1. Introducción y Propósito

**A.kit Platform** es una plataforma integral diseñada para la administración, supervisión y análisis de procesos de orientación vocacional y psicometría a escala institucional y profesional.

El sistema web permite a colegios, universidades, municipios y administradores:
- Emitir y controlar lotes de vouchers para estudiantes.
- Monitorear el progreso y estado de redención de los tests vocacionales en tiempo real.
- Consultar analíticas agregadas e informes individuales de participantes.
- Gestionar pagos, suscripciones y conciliación de pasarelas de pago (Stripe y Mercado Pago).

---

## 2. Requisitos de Acceso y Entorno

Para operar el panel web se requiere:
- **Conectividad a Internet:** Banda ancha estable (HTTPS / TLS 1.3).
- **Navegadores Compatibles:** Google Chrome, Mozilla Firefox, Apple Safari o Microsoft Edge (versiones actualizadas).
- **Resolución Recomendada:** Diseño responsivo compatible con computadoras de escritorio, portátiles y tablets (resolución mínima recomendada: 1024x768 píxeles).

---

## 3. Autenticación y Seguridad

### 3.1. Inicio de Sesión (Login)
1. Ingrese a la dirección web de la plataforma (`/login`).
2. Introduzca su correo electrónico corporativo o institucional y su contraseña.
3. Presione el botón **Iniciar Sesión**.
4. El sistema valida las credenciales y redirige automáticamente al Dashboard principal según el rol asignado (Superadmin, Administrador Institucional o Profesional).

### 3.2. Recuperación y Cambio de Contraseña
- En caso de olvido de credenciales, seleccione el enlace **¿Olvidaste tu contraseña?** en la pantalla de acceso (`/forgot-password`).
- Ingrese su correo registrado para recibir un enlace seguro temporal con vigencia limitada (`/reset-password`).
- Los nuevos usuarios invitados reciben un correo electrónico con un enlace único para establecer su contraseña inicial (`/setup-password`).

---

## 4. Módulo de Vouchers y Licencias Institucionales (`/dashboard/vouchers`)

Este módulo es el núcleo operativo para convenios con colegios y entidades.

### 4.1. Creación de Nuevos Lotes de Vouchers
1. Diríjase a la sección **Vouchers** en el menú lateral.
2. Haga clic en el botón **Crear Lote** o **Generar Vouchers**.
3. Complete los campos requeridos:
   - **Institución Destino:** Seleccione la entidad o colegio asociado.
   - **Cantidad de Vouchers:** Número de accesos a generar.
   - **Fecha de Expiración (opcional):** Plazo máximo de validez para el canje.
   - **Etiqueta o Referencia:** Identificador de campaña (ej. *"Colegio San Martín - 5to Año 2026"*).
4. Confirme la operación. Los códigos alfanuméricos únicos serán generados de inmediato con criptografía segura.

### 4.2. Control de Estado y Exportación
- Cada voucher presenta tres estados posibles:
  - **Disponible (Pending):** Listo para ser canjeado por un estudiante en la app móvil.
  - **Canjeado (Redeemed):** Ya asociado a un test vocacional completado.
  - **Expirado / Anulado (Expired/Revoked):** Fuera de vigencia.
- El operador puede exportar el listado de códigos generados a formato CSV o planilla de cálculo para su distribución física o digital a los estudiantes.

---

## 5. Módulo de Resultados y Sesiones (`/dashboard/results` y `/dashboard/sessions/:id`)

### 5.1. Vista General de Resultados
- Presenta métricas consolidadas sobre el rendimiento de las cohortes:
  - Total de participantes evaluados.
  - Distribución de perfiles psicométricos y áreas vocacionales más destacadas.
  - Tasa de finalización (*completion rate*).

### 5.2. Detalle de Sesión Individual
- Permite buscar a un participante específico por nombre, identificador o fecha.
- Al ingresar al detalle de una sesión (`/dashboard/sessions/:id`), se visualiza:
  - Datos de cabecera de la evaluación (fecha, participante, estado).
  - Puntuaciones por dimensión psicométrica.
  - Informe final generado y registro de despacho por correo electrónico.

---

## 6. Gestión de Usuarios e Instituciones (`/dashboard/users` e `/dashboard/institutions/:id`)

### 6.1. Gestión de Instituciones
- Registro de nuevas entidades educativas o corporativas.
- Configuración de datos de contacto, logo institucional y asignación de administradores locales.

### 6.2. Roles y Permisos de Usuarios
- **Superadmin:** Acceso irrestricto a todas las instituciones, auditoría de pagos y configuraciones globales.
- **Admin Institución:** Gestión exclusiva de los vouchers, métricas y usuarios de su propia entidad.
- **Profesional / Consultor:** Visualización de informes psicométricos y análisis de sesiones.

---

## 7. Facturación y Pasarelas de Pago (`/dashboard/billing` y `/dashboard/payment-ledger`)

### 7.1. Adquisición de Paquetes y Planes (`/dashboard/pricing-plans`)
- Las instituciones pueden adquirir nuevos cupos de vouchers o contratar planes de suscripción.
- Soporte multimoneda y pasarelas de pago integradas:
  - **Mercado Pago:** Cobros en moneda local mediante transferencias, tarjetas de débito/crédito y dinero en cuenta.
  - **Stripe:** Procesamiento de pagos internacionales con tarjetas de crédito corporativas.

### 7.2. Libro de Pagos y Conciliación (`/dashboard/payment-ledger`)
- Registro centralizado de transacciones financieras.
- Monitoreo en tiempo real del estado de cobros (Aprobado, Pendiente, Fallido, Reembolsado).
- Trazabilidad entre identificadores externos de pasarela (Stripe `pi_*`, Mercado Pago `payment_id`) y los lotes de vouchers emitidos.

---

## 8. Seguridad, Auditoría y Soporte

- **Registro de Actividad (`/dashboard/activity`):** Todas las acciones críticas (emisión de vouchers, cambios de permisos, bajas) quedan asentadas en un log inmutable de auditoría con marca temporal e IP.
- **Soporte Técnico:** Para consultas operativas o reportes de incidencias, comunicarse a través de los canales oficiales habilitados por la administración del sistema.
