-- =============================================================================
-- V001 (vuelta atrás): restaura los nombres y tipos originales del esquema anterior.
--
-- Válido justo tras aplicar la migración. Si la aplicación ya escribió datos nuevos,
-- el script rellena season_id desde race_id donde es posible (result, sprint,
-- fantasy_*) pero fallará en championship/constructor/configuration si hay filas
-- nuevas sin season_id. Las imágenes vuelven a las columnas *_legacy (BLOB/URL); lo
-- escrito en las columnas de ruta se descarta.
-- =============================================================================
SET NAMES utf8mb4;

UPDATE result r                JOIN race ra ON ra.id = r.race_id SET r.season_id = ra.season_id WHERE r.season_id IS NULL;
UPDATE sprint r                JOIN race ra ON ra.id = r.race_id SET r.season_id = ra.season_id WHERE r.season_id IS NULL;
UPDATE fantasy_points_driver r JOIN race ra ON ra.id = r.race_id SET r.season_id = ra.season_id WHERE r.season_id IS NULL;
UPDATE fantasy_price_driver r  JOIN race ra ON ra.id = r.race_id SET r.season_id = ra.season_id WHERE r.season_id IS NULL;
UPDATE fantasy_price_team r    JOIN race ra ON ra.id = r.race_id SET r.season_id = ra.season_id WHERE r.season_id IS NULL;
UPDATE fantasy_election r      JOIN race ra ON ra.id = r.race_id SET r.season_id = ra.season_id WHERE r.season_id IS NULL;

ALTER TABLE fantasy_points_driver MODIFY season_id TINYINT(2) NOT NULL;
ALTER TABLE result                MODIFY season_id TINYINT(2) NOT NULL;
ALTER TABLE fantasy_election      MODIFY season_id TINYINT(2) NOT NULL;
ALTER TABLE championship          MODIFY season_id TINYINT(2) NOT NULL;
ALTER TABLE constructor           MODIFY season_id TINYINT(2) NOT NULL;
ALTER TABLE configuration         MODIFY season_id TINYINT(2) NOT NULL;
ALTER TABLE sprint                MODIFY season_id TINYINT(2) NOT NULL;
ALTER TABLE fantasy_price_driver  MODIFY season_id TINYINT(2) NOT NULL;
ALTER TABLE fantasy_price_team    MODIFY season_id TINYINT(2) NOT NULL;

ALTER TABLE fantasy_election CHANGE COLUMN account_id user_id TINYINT(4) NOT NULL;
ALTER TABLE penalty CHANGE COLUMN penalty_severity_id severity_id TINYINT(2) NOT NULL;

ALTER TABLE team DROP COLUMN logo_image, DROP COLUMN car_image;
ALTER TABLE team
  CHANGE COLUMN logo_image_legacy logo_image BLOB NULL,
  CHANGE COLUMN car_image_legacy car_image TEXT NOT NULL;
ALTER TABLE driver DROP COLUMN driver_image;
ALTER TABLE driver CHANGE COLUMN driver_image_legacy driver_image BLOB NULL;

ALTER TABLE race
  MODIFY circuit_id TINYINT(4) NOT NULL,
  DROP COLUMN name, DROP COLUMN flag_image, DROP COLUMN circuit_image;

ALTER TABLE season DROP INDEX seasons_year_un, DROP COLUMN year;

DELETE FROM schema_migration WHERE version = 'V001';
