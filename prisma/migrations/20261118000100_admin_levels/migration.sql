-- Convert the legacy admin flag to explicit admin levels.
-- Existing admins become ADMIN_OPERASIONAL before the configured first super admin is promoted.
ALTER TABLE `User` ADD COLUMN `adminLevel` ENUM('SUPER_ADMIN', 'ADMIN_PENILAIAN', 'ADMIN_OPERASIONAL') NULL;
UPDATE `User` SET `adminLevel` = 'ADMIN_OPERASIONAL' WHERE `isAdmin` = true;
ALTER TABLE `User` DROP COLUMN `isAdmin`;
