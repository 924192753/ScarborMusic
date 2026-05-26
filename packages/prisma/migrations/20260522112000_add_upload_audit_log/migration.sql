-- CreateTable
CREATE TABLE `upload_audit_logs` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `file_name` VARCHAR(255) NOT NULL,
    `mime_type` VARCHAR(64) NOT NULL,
    `file_type` VARCHAR(16) NOT NULL,
    `object_key` VARCHAR(512) NULL,
    `status` VARCHAR(16) NOT NULL,
    `reason` VARCHAR(512) NULL,
    `ip` VARCHAR(64) NULL,
    `user_agent` VARCHAR(512) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_upload_audit_user_id`(`user_id`),
    INDEX `idx_upload_audit_status`(`status`),
    INDEX `idx_upload_audit_created_at`(`created_at` DESC),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `upload_audit_logs` ADD CONSTRAINT `upload_audit_logs_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
