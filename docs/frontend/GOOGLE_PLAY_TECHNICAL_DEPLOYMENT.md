# Google Play: Guia Tecnica de Despliegue Android

Fecha de referencia: 2026-03-23

## Objetivo

Documentar el proceso tecnico para probar, preparar y publicar la app Android en Google Play.

## Estado Actual del Proyecto

Datos detectados en el repo:

- `compileSdk = 36`
- `targetSdk = 35`
- `minSdk = 24`
- `versionCode = 8`
- `versionName = 1.1.5`
- se usa Firebase (`Auth`, `Analytics`, `Crashlytics`, `Perf`)
- existe `buildType` `release`
- existe `buildType` `qa`
- release ya apunta a backend remoto

Punto a revisar antes de Play:

- la documentacion actual habla de `com.akit.app`
- el `applicationId` actual en Gradle es `com.akt.app`

Eso hay que resolver antes de publicar, porque el package name en Play Console es permanente y no se puede reciclar.

## Requisitos Tecnicos Previos

Antes de pensar en Play Console, la app deberia cumplir:

- build release firmado
- `versionCode` nuevo en cada subida
- `versionName` actualizado
- `targetSdk` vigente para Play
- `google-services.json` correcto para release
- SHA-1 y SHA-256 del keystore release cargados en Firebase
- login Google funcionando en build release
- backend productivo accesible por HTTPS
- politica de privacidad disponible en URL publica

## Requisito Oficial de API Level

Google indica que desde **31 de agosto de 2025**:

- apps nuevas y updates deben targetear **Android 15 / API 35** o superior

El proyecto hoy tiene `targetSdk = 35`, por lo que **cumple** ese requisito.

## Tipo de Artefacto a Subir

Para Google Play, lo normal es subir:

- **AAB** (`Android App Bundle`)

No conviene pensar el proceso principal con APK para Play Store. El bundle es el camino correcto para distribucion oficial.

## Firma de la App

Recomendacion:

- usar **Play App Signing**
- conservar de forma segura el keystore de upload
- no versionar el archivo del keystore ni sus credenciales

## Tipos de Prueba

### 1. Internal testing

Uso recomendado:

- QA rapido
- validar instalacion
- validar integraciones criticas

Dato oficial:

- hasta **100 testers**

### 2. Closed testing

Uso recomendado:

- probar con usuarios controlados
- validar experiencia real antes de abrir la distribucion

### 3. Open testing

Uso recomendado:

- cuando la app ya esta madura y lista para ser visible en Google Play

## Flujo Tecnico Recomendado

### Paso 1. Validar identidad de la app

Revisar en:

- [CotejoApp/app/build.gradle.kts](C:/Dev/Personal/A.kit/CotejoApp/app/build.gradle.kts)
- [docs/frontend/RELEASE_CHECKLIST_PROD.md](C:/Dev/Personal/A.kit/docs/frontend/RELEASE_CHECKLIST_PROD.md)
- [docs/frontend/FIREBASE_SETUP.md](C:/Dev/Personal/A.kit/docs/frontend/FIREBASE_SETUP.md)

Chequeos:

- confirmar package name final
- confirmar `versionCode`
- confirmar `versionName`
- confirmar keystore release

### Paso 2. Generar fingerprints release

Ejecutar:

```powershell
.\gradlew signingReport
```

Si hace falta validar manualmente:

```powershell
keytool -list -v -keystore C:\path\to\keystore.jks -alias <alias>
```

Luego cargar `SHA-1` y `SHA-256` de release en Firebase.

### Paso 3. Verificar Firebase para release

Confirmar:

- proyecto Firebase correcto
- app Android correcta
- `google-services.json` correcto
- `default_web_client_id` correcto
- Google Sign-In funcionando en release

### Paso 4. Generar build release

Ejemplo:

```powershell
.\gradlew :app:bundleRelease
```

Opcional QA:

```powershell
.\gradlew :app:assembleQa
```

### Paso 5. Ejecutar smoke test release

Usar como base:

- [docs/frontend/SMOKE_TEST.md](C:/Dev/Personal/A.kit/docs/frontend/SMOKE_TEST.md)

Validar al menos:

- arranque
- login Google
- onboarding
- test swipe
- resultados
- logout
- estabilidad general

### Paso 6. Configurar Play Console

En Play Console hay que completar:

