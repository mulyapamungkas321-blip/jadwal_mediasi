/*
 * init-db.js
 * Skrip inisialisasi database MySQL untuk Jadwal Mediasi
 * Jalankan: node init-db.js (atau: node init-db.js --seed jika ingin mengisi contoh data)
 */

const path = require("path");
const fs = require("fs");

// Muat .env
try {
  if (typeof process.loadEnvFile === "function") {
    process.loadEnvFile(path.join(__dirname, ".env"));
  } else {
    const envPath = path.join(__dirname, ".env");
    if (fs.existsSync(envPath)) {
      fs.readFileSync(envPath, "utf8").split(/\r?\n/).forEach((line) => {
        const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
        if (m && process.env[m[1]] === undefined) {
          process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
        }
      });
    }
  }
} catch (e) {
  // Abaikan
}

const db = require("./db.js");

async function run() {
  console.log("=========================================================");
  console.log("  Inisialisasi Database MySQL (XAMPP)");
  console.log("=========================================================");
  console.log(`  Host     : ${db.DB_CONFIG.host}:${db.DB_CONFIG.port}`);
  console.log(`  User     : ${db.DB_CONFIG.user}`);
  console.log(`  Database : ${db.DB_CONFIG.database}`);
  console.log("---------------------------------------------------------");

  try {
    console.log("Memeriksa koneksi & menyiapkan database...");
    await db.initDb();
    console.log("✓ Database 'jadwal_mediasi' dan tabel 'jadwal' berhasil disiapkan!");

    const shouldSeed = process.argv.includes("--seed");
    if (shouldSeed) {
      const seedData = require("./seed-data.js");
      console.log(`Mengisi data awal (${seedData.length} baris)...`);
      await db.resetJadwal(seedData);
      console.log("✓ Data contoh berhasil dimasukkan.");
    } else {
      console.log("✓ Database kosong siap digunakan (tanpa data lama).");
      console.log("  (Tip: Jalankan 'node init-db.js --seed' jika sewaktu-waktu ingin memasukkan data contoh)");
    }

    console.log("=========================================================");
    console.log("Setup database selesai!");
    process.exit(0);
  } catch (err) {
    console.error("\n[!] Terjadi kesalahan:");
    console.error(err.message);
    console.log("\nPetunjuk:");
    console.log("1. Pastikan aplikasi XAMPP Control Panel sudah dibuka.");
    console.log("2. Klik tombol 'Start' pada modul MySQL.");
    console.log("3. Pastikan port 3306 tidak terblokir.");
    console.log("4. Jalankan kembali: node init-db.js\n");
    process.exit(1);
  }
}

run();
