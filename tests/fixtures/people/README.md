# Foto de una persona (fase 15, modo «Personas» de «Quitar fondo»)

| Archivo | Qué es |
|---|---|
| `person.jpg` | Retrato a medio cuerpo, 480 px de ancho, pegado sobre un fondo de rayas generado (JPEG 85 %) |
| `person-mask.png` | Máscara de referencia exacta (blanco = persona), del mismo tamaño |

**Origen**: retrato oficial de la astronauta Jessica Watkins, NASA Johnson Space Center, foto de Bill Stafford (NASA), 2026-04-24, `jsc2026e035015_alt` en https://images.nasa.gov/details/jsc2026e035015_alt (archivo `~medium.jpg`, sha256 `b657558f221d6fe27035c2f6f2f01dd2c6f61bdbb51fc618fc4e999563fcfb76`).

**Licencia**: obra de un empleado del gobierno federal de EE. UU. en su trabajo → **dominio público** (17 U.S.C. § 105); las [pautas de uso de medios de la NASA](https://www.nasa.gov/nasa-brand-center/images-and-media/) dicen que su material en general no tiene derechos de autor y se puede usar con fines comerciales, sin dar a entender que la NASA o la persona respaldan un producto. Aquí se usa solo como dato de prueba (no aparece en el sitio).

**Cómo se hizo**: `node scripts/bg/people-fixtures.mjs <carpeta con el JPG> tests/fixtures/people`. El retrato está en estudio sobre fondo blanco: la máscara es todo lo que no está conectado al fondo claro (sin ningún modelo), se recorta a medio cuerpo y la persona se pega sobre rayas con esa misma máscara. Con `--all` el script arma el set de 12 fotos (4 retratos × fondo blanco, rayas y degradé con ruido) de la evaluación en `docs/quitar-fondo-eval.md` (fase 15), que no se guarda en el repo.
