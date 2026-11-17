/*
 * db.js
 * Modul Database MySQL / MariaDB (XAMPP)
 * Jadwal Sidang Mediasi - Dinas Tenaga Kerja Kabupaten Tangerang
 */

const mysql = require("mysql2/promise");

const DB_CONFIG = {
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "jadwal_mediasi",
  dateStrings: true, // Mempertahankan format tanggal YYYY-MM-DD sebagai string
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

let pool = null;

function getPool() {
  if (!pool) {
    pool = mysql.createPool(DB_CONFIG);
  }
  return pool;
}

/**
 * Inisialisasi Database dan Tabel secara otomatis.
 * Menghubungkan ke server MySQL, membuat database jika belum ada,
 * lalu membuat tabel jadwal.
 */
async function initDb() {
  try {
    // 1. Koneksi awal tanpa database spesifik untuk membuat database jika belum ada
    const rootConn = await mysql.createConnection({
      host: DB_CONFIG.host,
      port: DB_CONFIG.port,
      user: DB_CONFIG.user,
      password: DB_CONFIG.password
    });

    await rootConn.query(
      `CREATE DATABASE IF NOT EXISTS \`${DB_CONFIG.database}\`
       CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
    );
    await rootConn.end();

    // 2. Buat tabel jadwal jika belum ada
    const dbPool = getPool();
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS \`jadwal\` (
        \`id\` VARCHAR(64) NOT NULL PRIMARY KEY,
        \`urutan\` INT NOT NULL DEFAULT 0,
        \`no\` VARCHAR(50) DEFAULT '-',
        \`noUrut\` VARCHAR(50) DEFAULT '-',
        \`perusahaan\` VARCHAR(255) NOT NULL,
        \`pekerja\` TEXT NOT NULL,
        \`mhi1\` VARCHAR(150) DEFAULT '-',
        \`mhi2\` VARCHAR(150) DEFAULT '-',
        \`agenda\` VARCHAR(100) DEFAULT 'KLARIFIKASI',
        \`tanggal\` DATE NOT NULL,
        \`jam\` VARCHAR(20) NOT NULL,
        \`ruangan\` VARCHAR(150) DEFAULT '-',
        \`ket\` VARCHAR(255) DEFAULT '-',
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX \`idx_tanggal\` (\`tanggal\`),
        INDEX \`idx_urutan\` (\`urutan\`),
        INDEX \`idx_agenda\` (\`agenda\`),
        INDEX \`idx_ruangan\` (\`ruangan\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Migrasi: tambahkan kolom urutan jika tabel lama belum memilikinya
    try {
      await dbPool.query("ALTER TABLE `jadwal` ADD COLUMN `urutan` INT NOT NULL DEFAULT 0 AFTER `id`");
    } catch (e) { /* abaikan jika sudah ada */ }

    // Migrasi privasi: hapus kolom nomor telepon jika tabel lama masih menyimpannya
    try {
      await dbPool.query("ALTER TABLE `jadwal` DROP COLUMN `telPerusahaan`");
    } catch (e) { /* abaikan jika tidak ada */ }
    try {
      await dbPool.query("ALTER TABLE `jadwal` DROP COLUMN `telPekerja`");
    } catch (e) { /* abaikan jika tidak ada */ }

    return { ok: true, message: "Database dan tabel siap digunakan." };
  } catch (err) {
    let helpMsg = "Gagal menghubungkan ke MySQL.";
    if (err.code === "ECONNREFUSED") {
      helpMsg += " Server MySQL belum berjalan. Buka XAMPP Control Panel dan klik 'Start' pada modul MySQL.";
    } else if (err.code === "ER_ACCESS_DENIED_ERROR") {
      helpMsg += " Akses ditolak. Periksa DB_USER dan DB_PASSWORD di file .env.";
    }
    console.error("[Database Error]:", helpMsg, err.message);
    throw new Error(helpMsg);
  }
}

/**
 * Mengambil semua data jadwal, diurutkan sesuai urutan pada PDF (bukan jam)
 */
async function getAllJadwal() {
  const [rows] = await getPool().query(
    `SELECT \`id\`, \`urutan\`, \`no\`, \`noUrut\`, \`perusahaan\`,
            \`pekerja\`, \`mhi1\`, \`mhi2\`, \`agenda\`,
            \`tanggal\`, \`jam\`, \`ruangan\`, \`ket\`
     FROM \`jadwal\`
     ORDER BY \`tanggal\` ASC, \`urutan\` ASC, \`id\` ASC`
  );
  return rows;
}

/**
 * Mengambil jadwal berdasarkan ID
 */
async function getJadwalById(id) {
  const [rows] = await getPool().query(
    `SELECT \`id\`, \`urutan\`, \`no\`, \`noUrut\`, \`perusahaan\`,
            \`pekerja\`, \`mhi1\`, \`mhi2\`, \`agenda\`,
            \`tanggal\`, \`jam\`, \`ruangan\`, \`ket\`
     FROM \`jadwal\`
     WHERE \`id\` = ? LIMIT 1`,
    [id]
  );
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Menambahkan data jadwal baru
 */
async function createJadwal(item) {
  let urutan = Number(item.urutan);
  if (!Number.isFinite(urutan) || urutan <= 0) {
    const [[row]] = await getPool().query(
      "SELECT COALESCE(MAX(`urutan`), 0) + 1 AS nextUrutan FROM `jadwal` WHERE `tanggal` = ?",
      [item.tanggal]
    );
    urutan = (row && row.nextUrutan) || 1;
  }
  await getPool().query(
    `INSERT INTO \`jadwal\`
      (\`id\`, \`urutan\`, \`no\`, \`noUrut\`, \`perusahaan\`,
       \`pekerja\`, \`mhi1\`, \`mhi2\`, \`agenda\`,
       \`tanggal\`, \`jam\`, \`ruangan\`, \`ket\`)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      item.id,
      urutan,
      item.no || "-",
      item.noUrut || "-",
      item.perusahaan,
      item.pekerja || "-",
      item.mhi1 || "-",
      item.mhi2 || "-",
      item.agenda || "KLARIFIKASI",
      item.tanggal,
      item.jam,
      item.ruangan || "-",
      item.ket || "-"
    ]
  );
  return { ...item, urutan };
}

/**
 * Memperbarui data jadwal
 */
async function updateJadwal(id, item) {
  const [res] = await getPool().query(
    `UPDATE \`jadwal\` SET
       \`urutan\` = ?,
       \`no\` = ?,
       \`noUrut\` = ?,
       \`perusahaan\` = ?,
       \`pekerja\` = ?,
       \`mhi1\` = ?,
       \`mhi2\` = ?,
       \`agenda\` = ?,
       \`tanggal\` = ?,
       \`jam\` = ?,
       \`ruangan\` = ?,
       \`ket\` = ?
     WHERE \`id\` = ?`,
    [
      Number(item.urutan) || 0,
      item.no || "-",
      item.noUrut || "-",
      item.perusahaan,
      item.pekerja || "-",
      item.mhi1 || "-",
      item.mhi2 || "-",
      item.agenda || "KLARIFIKASI",
      item.tanggal,
      item.jam,
      item.ruangan || "-",
      item.ket || "-",
      id
    ]
  );
  if (res.affectedRows === 0) return null;
  return { id, ...item };
}

/**
 * Menghapus data jadwal berdasarkan ID
 */
async function deleteJadwal(id) {
  const [res] = await getPool().query("DELETE FROM `jadwal` WHERE `id` = ?", [id]);
  return res.affectedRows > 0;
}

/**
 * Mereset/mengosongkan tabel jadwal atau mengisi ulang data seed jika diberikan
 */
async function resetJadwal(items) {
  const p = getPool();
  await p.query("TRUNCATE TABLE `jadwal`");

  if (Array.isArray(items) && items.length > 0) {
    const values = items.map((item, idx) => [
      item.id,
      Number(item.urutan) || (idx + 1),
      item.no || "-",
      item.noUrut || "-",
      item.perusahaan,
      item.pekerja || "-",
      item.mhi1 || "-",
      item.mhi2 || "-",
      item.agenda || "KLARIFIKASI",
      item.tanggal,
      item.jam,
      item.ruangan || "-",
      item.ket || "-"
    ]);

    await p.query(
      `INSERT INTO \`jadwal\`
        (\`id\`, \`urutan\`, \`no\`, \`noUrut\`, \`perusahaan\`,
         \`pekerja\`, \`mhi1\`, \`mhi2\`, \`agenda\`,
         \`tanggal\`, \`jam\`, \`ruangan\`, \`ket\`)
       VALUES ?`,
      [values]
    );
  }
}

module.exports = {
  DB_CONFIG,
  getPool,
  initDb,
  getAllJadwal,
  getJadwalById,
  createJadwal,
  updateJadwal,
  deleteJadwal,
  resetJadwal
};
