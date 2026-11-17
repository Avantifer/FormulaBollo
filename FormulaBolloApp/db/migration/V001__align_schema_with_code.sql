-- =============================================================================
-- V001: alinea el esquema de la base con el código de FormulaBolloApp (Boot 4)
--
-- Origen:  esquema anterior (copia de seguridad backup_20261102050001.sql, MariaDB 10.6)
-- Destino: el que esperan las entidades JPA de src/main/java/formula/bollo/entity
--
-- NO destructiva: lo que el código ya no usa se conserva (tabla circuit, columnas
-- *_legacy, season_id relajado a NULL). Vuelta atrás: V001__rollback.sql.
-- Ejecutar UNA vez, con la aplicación parada y tras hacer copia de seguridad:
--   mariadb-dump --single-transaction <bd> > antes_V001.sql
--   mariadb <bd> < V001__align_schema_with_code.sql
-- Si se repite, falla en el primer INSERT (clave duplicada) sin modificar nada.
-- =============================================================================
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS schema_migration (
  version VARCHAR(20) NOT NULL PRIMARY KEY,
  applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO schema_migration (version) VALUES ('V001');

-- 1) season.year (obligatorio y único en la entidad): año de la primera carrera
ALTER TABLE season ADD COLUMN year INT NULL;
UPDATE season s SET s.year = (SELECT YEAR(MIN(r.date_start)) FROM race r WHERE r.season_id = s.id);
UPDATE season SET year = 2022 + number WHERE year IS NULL;  -- temporadas sin carreras
ALTER TABLE season MODIFY year INT NOT NULL, ADD UNIQUE KEY seasons_year_un (year);

-- 2) race.name / flag_image / circuit_image (antes vivían en la tabla circuit, con imágenes BLOB)
ALTER TABLE race
  ADD COLUMN name VARCHAR(50) NULL,
  ADD COLUMN flag_image VARCHAR(255) NULL,
  ADD COLUMN circuit_image VARCHAR(255) NULL;

CREATE TEMPORARY TABLE tmp_circuit_dir (slug VARCHAR(40) PRIMARY KEY, dir VARCHAR(40) NOT NULL);
INSERT INTO tmp_circuit_dir (slug, dir) VALUES
  ('americas','americas'),
  ('bahrein','bahrein'),
  ('baku','baku'),
  ('barcelona','barcelona'),
  ('francia','francia'),
  ('hungaroring','hungaroring'),
  ('imola','imola'),
  ('jeddah','jeddah'),
  ('lasvegas','lasvegas'),
  ('marinabay','marinabay'),
  ('melbourne','melbourne'),
  ('mexico','mexico'),
  ('miami','miami'),
  ('monaco','monaco'),
  ('montreal','montreal'),
  ('monza','monza'),
  ('portimao','portimao'),
  ('qatar','qatar'),
  ('redbullring','redbullring'),
  ('saopaulo','saopaulo'),
  ('shangai','shangai'),
  ('silverstone','silverstone'),
  ('spafrancorchamps','spafrancorchamps'),
  ('suzuka','suzuka'),
  ('yasmarina','yasmarina'),
  ('zandvoort','zandvoort'),
  ('barein','bahrein');

UPDATE race r
  JOIN circuit c ON c.id = r.circuit_id
  LEFT JOIN tmp_circuit_dir d ON d.slug = LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(c.name,' ',''),'-',''),'é','e'),'á','a'),'í','i'),'ó','o'),'ú','u'),'ñ','n'))
SET r.name = c.name,
    r.flag_image = CONCAT('races/', COALESCE(d.dir, LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(c.name,' ',''),'-',''),'é','e'),'á','a'),'í','i'),'ó','o'),'ú','u'),'ñ','n'))), '/flag.webp'),
    r.circuit_image = CONCAT('races/', COALESCE(d.dir, LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(c.name,' ',''),'-',''),'é','e'),'á','a'),'í','i'),'ó','o'),'ú','u'),'ñ','n'))), '/circuit.avif');

ALTER TABLE race
  MODIFY name VARCHAR(50) NOT NULL,
  MODIFY flag_image VARCHAR(255) NOT NULL,
  MODIFY circuit_image VARCHAR(255) NOT NULL,
  MODIFY circuit_id TINYINT(4) NULL;

-- 3) Columnas renombradas por el código
ALTER TABLE penalty CHANGE COLUMN severity_id penalty_severity_id TINYINT(2) NOT NULL;
ALTER TABLE fantasy_election CHANGE COLUMN user_id account_id TINYINT(4) NOT NULL;

-- 4) season_id ya no lo usan estas entidades (se deduce de la carrera): se relaja a NULL
ALTER TABLE fantasy_points_driver MODIFY season_id TINYINT(2) NULL;
ALTER TABLE result                MODIFY season_id TINYINT(2) NULL;
ALTER TABLE fantasy_election      MODIFY season_id TINYINT(2) NULL;
ALTER TABLE championship          MODIFY season_id TINYINT(2) NULL;
ALTER TABLE constructor           MODIFY season_id TINYINT(2) NULL;
ALTER TABLE configuration         MODIFY season_id TINYINT(2) NULL;
ALTER TABLE sprint                MODIFY season_id TINYINT(2) NULL;
ALTER TABLE fantasy_price_driver  MODIFY season_id TINYINT(2) NULL;
ALTER TABLE fantasy_price_team    MODIFY season_id TINYINT(2) NULL;

