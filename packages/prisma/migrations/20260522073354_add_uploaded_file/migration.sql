-- CreateTable
CREATE TABLE `uploaded_files` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `file_name` VARCHAR(255) NOT NULL,
    `object_key` VARCHAR(512) NOT NULL,
    `url` VARCHAR(512) NOT NULL,
    `mime_type` VARCHAR(64) NOT NULL,
    `size` BIGINT NOT NULL,
    `file_type` VARCHAR(16) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `uploaded_files_object_key_key`(`object_key`),
    INDEX `idx_uploaded_files_user_id`(`user_id`),
    INDEX `idx_uploaded_files_file_type`(`file_type`),
    INDEX `idx_uploaded_files_created_at`(`created_at` DESC),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `uploaded_files` ADD CONSTRAINT `uploaded_files_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
