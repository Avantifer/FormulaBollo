-- =============================================================================
-- V003: claves únicas de puntos, precios fantasy y nombres de carrera (MariaDB 10.6)
-- NO destructiva. Ejecutar UNA vez, después de V002, con la aplicación parada:
--   mariadb-dump --single-transaction <bd> > antes_V003.sql
--   mariadb <bd> < V003__unique_keys.sql
-- Ejecutar antes V003__find_duplicates.sql y resolver TODOS los duplicados a mano.
-- No usar --force: el cliente debe detenerse ante el primer error.
-- La tabla TEMPORARY comprueba las cinco claves antes de registrar V003 o hacer DDL
-- persistente: si quedan duplicados, falla con 1062 sin cambiar datos ni índices.
-- Requiere CREATE TEMPORARY TABLES. Si se repite, falla en el INSERT de la versión
-- antes de tocar las claves. No volver a arrancar el backend anterior: sus guardados
-- fantasy insertan antes de ejecutar los borrados. Instalar el backend corregido
-- antes de reabrir escrituras (Hibernate ddl-auto=update también puede crear claves).
-- El DDL de MariaDB hace commit implícito: otro fallo puede dejar claves parciales.
-- En ese caso resolver la causa, quitar SOLO las claves V003 creadas (conservar los
-- índices de las FK como en V003__rollback.sql), borrar la marca V003 y reintentar.
-- Vuelta atrás: V003__rollback.sql, solo tras una V003 completada y con la app parada.
-- V001 NO se ejecuta sobre el esquema actual de producción.
-- =============================================================================
SET NAMES utf8mb4;

CREATE TEMPORARY TABLE v003_duplicate_guard (id INT NOT NULL PRIMARY KEY);
INSERT INTO v003_duplicate_guard (id) VALUES (1);
-- Insertar otro 1 solo si hay algún grupo que impediría crear una clave UNIQUE.
INSERT INTO v003_duplicate_guard (id)
SELECT 1 FROM (
    SELECT 1 FROM fantasy_points_driver
    WHERE race_id IS NOT NULL AND driver_id IS NOT NULL
    GROUP BY race_id, driver_id HAVING COUNT(*) > 1
    UNION ALL
    SELECT 1 FROM fantasy_points_team
    WHERE race_id IS NOT NULL AND team_id IS NOT NULL
    GROUP BY race_id, team_id HAVING COUNT(*) > 1
    UNION ALL
    SELECT 1 FROM fantasy_price_driver
    WHERE race_id IS NOT NULL AND driver_id IS NOT NULL
    GROUP BY race_id, driver_id HAVING COUNT(*) > 1
    UNION ALL
    SELECT 1 FROM fantasy_price_team
    WHERE race_id IS NOT NULL AND team_id IS NOT NULL
    GROUP BY race_id, team_id HAVING COUNT(*) > 1
    UNION ALL
    SELECT 1 FROM race
    WHERE season_id IS NOT NULL AND name IS NOT NULL
    GROUP BY season_id, name HAVING COUNT(*) > 1
) AS duplicates LIMIT 1;
DROP TEMPORARY TABLE v003_duplicate_guard;

CREATE TABLE IF NOT EXISTS schema_migration (
  version VARCHAR(20) NOT NULL PRIMARY KEY,
  applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO schema_migration (version) VALUES ('V003');

ALTER TABLE fantasy_points_driver ADD UNIQUE KEY fantasy_points_driver_race_driver_un (race_id, driver_id);
ALTER TABLE fantasy_points_team ADD UNIQUE KEY fantasy_points_team_race_team_un (race_id, team_id);
ALTER TABLE fantasy_price_driver ADD UNIQUE KEY fantasy_price_driver_race_driver_un (race_id, driver_id);
ALTER TABLE fantasy_price_team ADD UNIQUE KEY fantasy_price_team_race_team_un (race_id, team_id);
ALTER TABLE race ADD UNIQUE KEY race_season_name_un (season_id, name);
