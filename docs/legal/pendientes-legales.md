# Pendientes legales de Fileflect

Actualizado: 23/10/2026 (fase 7: textos publicados). Esto no es asesoramiento legal: es una lista de trabajo para revisar con un abogado o contador.

## Bloqueantes antes de cobrar el plan Pro
1. **Inscripción fiscal.** Para cobrar suscripciones hay que estar inscripto en ARCA (por ejemplo, monotributo) y emitir factura. Mientras no estés inscripto, mantené los pagos desactivados (sin `MP_ACCESS_TOKEN_*` de producción) o en modo prueba. **[consultar con un contador]**
2. **Botón de arrepentimiento y botón de baja (Disposición 954/2025).** Reemplazó a las Resoluciones 424/2020 y 316/2018 y alcanza a todos los proveedores que venden a distancia. Pide:
   - los dos botones visibles desde el primer acceso al sitio;
   - que no exijan registrarse ni pasos previos;
   - un código de identificación enviado dentro de las 24 h;
   - canales de atención publicados.

   Hoy el sitio solo permite cancelar desde Mi cuenta, con sesión iniciada. → **Tarea de código.**
3. ✅ **Hecho (fase 7, 23/10/2026).** **Aceptación expresa** de los Términos y la Política de privacidad al crear la cuenta y antes de pagar, con casilla o texto junto al botón, y registro de la fecha y la versión aceptada. Incluye el consentimiento para las transferencias internacionales. → Texto junto a los botones de Google y de email en el login (y junto al de suscribirse cuando `PRO_ENABLED=true`), con enlaces; al iniciar sesión se guardan `termsVersion` y `termsAcceptedAt` en el usuario (las cuentas viejas los reciben en su próximo inicio de sesión).
4. **Revisión de un abogado** de los borradores (`legal/terminos-borrador.md` y `legal/privacidad-borrador.md`), sobre todo:
   - responsabilidad y cláusulas abusivas (art. 37 de la Ley 24.240);
   - jurisdicción;
   - transferencias internacionales (art. 12 de la Ley 25.326);
   - reembolsos.

## Datos personales
5. **Registro de la base de datos ante la AAIP** (Registro Nacional de Bases de Datos), por los usuarios, suscripciones y estadísticas. **[consultar si corresponde y cómo]**
6. **Leyenda obligatoria de la AAIP** en la política de privacidad: ✅ publicada (texto oficial en español; en los otros idiomas, traducción y además el original en español). Falta que un abogado verifique el texto.
7. **Plazo de conservación** de las estadísticas de uso: el código ya las borra solo a los 12 meses (índice TTL en `ConversionLog` y `PageView`), y la política lo dice así. Si se cambia el plazo, hay que actualizar los dos lados.
8. **AdSense:** activar en AdSense, en "Privacidad y mensajes", el mensaje de consentimiento para el EEE, el Reino Unido y Suiza, y el de las regiones de EE. UU., antes de cargar los IDs de anuncios.

## Decisiones tuyas
9. Reembolso del **plan anual** después de los 10 días: ¿proporcional o sin reembolso?
10. Definir qué es una **"falla prolongada"** que da reembolso (por ejemplo, más de 72 h seguidas).
11. ✅ **Horario de atención**: "lunes a viernes, en horario hábil" (publicado en Contacto y en los Términos).
12. **Marca:** registro en el INPI postergado por costo. Mientras tanto, guardar pruebas de uso y revisar el Boletín de Marcas.

## Publicación de los textos (fase 7, 23/10/2026)
- ✅ Términos y condiciones y Política de privacidad publicados en los 5 idiomas (`messages/*.json`, sección `Legal`), sin notas internas ni aviso de borrador. Responsable: Juan Pablo Aste, Vicente López, Buenos Aires; contacto contact@fileflect.com.
- ✅ Plan Pro apagado (`PRO_ENABLED=false`): los términos dicen que el servicio es gratuito con publicidad y la privacidad no menciona Mercado Pago (avisa que los pagos se agregarán con aviso previo). Las secciones del plan Pro (precio, pago y renovación, arrepentimiento, baja, reembolsos) están en el código y aparecen al encender el interruptor.
- ✅ Aceptación expresa y registro de la versión y la fecha (punto 3).
- Se dejaron fuera del texto publicado, hasta que se decidan: reembolso por "falla prolongada" (punto 10), reembolso del plan anual después de los 10 días (punto 9), datos de inscripción fiscal (punto 1) y el plazo de conservación de los correos que nos envían (se dice solo que se usan para responder).
- Siguen en el texto pero el borrador los marcaba para revisar con un abogado: jurisdicción de San Isidro, el enlace de reclamos de Defensa del Consumidor, los plazos de 10 días y 5 días hábiles, la edad mínima de 18 años, "interés legítimo" como base de las estadísticas, la cláusula de responsabilidad, la frase sobre el consentimiento de AdSense, la región de Railway y la leyenda de la AAIP.
- **Antes de encender Pro:** construir el botón de arrepentimiento y el botón de baja visibles en todas las páginas (punto 2): las secciones Pro de los términos ya los describen.

## Voz IA del lector en voz alta (fase 8, 27/10/2026)
- ✅ Términos, nueva sección "Voz IA del lector en voz alta" (5 idiomas): la licencia de los pesos de Supertonic 3 (BigScience OpenRAIL-M, punto 4.a) exige incluir sus restricciones de uso (Anexo A) como cláusula exigible y avisar a los usuarios. Se tradujeron las 13 restricciones; prevalece el texto en inglés de la licencia (copia en `/licenses/BigScience-OpenRAIL-M.txt`, punto 4.b). Se pide indicar que el audio es voz generada por IA al publicarlo (restricción e).
- ✅ Privacidad: el texto se procesa en el dispositivo; Hugging Face recibe la IP al descargar el modelo; las voces "en línea" del navegador envían el texto a su proveedor; el modelo queda en la caché del navegador.
- `LEGAL_UPDATED` / `TERMS_VERSION` pasó a 2026-10-27: los usuarios con cuenta vuelven a aceptar en su próximo inicio de sesión. Los Términos dicen que los cambios importantes se avisan con 15 días; este agrega reglas solo para una función nueva y opcional, pero conviene que un abogado confirme si hace falta el aviso previo.
- Para revisar con un abogado: la traducción de las restricciones y si la cláusula alcanza como "enforceable provision" de la licencia.
