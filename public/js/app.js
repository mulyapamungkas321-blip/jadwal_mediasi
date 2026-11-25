(function () {
  "use strict";

  var REFRESH_MS = 30000;

  var state = {
    data: [],
    tanggal: "",
    agenda: "",
    ruangan: "",
    ket: "",
    cari: "",
    activeDetailItem: null
  };

  var isAdmin = false;
  var els = {};

  function $(id) {
    return document.getElementById(id);
  }

  /* ------------------------------- Toast -------------------------------- */
  function showToast(message, duration) {
    duration = duration || 2800;
    var container = els.toastContainer;
    if (!container) return;
    var toast = document.createElement("div");
    toast.className = "toast";
    toast.innerHTML =
      '<svg style="width:15px;height:15px;color:#10b981;flex-shrink:0;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>' +
      "<span>" + escapeHtml(message) + "</span>";
    container.appendChild(toast);
    setTimeout(function () {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, duration);
  }

  /* ----------------------------- Live Clock ----------------------------- */
  function updateClock() {
    var clock = $("live-clock");
    if (!clock) return;
    var now = new Date();
    var hari = HARI[now.getDay()];
    var tgl = now.getDate();
    var bln = BULAN_PENDEK[now.getMonth()];
    var thn = now.getFullYear();
    var hh = ("0" + now.getHours()).slice(-2);
    var mm = ("0" + now.getMinutes()).slice(-2);
    var ss = ("0" + now.getSeconds()).slice(-2);
    clock.innerHTML =
      '<span class="pulse-dot"></span> ' +
      hari + ", " + tgl + " " + bln + " " + thn + " &bull; " + hh + ":" + mm + ":" + ss + " WIB";
  }

  /* ------------------------------- Filter ------------------------------- */
  function uniqueDates(data) {
    var set = {};
    data.forEach(function (d) {
      if (d.tanggal) set[d.tanggal] = true;
    });
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

  function updateFilterBadgeCount() {
    var count = 0;
    if (state.agenda) count++;
    if (state.ruangan) count++;
    if (state.ket) count++;
    var badge = $("filter-active-count");
    if (badge) {
      if (count > 0) {
        badge.textContent = count;
        badge.style.display = "inline-flex";
      } else {
        badge.style.display = "none";
      }
    }
  }

  function renderTabs() {
    var box = els.tabs;
    box.innerHTML = "";
    var dates = uniqueDates(state.data);

    /* Tab Semua */
    var all = document.createElement("button");
    all.type = "button";
    all.className = "tab" + (state.tanggal === "" ? " active" : "");
    all.innerHTML = '<span>Semua Tanggal</span><span class="tab-badge">' + state.data.length + '</span>';
    all.dataset.tanggal = "";
    box.appendChild(all);

    /* Tab per tanggal */
    dates.forEach(function (d) {
      var count = state.data.filter(function (it) { return it.tanggal === d; }).length;
      var b = document.createElement("button");
      b.type = "button";
      b.className = "tab" + (state.tanggal === d ? " active" : "");
      b.innerHTML = '<span>' + escapeHtml(formatTanggalRingkas(d)) + '</span><span class="tab-badge">' + count + '</span>';
      b.dataset.tanggal = d;
      box.appendChild(b);
    });
  }

  function syncAgendaChips() {
    var chips = document.querySelectorAll("#quick-agenda-chips .chip");
    chips.forEach(function (c) {
      var ag = c.getAttribute("data-agenda") || "";
      if (ag === state.agenda) {
        c.classList.add("active");
      } else {
        c.classList.remove("active");
      }
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
  function renderTableView(list) {
    var tbody = els.tbody;
    tbody.innerHTML = "";

    list.forEach(function (item, i) {
      var tr = document.createElement("tr");

      var mediatorHtml =
        '<div class="mediator-cell">' +
          (item.mhi1 && item.mhi1 !== "-" ? '<div><strong>MHI 1:</strong> ' + escapeHtml(item.mhi1) + '</div>' : '') +
          (item.mhi2 && item.mhi2 !== "-" ? '<div style="color:var(--text-muted);margin-top:2px;"><strong>MHI 2:</strong> ' + escapeHtml(item.mhi2) + '</div>' : '') +
          ((!item.mhi1 || item.mhi1 === "-") && (!item.mhi2 || item.mhi2 === "-") ? '-' : '') +
        '</div>';

      tr.innerHTML =
        '<td class="col-no">' + escapeHtml(item.no || (i + 1)) + "</td>" +
        '<td class="col-urut">' + escapeHtml(item.noUrut || "-") + "</td>" +
        '<td><span class="perusahaan-cell">' + escapeHtml(item.perusahaan) + "</span></td>" +
        '<td><span class="pekerja-cell">' + escapeHtml(item.pekerja || "-") + "</span></td>" +
        "<td>" + mediatorHtml + "</td>" +
        "<td>" + agendaBadge(item.agenda) + "</td>" +
        '<td>' +
          '<span class="jam">' + escapeHtml(item.jam || "-") + " WIB</span>" +
          '<span class="tel tanggal-cell">' + escapeHtml(formatTanggalRingkas(item.tanggal)) + "</span>" +
        "</td>" +
        '<td><span class="badge badge-ruang">' + escapeHtml(item.ruangan || "-") + "</span></td>" +
        '<td><span class="badge badge-ket">' + escapeHtml(item.ket || "-") + "</span></td>" +
        '<td class="col-aksi-head col-aksi-cell">' +
          '<div class="table-actions-cell">' +
            '<button class="btn btn-outline btn-sm" data-edit="' + escapeHtml(item.id) + '" title="Edit jadwal">Edit</button>' +
            '<button class="btn btn-danger btn-sm" data-hapus="' + escapeHtml(item.id) + '" title="Hapus jadwal">Hapus</button>' +
          "</div>" +
        "</td>";

      tbody.appendChild(tr);
    });
  }

  function render() {
    var list = sortJadwal(state.data.filter(matches));

    renderTableView(list);

    els.empty.style.display = list.length ? "none" : "block";
    els.resultCount.textContent = "Menampilkan " + list.length + " dari " + state.data.length + " jadwal";

    renderTabs();
    syncAgendaChips();
    updateFilterBadgeCount();
  }

  function renderStats() {
    els.statTotal.textContent = state.data.length;
    els.statMediasi.textContent = state.data.filter(function (d) {
      return (d.agenda || "").toUpperCase() === "MEDIASI";
    }).length;
    els.statKlarifikasi.textContent = state.data.filter(function (d) {
      return (d.agenda || "").toUpperCase() === "KLARIFIKASI";
    }).length;
    els.statRuangan.textContent = uniqSorted(state.data, "ruangan").length;
  }

  function buildFilters() {
    fillSelect(els.fAgenda, uniqSorted(state.data, "agenda"), "Semua Agenda", state.agenda);
    fillSelect(els.fRuangan, uniqSorted(state.data, "ruangan"), "Semua Ruangan", state.ruangan);
    fillSelect(els.fKet, uniqSorted(state.data, "ket"), "Semua KET", state.ket);
  }

  function renderRuanganList() {
    var list = $("list-ruangan");
    if (!list) return;
    list.innerHTML = "";
    uniqSorted(state.data, "ruangan").forEach(function (r) {
      var o = document.createElement("option");
      o.value = r;
      list.appendChild(o);
    });
  }

  /* --------------------------- Modal Detail ----------------------------- */
  function openDetailModal(item) {
    state.activeDetailItem = item;
    var body = $("detail-body");
    if (!body) return;

    body.innerHTML =
      '<table class="detail-table">' +
        '<tr><td class="detail-label">Pihak Perusahaan</td><td class="detail-val" style="color:var(--navy-900);font-size:14.5px;">' + escapeHtml(item.perusahaan) + '</td></tr>' +
        '<tr><td class="detail-label">Pekerja / Serikat</td><td class="detail-val">' + escapeHtml(item.pekerja || "-") + '</td></tr>' +
        '<tr><td class="detail-label">Agenda Sidang</td><td class="detail-val">' + agendaBadge(item.agenda) + '</td></tr>' +
        '<tr><td class="detail-label">Kategori (KET)</td><td class="detail-val"><span class="badge badge-ket">' + escapeHtml(item.ket || "-") + '</span></td></tr>' +
        '<tr><td class="detail-label">Hari &amp; Tanggal</td><td class="detail-val">' + escapeHtml(formatTanggalPanjang(item.tanggal)) + '</td></tr>' +
        '<tr><td class="detail-label">Waktu Pelaksanaan</td><td class="detail-val">' + escapeHtml(item.jam || "-") + ' WIB</td></tr>' +
        '<tr><td class="detail-label">Ruangan Sidang</td><td class="detail-val"><span class="badge badge-ruang">' + escapeHtml(item.ruangan || "-") + '</span></td></tr>' +
        '<tr><td class="detail-label">Mediator (MHI 1)</td><td class="detail-val">' + escapeHtml(item.mhi1 || "-") + '</td></tr>' +
        '<tr><td class="detail-label">Mediator (MHI 2)</td><td class="detail-val">' + escapeHtml(item.mhi2 || "-") + '</td></tr>' +
        '<tr><td class="detail-label">No Urut / Reg</td><td class="detail-val">' + escapeHtml(item.noUrut || "-") + '</td></tr>' +
      '</table>';

    $("detail-modal").classList.add("open");
  }

  function closeDetailModal() {
    $("detail-modal").classList.remove("open");
    state.activeDetailItem = null;
  }

  /* --------------------------- Muat & Refresh --------------------------- */
  function setLoading() {
    els.tbody.innerHTML = '<tr><td colspan="10" class="loading">Memuat data jadwal sidang...</td></tr>';
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
        '<div class="empty-icon-wrap"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div>' +
        '<h4>Tidak Dapat Terhubung ke Server</h4>' +
        '<p>Pastikan server Node.js aktif. Jalankan <code>start.bat</code> atau <code>npm start</code>, lalu muat ulang halaman.</p>';
    } else {
      els.empty.innerHTML = '<p>Gagal memuat data: ' + escapeHtml(err.message || "kesalahan tak diketahui") + '</p>';
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
      if (showLoading) {
        els.tbody.innerHTML = "";
      }
      showLoadError(err);
    });
  }

  /* ----------------------------- Mode Admin ----------------------------- */
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
    $("btn-simpan").innerHTML =
      '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> Simpan Jadwal';
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
      showToast(id ? "Jadwal berhasil diperbarui!" : "Jadwal berhasil ditambahkan!");
      return loadData(false);
    }).then(function () {
      btn.disabled = false;
      $("admin-panel").scrollIntoView({ behavior: "smooth", block: "start" });
    }).catch(function (err) {
      btn.disabled = false;
      apiError(err);
    });
  }

  /* --------------------------- Action Handlers -------------------------- */
  function onTableClick(e) {
    var editBtn = e.target.closest("[data-edit]");
    var hapusBtn = e.target.closest("[data-hapus]");

    if (editBtn && isAdmin) {
      var eid = editBtn.getAttribute("data-edit");
      var eItem = state.data.find(function (d) { return d.id === eid; });
      if (eItem) {
        fillForm(eItem);
        $("form-title").textContent = "Edit Jadwal Sidang";
        $("btn-simpan").innerHTML =
          '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> Simpan Perubahan';
        $("btn-batal").style.display = "inline-flex";
        $("admin-panel").scrollIntoView({ behavior: "smooth", block: "start" });
      }
      return;
    }

    if (hapusBtn && isAdmin) {
      var hid = hapusBtn.getAttribute("data-hapus");
      var hItem = state.data.find(function (d) { return d.id === hid; });
      var nama = hItem ? hItem.perusahaan : "ini";
      if (confirm('Hapus jadwal sidang untuk "' + nama + '"?')) {
        Api.deleteJadwal(hid).then(function () {
          if ($("a-id").value === hid) clearForm();
          showToast("Jadwal berhasil dihapus.");
          return loadData(false);
        }).catch(apiError);
      }
      return;
    }

    /* Klik baris untuk melihat detail */
    var tr = e.target.closest("tr");
    if (tr && !e.target.closest("button")) {
      var index = Array.prototype.indexOf.call(tr.parentNode.children, tr);
      var currentList = sortJadwal(state.data.filter(matches));
      if (currentList[index]) {
        openDetailModal(currentList[index]);
      }
    }
  }

  function onResetData() {
    if (confirm("Kembalikan semua jadwal ke data awal resmi? Perubahan data saat ini akan ditimpa.")) {
      Api.resetJadwal().then(function () {
        clearForm();
        showToast("Data jadwal di-reset ke versi awal.");
        return loadData(false);
      }).catch(apiError);
    }
  }

  /* ------------------------------- Login -------------------------------- */
  function openLogin() {
    els.loginError.style.display = "none";
    els.loginForm.reset();
    els.loginModal.classList.add("open");
    setTimeout(function () { $("login-username").focus(); }, 60);
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
        showToast("Login admin berhasil!");
        return loadData(false);
      })
      .catch(function (err) {
        showLoginError(err.message || "Username atau password tidak cocok.");
      })
      .then(function () {
        btn.disabled = false;
        btn.innerHTML =
          '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3"/></svg> Masuk';
      });
  }

  function onLogout() {
    Api.logout().then(function () {
      setAdminMode(false);
      showToast("Berhasil logout.");
      return loadData(false);
    }).catch(function () {
      setAdminMode(false);
    });
  }

  /* ------------------------------ Export -------------------------------- */
  function exportCsv() {
    var list = sortJadwal(state.data.filter(matches));
    var head = [
      "No", "No Urut", "Pihak Perusahaan",
      "Pihak Pekerja/Kuasa Hukum", "MHI 1", "MHI 2",
      "Agenda", "Tanggal", "Jam", "Ruangan", "Ket"
    ];
    function cell(v) {
      v = String(v === undefined || v === null ? "" : v).replace(/"/g, '""');
      return '"' + v + '"';
    }
    var rows = [head.map(cell).join(",")];
    list.forEach(function (it, i) {
      rows.push([
        i + 1, it.noUrut || "-", it.perusahaan || "-", it.pekerja || "-",
        it.mhi1 || "-", it.mhi2 || "-", it.agenda || "-",
        formatTanggalPendek(it.tanggal), (it.jam || "-") + " WIB",
        it.ruangan || "-", it.ket || "-"
      ].map(cell).join(","));
    });
    var blob = new Blob(["\ufeff" + rows.join("\r\n")], { type: "text/csv;charset=utf-8;" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "jadwal-sidang-mediasi-disnaker.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("File CSV jadwal berhasil diunduh.");
  }

  /* ------------------------------ Events -------------------------------- */
  function bindEvents() {
    /* Tab Tanggal */
    els.tabs.addEventListener("click", function (e) {
      var t = e.target.closest(".tab");
      if (!t) return;
      state.tanggal = t.dataset.tanggal || "";
      render();
    });

    /* Pencarian sinkron */
    function onSearchChange(val) {
      state.cari = val.trim();
      els.fCari.value = val;
      if (els.heroCari) els.heroCari.value = val;
      
      var hasVal = state.cari.length > 0;
      if (els.btnClearSearch) els.btnClearSearch.style.display = hasVal ? "flex" : "none";
      if (els.btnHeroClear) els.btnHeroClear.style.display = hasVal ? "flex" : "none";
      
      render();
    }

    els.fCari.addEventListener("input", function () { onSearchChange(this.value); });
    if (els.heroCari) {
      els.heroCari.addEventListener("input", function () { onSearchChange(this.value); });
    }

    if (els.btnClearSearch) {
      els.btnClearSearch.addEventListener("click", function () {
        onSearchChange("");
        els.fCari.focus();
      });
    }
    if (els.btnHeroClear) {
      els.btnHeroClear.addEventListener("click", function () {
        onSearchChange("");
        els.heroCari.focus();
      });
    }

    /* Quick Agenda Chips */
    var chipsContainer = $("quick-agenda-chips");
    if (chipsContainer) {
      chipsContainer.addEventListener("click", function (e) {
        var chip = e.target.closest(".chip");
        if (!chip) return;
        state.agenda = chip.getAttribute("data-agenda") || "";
        els.fAgenda.value = state.agenda;
        render();
      });
    }

    /* Dropdowns */
    els.fAgenda.addEventListener("change", function () {
      state.agenda = this.value;
      render();
    });
    els.fRuangan.addEventListener("change", function () {
      state.ruangan = this.value;
      render();
    });
    els.fKet.addEventListener("change", function () {
      state.ket = this.value;
      render();
    });

    /* Toggle Filter Lanjutan */
    var btnFilterToggle = $("btn-filter-toggle");
    var filterCollapsible = $("filter-collapsible");
    if (btnFilterToggle && filterCollapsible) {
      btnFilterToggle.addEventListener("click", function () {
        var isOpen = filterCollapsible.classList.toggle("open");
        btnFilterToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
      });
    }

    /* Reset button */
    function resetAllFilters() {
      state.tanggal = state.agenda = state.ruangan = state.ket = state.cari = "";
      els.fCari.value = "";
      if (els.heroCari) els.heroCari.value = "";
      if (els.btnClearSearch) els.btnClearSearch.style.display = "none";
      if (els.btnHeroClear) els.btnHeroClear.style.display = "none";
      buildFilters();
      render();
    }
    els.btnReset.addEventListener("click", resetAllFilters);
    var btnEmptyReset = $("btn-empty-reset");
    if (btnEmptyReset) btnEmptyReset.addEventListener("click", resetAllFilters);

    /* Print & Export */
    els.btnPrint.addEventListener("click", function () { window.print(); });
    els.btnExport.addEventListener("click", exportCsv);

    /* Table Event Delegation */
    els.tbody.addEventListener("click", onTableClick);

    /* Detail Modal Events */
    $("btn-detail-close").addEventListener("click", closeDetailModal);
    $("btn-detail-done").addEventListener("click", closeDetailModal);
    $("detail-modal").addEventListener("click", function (e) {
      if (e.target === $("detail-modal")) closeDetailModal();
    });
    $("btn-detail-copy").addEventListener("click", function () {
      if (state.activeDetailItem) {
        copyToClipboard(formatTeksJadwal(state.activeDetailItem)).then(function () {
          showToast("Ringkasan jadwal berhasil disalin!");
        });
      }
    });

    /* Scroll To Top */
    var btnScrollTop = $("btn-scroll-top");
    window.addEventListener("scroll", function () {
      if (window.scrollY > 280) {
        btnScrollTop.style.display = "flex";
      } else {
        btnScrollTop.style.display = "none";
      }
    });
    btnScrollTop.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    /* Admin Events */
    $("btn-login-open").addEventListener("click", openLogin);
    $("btn-login-close").addEventListener("click", closeLogin);
    els.loginModal.addEventListener("click", function (e) {
      if (e.target === els.loginModal) closeLogin();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        closeLogin();
        closeDetailModal();
      }
    });
    els.loginForm.addEventListener("submit", onLoginSubmit);
    $("btn-logout").addEventListener("click", onLogout);
    $("form-jadwal").addEventListener("submit", onSubmit);
    $("btn-batal").addEventListener("click", clearForm);
    $("btn-reset-data").addEventListener("click", onResetData);
  }

  function init() {
    els.tabs = $("tabs-tanggal");
    els.tbody = $("tbody-jadwal");
    els.empty = $("empty-state");
    els.resultCount = $("result-count");
    els.fCari = $("f-cari");
    els.heroCari = $("hero-cari");
    els.btnClearSearch = $("btn-clear-search");
    els.btnHeroClear = $("btn-hero-clear");
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
    els.toastContainer = $("toast-container");

    bindEvents();
    loadData(true);

    /* Cek sesi login admin */
    Api.session().then(function (s) {
      if (s && s.loggedIn) {
        setAdminMode(true);
        $("current-user").textContent = s.user || "admin";
      }
    }).catch(function () {});

    /* Jam Digital Realtime */
    updateClock();
    setInterval(updateClock, 1000);

    /* Auto-refresh data tiap 30 detik & saat tab kembali aktif */
    setInterval(function () { loadData(false); }, REFRESH_MS);
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "visible") loadData(false);
    });

    $("tahun").textContent = new Date().getFullYear();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
