# Migración de esquema V001

> **No la ejecutes en producción.** El volcado del 18/11/2026 muestra que producción ya tiene el esquema nuevo
> (lo generó Hibernate): V001 falla con `ERROR 1060 Duplicate column name 'year'`. Solo sirve para una base que
> siga con el esquema anterior. Antes de lanzarla, comprueba que `SHOW COLUMNS FROM season LIKE 'year'` no
> devuelve nada.
>
> Si en un intento anterior quedó la fila `V001` en `schema_migration` sin que la migración terminara, es una
> marca falsa de la versión antigua del script. Anótalo antes de borrarla.

Alinea una base MariaDB con el **esquema anterior** (la de la copia `backup_20261102050001.sql`)
con el que esperan las entidades JPA del código actual.

| Fichero | Qué hace |
|---|---|
| `V001__align_schema_with_code.sql` | Migración. No destructiva. |
| `V001__rollback.sql` | Vuelta atrás al esquema original. |

## Qué cambia

| Cambio | Detalle |
|---|---|
| `season.year` | Columna nueva, obligatoria y única. Se rellena con el año de la primera carrera de la temporada (2023 y 2024 en la copia). |
| `race.name`, `flag_image`, `circuit_image` | Columnas nuevas. Antes estaban en `circuit` (con las imágenes como BLOB). `race.circuit_id` pasa a ser opcional. |
| `penalty.severity_id` → `penalty_severity_id` | Renombrada. |
| `fantasy_election.user_id` → `account_id` | Renombrada. Sigue como `TINYINT(4)`: con V001 solo admite cuentas hasta la 127. Producción ya es `BIGINT`. |
| `season_id` opcional | En 9 tablas que el código ya no usa (`result`, `sprint`, `fantasy_*`, `championship`, `constructor`, `configuration`): la temporada se deduce de la carrera. |
| Imágenes | `driver.driver_image`, `team.logo_image` y `team.car_image` pasan de BLOB/URL a **rutas relativas** a la carpeta `images/` (`drivers/season2/Avantifer/driver.webp`, ...). Lo anterior se conserva en `*_legacy`. |
| `cache` | Se inserta la fila `general_cache` (versión 0). |
| `schema_migration` | Tabla de control: `V001` se anota al final, solo si todo ha ido bien. |

No se borra nada: `circuit`, las columnas `*_legacy` y los `season_id` siguen en la base.
Cuando todo esté validado en producción se pueden eliminar a mano.

## Cómo aplicarla

1. **Para la aplicación** y haz copia de seguridad:
   ```bash
   mariadb-dump --single-transaction <base> > antes_V001.sql
   ```
2. Aplica la migración:
   ```bash
   mariadb <base> < FormulaBolloApp/db/migration/V001__align_schema_with_code.sql
   ```
3. Comprueba:
   ```sql
   SELECT COUNT(*) FROM driver WHERE driver_image LIKE '%default%';   -- pilotos sin foto propia (4 en la copia: Mante, Alberto430 x2, Jolomo92)
   SELECT COUNT(*) FROM team   WHERE logo_image IS NULL OR car_image IS NULL;   -- debe dar 0
   SELECT COUNT(*) FROM race   WHERE name IS NULL;                              -- debe dar 0
   ```
4. Arranca la aplicación nueva. La carpeta `images/` debe estar donde apunta
   `spring.web.resources.static-locations` (`file:../images/` en desarrollo), porque ahora la
   base guarda rutas y no los bytes.

## Si falla a medias

Cada `ALTER` queda confirmado por separado y `V001` no se anota. No la repitas sobre esa base (se detiene en la
primera columna ya creada) ni lances el rollback, que presupone la migración completa: **restaura la copia**
`antes_V001.sql`, corrige la causa y vuelve a empezar. Nunca uses `--force`.

## Qué NO hace

- **No crea la temporada 3.** El frontend usa la 3 como actual (`environment.seasonActual`); la
  base solo tiene la 1 y la 2. Con la temporada actual sin datos, la portada sale vacía. Hay un
  `INSERT` comentado al final de la migración.
- **No copia imágenes.** Solo mapea por nombre a los ficheros que ya hay en `images/`. Un piloto o
  equipo nuevo necesita su carpeta (`drivers/season<N>/<Nombre_con_guiones_bajos>/driver.webp`,
  `teams/season<N>/<Equipo>/{car/car.avif,logo/logo.webp}`).
