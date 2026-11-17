-- =============================================================================
-- V002: limpieza OPCIONAL de resultados idénticos (MariaDB)
-- DESTRUCTIVA: ejecutar solo tras revisar el SELECT previo, con la aplicación parada
-- y después de hacer copia de seguridad:
--   mariadb-dump --single-transaction <bd> > antes_V002.sql
-- Conserva el menor id; elimina los mayores solo si TODO el grupo coincide en
-- position_id, fastlap y pole (comparación que también admite NULL).
-- No toca grupos con diferencias: requieren decisión humana (p. ej. Escapa,
-- carrera 11, posiciones 1 y 4). No registra V002 en schema_migration.
-- La recuperación de filas eliminadas requiere restaurar la copia de seguridad.
-- =============================================================================
SET NAMES utf8mb4;

-- Vista previa exacta de las filas que se van a borrar.
SELECT DISTINCT duplicado.*
FROM result duplicado
JOIN result original ON original.race_id = duplicado.race_id
                    AND original.driver_id = duplicado.driver_id
                    AND original.id < duplicado.id
LEFT JOIN result distinto ON distinto.race_id = duplicado.race_id
                         AND distinto.driver_id = duplicado.driver_id
                         AND (NOT (distinto.position_id <=> duplicado.position_id)
                           OR NOT (distinto.fastlap <=> duplicado.fastlap)
                           OR NOT (distinto.pole <=> duplicado.pole))
WHERE distinto.id IS NULL
ORDER BY duplicado.id;

DELETE duplicado
FROM result duplicado
JOIN result original ON original.race_id = duplicado.race_id
                    AND original.driver_id = duplicado.driver_id
                    AND original.id < duplicado.id
LEFT JOIN result distinto ON distinto.race_id = duplicado.race_id
                         AND distinto.driver_id = duplicado.driver_id
                         AND (NOT (distinto.position_id <=> duplicado.position_id)
                           OR NOT (distinto.fastlap <=> duplicado.fastlap)
                           OR NOT (distinto.pole <=> duplicado.pole))
WHERE distinto.id IS NULL;

-- Duplicados pendientes: revisar todas sus filas antes de decidir qué conservar.
SELECT race_id, driver_id, COUNT(*) AS cantidad,
       GROUP_CONCAT(id ORDER BY id) AS ids
FROM result
GROUP BY race_id, driver_id HAVING COUNT(*) > 1;