-- 5) Imágenes: de BLOB / URL a ruta relativa dentro de la carpeta images/ (ver README)
ALTER TABLE driver
  CHANGE COLUMN driver_image driver_image_legacy BLOB NULL,
  ADD COLUMN driver_image VARCHAR(255) NULL;

CREATE TEMPORARY TABLE tmp_driver_img (season_number TINYINT NOT NULL, folder VARCHAR(60) NOT NULL, PRIMARY KEY (season_number, folder));
INSERT INTO tmp_driver_img (season_number, folder) VALUES
  (1,'AlbertoMD'),
  (1,'AlbertoPJ'),
  (1,'Avantifer'),
  (1,'Bollo'),
  (1,'Bubapu'),
  (1,'Dani_Calde'),
  (1,'El_Jupa'),
  (1,'Escapa'),
  (1,'Farmiid'),
  (1,'Fernando'),
  (1,'Ismallen'),
  (1,'Jesule'),
  (1,'Moraga'),
  (1,'MuchaSalsa'),
  (1,'PepePerez'),
  (1,'Robe'),
  (1,'SmokingWeed'),
  (1,'WenDiego'),
  (2,'AlbertoMD'),
  (2,'AlbertoPJ'),
  (2,'Avantifer'),
  (2,'Bubapu'),
  (2,'Chamann'),
  (2,'Dani_Calde'),
  (2,'Droekt'),
  (2,'Farmiid'),
  (2,'Fernando'),
  (2,'Ismallen'),
  (2,'Jesule'),
  (2,'Juannudi'),
  (2,'LexBon'),
  (2,'Moraga'),
  (2,'MuchaSalsa'),
  (2,'PepePerez'),
  (2,'Robe'),
  (2,'SmokingWeed'),
  (2,'WenDiego'),
  (3,'AlbertoMD'),
  (3,'AlbertoPJ'),
  (3,'Avantifer'),
  (3,'Bubapu'),
  (3,'Dani_Calde'),
  (3,'Escapa'),
  (3,'Fernando'),
  (3,'Ismallen'),
  (3,'Juannudi'),
  (3,'Moraga'),
  (3,'PepePerez'),
  (3,'Quique'),
  (3,'Ricciardo_Leon'),
  (3,'Robe'),
  (3,'Sinergia'),
  (3,'SmokingWeed');

UPDATE driver d
  JOIN season s ON s.id = d.season_id
  LEFT JOIN tmp_driver_img i ON i.season_number = s.number AND i.folder = REPLACE(TRIM(d.name), ' ', '_')
SET d.driver_image = IF(i.folder IS NULL, 'drivers/default/default.webp',
                        CONCAT('drivers/season', s.number, '/', i.folder, '/driver.webp'));
ALTER TABLE driver MODIFY driver_image VARCHAR(255) NOT NULL;

ALTER TABLE team
  CHANGE COLUMN logo_image logo_image_legacy BLOB NULL,
  CHANGE COLUMN car_image  car_image_legacy  TEXT NULL,
  ADD COLUMN logo_image VARCHAR(255) NULL,
  ADD COLUMN car_image  VARCHAR(255) NULL;

CREATE TEMPORARY TABLE tmp_team_img (season_number TINYINT NOT NULL, slug VARCHAR(40) NOT NULL, dir VARCHAR(40) NOT NULL, PRIMARY KEY (season_number, slug));
INSERT INTO tmp_team_img (season_number, slug, dir) VALUES
  (1,'alfaromeo','AlfaRomeo'),
  (1,'alphatauri','AlphaTauri'),
  (1,'alpine','Alpine'),
  (1,'astonmartin','AstonMartin'),
  (1,'ferrari','Ferrari'),
  (1,'haas','Haas'),
  (1,'mclaren','Mclaren'),
  (1,'mercedes','Mercedes'),
  (1,'redbull','RedBull'),
  (1,'williams','Williams'),
  (2,'alfaromeo','AlfaRomeo'),
  (2,'alphatauri','AlphaTauri'),
  (2,'alpine','Alpine'),
  (2,'astonmartin','AstonMartin'),
  (2,'ferrari','Ferrari'),
  (2,'haas','Haas'),
  (2,'mclaren','Mclaren'),
  (2,'mercedes','Mercedes'),
  (2,'redbull','RedBull'),
  (2,'williams','Williams'),
  (3,'alpine','Alpine'),
  (3,'astonmartin','AstonMartin'),
  (3,'ferrari','Ferrari'),
  (3,'haas','Haas'),
  (3,'kicksauber','KickSauber'),
  (3,'mclaren','Mclaren'),
  (3,'mercedes','Mercedes'),
  (3,'rb','RB'),
  (3,'redbull','RedBull'),
  (3,'williams','Williams'),
  (1,'alfaromeoracing','AlfaRomeo'),
  (2,'alfaromeoracing','AlfaRomeo');

UPDATE team t
  JOIN season s ON s.id = t.season_id
  JOIN tmp_team_img i ON i.season_number = s.number AND i.slug = LOWER(REPLACE(t.name, ' ', ''))
SET t.logo_image = CONCAT('teams/season', s.number, '/', i.dir, '/logo/logo.webp'),
    t.car_image  = CONCAT('teams/season', s.number, '/', i.dir, '/car/car.avif');

-- 6) El código espera la fila 'general_cache' (versión de la caché del cliente)
INSERT IGNORE INTO cache (name, version) VALUES ('general_cache', 0);

-- 7) La temporada actual del frontend es la 3 (environment.seasonActual). Si aún no existe,
--    créala cuando empiece (el año debe ser único):
-- INSERT INTO season (name, number, year) VALUES ('Temporada 3', 3, 2025);
