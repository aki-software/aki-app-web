# Branding Guidelines — A.kit Platform

Fecha: 2026-05-06

## 1) Convención de marca

- **A.kit**: marca de la plataforma.
- **Orient A.Ki**: nombre del producto / app móvil.

### Regla de uso

- Usar **A.kit** cuando se hable de la plataforma, el backend, la web corporativa o los correos transaccionales.
- Usar **Orient A.Ki** cuando se hable de la app móvil, onboarding, resultados y flujos de usuario finales.
- No mezclar ambos nombres en el mismo bloque visual salvo que sea necesario por contexto legal o informativo.

---

## 2) Fuente de verdad visual

**Android es la referencia principal de identidad visual.**

La web y los emails deben alinearse a esta base, no inventar una paleta paralela.

---

## 3) Paleta base oficial

### Colores de marca

| Token | Android | Rol recomendado |
|---|---:|---|
| `primary` | `#0F6B68` | Acción principal / confianza |
| `secondary` | `#8E5A12` | Acento cálido / crecimiento |
| `tertiary` | `#4E7F52` | Refuerzo / equilibrio |
| `background` | `#F5EFE7` | Fondo principal claro |
| `surface` | `#FAF6F0` | Tarjetas / superficies |
| `surfaceVariant` | `#DCD3C5` | Bordes suaves / contenedores |
| `outline` | `#7A8783` | Bordes / texto secundario |
| `error` | `#B9414A` | Estado de error |

### Tokens semánticos de acción

| Token | Android | Uso |
|---|---:|---|
| `confirm` | `#43A047` | Confirmar / guardar / avanzar |
| `destructive` | `#E53935` | Eliminar / cancelar / peligro |
| `warning` | `#F59E0B` | Advertencias / atención |

---

## 4) Equivalencias por canal

### Android

Usar los tokens oficiales tal como están definidos en:
- `cotejoapp/app/src/main/java/com/akit/app/ui/theme/Color.kt`
- `cotejoapp/app/src/main/java/com/akit/app/ui/theme/Theme.kt`

### Web

La web debe mapear sus variables CSS a la paleta Android.

#### Mapeo recomendado

| Web token | Valor actual | Estado |
|---|---:|---|
| `--color-app-primary` | `#2f7a66` / `#289b76` | **Alinear a Android** |
| `--color-app-bg` | `#f1ede4` | **Muy cercano** |
| `--color-app-surface` | `rgba(250, 242, 232, 0.94)` | **Aceptar si no rompe contraste** |
| `--color-app-text-main` | `#1d1914` | **Aceptar** |
| `--color-app-border` | `rgba(60, 50, 40, 0.18)` | **Aceptar** |

#### Deuda visual detectada

- Los acentos violetas de la web no forman parte de la identidad Android.
- El tono primary web no coincide exactamente con el teal de Android.

### Emails

Los templates transaccionales deben usar la paleta de marca más cercana a Android:
- fondo cálido
- primary teal
- secondary terracota
- surfaces suaves

#### Regla

Los emails deben ser:
- limpios
- consistentes
- poco ruidosos
- con fallback visible pero secundario

---

## 5) Reglas por tipo de pieza

### Plataforma / backend

- Naming: **A.kit**
- Voz: institucional, clara, técnica
- No usar el nombre del producto salvo que sea necesario por contexto

### App móvil

- Naming: **Orient A.Ki**
- Voz: cercana, orientativa, simple
- Usar la paleta Android sin derivaciones libres

### Web dashboard

- Naming: **A.kit**
- Voz: operativa y funcional
- Debe verse como el panel de la plataforma, no como otra marca

### Emails

- Naming: **A.kit**
- Deben acompañar la identidad de la plataforma
- Los CTAs deben usar el color de marca principal

---

## 6) Inconsistencias actuales a resolver

1. La web tiene acentos violetas que no están en Android.
2. Los mails usan una estética cálida propia que todavía no replica Android.
3. Algunos textos mezclan A.kit, A.Ki y Orient A.KI sin una convención fija.

---

## 7) Pendientes priorizados

### P1 — Alinear tokens visuales

- Llevar la paleta Android a web.
- Ajustar emails para que compartan identidad con Android.
- Eliminar colores no alineados a la marca.

### P2 — Refactor de sesiones

- Separar lógica pesada del controller.
- Limpiar acoplamientos entre capa HTTP y dominio.

### P3 — Validación y calidad

- Tests de integración para flujos críticos.
- Smoke tests manuales Android + web + mails.
- Mejor observabilidad para QA.

---

## 8) Decisión operativa

**Android define la verdad visual.**

La web y los mails deben seguirla.  
La plataforma usa **A.kit**; la app usa **Orient A.Ki**.

