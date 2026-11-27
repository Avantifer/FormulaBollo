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
- [ ] Las fuentes (Barlow Condensed y Geist) ya salen de nuestro propio servidor: no hay peticiones a Google Fonts.
      Nada que configurar, pero conviene comprobar que `/media/*.woff2` responde 200 tras publicar. El frontend
      tiene dos dependencias nuevas (`@fontsource/barlow-condensed` y `@fontsource-variable/geist`).
- [ ] **La foto de la portada no está en git** (`/images/` está en `.gitignore`). Copia a mano
      `images/intro/introImage-v4.avif` al servidor, en la misma carpeta `images/intro/`, antes de publicar el
      frontend. El nombre lleva versión (`-v4`) para saltarse la caché del navegador: si cambias la foto, súbela con
      otro nombre y actualiza `home.component.html`, su test y el script de precarga de `index.html`.
      Sin el archivo la portada no se rompe (se queda con fondo liso), pero el navegador pide la imagen y recibe un 404.

## 2b. Cambios de contrato que obligan a desplegar backend y frontend a la vez

- `POST /account/changePassword` ahora recibe `{"password": "..."}` en el **cuerpo** y exige el token del enlace
  del correo (o de sesión) en `Authorization: Bearer`. El usuario afectado es siempre el del token; ya no hay
  parámetros `username`/`password` en la URL.
- Los tokens llevan un propósito (`session` o `recovery`) y una huella de la contraseña: el enlace de recuperación
  solo sirve para `POST /account/changePassword`, caduca a los 30 minutos y es de un solo uso; cambiar la
  contraseña cierra todas las sesiones anteriores.
- Las respuestas ya no incluyen `password`, `email` ni `admin` de las cuentas.
- Los endpoints de guardado (`/results`, `/sprints`, `/races`, `/penalties`, puntos y precios de Fantasy) suben
  la versión de la caché de los clientes al terminar con éxito, y avisan por WebSocket a los navegadores
  conectados. `POST /cache/update` sigue existiendo pero exige rol ADMIN.
- Login y recuperación de contraseña tienen límite de intentos (en memoria, se reinicia con cada arranque): 10
  fallos de login por cuenta+IP y 30 por IP cada 15 min; 3 recuperaciones por correo+IP, 10 por correo en total
  (frena el bombardeo de un buzón desde muchas IPs) y 20 por IP. Superado el límite responden `429` con
  `Retry-After`. Se ajusta con `account.rate-limit.{window,login-account,login-ip,recovery-email,recovery-email-total,recovery-ip}`.
  Usa la IP de `request.getRemoteAddr()`: si hay un proxy inverso delante de Spring, todos los usuarios
  compartirían IP; en ese caso hay que configurar `server.forward-headers-strategy` antes de desplegar.
- `POST /account/register` devuelve `400` si faltan datos o son inválidos (contraseña vacía o de más de 72 bytes,
  correo mal formado) y `409` si el usuario o el correo ya existen (antes `500`).
- Resultados y sprints: un lote vacío, con varias carreras o con pilotos repetidos se rechaza con `400` sin borrar nada.
- Frontend: la configuración de Angular `prod` ahora se llama `production` y es la predeterminada de `npm run build`.
  Si algún script de despliegue usa `--configuration prod`, hay que cambiarlo.
- `GET /fantasy/fantasyElection` ahora exige sesión (`Authorization: Bearer`), recibe solo `raceId` y devuelve
  siempre la elección del usuario del token; `userId` se ignora. Un frontend antiguo sin token recibe 401/403.
- `GET /fantasy/getFantasyPointsRace` devuelve lista vacía mientras la carrera no esté terminada, para no
  publicar las alineaciones de los rivales antes de correr. El ranking de carreras terminadas no cambia.
- `POST /fantasy/saveFantasyElection` valida en el servidor: carrera existente, plazo (hasta 12 h antes de la
  carrera, con `dateStart` tratada como UTC, que es como la guarda el administrador), 3 pilotos y 2 escuderías
  distintos, con precio para esa carrera, y presupuesto de 80.000.000. Si falla responde 400, 403 o 404 con el motivo.
  Revisa que las carreras insertadas a mano tengan `date_start` en UTC: si estuvieran en hora local, el plazo se
  desplazaría 1 o 2 horas.
- Las bonificaciones de pilotos baratos de Fantasy ahora usan la escala real de precios (menos de 10 M y de 10 M a
  20 M). Solo afectan a los puntos que se calculen a partir de ahora: el histórico guardado no se recalcula.
- Los errores de validación (`400`, `403`, `404` con motivo) llegan ahora al cliente como texto plano, para que el
  frontend los muestre. Antes Spring ocultaba el motivo y el usuario veía «Ha ocurrido un error».
- WebSocket `/ws/cache-version`: solo acepta los orígenes `https://formulabollo.es` y `http://localhost:4200`, con un
  máximo de 500 conexiones simultáneas. Si el frontend se sirve desde otro dominio hay que añadirlo en `WebSocketConfig`.
