# Migración de esquema V001

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
| `fantasy_election.user_id` → `account_id` | Renombrada. |
| `season_id` opcional | En 9 tablas que el código ya no usa (`result`, `sprint`, `fantasy_*`, `championship`, `constructor`, `configuration`): la temporada se deduce de la carrera. |
| Imágenes | `driver.driver_image`, `team.logo_image` y `team.car_image` pasan de BLOB/URL a **rutas relativas** a la carpeta `images/` (`drivers/season2/Avantifer/driver.webp`, ...). Lo anterior se conserva en `*_legacy`. |
| `cache` | Se inserta la fila `general_cache` (versión 0). |
| `schema_migration` | Tabla de control: si el script se repite, falla antes de tocar nada. |

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
nuevas sin temporada.
