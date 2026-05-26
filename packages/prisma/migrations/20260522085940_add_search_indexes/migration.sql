-- CreateIndex
CREATE INDEX `idx_songs_title` ON `songs`(`title`);

-- CreateIndex
CREATE INDEX `idx_songs_artist_name` ON `songs`(`artist_name`);

-- CreateIndex
CREATE INDEX `idx_songs_album_name` ON `songs`(`album_name`);

-- CreateIndex
CREATE FULLTEXT INDEX `songs_title_artist_name_album_name_idx` ON `songs`(`title`, `artist_name`, `album_name`);
