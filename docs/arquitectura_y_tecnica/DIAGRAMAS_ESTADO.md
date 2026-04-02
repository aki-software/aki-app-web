# Diagramas de Estados

A continuación se presentan los diagramas de estado (Mermaid `stateDiagram-v2`) que representan el ciclo de vida de los dominios principales de la plataforma.

---

## 1. Ciclo de Vida de una Sesión de Test (TestSession)

Describe el estado por el que pasa un test vocacional de un paciente desde su inicio hasta que se entregan sus resultados.

```mermaid
stateDiagram-v2
    [*] --> Init: Usuario abre la app y solicita iniciar test
    Init --> InProgress: Retorna lista de tarjetas (OccupationalCards)
    
    state InProgress {
        [*] --> Swiping
        Swiping --> Swiping: Swipe (Like/Dislike) registrado local/remoto
    }
    
    InProgress --> Calculating: Usuario finalizó todas las tarjetas
    Calculating --> ResultGenerated: Algoritmo procesa el vector de afinidad
    Calculating --> Error: Falla en cálculo o red
    
    Error --> Calculating: Reintento manual/automático
    
    ResultGenerated --> PDF_Generation_Pending: Se planifica generación de reporte
    PDF_Generation_Pending --> PDF_Generated: Generación asíncrona Puppeteer
    
    ResultGenerated --> [*]: Usuario ve resultados en App
    PDF_Generated --> [*]: Usuario recibe email híbrido
```

---

## 2. Ciclo de Vida de un Voucher (Monetización B2B)

Modelo para los terapeutas, instituciones o compras web de pines/tokens de evaluación.

```mermaid
stateDiagram-v2
    [*] --> Created: Terapeuta adquiere / Sistema genera Voucher(s)
    Created --> Assigned: Terapeuta asocia el Voucher a un correo de paciente (Opcional)
    
    Created --> Redeemed: Paciente ingresa PIN directamente en CotejoApp
    Assigned --> Redeemed: Paciente se registra y Consume el Voucher asignado
    
    Redeemed --> Expired: Tiempo útil del voucher expirado post-canje
    Created --> Expired: Fecha de caducidad superada antes de uso
    Assigned --> Expired: Fecha de caducidad superada antes de uso
    
    Redeemed --> [*]
    Expired --> [*]
```

---

## 3. Máquina de Estados de Sincronización Móvil (Offline-First)

Estados que maneja la App Android (Room DB + WorkManager) para el motor de tests.

```mermaid
stateDiagram-v2
    [*] --> CacheReady: Tarjetas e infomación base cacheadas vía Room
    
    CacheReady --> SyncCards: Intento de fetch de nuevas tarjetas
    SyncCards --> CacheReady: Ok
    SyncCards --> FallbackLocal: Timeout/No Net -> Usar Cache
    FallbackLocal --> CacheReady: Usa local
    
    CacheReady --> RecordSwipe: Usuario desliza tarjeta
    
    state RecordSwipe {
       [*] --> DbLocal
       DbLocal --> FlushSyncQueue: En backgrounds (WorkManager)
       FlushSyncQueue --> BackendOk: Sincronismo Exitoso
       FlushSyncQueue --> DbLocal: Fallo. Retener para reintento.
    }
    
    BackendOk --> [*]
```
