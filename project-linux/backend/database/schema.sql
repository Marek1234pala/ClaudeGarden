-- Run this once to set up the database.
-- mysql -u root -p < database/schema.sql

CREATE DATABASE IF NOT EXISTS `login`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `login`;

CREATE TABLE IF NOT EXISTS `users` (
  `id`         INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  `firstName`  VARCHAR(50)      NOT NULL,
  `lastName`   VARCHAR(50)      NOT NULL,
  `email`      VARCHAR(255)     NOT NULL,
  `password`   VARCHAR(255)     NOT NULL,   -- bcrypt hash
  `created_at` TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