- `spring.jpa.open-in-view` pasa a `false`: la sesión de Hibernate ya no dura toda la petición. Todos los GET de los
  controladores llevan `@Transactional(readOnly = true)`; un endpoint nuevo que lea relaciones LAZY sin esa
  anotación falla con `LazyInitializationException`. Comprobado contra MariaDB real con 180 URLs GET: todas 200 y
  con la misma respuesta que antes.
- `GET /teams/allInfoTeam` hace ahora 7 consultas SELECT con la caché fría, sea cual sea el número de equipos (antes
  76 por temporada y 151 para `season=0`). El JSON es idéntico.
- **Cifras que cambian para el público.** En la vista «todas las temporadas» (`season=0`) de pilotos y equipos, la mejor
  posición pasa a ser la mínima de las positivas (antes salía la peor), la media se pondera por carreras terminadas
  (antes era la de una sola temporada) y las últimas 5 carreras se unen por fecha. En Fantasy, la variación de precio y
  los puntos de una carrera pasada se calculan con las carreras anteriores de su temporada; antes mostraban siempre los
  datos de la última. Comprobado contra MariaDB real con SQL como referencia.
- `POST /fantasy/saveDriverTeamPrices` busca la carrera siguiente por fecha dentro de la temporada, no como `raceId + 1`.
  Tras la última carrera responde 200 «Era la última carrera de la temporada…» (antes 404); 404 solo si la carrera no
  existe. Los precios de la carrera 31 que ya estaban guardados no coinciden con los que se regeneran desde la 30 (ni
  siquiera con el código anterior): vienen de datos editados después de calcularlos. No se ha tocado ningún dato.
- Endpoint nuevo `GET /drivers/teamHistory?driverName=<nombre>`: lista, ordenada por temporada y luego por `id`, de
  pares `{season, team}` con el equipo del piloto en cada registro. La ficha del piloto lo usa en la pestaña «Total»
  para mostrar el recorrido de equipos. Si el frontend nuevo se publica antes que el backend, la ficha sigue
  funcionando pero muestra un solo equipo; por eso conviene desplegar los dos a la vez.
- **Equipo principal de un piloto.** Un piloto puede tener dos registros en la misma temporada (cambio de equipo a
  mitad de temporada: hoy solo Robe en la temporada 3, Kick Sauber y Ferrari). Su equipo principal es el del
  **primer registro** (`id` menor) de esa temporada, y en «Total» el principal de la última temporada. Lo usan
  `GET /results/totalPerDriver` (lista de pilotos y portada) y `GET /drivers/infoDriverByName` (campo `driver`). Antes
  se quedaba con el que devolviera el `HashMap`, sin ningún criterio. Las estadísticas siguen sumando todos los
  registros. No hay cambios de esquema ni de datos.
- Frontend: la web usa ahora el locale `es-ES` (decimales con coma, p. ej. posición media `2,41`) y cada página
  tiene su propio título del navegador (`<página> · FormulaBollo`; la ficha de un piloto, de una escudería y de una
  carrera llevan además su nombre). No afecta al backend.
- CI: `.github/workflows/ci.yml` ejecuta los tests del backend (con H2, sin Docker) y del frontend, y compila el
  frontend, en cada PR. Los tests de repositorio usan H2 y no sustituyen a la prueba con MariaDB real del paso 4.

## 2c. Endurecimiento de producción (auditoría)

Esto es infraestructura: no se arregla con código y lo tienes que hacer tú en el servidor.

- [ ] **Base de datos fuera de Internet.** El perfil de producción se conecta como `root` a una IP pública. Cierra
      el puerto 3306 al exterior (cortafuegos o red privada) y deja entrar solo a la máquina de la aplicación.
      Comprueba desde fuera con `nc -vz <ip-de-la-bd> 3306`: debe fallar.
- [ ] **Usuario de BD con permisos mínimos.** La aplicación no ejecuta DDL (no hay `ddl-auto`), solo datos. Las
      migraciones (`V001`) se siguen aplicando a mano con un usuario administrador.

      ```sql
      CREATE USER 'fb_app'@'<ip-de-la-app>' IDENTIFIED BY '<clave larga y aleatoria>';
      GRANT SELECT, INSERT, UPDATE, DELETE ON f1bollo.* TO 'fb_app'@'<ip-de-la-app>';
      ```

      Cambia también la contraseña de `root`: ha estado accesible desde fuera.
- [ ] **Secretos por variables de entorno**, no en el fichero de perfil. Spring las lee sin tocar código:
      `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD`, `JWT_SECRET`,
      `SPRING_MAIL_PASSWORD`.
- [ ] **Logs en INFO.** Quita `logging.level.org.springframework.web=DEBUG` del perfil de producción: registra el
      detalle de cada petición y los ficheros crecen sin necesidad.
- [ ] **Temporada actual.** Vive en dos sitios: la variable de entorno `SEASON_ACTUAL` del backend (por defecto 3) y
      `environment.seasonActual` del frontend. Al empezar una temporada cambia las dos y despliega el frontend.
