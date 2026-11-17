/*
 * server.js
 * Server Jadwal Sidang Mediasi - Dinas Tenaga Kerja Kabupaten Tangerang
 *
 * - Menyajikan halaman publik (public/) secara statis.
 * - Halaman admin dilindungi di sisi server (harus login).
 * - Login diverifikasi di server (password di-hash dengan scrypt).
 * - Data jadwal disimpan di Database MySQL / MariaDB (XAMPP).
 */

const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { exec } = require("child_process");
const express = require("express");
const session = require("express-session");

/* --------------------------- Muat konfigurasi --------------------------- */
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
  console.warn("Peringatan: gagal memuat .env ->", e.message);
}

const db = require("./db.js");
const seedData = require("./seed-data.js");

const PORT = Number(process.env.PORT) || 3000;
const ADMIN_USER = process.env.ADMIN_USER || "disnaker";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "disnaker123";
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex");

/* ------------------------ Hashing password (scrypt) --------------------- */
const passwordSalt = crypto.randomBytes(16);
const passwordHash = crypto.scryptSync(ADMIN_PASSWORD, passwordSalt, 64);

function verifyPassword(candidate) {
  try {
    const candHash = crypto.scryptSync(String(candidate), passwordSalt, 64);
    return crypto.timingSafeEqual(candHash, passwordHash);
  } catch (e) {
    return false;
  }
}

function safeEqualStr(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

/* ------------------------------ Normalisasi ----------------------------- */
function str(v, fallback) {
  if (v === undefined || v === null) return fallback === undefined ? "-" : fallback;
  const s = String(v).trim();
  return s === "" ? (fallback === undefined ? "-" : fallback) : s;
}

function normalizeJadwal(body) {
  body = body || {};
  const urutanNum = Number(body.urutan);
  return {
    urutan: Number.isFinite(urutanNum) ? urutanNum : 0,
    no: str(body.no),
    noUrut: str(body.noUrut),
    perusahaan: str(body.perusahaan, ""),
    pekerja: str(body.pekerja),
    mhi1: str(body.mhi1),
    mhi2: str(body.mhi2),
    agenda: str(body.agenda, "KLARIFIKASI"),
    tanggal: str(body.tanggal, ""),
    jam: str(body.jam, ""),
    ruangan: str(body.ruangan),
    ket: str(body.ket)
  };
}

/* --------------------------------- App ---------------------------------- */
const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "256kb" }));
app.use(
  session({
    name: "disnaker.sid",
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: false
      /* tanpa maxAge -> cookie sesi, hilang saat browser ditutup */
    }
  })
);

function requireAuthApi(req, res, next) {
  if (req.session && req.session.user) return next();
  return res.status(401).json({ error: "Tidak terautentikasi. Silakan login." });
}

/* ------------------------------ API: auth ------------------------------- */
app.post("/api/login", (req, res) => {
  const body = req.body || {};
  const username = body.username;
  const password = body.password;
  if (typeof username !== "string" || typeof password !== "string") {
    return res.status(400).json({ error: "Username dan password wajib diisi." });
  }
  const userOk = safeEqualStr(username, ADMIN_USER);
  const passOk = verifyPassword(password);
  if (userOk && passOk) {
    req.session.user = ADMIN_USER;
    return res.json({ ok: true, user: ADMIN_USER });
  }
  return res.status(401).json({ error: "Username atau password salah." });
});

app.post("/api/logout", (req, res) => {
  if (!req.session) return res.json({ ok: true });
  req.session.destroy(() => {
    res.clearCookie("disnaker.sid");
    res.json({ ok: true });
  });
});

app.get("/api/session", (req, res) => {
  const user = (req.session && req.session.user) || null;
  res.json({ loggedIn: !!user, user });
});

/* ----------------------------- API: jadwal ------------------------------ */
app.get("/api/jadwal", async (req, res) => {
  try {
    const list = await db.getAllJadwal();
    res.json(list);
  } catch (err) {
    console.error("Gagal mengambil jadwal:", err.message);
    res.status(500).json({
      error: "Gagal mengambil data jadwal dari database. Pastikan MySQL di XAMPP sudah dijalankan (Start)."
    });
  }
});

