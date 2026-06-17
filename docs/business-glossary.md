# Diccionario de Dominio (Business Glossary)

Este documento centraliza y define estrictamente los términos de negocio y las entidades lógicas utilizadas a través de la plataforma A.kit. Su propósito es alinear a producto, diseño y desarrollo bajo el mismo modelo mental.

## Visión Macro del Producto

**A.kit Platform** es una plataforma orientada a la evaluación vocacional y psicológica, proporcionando herramientas estandarizadas (como los test de Holland) para orientar a estudiantes en su futuro profesional. La plataforma cuenta con dos frentes principales de monetización y distribución:
1. **B2C (Business to Consumer):** Usuarios finales (estudiantes) que acceden a la aplicación, toman el test y compran el reporte detallado a través de pagos in-app (Play Store / App Store).
2. **B2B (Business to Business):** Instituciones (colegios, ministerios, fundaciones) que adquieren "Vouchers" en lote para distribuirlos gratuitamente a sus alumnos.

---

## Entidades Principales

### 1. Usuario (User)
Representa a una persona física que interactúa con la plataforma.
- **Student (Estudiante):** Usuario final que responde las pruebas vocacionales.
- **Admin / Manager:** Usuarios con privilegios elevados, encargados de la gestión de Instituciones y emisión de Vouchers.

### 2. Institución (Institution)
Entidad corporativa u organización educativa (ej. un colegio).
- Actúa como el "cliente corporativo" en el modelo B2B.
- Compra lotes de acceso para sus estudiantes, los cuales son distribuidos en forma de Vouchers.
- Posee estadísticas agrupadas sobre los resultados de los estudiantes bajo su dominio.

### 3. Sesión (Session)
Representa una instancia única de evaluación o test realizado por un estudiante.
- Contiene las respuestas seleccionadas por el usuario.
- Está vinculada a un resultado (ej. Perfil Holland).
- Puede estar "abierta" (en progreso) o "cerrada/completada".

### 4. Voucher (Cupón de Acceso)
Es un token o código de acceso prepagado que permite a un usuario desbloquear un reporte sin pagar en las tiendas de aplicaciones.
- **Tipos de estado:**
  - `ACTIVE`: El voucher fue generado y está listo para ser usado.
  - `REDEEMED`: El voucher fue utilizado por un estudiante. Queda atado permanentemente a la cuenta de ese usuario y a la sesión desbloqueada.
  - `EXPIRED / REVOKED`: El voucher ya no es válido por tiempo o por decisión administrativa.

### 5. Reporte Holland (Holland Result)
El resultado procesado de una sesión de evaluación.
- Clasifica al usuario en el modelo RIASEC (Realista, Investigador, Artístico, Social, Emprendedor, Convencional).
- Existe una versión pública/gratuita (resumen) y una versión "Premium" detallada que se desbloquea mediante pago B2C o mediante un Voucher B2B.

### 6. Categoría (Category)
Agrupaciones temáticas o áreas de conocimiento dentro de la plataforma que nutren los test o los perfiles sugeridos a los estudiantes.
