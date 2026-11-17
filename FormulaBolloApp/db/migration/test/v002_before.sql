-- Esquema minimo tras V001 y antes de V002, sin claves foraneas.
-- BIGINT/INT corresponden a Long/int de las entidades. V001 fija
-- expresamente fantasy_election.account_id como TINYINT(4) NOT NULL.
SET NAMES utf8mb4 COLLATE utf8mb4_general_ci;

CREATE TABLE account (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(25) NOT NULL,
  password VARCHAR(100) NOT NULL,
  admin INT NOT NULL,
  email VARCHAR(100) NOT NULL,
  UNIQUE KEY account_username_un (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE result (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  race_id BIGINT NULL,
  driver_id BIGINT NULL,
  position_id BIGINT NULL,
  fastlap INT NOT NULL,
  pole INT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE sprint (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  race_id BIGINT NULL,
  driver_id BIGINT NULL,
  position_id BIGINT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE fantasy_election (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  account_id TINYINT(4) NOT NULL,
  race_id BIGINT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE schema_migration (
  version VARCHAR(20) NOT NULL PRIMARY KEY,
  applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO schema_migration (version) VALUES ('V001');

INSERT INTO account (id, username, password, admin, email) VALUES
  (1, 'alice', 'fixture-password', 0, 'Alice@example.test'),
  (2, 'bob', 'fixture-password', 0, 'bob@example.test'),
  (3, 'carol', 'fixture-password', 1, 'CAROL@example.test');

INSERT INTO result (id, race_id, driver_id, position_id, fastlap, pole) VALUES
  -- Par identico: la limpieza conserva 101 y borra SOLO 102.
  -- Los dos NULL ejercitan la comparacion null-safe (<=>) de MariaDB.
  (101, 1, 11, NULL, 0, 0),
  (102, 1, 11, NULL, 0, 0),
  -- Par distinto: ambas filas deben sobrevivir a la limpieza automatica.
  (201, 2, 22, 1, 0, 1),
  (202, 2, 22, 4, 0, 1),
  -- Filas normales; reutilizan carrera o piloto, nunca la pareja.
  (301, 1, 22, 2, 1, 0),
  (302, 2, 11, NULL, 0, 0);

INSERT INTO sprint (id, race_id, driver_id, position_id) VALUES
  (1, 1, 11, NULL),
  (2, 1, 22, 1),
  (3, 2, 11, 2);

INSERT INTO fantasy_election (id, account_id, race_id) VALUES
  (1, 1, 1),
  (2, 1, 2),
  (3, 2, 1);
