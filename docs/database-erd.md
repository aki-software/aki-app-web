# Diagrama Entidad-Relación (ERD)

Este documento mapea la estructura relacional de la base de datos PostgreSQL, representando cómo interactúan las principales entidades de la plataforma utilizando TypeORM.

```mermaid
erDiagram
    USER {
        uuid id PK
        string email
        string firebaseUid
        string role
        timestamp createdAt
    }

    INSTITUTION {
        uuid id PK
        string name
        string contactEmail
        boolean isActive
    }

    VOUCHER_BATCH {
        uuid id PK
        uuid institutionId FK
        int quantity
        timestamp expiresAt
    }

    VOUCHER {
        uuid id PK
        uuid batchId FK
        uuid claimedByUserId FK
        string code
        string status
        timestamp redeemedAt
    }

    SESSION {
        uuid id PK
        uuid userId FK
        string status
        timestamp startedAt
        timestamp completedAt
    }

    SESSION_SWIPE {
        uuid id PK
        uuid sessionId FK
        uuid categoryId FK
        string action
    }

    SESSION_RESULT {
        uuid id PK
        uuid sessionId FK
        json hollandProfile
    }

    SESSION_METRICS {
        uuid id PK
        uuid sessionId FK
        int timeSpentSeconds
    }

    VOCATIONAL_CATEGORY {
        uuid id PK
        string name
        string code
    }

    INSTITUTION ||--o{ VOUCHER_BATCH : "Generates"
    VOUCHER_BATCH ||--o{ VOUCHER : "Contains"
    USER ||--o{ VOUCHER : "Redeems"
    
    USER ||--o{ SESSION : "Conducts"
    SESSION ||--o{ SESSION_SWIPE : "Registers"
    SESSION ||--o| SESSION_RESULT : "Produces"
    SESSION ||--o| SESSION_METRICS : "Records"

    VOCATIONAL_CATEGORY ||--o{ SESSION_SWIPE : "Evaluated"
```

## Notas Arquitectónicas
- **Autenticación Delegada:** La entidad `USER` no guarda contraseñas. Depende enteramente de `firebaseUid` delegado a Google/Firebase Auth.
- **Redención B2B:** Cuando un `VOUCHER` cambia de estado a `REDEEMED`, se enlaza al `USER` a través del campo `claimedByUserId`. Esto permite trazabilidad para la institución que compró el `VOUCHER_BATCH`.
- **Inmutabilidad Parcial:** Los registros en `SESSION_SWIPE` y `SESSION_RESULT` deben ser tratados como inmutables una vez que la sesión pasa al estado `COMPLETED`.