app.post("/api/jadwal", requireAuthApi, async (req, res) => {
  try {
    const item = normalizeJadwal(req.body);
    if (!item.perusahaan || !item.tanggal || !item.jam) {
      return res.status(400).json({ error: "Perusahaan, tanggal, dan jam wajib diisi." });
    }
    item.id = crypto.randomUUID();
    await db.createJadwal(item);
    res.status(201).json(item);
  } catch (err) {
    console.error("Gagal menambah jadwal:", err.message);
    res.status(500).json({ error: "Gagal menyimpan jadwal ke database: " + err.message });
  }
});

app.put("/api/jadwal/:id", requireAuthApi, async (req, res) => {
  try {
    const existing = await db.getJadwalById(req.params.id);
    if (!existing) return res.status(404).json({ error: "Jadwal tidak ditemukan." });

    const item = normalizeJadwal(req.body);
    if (!item.perusahaan || !item.tanggal || !item.jam) {
      return res.status(400).json({ error: "Perusahaan, tanggal, dan jam wajib diisi." });
    }
    const updated = await db.updateJadwal(req.params.id, item);
    res.json(updated);
  } catch (err) {
    console.error("Gagal mengubah jadwal:", err.message);
    res.status(500).json({ error: "Gagal memperbarui jadwal di database: " + err.message });
  }
});

app.delete("/api/jadwal/:id", requireAuthApi, async (req, res) => {
  try {
    const ok = await db.deleteJadwal(req.params.id);
    if (!ok) return res.status(404).json({ error: "Jadwal tidak ditemukan." });
    res.json({ ok: true, id: req.params.id });
  } catch (err) {
    console.error("Gagal menghapus jadwal:", err.message);
    res.status(500).json({ error: "Gagal menghapus jadwal dari database: " + err.message });
  }
});

app.post("/api/reset", requireAuthApi, async (req, res) => {
  try {
    await db.resetJadwal(seedData);
    res.json({ ok: true, count: seedData.length });
  } catch (err) {
    console.error("Gagal mereset database:", err.message);
    res.status(500).json({ error: "Gagal mereset database: " + err.message });
  }
});

/* --------------------------- File statis publik ------------------------- */
app.use(express.static(path.join(__dirname, "public"), { index: "index.html" }));

/* ------------------------------- 404 & error ---------------------------- */
app.use((req, res) => {
  if (req.path.indexOf("/api/") === 0) {
    return res.status(404).json({ error: "Endpoint tidak ditemukan." });
  }
  res.status(404).sendFile(path.join(__dirname, "public", "index.html"));
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Terjadi kesalahan pada server." });
});

/* -------------------------------- Start --------------------------------- */
function openBrowser(url) {
  let cmd;
  if (process.platform === "win32") cmd = 'start "" "' + url + '"';
  else if (process.platform === "darwin") cmd = 'open "' + url + '"';
  else cmd = 'xdg-open "' + url + '"';
  exec(cmd, function () { /* diamkan bila gagal */ });
}

async function startServer() {
  try {
    console.log("Memeriksa koneksi database MySQL...");
    await db.initDb();
    console.log("✓ Database MySQL (XAMPP) berhasil terhubung dan tabel siap.");
  } catch (err) {
    console.warn("⚠️  Peringatan: Belum dapat terhubung ke MySQL saat startup.");
    console.warn("   Pastikan XAMPP Control Panel dibuka dan modul MySQL sudah di-Start.");
    console.warn("   (Aplikasi server tetap berjalan, dan akan mencoba terhubung saat ada request)");
  }

  app.listen(PORT, () => {
    const url = "http://localhost:" + PORT + "/";
    console.log("=========================================================");
    console.log("  Jadwal Sidang Mediasi - Disnaker Kabupaten Tangerang");
    console.log("=========================================================");
    console.log("  Situs    : " + url);
    console.log("  Admin    : klik tombol \"Login Admin\" di halaman tersebut");
    console.log("  User     : " + ADMIN_USER);
    console.log("  Database : MySQL (XAMPP) - " + db.DB_CONFIG.database);
    console.log("=========================================================");

    /* Buka browser otomatis (kecuali OPEN_BROWSER=0) */
    if (process.env.OPEN_BROWSER !== "0") {
      setTimeout(function () { openBrowser(url); }, 500);
    }
  });
}

startServer();
