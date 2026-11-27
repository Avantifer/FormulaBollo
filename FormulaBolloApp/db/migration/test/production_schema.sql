-- Estructura de producción (volcado del 18/11/2026): solo definiciones, sin datos.
-- La tabla account no venía en el volcado: se ha reconstruido a partir de las entidades,
-- sin la clave account_email_un (la crea V002). Confírmala con SHOW CREATE TABLE en el servidor.
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE `account` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `username` varchar(25) NOT NULL,
  `password` varchar(100) NOT NULL,
  `admin` int(11) NOT NULL,
  `email` varchar(100) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `admins_un` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `cache` (
  `name` varchar(20) NOT NULL,
  `version` smallint(6) NOT NULL,
  PRIMARY KEY (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `championship` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `driver_id` bigint(20) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FK7nbsu3rgrbpd5fx9nfeadvof0` (`driver_id`),
  CONSTRAINT `FK7nbsu3rgrbpd5fx9nfeadvof0` FOREIGN KEY (`driver_id`) REFERENCES `driver` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `configuration` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `setting` varchar(50) NOT NULL,
  `setting_value` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UKbb1gn1npasj2tvgy8mg3cd9mk` (`setting`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `constructor` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `team_id` bigint(20) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FK1q978i7g3gxvyeuu3jmm0s380` (`team_id`),
  CONSTRAINT `FK1q978i7g3gxvyeuu3jmm0s380` FOREIGN KEY (`team_id`) REFERENCES `team` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `driver` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `number` int(11) NOT NULL,
  `team_id` bigint(20) DEFAULT NULL,
  `driver_image` varchar(255) DEFAULT NULL,
  `season_id` bigint(20) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FKrxdheu63438283d00c0u54e7l` (`season_id`),
  KEY `FKsa4t1yt73oy278g6acli996p7` (`team_id`),
  CONSTRAINT `FKrxdheu63438283d00c0u54e7l` FOREIGN KEY (`season_id`) REFERENCES `season` (`id`),
  CONSTRAINT `FKsa4t1yt73oy278g6acli996p7` FOREIGN KEY (`team_id`) REFERENCES `team` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `fantasy_election` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `account_id` bigint(20) DEFAULT NULL,
  `driver_one_id` bigint(20) DEFAULT NULL,
  `driver_two_id` bigint(20) DEFAULT NULL,
  `driver_three_id` bigint(20) DEFAULT NULL,
  `team_one_id` bigint(20) DEFAULT NULL,
  `team_two_id` bigint(20) DEFAULT NULL,
  `race_id` bigint(20) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FKqa93djtkhu7u37qgb9fx1xuch` (`account_id`),
  KEY `FKhjqfy7r2rqoxf5bal0m77464x` (`driver_one_id`),
  KEY `FKb4kap5ne3g16jdbqu8eqvje6o` (`driver_three_id`),
  KEY `FK2w7i18pqa3lbj12s28y3wu61q` (`driver_two_id`),
  KEY `FK2pwonexk5o0i3j6sccao4r73d` (`race_id`),
  KEY `FKol4kdx9mf4ga29i6l6vd2sbsi` (`team_one_id`),
  KEY `FKlgvxp7xnae5avtpd3papfyt7e` (`team_two_id`),
  CONSTRAINT `FK2pwonexk5o0i3j6sccao4r73d` FOREIGN KEY (`race_id`) REFERENCES `race` (`id`),
  CONSTRAINT `FK2w7i18pqa3lbj12s28y3wu61q` FOREIGN KEY (`driver_two_id`) REFERENCES `driver` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `FKb4kap5ne3g16jdbqu8eqvje6o` FOREIGN KEY (`driver_three_id`) REFERENCES `driver` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `FKhjqfy7r2rqoxf5bal0m77464x` FOREIGN KEY (`driver_one_id`) REFERENCES `driver` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `FKlgvxp7xnae5avtpd3papfyt7e` FOREIGN KEY (`team_two_id`) REFERENCES `team` (`id`),
  CONSTRAINT `FKol4kdx9mf4ga29i6l6vd2sbsi` FOREIGN KEY (`team_one_id`) REFERENCES `team` (`id`),
  CONSTRAINT `FKqa93djtkhu7u37qgb9fx1xuch` FOREIGN KEY (`account_id`) REFERENCES `account` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `fantasy_points_driver` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `driver_id` bigint(20) DEFAULT NULL,
  `race_id` bigint(20) DEFAULT NULL,
  `points` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FKemycneuue25r1ncwue7myqcab` (`driver_id`),
  KEY `FKgay1ralvgnwo3yw64edptk2ik` (`race_id`),
  CONSTRAINT `FKemycneuue25r1ncwue7myqcab` FOREIGN KEY (`driver_id`) REFERENCES `driver` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `FKgay1ralvgnwo3yw64edptk2ik` FOREIGN KEY (`race_id`) REFERENCES `race` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `fantasy_points_team` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `team_id` bigint(20) DEFAULT NULL,
  `race_id` bigint(20) DEFAULT NULL,
  `points` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FKql9lu99kkysyady5ylim6rumv` (`race_id`),
  KEY `FKf9pjaqayscidrtcaxt4sy5uxg` (`team_id`),
  CONSTRAINT `FKf9pjaqayscidrtcaxt4sy5uxg` FOREIGN KEY (`team_id`) REFERENCES `team` (`id`),
  CONSTRAINT `FKql9lu99kkysyady5ylim6rumv` FOREIGN KEY (`race_id`) REFERENCES `race` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `fantasy_price_driver` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `driver_id` bigint(20) DEFAULT NULL,
  `race_id` bigint(20) DEFAULT NULL,
  `price` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FK58q06mhhrt0u0i1lbu5omc2p5` (`driver_id`),
  KEY `FKtk495iux306x3v3bqmx2fv5ie` (`race_id`),
  CONSTRAINT `FK58q06mhhrt0u0i1lbu5omc2p5` FOREIGN KEY (`driver_id`) REFERENCES `driver` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `FKtk495iux306x3v3bqmx2fv5ie` FOREIGN KEY (`race_id`) REFERENCES `race` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `fantasy_price_team` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `team_id` bigint(20) DEFAULT NULL,
  `race_id` bigint(20) DEFAULT NULL,
  `price` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FK57k0f80j9nf1bosott310nwfs` (`race_id`),
  KEY `FKvtv7vi085oakxanhksy9tuow` (`team_id`),
  CONSTRAINT `FK57k0f80j9nf1bosott310nwfs` FOREIGN KEY (`race_id`) REFERENCES `race` (`id`),
  CONSTRAINT `FKvtv7vi085oakxanhksy9tuow` FOREIGN KEY (`team_id`) REFERENCES `team` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `penalty` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `race_id` bigint(20) DEFAULT NULL,
  `driver_id` bigint(20) DEFAULT NULL,
  `reason` varchar(250) NOT NULL,
  `penalty_severity_id` bigint(20) DEFAULT NULL,
  `season_id` bigint(20) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FKsftfkkubqxlc0ldksm59mny59` (`driver_id`),
  KEY `FKfet35c8lafqkb6cyn1eid3fdi` (`penalty_severity_id`),
  KEY `FKroh6y2gkoa6mk0ebylhsk026e` (`race_id`),
  KEY `FK36uwwjq3die6exw3as845179v` (`season_id`),
  CONSTRAINT `FK36uwwjq3die6exw3as845179v` FOREIGN KEY (`season_id`) REFERENCES `season` (`id`),
  CONSTRAINT `FKfet35c8lafqkb6cyn1eid3fdi` FOREIGN KEY (`penalty_severity_id`) REFERENCES `penalty_severity` (`id`),
  CONSTRAINT `FKroh6y2gkoa6mk0ebylhsk026e` FOREIGN KEY (`race_id`) REFERENCES `race` (`id`),
  CONSTRAINT `FKsftfkkubqxlc0ldksm59mny59` FOREIGN KEY (`driver_id`) REFERENCES `driver` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `penalty_severity` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `severity` varchar(5) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `position` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `position_number` int(11) NOT NULL,
  `points` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `race` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `date_start` datetime(6) NOT NULL,
  `flag_image` varchar(255) NOT NULL,
  `circuit_image` varchar(255) NOT NULL,
  `finished` int(11) NOT NULL,
  `season_id` bigint(20) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FK2t8wb07xq96wtiskfbbuoxsv5` (`season_id`),
  CONSTRAINT `FK2t8wb07xq96wtiskfbbuoxsv5` FOREIGN KEY (`season_id`) REFERENCES `season` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `result` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `race_id` bigint(20) DEFAULT NULL,
  `driver_id` bigint(20) DEFAULT NULL,
  `position_id` bigint(20) DEFAULT NULL,
  `fastlap` int(11) NOT NULL,
  `pole` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FKktbu5me8ex0l2pxumiohfgwd8` (`driver_id`),
  KEY `FK1jk7l68693sp3m7dj8t2uvc02` (`position_id`),
  KEY `FKn83ipy47n6n2ajwar43nuytiy` (`race_id`),
  CONSTRAINT `FK1jk7l68693sp3m7dj8t2uvc02` FOREIGN KEY (`position_id`) REFERENCES `position` (`id`),
  CONSTRAINT `FKktbu5me8ex0l2pxumiohfgwd8` FOREIGN KEY (`driver_id`) REFERENCES `driver` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `FKn83ipy47n6n2ajwar43nuytiy` FOREIGN KEY (`race_id`) REFERENCES `race` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `season` (
  `number` int(11) NOT NULL,
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `name` varchar(12) NOT NULL,
  `year` varchar(4) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UKprk7t1ouupc3mgfu6i9oe8x4f` (`number`),
  UNIQUE KEY `UKh8gpicoby9c670n138txw7ft0` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `sprint` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `driver_id` bigint(20) DEFAULT NULL,
  `race_id` bigint(20) DEFAULT NULL,
  `position_id` bigint(20) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FK4w5hnj5qog4ufhdofp1qwoqox` (`driver_id`),
  KEY `FKh9i0v4r926owodbb9h76kxywp` (`position_id`),
  KEY `FKhoc3phudi5ekb44mohcdteekm` (`race_id`),
  CONSTRAINT `FK4w5hnj5qog4ufhdofp1qwoqox` FOREIGN KEY (`driver_id`) REFERENCES `driver` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `FKh9i0v4r926owodbb9h76kxywp` FOREIGN KEY (`position_id`) REFERENCES `sprint_position` (`id`),
  CONSTRAINT `FKhoc3phudi5ekb44mohcdteekm` FOREIGN KEY (`race_id`) REFERENCES `race` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `sprint_position` (
  `points` int(11) NOT NULL,
  `position_number` int(11) NOT NULL,
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `team` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `season_id` bigint(20) DEFAULT NULL,
  `name` varchar(50) NOT NULL,
  `car_image` varchar(255) DEFAULT NULL,
  `logo_image` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FK91i24ep6xjpoxfydqb17eym4h` (`season_id`),
  CONSTRAINT `FK91i24ep6xjpoxfydqb17eym4h` FOREIGN KEY (`season_id`) REFERENCES `season` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

SET FOREIGN_KEY_CHECKS = 1;
