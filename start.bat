@echo off
setlocal
cd /d "%~dp0"

echo =========================================================
echo   Jadwal Sidang Mediasi - Disnaker Kabupaten Tangerang
echo =========================================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [!] Node.js tidak ditemukan.
  echo     Install dulu dari https://nodejs.org lalu jalankan file ini lagi.
  echo.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Menginstall dependensi (hanya sekali)...
  call npm install
  if errorlevel 1 (
    echo.
    echo [!] Gagal install dependensi. Periksa koneksi internet.
    echo.
    pause
    exit /b 1
  )
)

echo [INFO] Pastikan XAMPP sudah aktif dan modul MySQL sudah di-Start.
echo.

echo Menjalankan server di jendela baru...
start "Jadwal Mediasi Server" cmd /k "node server.js"

echo.
echo Browser akan terbuka otomatis di http://localhost:3000
echo Server berjalan di jendela "Jadwal Mediasi Server".
echo JANGAN tutup jendela tersebut selama memakai website.
echo Menutup jendela itu = mematikan server.
echo.
pause
