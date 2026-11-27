-- =============================================================================
-- V003: vuelta atrás de las cinco claves únicas (MariaDB 10.6)
-- Ejecutar con la aplicación parada tras una V003 completada. Conserva los datos
-- y V002. Si V003 falló a medias, quitar solo las claves que llegaron a crearse.
-- InnoDB puede usar la nueva clave para la FK y retirar su índice implícito.
-- Reponer/conservar el índice original de production_schema.sql en el MISMO ALTER
-- permite quitar la clave única sin error 1553 y sin desactivar FOREIGN_KEY_CHECKS.
-- Si el esquema tiene otros nombres para esos índices, adaptarlos tras consultar
-- SHOW CREATE TABLE; no ejecutar a ciegas sobre una estructura distinta.
-- =============================================================================
SET NAMES utf8mb4;

ALTER TABLE fantasy_points_driver
    ADD INDEX IF NOT EXISTS FKgay1ralvgnwo3yw64edptk2ik (race_id),
    DROP INDEX fantasy_points_driver_race_driver_un;
ALTER TABLE fantasy_points_team
    ADD INDEX IF NOT EXISTS FKql9lu99kkysyady5ylim6rumv (race_id),
    DROP INDEX fantasy_points_team_race_team_un;
ALTER TABLE fantasy_price_driver
    ADD INDEX IF NOT EXISTS FKtk495iux306x3v3bqmx2fv5ie (race_id),
    DROP INDEX fantasy_price_driver_race_driver_un;
ALTER TABLE fantasy_price_team
    ADD INDEX IF NOT EXISTS FK57k0f80j9nf1bosott310nwfs (race_id),
    DROP INDEX fantasy_price_team_race_team_un;
ALTER TABLE race
    ADD INDEX IF NOT EXISTS FK2t8wb07xq96wtiskfbbuoxsv5 (season_id),
    DROP INDEX race_season_name_un;
DELETE FROM schema_migration WHERE version = 'V003';
