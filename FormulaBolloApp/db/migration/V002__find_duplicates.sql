-- =============================================================================
-- V002: revisión de duplicados antes de crear las claves únicas (MariaDB)
-- Solo lectura: no modifica datos ni registra una migración.
-- Revisar los ids de cada grupo; no ejecutar V002__unique_keys.sql hasta resolverlos.
-- =============================================================================
SELECT race_id, driver_id, COUNT(*) AS cantidad,
       GROUP_CONCAT(id ORDER BY id) AS ids
FROM result
GROUP BY race_id, driver_id HAVING COUNT(*) > 1;

SELECT race_id, driver_id, COUNT(*) AS cantidad,
       GROUP_CONCAT(id ORDER BY id) AS ids
FROM sprint
GROUP BY race_id, driver_id HAVING COUNT(*) > 1;

SELECT account_id, race_id, COUNT(*) AS cantidad,
       GROUP_CONCAT(id ORDER BY id) AS ids
FROM fantasy_election
GROUP BY account_id, race_id HAVING COUNT(*) > 1;

SELECT LOWER(email) AS email_normalizado, COUNT(*) AS cantidad,
       GROUP_CONCAT(id ORDER BY id) AS ids
FROM account
GROUP BY LOWER(email) HAVING COUNT(*) > 1;
