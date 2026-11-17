/*
 * app.js - Logika halaman tunggal (index.html)
 *  - Publik: melihat jadwal (tanpa login)
 *  - Admin : login untuk menambah/mengubah/menghapus jadwal
 *  - Data diambil dari API server dan di-refresh otomatis tiap 30 detik.
 */
(function () {
  "use strict";

  var REFRESH_MS = 30000;

  var state = {
    data: [],
    tanggal: "",
    agenda: "",
    ruangan: "",
    ket: "",
    cari: ""
  };

  var isAdmin = false;
  var els = {};

  function $(id) { return document.getElementById(id); }

  /* ------------------------------- Filter ------------------------------- */
  function uniqueDates(data) {
    var set = {};
    data.forEach(function (d) { if (d.tanggal) set[d.tanggal] = true; });
    return Object.keys(set).sort();
  }

  function fillSelect(select, values, placeholder, selected) {
    select.innerHTML = "";
    var opt0 = document.createElement("option");
    opt0.value = "";
    opt0.textContent = placeholder;
    select.appendChild(opt0);
    values.forEach(function (v) {
      var o = document.createElement("option");
      o.value = v;
      o.textContent = v;
      select.appendChild(o);
    });
    select.value = selected || "";
  }

  function renderTabs() {
    var box = els.tabs;
    box.innerHTML = "";
    var dates = uniqueDates(state.data);

    var all = document.createElement("button");
    all.type = "button";
    all.className = "tab" + (state.tanggal === "" ? " active" : "");
    all.textContent = "Semua Tanggal";
    all.dataset.tanggal = "";
    box.appendChild(all);

    dates.forEach(function (d) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "tab" + (state.tanggal === d ? " active" : "");
      b.textContent = formatTanggalPendek(d);
      b.dataset.tanggal = d;
      box.appendChild(b);
    });
  }

  function matches(item) {
    if (state.tanggal && item.tanggal !== state.tanggal) return false;
    if (state.agenda && item.agenda !== state.agenda) return false;
    if (state.ruangan && item.ruangan !== state.ruangan) return false;
    if (state.ket && item.ket !== state.ket) return false;
    if (state.cari) {
      var q = state.cari.toLowerCase();
      var hay = [
        item.perusahaan, item.pekerja,
        item.mhi1, item.mhi2, item.agenda, item.ruangan, item.ket, item.noUrut
      ].join(" ").toLowerCase();
      if (hay.indexOf(q) === -1) return false;
    }
    return true;
  }

  /* ------------------------------- Render ------------------------------- */
  function render() {
    var list = sortJadwal(state.data.filter(matches));
    var tbody = els.tbody;
    tbody.innerHTML = "";

    list.forEach(function (item, i) {
      var tr = document.createElement("tr");
      tr.innerHTML =
        '<td class="col-no">' + escapeHtml(item.no || (i + 1)) + "</td>" +
        '<td class="col-urut">' + escapeHtml(item.noUrut) + "</td>" +
        '<td><span class="perusahaan">' + escapeHtml(item.perusahaan) + "</span></td>" +
        '<td>' + escapeHtml(item.pekerja) + "</td>" +
        "<td>" + escapeHtml(item.mhi1) + "</td>" +
        "<td>" + escapeHtml(item.mhi2) + "</td>" +
        "<td>" + agendaBadge(item.agenda) + "</td>" +
        '<td><span class="jam">' + escapeHtml(item.jam) + "</span>" +
          '<span class="tel tanggal-cell">' + escapeHtml(formatTanggalPendek(item.tanggal)) + "</span>" +
        "</td>" +
        '<td><span class="badge badge-ruang">' + escapeHtml(item.ruangan) + "</span></td>" +
        '<td><span class="badge badge-ket">' + escapeHtml(item.ket || "-") + "</span></td>" +
        '<td class="col-aksi"><div class="table-actions">' +
          '<button class="btn btn-outline btn-sm" data-edit="' + escapeHtml(item.id) + '">Edit</button>' +
          '<button class="btn btn-danger btn-sm" data-hapus="' + escapeHtml(item.id) + '">Hapus</button>' +
        "</div></td>";
      tbody.appendChild(tr);
    });

    els.empty.style.display = list.length ? "none" : "block";
    els.resultCount.textContent = "Menampilkan " + list.length + " dari " + state.data.length + " jadwal";
    renderTabs();
  }

  function renderStats() {
    els.statTotal.textContent = state.data.length;
    els.statMediasi.textContent = state.data.filter(function (d) { return (d.agenda || "").toUpperCase() === "MEDIASI"; }).length;
    els.statKlarifikasi.textContent = state.data.filter(function (d) { return (d.agenda || "").toUpperCase() === "KLARIFIKASI"; }).length;
    els.statRuangan.textContent = uniqSorted(state.data, "ruangan").length;
  }

  function buildFilters() {
    fillSelect(els.fAgenda, uniqSorted(state.data, "agenda"), "Semua Agenda", state.agenda);
    fillSelect(els.fRuangan, uniqSorted(state.data, "ruangan"), "Semua Ruangan", state.ruangan);
    fillSelect(els.fKet, uniqSorted(state.data, "ket"), "Semua KET", state.ket);
  }

  function renderRuanganList() {
    var list = $("list-ruangan");
    list.innerHTML = "";
    uniqSorted(state.data, "ruangan").forEach(function (r) {
      var o = document.createElement("option");
      o.value = r;
      list.appendChild(o);
    });
  }

  /* --------------------------- Muat & refresh --------------------------- */
  function setLoading() {
    els.tbody.innerHTML = '<tr><td colspan="11" class="loading">Memuat data jadwal...</td></tr>';
  }

  function isOffline(err) {
    if (!err) return false;
    if (err instanceof TypeError) return true;
    return /failed to fetch|networkerror|load failed|network request failed/i.test(err.message || "");
  }

  function showLoadError(err) {
    els.empty.style.display = "block";
    if (isOffline(err)) {
      els.empty.innerHTML =
        '<strong>Tidak dapat terhubung ke server.</strong><br>' +
        'Website ini butuh server dijalankan. Jalankan <code>start.bat</code> (klik dua kali) ' +
        'atau <code>npm start</code>, lalu buka <a href="http://localhost:3000/">http://localhost:3000</a>.';
    } else {
      els.empty.textContent = "Gagal memuat data: " + (err.message || "kesalahan tak diketahui");
    }
  }

  function loadData(showLoading) {
    if (showLoading) setLoading();
    return Api.getJadwal().then(function (data) {
      state.data = Array.isArray(data) ? data : [];
      buildFilters();
      renderRuanganList();
      renderStats();
      render();
    }).catch(function (err) {
      if (showLoading) els.tbody.innerHTML = "";
      showLoadError(err);
    });
  }

  /* ----------------------------- Mode admin ----------------------------- */
  function setAdminMode(on) {
    isAdmin = on;
    document.body.classList.toggle("admin-mode", on);
    if (!on) clearForm();
  }

  function handleAuthError(err) {
    if (err && err.status === 401) {
      setAdminMode(false);
      openLogin();
      showLoginError("Sesi Anda berakhir. Silakan login kembali.");
      return true;
    }
    return false;
  }

  function apiError(err) {
    if (!handleAuthError(err)) {
      alert(err && err.message ? err.message : "Terjadi kesalahan.");
    }
  }

  /* ------------------------------- Form --------------------------------- */
  function readForm() {
    return {
      no: $("a-no").value.trim(),
      noUrut: $("a-noUrut").value.trim(),
      perusahaan: $("a-perusahaan").value.trim(),
      pekerja: $("a-pekerja").value.trim() || "-",
      mhi1: $("a-mhi1").value.trim() || "-",
      mhi2: $("a-mhi2").value.trim() || "-",
      agenda: $("a-agenda").value,
      tanggal: $("a-tanggal").value,
      jam: $("a-jam").value,
      ruangan: $("a-ruangan").value.trim() || "-",
      ket: $("a-ket").value.trim() || "-"
    };
  }

  function fillForm(item) {
    $("a-id").value = item.id || "";
    $("a-no").value = item.no || "";
    $("a-noUrut").value = item.noUrut || "";
    $("a-perusahaan").value = item.perusahaan || "";
    $("a-pekerja").value = (item.pekerja === "-" ? "" : item.pekerja) || "";
    $("a-mhi1").value = (item.mhi1 === "-" ? "" : item.mhi1) || "";
    $("a-mhi2").value = (item.mhi2 === "-" ? "" : item.mhi2) || "";
    $("a-agenda").value = item.agenda || "KLARIFIKASI";
    $("a-tanggal").value = item.tanggal || "";
    $("a-jam").value = item.jam || "";
    $("a-ruangan").value = (item.ruangan === "-" ? "" : item.ruangan) || "";
    $("a-ket").value = (item.ket === "-" ? "" : item.ket) || "";
  }

  function clearForm() {
    $("form-jadwal").reset();
    $("a-id").value = "";
    $("form-title").textContent = "Tambah Jadwal Baru";
    $("btn-simpan").textContent = "Simpan Jadwal";
    $("btn-batal").style.display = "none";
  }

  function onSubmit(e) {
    e.preventDefault();
    var form = readForm();
    if (!form.perusahaan || !form.tanggal || !form.jam) {
      alert("Pihak Perusahaan, Tanggal, dan Jam wajib diisi.");
      return;
    }
    var id = $("a-id").value;
    var btn = $("btn-simpan");
    btn.disabled = true;

    var action = id ? Api.updateJadwal(id, form) : Api.createJadwal(form);
    action.then(function () {
      clearForm();
      return loadData(false);
    }).then(function () {
      btn.disabled = false;
      $("admin-panel").scrollIntoView({ behavior: "smooth", block: "start" });
    }).catch(function (err) {
      btn.disabled = false;
      apiError(err);
    });
  }

  function onTableClick(e) {
    if (!isAdmin) return;
    var editBtn = e.target.closest("[data-edit]");
    var hapusBtn = e.target.closest("[data-hapus]");

    if (editBtn) {
      var id = editBtn.getAttribute("data-edit");
      var item = state.data.find(function (d) { return d.id === id; });
      if (item) {
        fillForm(item);
        $("form-title").textContent = "Edit Jadwal";
        $("btn-simpan").textContent = "Simpan Perubahan";
        $("btn-batal").style.display = "inline-flex";
        $("admin-panel").scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }

    if (hapusBtn) {
      var hid = hapusBtn.getAttribute("data-hapus");
      var it = state.data.find(function (d) { return d.id === hid; });
      var nama = it ? it.perusahaan : "ini";
      if (confirm("Hapus jadwal \"" + nama + "\"?")) {
        Api.deleteJadwal(hid).then(function () {
          if ($("a-id").value === hid) clearForm();
          return loadData(false);
        }).catch(apiError);
      }
    }
  }

  function onResetData() {
    if (confirm("Kembalikan semua jadwal ke data awal dari PDF? Perubahan akan hilang.")) {
      Api.resetJadwal().then(function () {
        clearForm();
        return loadData(false);
      }).catch(apiError);
    }
  }

  /* ------------------------------- Login -------------------------------- */
  function openLogin() {
    els.loginError.style.display = "none";
    els.loginForm.reset();
    els.loginModal.classList.add("open");
    setTimeout(function () { $("login-username").focus(); }, 50);
  }

  function closeLogin() {
    els.loginModal.classList.remove("open");
  }

  function showLoginError(msg) {
    els.loginError.textContent = msg;
    els.loginError.style.display = "block";
  }

  function onLoginSubmit(e) {
    e.preventDefault();
    els.loginError.style.display = "none";
    var btn = $("btn-login-submit");
    btn.disabled = true;
    btn.textContent = "Memproses...";

    Api.login($("login-username").value.trim(), $("login-password").value)
      .then(function (res) {
        closeLogin();
        setAdminMode(true);
        $("current-user").textContent = (res && res.user) || "admin";
        return loadData(false);
      })
      .catch(function (err) {
        showLoginError(err.message || "Login gagal.");
      })
      .then(function () {
        btn.disabled = false;
        btn.textContent = "Masuk";
      });
  }

  function onLogout() {
    Api.logout().then(function () {
      setAdminMode(false);
      return loadData(false);
    }).catch(function () {
      setAdminMode(false);
    });
  }

  /* ------------------------------ Export -------------------------------- */
  function exportCsv() {
    var list = sortJadwal(state.data.filter(matches));
    var head = ["No", "No Urut", "Pihak Perusahaan",
      "Pihak Pekerja/Kuasa Hukum", "MHI 1", "MHI 2",
      "Agenda", "Tanggal", "Jam", "Ruangan", "Ket"];
    function cell(v) {
      v = String(v === undefined || v === null ? "" : v).replace(/"/g, '""');
      return '"' + v + '"';
    }
    var rows = [head.map(cell).join(",")];
    list.forEach(function (it, i) {
      rows.push([
        i + 1, it.noUrut, it.perusahaan, it.pekerja,
        it.mhi1, it.mhi2, it.agenda, formatTanggalPendek(it.tanggal), it.jam, it.ruangan, it.ket
      ].map(cell).join(","));
    });
    var blob = new Blob(["\ufeff" + rows.join("\r\n")], { type: "text/csv;charset=utf-8;" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "jadwal-mediasi-disnaker-tangerang.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /* ------------------------------ Events -------------------------------- */
  function bindEvents() {
    els.tabs.addEventListener("click", function (e) {
      var t = e.target.closest(".tab");
      if (!t) return;
      state.tanggal = t.dataset.tanggal || "";
      render();
    });
    els.fCari.addEventListener("input", function () { state.cari = this.value.trim(); render(); });
    els.fAgenda.addEventListener("change", function () { state.agenda = this.value; render(); });
    els.fRuangan.addEventListener("change", function () { state.ruangan = this.value; render(); });
    els.fKet.addEventListener("change", function () { state.ket = this.value; render(); });
    els.btnReset.addEventListener("click", function () {
      state.tanggal = state.agenda = state.ruangan = state.ket = state.cari = "";
      els.fCari.value = "";
      buildFilters();
      render();
    });
    els.btnPrint.addEventListener("click", function () { window.print(); });
    els.btnExport.addEventListener("click", exportCsv);

    /* Admin */
    $("btn-login-open").addEventListener("click", openLogin);
    $("btn-login-close").addEventListener("click", closeLogin);
    els.loginModal.addEventListener("click", function (e) {
      if (e.target === els.loginModal) closeLogin();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeLogin();
    });
    els.loginForm.addEventListener("submit", onLoginSubmit);
    $("btn-logout").addEventListener("click", onLogout);
    $("form-jadwal").addEventListener("submit", onSubmit);
    $("btn-batal").addEventListener("click", clearForm);
    $("btn-reset-data").addEventListener("click", onResetData);
    els.tbody.addEventListener("click", onTableClick);
  }

  function init() {
    els.tabs = $("tabs-tanggal");
    els.tbody = $("tbody-jadwal");
    els.empty = $("empty-state");
    els.resultCount = $("result-count");
    els.fCari = $("f-cari");
    els.fAgenda = $("f-agenda");
    els.fRuangan = $("f-ruangan");
    els.fKet = $("f-ket");
    els.btnReset = $("btn-reset");
    els.btnPrint = $("btn-print");
    els.btnExport = $("btn-export");
    els.statTotal = $("stat-total");
    els.statMediasi = $("stat-mediasi");
    els.statKlarifikasi = $("stat-klarifikasi");
    els.statRuangan = $("stat-ruangan");
    els.loginModal = $("login-modal");
    els.loginForm = $("login-form");
    els.loginError = $("login-error");

    bindEvents();
    loadData(true);

    /* Cek sesi: bila sudah login, aktifkan mode admin */
    Api.session().then(function (s) {
      if (s && s.loggedIn) {
        setAdminMode(true);
        $("current-user").textContent = s.user || "admin";
      }
    }).catch(function () {});

    /* Auto-refresh data tiap 30 detik + saat tab kembali aktif */
    setInterval(function () { loadData(false); }, REFRESH_MS);
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "visible") loadData(false);
    });

    $("tahun").textContent = new Date().getFullYear();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
