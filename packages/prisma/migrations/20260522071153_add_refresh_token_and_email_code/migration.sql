-- AlterTable
ALTER TABLE `users` ADD COLUMN `refresh_token` VARCHAR(512) NULL,
    ADD COLUMN `refresh_token_expires_at` DATETIME(3) NULL;

-- CreateTable
CREATE TABLE `email_verification_codes` (
    `id` CHAR(36) NOT NULL,
    `email` VARCHAR(128) NOT NULL,
    `code` VARCHAR(6) NOT NULL,
    `type` VARCHAR(32) NOT NULL DEFAULT 'register',
    `expires_at` DATETIME(3) NOT NULL,
    `used` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_email_codes_email`(`email`),
    INDEX `idx_email_codes_expires_at`(`expires_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
