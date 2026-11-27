-- =============================================================================
-- V003: revisión de duplicados de puntos, precios fantasy y carreras (MariaDB)
-- Solo lectura: no modifica datos ni registra una migración.
-- Revisar los ids de cada grupo y resolver TODOS antes de V003__unique_keys.sql.
-- Como las claves UNIQUE, no considera duplicados los pares que contienen NULL.
-- =============================================================================
SELECT race_id, driver_id, COUNT(*) AS cantidad,
       GROUP_CONCAT(id ORDER BY id) AS ids
FROM fantasy_points_driver
WHERE race_id IS NOT NULL AND driver_id IS NOT NULL
GROUP BY race_id, driver_id HAVING COUNT(*) > 1;

SELECT race_id, team_id, COUNT(*) AS cantidad,
       GROUP_CONCAT(id ORDER BY id) AS ids
FROM fantasy_points_team
WHERE race_id IS NOT NULL AND team_id IS NOT NULL
GROUP BY race_id, team_id HAVING COUNT(*) > 1;

SELECT race_id, driver_id, COUNT(*) AS cantidad,
       GROUP_CONCAT(id ORDER BY id) AS ids
FROM fantasy_price_driver
WHERE race_id IS NOT NULL AND driver_id IS NOT NULL
GROUP BY race_id, driver_id HAVING COUNT(*) > 1;

SELECT race_id, team_id, COUNT(*) AS cantidad,
       GROUP_CONCAT(id ORDER BY id) AS ids
FROM fantasy_price_team
WHERE race_id IS NOT NULL AND team_id IS NOT NULL
GROUP BY race_id, team_id HAVING COUNT(*) > 1;

SELECT season_id, name, COUNT(*) AS cantidad,
       GROUP_CONCAT(id ORDER BY id) AS ids
FROM race
WHERE season_id IS NOT NULL AND name IS NOT NULL
GROUP BY season_id, name HAVING COUNT(*) > 1;