#### App setup

- crear la app
- idioma principal
- nombre de la app
- app o game
- free o paid
- email de contacto
- aceptar declaraciones iniciales
- aceptar Play App Signing

#### Store listing

Google indica estos limites:

- **App name**: hasta **30** caracteres
- **Short description**: hasta **80** caracteres
- **Full description**: hasta **4000** caracteres

Tambien cargar:

- icono
- screenshots
- categoria
- datos de contacto

#### App content

Completar en `Policy and programs > App content`:

- Privacy policy
- Ads
- App access
- Target audience and content
- Content ratings
- Data safety
- Permissions declaration si aplica

### Paso 7. App access para revisores

Como la app usa autenticacion, si algun flujo queda restringido por login hay que cargar instrucciones para review.

Google permite agregar instrucciones de acceso y detallar:

- usuario de prueba
- password o mecanismo
- pasos especiales
- MFA o flujo alternativo si existiera

### Paso 8. Testing tracks en Play Console

Rutas habituales:

- `Test and release > Testing > Internal testing`
- `Test and release > Testing > Closed testing`
- `Test and release > Testing > Open testing`
- `Test and release > Production`

### Paso 9. Publicar una release de prueba

Subir el `.aab` al track elegido.

Luego:

- agregar release notes
- seleccionar testers o grupo
- revisar cambios
- enviar a review/publicar segun corresponda

### Paso 10. Pasar a produccion

Antes de publicar a produccion:

- store listing listo
- app content completo
- precio definido
- paises definidos
- release revisada

Si la cuenta es personal nueva:

- closed testing con **12 testers**
- durante **14 dias continuos**
- luego pedir acceso a produccion

## Configuraciones de Play Console que Debes Realizar

Checklist tecnico:

- [ ] Crear app en Play Console
- [ ] Definir package name final
- [ ] Activar Play App Signing
- [ ] Cargar store listing
- [ ] Cargar screenshots e icono
- [ ] Completar privacy policy
- [ ] Declarar ads
- [ ] Completar app access
- [ ] Completar target audience and content
- [ ] Completar content rating
- [ ] Completar data safety
- [ ] Definir paises/regiones
- [ ] Definir si la app es free o paid
- [ ] Crear internal testing
- [ ] Crear closed testing
- [ ] Subir AAB release
- [ ] Enviar cambios a review

## Recomendacion Tecnica para A.kit

Para este proyecto, la secuencia recomendada es:

1. resolver package name definitivo (`com.akit.app` vs `com.akt.app`)
2. validar Firebase release con SHA release reales
3. generar `bundleRelease`
4. pasar smoke test completo
5. subir a **internal testing**
6. pasar a **closed testing**
7. completar App content y Store listing
8. publicar a produccion

## Riesgos Tecnicos Detectados

### 1. Inconsistencia de package name

La documentacion existente usa `com.akit.app`, pero el Gradle actual usa `com.akt.app`.

Esto debe resolverse antes de crear la app en Play Console.

### 2. Cleartext traffic habilitado

En [AndroidManifest.xml](C:/Dev/Personal/A.kit/CotejoApp/app/src/main/AndroidManifest.xml) figura:

- `android:usesCleartextTraffic="true"`

Para release productivo conviene revisar si sigue siendo necesario.

### 3. Dependencia de configuracion Firebase release

Si las huellas SHA o el `google-services.json` no coinciden, el login Google puede fallar en produccion aunque funcione en debug.

## Fuentes oficiales

- Create and set up your app: https://support.google.com/googleplay/android-developer/answer/9859152
- Set up internal, closed, or open testing: https://support.google.com/googleplay/android-developer/answer/9845334
- Testing requirements for new personal accounts: https://support.google.com/googleplay/android-developer/answer/14151465
- Prepare your app for review: https://support.google.com/googleplay/android-developer/answer/9859455
- Data safety: https://support.google.com/googleplay/android-developer/answer/10787469
- Content ratings: https://support.google.com/googleplay/android-developer/answer/9898843
- Prepare and roll out a release: https://support.google.com/googleplay/android-developer/answer/9859348
- Publish your app: https://support.google.com/googleplay/android-developer/answer/9859751
- Play App Signing: https://support.google.com/googleplay/android-developer/answer/9842756
- Target API requirements: https://support.google.com/googleplay/android-developer/answer/11926878
