/*
 * util.js - Fungsi bantu tampilan & format jadwal mediasi
 */

var HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
var BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];
var BULAN_PENDEK = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des"
];

function escapeHtml(s) {
  return String(s === undefined || s === null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* "2026-11-17" -> "Selasa, 17 November 2026" */
function formatTanggalPanjang(iso) {
  if (!iso) return "-";
  var p = String(iso).split("-");
  if (p.length !== 3) return iso;
  var d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
  if (isNaN(d.getTime())) return iso;
  return HARI[d.getDay()] + ", " + d.getDate() + " " + BULAN[d.getMonth()] + " " + d.getFullYear();
}

/* "2026-11-17" -> "Selasa, 17 Nov 2026" */
function formatTanggalRingkas(iso) {
  if (!iso) return "-";
  var p = String(iso).split("-");
  if (p.length !== 3) return iso;
  var d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
  if (isNaN(d.getTime())) return iso;
  return HARI[d.getDay()] + ", " + d.getDate() + " " + BULAN_PENDEK[d.getMonth()] + " " + d.getFullYear();
}

/* "2026-11-17" -> "Selasa 17/11/2026" */
function formatTanggalPendek(iso) {
  if (!iso) return "-";
  var p = String(iso).split("-");
  if (p.length !== 3) return iso;
  var d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
  if (isNaN(d.getTime())) return iso;
  var dd = ("0" + d.getDate()).slice(-2);
  var mm = ("0" + (d.getMonth() + 1)).slice(-2);
  return HARI[d.getDay()] + " " + dd + "/" + mm + "/" + d.getFullYear();
}

/* Daftar nilai unik dari sebuah properti, terurut */
function uniqSorted(arr, prop) {
  var set = {};
  arr.forEach(function (item) {
    var v = item[prop];
    if (v !== undefined && v !== null && v !== "") set[v] = true;
  });
  return Object.keys(set).sort(function (a, b) {
    return a.localeCompare(b, "id");
  });
}

/* Urutkan: tanggal naik, urutan PDF (kolom urutan/no) */
function sortJadwal(arr) {
  return arr.map(function (item, i) { return { item: item, i: i }; })
    .sort(function (a, b) {
      var t = (a.item.tanggal || "").localeCompare(b.item.tanggal || "");
      if (t !== 0) return t;
      var ua = Number(a.item.urutan);
      var ub = Number(b.item.urutan);
      if (Number.isFinite(ua) && Number.isFinite(ub) && ua !== ub) return ua - ub;
      if (Number.isFinite(ua) && !Number.isFinite(ub)) return -1;
      if (!Number.isFinite(ua) && Number.isFinite(ub)) return 1;
      var na = parseInt(a.item.no, 10), nb = parseInt(b.item.no, 10);
      if (!isNaN(na) && !isNaN(nb) && na !== nb) return na - nb;
      return a.i - b.i;
    })
    .map(function (x) { return x.item; });
}

function agendaBadge(agenda) {
  var a = (agenda || "").toUpperCase();
  var cls = "badge-default";
  if (a === "MEDIASI") cls = "badge-mediasi";
  else if (a === "KLARIFIKASI") cls = "badge-klarifikasi";
  else if (a === "KONSILIASI") cls = "badge-konsiliasi";
  return '<span class="badge ' + cls + '">' + escapeHtml(agenda || "-") + "</span>";
}

/* Format ringkasan resmi untuk disalin */
function formatTeksJadwal(item) {
  var lines = [
    "JADWAL SIDANG HUBUNGAN INDUSTRIAL",
    "Dinas Tenaga Kerja Kabupaten Tangerang",
    "======================================",
    "Perusahaan       : " + (item.perusahaan || "-"),
    "Pihak Pekerja    : " + (item.pekerja || "-"),
    "Agenda           : " + (item.agenda || "-") + (item.ket && item.ket !== "-" ? " (" + item.ket + ")" : ""),
    "Hari / Tanggal   : " + formatTanggalPanjang(item.tanggal),
    "Waktu            : " + (item.jam || "-") + " WIB",
    "Ruangan          : " + (item.ruangan || "-"),
    "Mediator (MHI 1) : " + (item.mhi1 || "-"),
    "Mediator (MHI 2) : " + (item.mhi2 || "-"),
    item.noUrut ? "No Urut / Reg    : " + item.noUrut : "",
    "======================================",
    "Catatan: Harap hadir 15 menit sebelum sidang dimulai."
  ];
  return lines.filter(Boolean).join("\n");
}

/* Copy to clipboard dengan fallback */
function copyToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text);
  }
  return new Promise(function (resolve, reject) {
    try {
      var textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.top = "-9999px";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      var ok = document.execCommand("copy");
      document.body.removeChild(textarea);
      if (ok) resolve();
      else reject(new Error("Gagal menyalin"));
    } catch (err) {
      reject(err);
    }
  });
}