- [ ] **Cabeceras de seguridad en el servidor web del frontend.** La sesión es un JWT en `localStorage` y no hay
      CSP. Empieza en modo informe y revisa la consola del navegador antes de hacerla obligatoria:

      ```
      Content-Security-Policy-Report-Only: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data: https://formulabollo.es:8443; connect-src 'self' https://formulabollo.es:8443 wss://formulabollo.es:8443; object-src 'none'; base-uri 'self'; frame-ancestors 'none'
      ```

      `script-src` lleva `'unsafe-inline'` porque `index.html` y la compilación de Angular tienen scripts en línea;
      cuando el informe salga limpio, cámbialo por los hashes `sha256-…` de esos scripts. El token de sesión dura
      30 días (`JwtConfig.JWT_TOKEN_VALIDITY`): acortarlo es decisión tuya.

## 3. Base de datos

- [ ] Para la aplicación.
- [ ] `mariadb <bd> < FormulaBolloApp/db/migration/V001__align_schema_with_code.sql` (no destructiva; si se repite,
      falla antes de tocar nada). Detalle y comprobaciones en `FormulaBolloApp/db/migration/README.md`.
- [ ] **Temporada 3**: el frontend la usa como actual (`environment.seasonActual`) y la base solo tiene la 1 y la 2.
      Sin ella la portada sale vacía y guardar sanciones falla por una clave foránea. Hay un `INSERT` comentado al
      final de V001; el `id` que se cree debe ser el que usa el frontend (3).
- [ ] **V002: claves únicas (auditoría del backend).** Sin ellas un doble envío podía duplicar resultados (hay
      duplicados reales en la copia local) y sumar puntos de más. Con la aplicación parada y copia hecha
      (`mariadb-dump --single-transaction <bd> > antes_V002.sql`):
      1. `mariadb <bd> < FormulaBolloApp/db/migration/V002__find_duplicates.sql` (solo lectura): lista los duplicados
         de `result`, `sprint`, `fantasy_election` y `account.email`.
      2. Si hay en `result`: `V002__dedupe_results.sql` borra los idénticos (mismo guardado insertado dos veces, caso
         de Las Vegas). Los que difieren (en la copia, Escapa en la carrera 11: 1º y 4º) los decide una persona; el
         script los deja y los muestra.
      3. `mariadb <bd> < FormulaBolloApp/db/migration/V002__unique_keys.sql`. Falla si queda algún duplicado.
      Vuelta atrás: `V002__rollback.sql`. Hasta aplicarla, la aplicación nueva funciona igual, pero un doble envío
      simultáneo sigue pudiendo duplicar filas.
- [ ] **Contraseñas y login.** Registro y cambio de contraseña exigen 8 caracteres o más; el login sigue aceptando las
      cortas de cuentas existentes. Además de los límites por cuenta+IP y por IP hay un tope por cuenta desde cualquier
      IP (`account.rate-limit.login-account-total`, 50 fallos cada 15 min): bajo un ataque dirigido la cuenta atacada
      (también la de administrador) queda bloqueada hasta que caduque la ventana.
- [ ] **`jwt.secret` de 32 bytes o más.** La aplicación ya no arranca con un secreto más corto (antes arrancaba y
      cada login daba 500).
- [ ] **Logs.** Se conservan 30 días (antes 5) y los saltos de línea de los mensajes se sustituyen por un espacio.
- [ ] Arranca la aplicación nueva.

## 4. Pruebas de humo (en el entorno de pruebas y otra vez en producción)

Sustituye `$B` por la URL del backend.

| Prueba | Esperado |
|---|---|
| `curl -s -o /dev/null -w "%{http_code}" $B/seasons/all` | 200 |
| `curl -s -o /dev/null -w "%{http_code}" "$B/drivers/allInfoDriver?season=3"` | 200 |
| `curl -s "$B/drivers/teamHistory?driverName=Robe"` | lista de 4 entradas: T1 Ferrari, T2 Alpine, T3 Kick Sauber, T3 Ferrari |
| `curl -s -o /dev/null -w "%{http_code}" "$B/intro/introImage-v4.avif"` | 200 |
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

Pendientes de la auditoría global:

- [ ] **Elección de Fantasy apagada a propósito.** El frontend no la guarda (`electionEnabled = false` en
      `fantasy-team.component.ts`), pero el backend conserva `POST /fantasy/saveFantasyElection` con su
      validación de presupuesto y plazo de 12 h y sus pruebas: cualquier cuenta registrada puede llamarlo. Para
      reactivarla basta cambiar ese indicador; si se decide abandonarla, se elimina el endpoint con sus pruebas.
- [ ] **CI ejecuta las migraciones.** El job `migrations` aplica `V002` y su vuelta atrás sobre un MariaDB real
      con datos de prueba (`FormulaBolloApp/db/migration/test/run_v002.sh`). No sustituye probarlas sobre una copia
      de la base real antes de producción.

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
