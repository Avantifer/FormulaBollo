-- =============================================================================
-- V002: vuelta atrás de las cuatro claves únicas (MariaDB)
-- Ejecutar con la aplicación parada tras una V002 completada. Conserva los datos;
-- NO recupera las filas borradas por la limpieza opcional (usar la copia previa).
-- Si V002 falló a medias, eliminar solo las claves que llegaron a crearse.
-- =============================================================================
SET NAMES utf8mb4;

ALTER TABLE result DROP INDEX result_race_driver_un;
ALTER TABLE sprint DROP INDEX sprint_race_driver_un;
ALTER TABLE fantasy_election DROP INDEX fantasy_election_account_race_un;
ALTER TABLE account DROP INDEX account_email_un;
DELETE FROM schema_migration WHERE version = 'V002';
