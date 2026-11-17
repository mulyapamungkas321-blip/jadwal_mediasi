/*
 * api.js - Pembungkus fetch ke API server
 */
var Api = (function () {
  "use strict";

  function request(url, options) {
    options = options || {};
    options.headers = Object.assign({ "Content-Type": "application/json" }, options.headers || {});
    options.credentials = "same-origin";
    return fetch(url, options).then(function (res) {
      var ct = res.headers.get("content-type") || "";
      var bodyPromise = ct.indexOf("application/json") !== -1 ? res.json() : res.text();
      return bodyPromise.then(function (body) {
        if (!res.ok) {
          var msg = (body && body.error) || (typeof body === "string" && body) || "Terjadi kesalahan.";
          var err = new Error(msg);
          err.status = res.status;
          throw err;
        }
        return body;
      });
    });
  }

  return {
    session: function () {
      return request("/api/session");
    },
    login: function (username, password) {
      return request("/api/login", {
        method: "POST",
        body: JSON.stringify({ username: username, password: password })
      });
    },
    logout: function () {
      return request("/api/logout", { method: "POST" });
    },
    getJadwal: function () {
      return request("/api/jadwal");
    },
    createJadwal: function (item) {
      return request("/api/jadwal", { method: "POST", body: JSON.stringify(item) });
    },
    updateJadwal: function (id, item) {
      return request("/api/jadwal/" + encodeURIComponent(id), {
        method: "PUT",
        body: JSON.stringify(item)
      });
    },
    deleteJadwal: function (id) {
      return request("/api/jadwal/" + encodeURIComponent(id), { method: "DELETE" });
    },
    resetJadwal: function () {
      return request("/api/reset", { method: "POST" });
    }
  };
})();
