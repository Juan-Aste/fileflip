# Pendientes legales de Fileflect

Actualizado: 23/10/2026. Esto no es asesoramiento legal: es una lista de trabajo para revisar con un abogado o contador.

## Bloqueantes antes de cobrar el plan Pro
1. **Inscripción fiscal.** Para cobrar suscripciones hay que estar inscripto en ARCA (por ejemplo, monotributo) y emitir factura. Mientras no estés inscripto, mantené los pagos desactivados (sin `MP_ACCESS_TOKEN_*` de producción) o en modo prueba. **[consultar con un contador]**
2. **Botón de arrepentimiento y botón de baja (Disposición 954/2025).** Reemplazó a las Resoluciones 424/2020 y 316/2018 y alcanza a todos los proveedores que venden a distancia. Pide:
   - los dos botones visibles desde el primer acceso al sitio;
   - que no exijan registrarse ni pasos previos;
   - un código de identificación enviado dentro de las 24 h;
   - canales de atención publicados.

   Hoy el sitio solo permite cancelar desde Mi cuenta, con sesión iniciada. → **Tarea de código.**
3. **Aceptación expresa** de los Términos y la Política de privacidad al crear la cuenta y antes de pagar, con casilla o texto junto al botón, y registro de la fecha y la versión aceptada. Incluye el consentimiento para las transferencias internacionales. → **Tarea de código.**
4. **Revisión de un abogado** de los borradores (`legal/terminos-borrador.md` y `legal/privacidad-borrador.md`), sobre todo:
   - responsabilidad y cláusulas abusivas (art. 37 de la Ley 24.240);
   - jurisdicción;
   - transferencias internacionales (art. 12 de la Ley 25.326);
   - reembolsos.

## Datos personales
5. **Registro de la base de datos ante la AAIP** (Registro Nacional de Bases de Datos), por los usuarios, suscripciones y estadísticas. **[consultar si corresponde y cómo]**
6. **Leyenda obligatoria de la AAIP** en la política de privacidad (ya incluida en el borrador, verificar texto).
7. **Plazo de conservación** de las estadísticas de uso: el código ya las borra solo a los 12 meses (índice TTL en `ConversionLog` y `PageView`), y la política lo dice así. Si se cambia el plazo, hay que actualizar los dos lados.
8. **AdSense:** activar en AdSense, en "Privacidad y mensajes", el mensaje de consentimiento para el EEE, el Reino Unido y Suiza, y el de las regiones de EE. UU., antes de cargar los IDs de anuncios.

## Decisiones tuyas
9. Reembolso del **plan anual** después de los 10 días: ¿proporcional o sin reembolso?
10. Definir qué es una **"falla prolongada"** que da reembolso (por ejemplo, más de 72 h seguidas).
11. **Horario de atención** que publicás (la norma pide al menos horario hábil).
12. **Marca:** registro en el INPI postergado por costo. Mientras tanto, guardar pruebas de uso y revisar el Boletín de Marcas.

## Cuando estén aprobados los textos (tarea programada)
- Cargar los textos finales en los 5 idiomas (`messages/*.json`, sección `Legal`).
- Agregar el botón de arrepentimiento, el botón de baja, la aceptación expresa y el registro de aceptación.
- Actualizar `docs/launch-checklist.md`.
