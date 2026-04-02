# Firebase Setup (A.kit Android)

Este documento explica cómo configurar Firebase para el proyecto **A.kit** (`com.akit.app`) y dejar Google Sign‑In funcionando correctamente.

## 1) Crear/actualizar la app Android en Firebase
1. Abrí **Firebase Console** y entrá al proyecto correspondiente.
2. Andá a **Project settings** (ícono de engranaje) → **Your apps** → **Add app** → **Android**.
3. En **Android package name** poné: `com.akit.app`.
4. (Opcional) **App nickname**: `A.kit`.
5. Dejá **SHA‑1 / SHA‑256** para el siguiente paso.

## 2) Obtener SHA‑1 / SHA‑256 del keystore
### Opción A (recomendado): Gradle
Desde la raíz del proyecto:
```powershell
.\gradlew signingReport
```
Buscá las entradas **debug** y **release** y copiá `SHA1` y `SHA-256`.

### Opción B: keytool
```powershell
keytool -list -v -keystore C:\path\to\keystore.jks -alias <alias>
```

## 3) Registrar los SHA en Firebase
1. En **Project settings** → **Your apps** → **A.kit (Android)**.
2. **Add fingerprint** → pegá `SHA‑1` y `SHA‑256` (debug y release si vas a firmar).
3. Guardar cambios.

## 4) Descargar y reemplazar `google-services.json`
1. En la misma sección de la app, hacé **Download google-services.json**.
2. Reemplazá el archivo local:
   - `app/google-services.json`

## 5) Verificar Web Client ID para Google Sign‑In
Este proyecto usa `default_web_client_id` en:
`app/src/main/res/values/auth_strings.xml`

Después de reemplazar `google-services.json`, verificá:
- Firebase Console → **Project settings** → **General** → **Web API Key / OAuth**  
El **Web client ID** debe coincidir con `default_web_client_id`.

Si no coincide, actualizá el string manualmente:
```xml
<string name="default_web_client_id">TU_WEB_CLIENT_ID</string>
```

## 6) Probar login con Google
```powershell
.\gradlew :app:assembleDebug
```
Abrí la app en emulador o dispositivo y probá **“Continuar con Google”**.

## 7) Notas importantes
- Cambiar el `applicationId` crea una **nueva app** en Firebase.
- Si usás el **mismo proyecto Firebase**, los usuarios previos siguen existiendo.
- Si cambiás de proyecto Firebase, es otro universo de usuarios.

