# Despliegue de la migración (Spring Boot 4 + Angular 21)

Lista de comprobación para pasar la rama `migration/boot4-angular21` a producción. Hazla primero en un
entorno de pruebas con un **volcado reciente** de producción y repite los pasos 3 a 5 en producción.

## 1. Antes de tocar nada

- [ ] Copia de seguridad de producción: `mariadb-dump --single-transaction <bd> > antes_migracion.sql`.
- [ ] Guarda también la carpeta `images/` y el `.jar`/versión que está en marcha, por si hay que volver atrás.
- [ ] Confirma que el esquema de producción es el anterior al código (el que describe `FormulaBolloApp/db/migration/README.md`).

## 2. Configuración del servidor

El backend no trae secretos en el repositorio; deben llegar por ficheros de perfil o variables de entorno.

- [ ] `jwt.secret`: cadena larga y aleatoria, **distinta** de la anterior (así se invalidan las sesiones y los
      enlaces de recuperación emitidos antes de las correcciones de seguridad).
- [ ] Credenciales de la base y del SMTP (`spring.mail.*`). Si la contraseña SMTP se ha compartido o pegado en
      algún sitio, cámbiala en el proveedor.
- [ ] `frontend.url`: dirección pública del frontend (por defecto `https://formulabollo.es/`). Es la base del
      enlace del correo de recuperación; en desarrollo pon `http://localhost:4200/`.
- [ ] `SWAGGER_ENABLED`: déjalo sin definir (Swagger cerrado). Solo `true` en un entorno de pruebas.
- [ ] Certificado (`.p12`) fuera del repositorio. Si el que estuvo versionado llegó a usarse, rótalo.
- [ ] Carpeta `images/` donde apunte `spring.web.resources.static-locations`: la base guarda rutas relativas.

## 3. Base de datos

- [ ] Para la aplicación.
- [ ] `mariadb <bd> < FormulaBolloApp/db/migration/V001__align_schema_with_code.sql` (no destructiva; si se repite,
      falla antes de tocar nada). Detalle y comprobaciones en `FormulaBolloApp/db/migration/README.md`.
- [ ] **Temporada 3**: el frontend la usa como actual (`environment.seasonActual`) y la base solo tiene la 1 y la 2.
      Sin ella la portada sale vacía y guardar sanciones falla por una clave foránea. Hay un `INSERT` comentado al
      final de V001; el `id` que se cree debe ser el que usa el frontend (3).
- [ ] Arranca la aplicación nueva.

## 4. Pruebas de humo (en el entorno de pruebas y otra vez en producción)

Sustituye `$B` por la URL del backend.

| Prueba | Esperado |
|---|---|
| `curl -s -o /dev/null -w "%{http_code}" $B/seasons/all` | 200 |
| `curl -s -o /dev/null -w "%{http_code}" "$B/drivers/allInfoDriver?season=3"` | 200 |
| `curl -s -o /dev/null -w "%{http_code}" -X DELETE "$B/results/delete?raceId=1"` | **403** (sin token) |
| `curl -s -o /dev/null -w "%{http_code}" -X POST "$B/cache/update"` | **403** |
| `curl -s -o /dev/null -w "%{http_code}" "$B/account/id?id=1"` | **403** |
| `curl -s -o /dev/null -w "%{http_code}" -X POST "$B/account/changePassword?username=x&password=y"` | **403** |
| Login con una clave equivocada | **401** |

Desde la web: iniciar sesión como administrador, guardar unos resultados y una sanción, recuperar una contraseña
(el correo debe llegar y el enlace caducar a los 30 minutos).

## 5. Revisión tras el incidente de seguridad

Antes de las correcciones de este commit cualquiera podía registrarse como administrador, sobrescribir una
cuenta indicando su `id`, cambiar contraseñas sin token y borrar resultados o sprints sin sesión. Revisa en
producción si se abusó:

```sql
-- Administradores: ¿los reconoces todos?
SELECT id, username, email, admin FROM account WHERE admin = 1;

-- Cuentas más recientes (posibles altas sospechosas)
SELECT id, username, email, admin FROM account ORDER BY id DESC LIMIT 20;

-- Carreras terminadas sin resultados (posible borrado)
SELECT r.id, r.name FROM race r LEFT JOIN result x ON x.race_id = r.id
WHERE r.finished = 1 GROUP BY r.id, r.name HAVING COUNT(x.id) = 0;
```

Compáralo con la copia de seguridad del paso 1. Si algo no cuadra, restablece las contraseñas afectadas.

## 6. Vuelta atrás

- Aplicación: vuelve al `.jar` y a la configuración anteriores.
- Base de datos: `mariadb <bd> < FormulaBolloApp/db/migration/V001__rollback.sql` (válido justo tras migrar; ver el
  README de migración para sus límites) o restaura `antes_migracion.sql`.

## 7. Limpieza (cuando todo esté validado)

- [ ] Borra el bundle de seguridad `FormulaBollo-pre-purge.bundle` (contiene el `.p12` antiguo).
- [ ] Pide a GitHub Support que purgue las referencias en caché de la PR nº 1 (`refs/pull/1/head`) y avisa a quien
      tenga el repositorio clonado de que vuelva a clonarlo.
- [ ] Cuando la migración esté validada se pueden eliminar a mano `circuit`, las columnas `*_legacy` y los
      `season_id` sobrantes (ver el README de migración).
