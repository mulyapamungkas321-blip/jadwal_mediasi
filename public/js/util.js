/*
 * util.js - Fungsi bantu tampilan (dipakai index.html & admin.html)
 */

var HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
var BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
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

/* Urutkan: tanggal naik, urutan PDF (kolom urutan/no), bukan berdasarkan jam */
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
  var cls = a === "MEDIASI" ? "badge-mediasi" : (a === "KLARIFIKASI" ? "badge-klarifikasi" : "");
  return '<span class="badge ' + cls + '">' + escapeHtml(agenda || "-") + "</span>";
}
