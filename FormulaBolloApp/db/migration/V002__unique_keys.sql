-- =============================================================================
-- V002: claves únicas de resultados, sprints, elecciones fantasy y emails (MariaDB)
-- NO destructiva. Ejecutar UNA vez con la aplicación parada y copia de seguridad:
--   mariadb-dump --single-transaction <bd> > antes_V002.sql
--   mariadb <bd> < V002__unique_keys.sql
-- Ejecutar antes V002__find_duplicates.sql y resolver TODOS los duplicados.
-- La limpieza V002__dedupe_results.sql es opcional y solo resuelve filas idénticas.
-- Si se repite, falla en el INSERT inicial sin tocar las claves. No usar --force:
-- el cliente debe detenerse ante el primer error.
-- Si quedan duplicados, ALTER falla con ER_DUP_ENTRY. El DDL de MariaDB hace commit
-- implícito: puede haber claves ya creadas. Antes de reintentar, resolver los datos,
-- eliminar SOLO las claves de V002 que llegaron a crearse y ejecutar:
--   DELETE FROM schema_migration WHERE version = 'V002';
-- Después volver a ejecutar este archivo completo. Vuelta atrás: V002__rollback.sql
-- (presupone que se crearon las cuatro claves).
-- =============================================================================
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS schema_migration (
  version VARCHAR(20) NOT NULL PRIMARY KEY,
  applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO schema_migration (version) VALUES ('V002');

ALTER TABLE result ADD UNIQUE KEY result_race_driver_un (race_id, driver_id);
ALTER TABLE sprint ADD UNIQUE KEY sprint_race_driver_un (race_id, driver_id);
ALTER TABLE fantasy_election ADD UNIQUE KEY fantasy_election_account_race_un (account_id, race_id);
ALTER TABLE account ADD UNIQUE KEY account_email_un (email);
