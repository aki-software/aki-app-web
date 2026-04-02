# Google Play: Informe Administrativo

Fecha de referencia: 2026-03-23

## Objetivo

Explicar, en lenguaje ejecutivo, que hace falta para publicar la app Android en Google Play, que tipos de pruebas conviene usar y que decisiones debe tomar el owner antes de salir a produccion.

## Resumen Ejecutivo

Para lanzar la app en Google Play no alcanza con generar el archivo Android.

Tambien hay que:

- configurar la app en Play Console
- completar formularios obligatorios de contenido, privacidad y acceso
- ejecutar pruebas previas
- pasar revision de Google
- definir como se va a publicar: prueba interna, cerrada o produccion

## Tipos de Pruebas en Google Play

Google Play permite tres tipos de pruebas antes de produccion:

| Tipo de prueba | Para que sirve | Alcance | Recomendacion |
| --- | --- | --- | --- |
| **Interna** | Validacion rapida del equipo | Hasta **100 testers** | 🟢 Primer paso recomendado |
| **Cerrada** | Pruebas con grupo controlado de usuarios reales | Grupo definido por el equipo | 🟢 Paso recomendado antes de produccion |
| **Abierta** | Test publico previo al lanzamiento | Visible en Google Play para quienes se sumen | 🟡 Solo cuando la app ya esta bastante madura |

## Regla Importante para Cuentas Personales Nuevas

Si la cuenta de desarrollador de Google Play es **personal** y fue creada **despues del 13 de noviembre de 2023**, Google exige una prueba cerrada antes de habilitar produccion.

Requisito oficial actual:

- minimo **12 testers**
- durante al menos **14 dias continuos**

Si la cuenta cae en ese caso, esto deja de ser opcional: es un paso obligatorio para pedir acceso a produccion.

## Camino Recomendado para el Proyecto

### Etapa 1: Prueba interna

Objetivo:

- validar que la app instala
- probar login, onboarding, test, resultados y logout
- detectar errores tecnicos basicos

### Etapa 2: Prueba cerrada

Objetivo:

- probar con usuarios controlados
- validar experiencia real
- recibir feedback sin exponer la app a todo el publico

### Etapa 3: Produccion

Objetivo:

- publicar la app para usuarios finales
- hacer un lanzamiento mas controlado

**Recomendacion:** para la primera salida, conviene publicar con rollout gradual si Google lo permite para la actualizacion siguiente. En el primer lanzamiento, lo importante es llegar con una version ya probada.

## Que Tiene que Definir el Owner

Antes de publicar, el owner debe resolver estas decisiones:

| Decision | Que significa |
| --- | --- |
| **Nombre comercial de la app** | Como va a aparecer en Google Play |
| **Free o paid** | Si la app sera gratuita o paga |
| **Paises de disponibilidad** | En que mercados se va a publicar |
| **Email de contacto** | Correo que veran usuarios y Google |
| **Politica de privacidad** | URL publica obligatoria |
| **Categoria de la app** | Como se clasificara en Google Play |
| **Grupo de testers** | Quienes entran en prueba interna/cerrada |
| **Fecha de salida** | Cuando se habilita produccion |

## Configuraciones que Deben Existir en Play Console

En la consola de Google Play hay que completar al menos:

- datos basicos de la app
- ficha de tienda
- politica de privacidad
- declaracion de anuncios
- acceso a la app para revisores, si la app requiere login
- target audience y contenido
- data safety
- content rating
- paises de distribucion
- precio
- firma de app con Play App Signing

## Requisitos Previos al Lanzamiento

Antes de subir la app a produccion se recomienda tener cerrado:

- build release estable
- keystore de release controlado
- versionado correcto
- login Google funcionando
- backend productivo disponible
- Firebase y Crashlytics activos
- politica de privacidad publicada
- material de store listing preparado

## Material que Google Play va a pedir

Normalmente hace falta preparar:

- nombre de la app
- descripcion corta
- descripcion completa
- icono
- screenshots
- email de contacto
- politica de privacidad

## Riesgos Mas Comunes

- salir a produccion sin prueba cerrada suficiente
- no completar bien Data safety
- no cargar acceso para revisores si la app requiere login
- subir una build con versionCode repetido
- inconsistencias entre package name, Firebase y Play Console
- politica de privacidad incompleta o sin URL publica

## Recomendacion Ejecutiva

La mejor ruta para este proyecto es:

1. **Prueba interna**
2. **Prueba cerrada**
3. **Salida a produccion**

Y, si la cuenta de Play es personal nueva:

1. cumplir el requisito de **12 testers / 14 dias**

## Conclusion

Desde negocio, publicar en Google Play implica tres cosas:

- tener una app tecnicamente lista
- completar correctamente la configuracion de Play Console
- pasar por una etapa real de pruebas antes de producir

Para este proyecto, la salida mas segura es hacer una publicacion escalonada y no intentar ir directo a produccion sin test previo.

## Fuentes oficiales

- Testing tracks: <https://support.google.com/googleplay/android-developer/answer/9845334>
- Testing requirements for new personal accounts: <https://support.google.com/googleplay/android-developer/answer/14151465>
- Create and set up your app: <https://support.google.com/googleplay/android-developer/answer/9859152>
- Prepare your app for review: <https://support.google.com/googleplay/android-developer/answer/9859455>
- Prepare and roll out a release: <https://support.google.com/googleplay/android-developer/answer/9859348>
- Publish your app: <https://support.google.com/googleplay/android-developer/answer/9859751>
