-- ====================================================================
-- Skema Database: Jadwal Sidang Mediasi Disnaker Kabupaten Tangerang
-- Database Engine: MySQL / MariaDB (XAMPP)
-- ====================================================================

-- 1. Buat database jika belum ada
CREATE DATABASE IF NOT EXISTS `jadwal_mediasi`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `jadwal_mediasi`;

-- 2. Buat tabel jadwal
CREATE TABLE IF NOT EXISTS `jadwal` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `urutan` INT NOT NULL DEFAULT 0,
  `no` VARCHAR(50) DEFAULT '-',
  `noUrut` VARCHAR(50) DEFAULT '-',
  `perusahaan` VARCHAR(255) NOT NULL,
  `pekerja` TEXT NOT NULL,
  `mhi1` VARCHAR(150) DEFAULT '-',
  `mhi2` VARCHAR(150) DEFAULT '-',
  `agenda` VARCHAR(100) DEFAULT 'KLARIFIKASI',
  `tanggal` DATE NOT NULL,
  `jam` VARCHAR(20) NOT NULL,
  `ruangan` VARCHAR(150) DEFAULT '-',
  `ket` VARCHAR(255) DEFAULT '-',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_tanggal` (`tanggal`),
  INDEX `idx_urutan` (`urutan`),
  INDEX `idx_agenda` (`agenda`),
  INDEX `idx_ruangan` (`ruangan`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
