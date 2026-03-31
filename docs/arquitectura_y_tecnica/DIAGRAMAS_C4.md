# Diagramas de Arquitectura (C4 Model)

A continuación se presentan los diagramas de arquitectura basados en el modelo C4 para el ecosistema A.kit / CotejoApp.

---

## Nivel 1: Diagrama de Contexto del Sistema

Muestra el sistema en su totalidad y cómo interactúa con los distintos actores (usuarios) y sistemas externos.

```mermaid
C4Context
    title Diagrama de Contexto (Nivel 1) - Plataforma A.kit

    Person(patient, "Paciente/Estudiante", "Usuario final que realiza el test vocacional.")
    Person(therapist, "Terapeuta/Institución", "Profesional que administra vouchers y analiza resultados.")
    
    System(akitSystem, "Plataforma A.kit / Cotejo", "Sistema central que procesa los tests vocacionales, gestiona vouchers y emite reportes.")
    System_Ext(emailProvider, "Email Provider (AWS SES/SMTP)", "Envío de reportes y notificaciones.")
    System_Ext(cloudStorage, "Cloud Storage (S3)", "Almacenamiento de reportes PDF generados.")
    
    Rel(patient, akitSystem, "Realiza tests y obtiene sus resultados vocacionales.", "App Móvil")
    Rel(therapist, akitSystem, "Genera vouchers, administra pacientes y revisa métricas.", "Navegador Web")
    
    Rel(akitSystem, emailProvider, "Envía correos a pacientes (Reporte Híbrido).", "SMTP/API")
    Rel(akitSystem, cloudStorage, "Guarda archivos PDF generados por Puppeteer.", "HTTPS/API")
```

---

## Nivel 2: Diagrama de Contenedores

Zoom en el Sistema para ver las aplicaciones, bases de datos o microservicios que lo componen.

```mermaid
C4Container
    title Diagrama de Contenedores (Nivel 2) - Plataforma A.kit

    Person(patient, "Paciente/Estudiante", "Realiza el test desde su dispositivo.")
    Person(therapist, "Terapeuta/Institución", "Gestiona a través del panel de control.")

    System_Boundary(c1, "A.kit / Cotejo") {
        Container(mobileApp, "CotejoApp (Mobile)", "Android, Kotlin, Compose", "Provee la interfaz de swiping y visualización offline-first al paciente.")
        Container(webApp, "A.kit Dashboard (Web)", "React, Vite, TypeScript", "Portal SPA para terapeutas y admins.")
        Container(apiApp, "A.kit API (Backend)", "NestJS, Node.js, TypeScript", "Motor central, orquestador de DDD, APIs REST y generación de PDFs (Puppeteer).")
        ContainerDb(database, "Database", "PostgreSQL", "Almacena perfiles, resultados de tests, configuración y vouchers.")
    }
    
    System_Ext(externalServices, "Servicios Externos", "Emails (SMTP) / Storage (S3)")

    Rel(patient, mobileApp, "Usa la aplicación", "Taps & Swipes")
    Rel(therapist, webApp, "Gestiona flujo", "HTTPS")
    
    Rel(mobileApp, apiApp, "Llamadas a API, sincronización y descarga de Tarjetas", "REST/JSON")
    Rel(webApp, apiApp, "Consumo de API interna", "REST/JSON")
    
    Rel(apiApp, database, "Lee y escribe datos", "TCP/IP Prisma/ORM")
    Rel(apiApp, externalServices, "Envía emails y archiva PDFs", "HTTPS/SMTP")
```

---

## Nivel 3: Diagrama de Componentes (A.kit API - Backend)

Detalle interno del contenedor principal (API Backend) resaltando la separación por Clean Architecture.

```mermaid
C4Component
    title Diagrama de Componentes (Nivel 3) - API Backend (NestJS)

    ContainerExt(mobileApp, "CotejoApp (Mobile)", "Cliente Android")
    ContainerExt(webApp, "A.kit Web", "Cliente React")
    ContainerDbExt(database, "PostgreSQL", "Data Store")

    Container_Boundary(api, "A.kit API Application") {
        Component(controllers, "REST Controllers", "NestJS @Controller", "Puntos de entrada HTTP (Rutas: Auth, Test, Vouchers, Reports).")
        
        System_Boundary(app_layer, "Capa de Aplicación (Use Cases)") {
            Component(uc_onboarding, "Onboarding Service", "TS Class", "Registra nuevos pacientes y emite tokens.")
            Component(uc_test_engine, "Test Engine Service", "TS Class", "Gestiona inicio de tests y registra swipes.")
            Component(uc_calc, "Result Calculator", "TS Class", "Aplica el algoritmo para sugerir perfiles e intereses vocacionales.")
            Component(uc_voucher, "Voucher Service", "TS Class", "Gestiona la acreditación B2B y cupones de un solo uso.")
            Component(uc_report, "Report Generator", "TS Class", "Integra Puppeteer para generar PDFs a partir de plantillas HTML.")
        }
        
        System_Boundary(domain_layer, "Capa de Dominio") {
            Component(domain_entities, "Entities & Aggregates", "TS Classes", "Modelos core: User, TestSession, VocationalResult, Voucher, Category.")
            Component(domain_repo_iface, "Repository Interfaces", "TS Interfaces", "Contratos para inyección de dependencias.")
        }
        
        System_Boundary(infra_layer, "Capa de Infraestructura") {
            Component(repo_impl, "Postgres Repositories", "TS Class (ORM)", "Implementa los repositorios (Ej. PrismaClient).")
            Component(email_service, "Email Client", "Nodemailer/SES", "Conector al servicio de correos externo.")
            Component(storage_service, "Cloud Storage Client", "AWS SDK S3", "Conector para subir archivos.")
        }
    }

    Rel(mobileApp, controllers, "Hace peticiones HTTPS", "JSON")
    Rel(webApp, controllers, "Hace peticiones HTTPS", "JSON")
    
    Rel(controllers, uc_onboarding, "Llama a")
    Rel(controllers, uc_test_engine, "Llama a")
    Rel(controllers, uc_calc, "Llama a")
    Rel(controllers, uc_voucher, "Llama a")
    Rel(controllers, uc_report, "Llama a")
    
    Rel(uc_test_engine, domain_entities, "Instancia entidades")
    Rel(uc_calc, domain_entities, "Instancia entidades")
    Rel(uc_onboarding, domain_entities, "Instancia entidades")
    
    Rel(uc_test_engine, domain_repo_iface, "Usa abstracciones para guardar")
    Rel(repo_impl, domain_repo_iface, "Implementa (DI)")
    Rel(repo_impl, database, "Ejecuta queries SQL", "Prisma/TypeORM")
    
    Rel(uc_report, email_service, "Envía template/email")
    Rel(uc_report, storage_service, "Sube PDF")
```
