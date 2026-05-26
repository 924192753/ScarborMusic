-- =============================================================================
-- ScarborMusic MySQL Initialization Script
-- Runs once on first container start (docker-entrypoint-initdb.d)
-- =============================================================================

-- Ensure proper charset on the app database
-- (MySQL Docker image creates MYSQL_DATABASE automatically;
--  we just ensure the charset settings are correct)
ALTER DATABASE `scarbormusic`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- Set session variables for proper charset handling
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- =============================================================================
-- Session defaults
-- =============================================================================
SET SESSION sql_mode = 'STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';