- El mapeo de imágenes está **fijado a las carpetas existentes** al generar el script. Si añades
  carpetas antes de migrar, hay que añadir sus filas en las tablas `tmp_*`.

## Cómo se probó (sobre una copia, nunca sobre producción)

- Migración sobre una copia limpia del volcado: sin errores; recuentos idénticos (41 pilotos,
  20 equipos, 50 carreras, 1.019 resultados, 31 cuentas, 205 elecciones) y las 181 rutas de
  imagen existen como fichero.
- Backend contra la base migrada: 44 de 44 endpoints GET responden 200; guardado de resultados,
  puntos de fantasy, elección de fantasy y alta de carrera funcionan.
- Rollback: el esquema queda idéntico al original (salvo la tabla vacía `schema_migration`) y los
  datos de imágenes coinciden byte a byte.

## Vuelta atrás

```bash
mariadb <base> < FormulaBolloApp/db/migration/V001__rollback.sql
```
Válida justo tras migrar. Con datos nuevos escritos por la aplicación, las columnas `season_id`
de esas filas están a NULL; el script las rellena desde la carrera donde puede (`result`,
`sprint`, `fantasy_*`) y fallará en `championship`/`constructor`/`configuration` si hay filas
nuevas sin temporada. Los equipos creados después de migrar conservan en `car_image` la ruta, no los bytes.

# Migración V002: claves únicas

Sin clave única, un doble envío de resultados duplicaba filas y los puntos se contaban dos veces
(en la copia local hay 11 pares: 10 en Las Vegas, temporada 2, y 1 en Red Bull Ring, temporada 1).
Se aplica sobre el esquema actual de producción sin necesidad de V001 (sobre el esquema anterior, V001 va antes).
No es destructiva salvo la limpieza opcional.

| Fichero | Qué hace |
|---|---|
| `V002__find_duplicates.sql` | Solo lectura. Lista los duplicados de `result`, `sprint`, `fantasy_election` y `account.email`. |
| `V002__dedupe_results.sql` | **Destructiva, opcional.** Borra de `result` la fila de mayor id de cada par idéntico en `position_id`, `fastlap` y `pole`. Los pares que difieren (Escapa, carrera 11: 1º y 4º) no se tocan y se muestran: decide una persona qué fila es la buena. |
| `V002__unique_keys.sql` | Crea `result_race_driver_un`, `sprint_race_driver_un`, `fantasy_election_account_race_un` y `account_email_un`. Falla si queda algún duplicado. |
| `V002__rollback.sql` | Elimina las cuatro claves. No recupera las filas que borró la limpieza. |

Orden: parar la aplicación, copia (`mariadb-dump --single-transaction <base> > antes_V002.sql`),
`find_duplicates`, `dedupe_results` si procede, resolver a mano lo que quede, `unique_keys`.
El DDL de MariaDB confirma cada `ALTER` por separado: si uno falla, pueden haberse creado ya las
anteriores. Corrige los datos, elimina esas claves, borra la fila V002 de `schema_migration` y repite.

Con la clave aplicada, el backend responde 409 («Otro guardado simultáneo…») en lugar de duplicar
cuando dos guardados de la misma carrera coinciden.

En el volcado del 18/11/2026 no hay duplicados en `result`, `sprint` ni `fantasy_election`. **La tabla `account`
no venía en el volcado:** ejecuta `find_duplicates` antes, porque un correo repetido dejaría creadas tres claves
y la cuarta no.

## Pruebas

- `test/run_v002.sh`: V002 y su vuelta atrás sobre el esquema anterior con duplicados.
- `test/run_production.sh`: sobre `test/production_schema.sql` (estructura de producción sin datos; `account`
  reconstruida desde las entidades), comprueba que V001 no deja marca y que V002 se aplica y se revierte.
- `ProductionSchemaTest`: lee y escribe las entidades contra esa estructura con V002. Se ejecuta en la CI; en local
  necesita `PRODUCTION_SCHEMA_JDBC_URL`. Diferencias conocidas con las entidades: `cache.version` es `smallint` y
  `season.year` es texto.
