# Website Jadwal Sidang Mediasi - Disnaker Kabupaten Tangerang

Aplikasi web untuk menampilkan dan mengelola jadwal sidang mediasi hubungan industrial pada Dinas Tenaga Kerja Kabupaten Tangerang.

Diagram alur aplikasi tersedia di [`docs/FLOWCHART.md`](docs/FLOWCHART.md).

---

## 🗄️ Konfigurasi Database (MySQL / XAMPP)

Aplikasi ini menggunakan database **MySQL / MariaDB** (melalui **XAMPP**).

### 1. Struktur Database
Database: `jadwal_mediasi`
Tabel: `jadwal`

Kolom tabel `jadwal`:
- `id` (VARCHAR(64), Primary Key)
- `no` (VARCHAR(50)) - Nomor baris/tampilan
- `noUrut` (VARCHAR(50)) - Nomor urut perkara
- `perusahaan` (VARCHAR(255)) - Nama perusahaan
- `pekerja` (TEXT) - Nama pekerja / kuasa hukum
- `mhi1` (VARCHAR(150)) - Mediator Hubungan Industrial 1
- `mhi2` (VARCHAR(150)) - Mediator Hubungan Industrial 2
- `agenda` (VARCHAR(100)) - Agenda (KLARIFIKASI, MEDIASI, dll.)
- `tanggal` (DATE) - Tanggal sidang (YYYY-MM-DD)
- `jam` (VARCHAR(20)) - Waktu pelaksanaan (misal: 09:00)
- `ruangan` (VARCHAR(150)) - Ruang sidang mediasi
- `ket` (VARCHAR(255)) - Keterangan (K1, K2, M1, dll.)
- `created_at` (TIMESTAMP) - Waktu data ditambahkan
- `updated_at` (TIMESTAMP) - Waktu data terakhir diubah

File skrip SQL lengkap tersedia di [`schema.sql`](file:///C:/Users/David/Documents/Jadwal_Mediasi/schema.sql).

---

## 🚀 Cara Menjalankan

### Langkah 1: Nyalakan MySQL di XAMPP
1. Buka aplikasi **XAMPP Control Panel**.
2. Pada baris **MySQL**, klik tombol **Start** sampai status berwarna hijau.

### Langkah 2: Inisialisasi Database (Otomatis)
Aplikasi sudah diprogram untuk membuat database dan tabel secara otomatis saat pertama kali dijalankan. Namun jika ingin memeriksa atau menginisialisasi secara manual:
```bash
node init-db.js
```
*(Opsional: Jika ingin mengisi dengan contoh data awal, jalankan `node init-db.js --seed`)*

Atau Anda juga bisa mengimpor file [`schema.sql`](file:///C:/Users/David/Documents/Jadwal_Mediasi/schema.sql) langsung melalui **phpMyAdmin** (`http://localhost/phpmyadmin`).

### Langkah 3: Jalankan Aplikasi
Klik dua kali file [`start.bat`](file:///C:/Users/David/Documents/Jadwal_Mediasi/start.bat) atau jalankan melalui terminal:
```bash
npm start
```
Buka browser di: [http://localhost:3000](http://localhost:3000)

---

## ⚙️ Pengaturan (.env)

Pengaturan server dan database disimpan di file `.env` (file ini tidak ikut ter-upload ke GitHub). Salin [`.env.example`](.env.example) menjadi `.env`, lalu isi nilainya sendiri:

```env
ADMIN_USER=disnaker
ADMIN_PASSWORD=ganti-password-anda
SESSION_SECRET=ganti-dengan-string-acak-panjang
PORT=3000

# Konfigurasi Database MySQL (XAMPP)
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=jadwal_mediasi
```
