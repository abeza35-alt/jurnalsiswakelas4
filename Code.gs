/**
 * ===========================================================================
 * SKRIP GABUNGAN: SINKRONISASI GOOGLE SHEET + UPLOAD DOKUMEN KE GOOGLE DRIVE
 * Aplikasi: Catatan Pengumpulan Tugas — SDIT Muhammadiyah Harjamukti
 * ===========================================================================
 *
 * FUNGSI SKRIP INI (SEKARANG SATU URL UNTUK DUA HAL):
 * 1. SINKRONISASI DUA ARAH data Siswa/Tugas/Guru/Jadwal/Jurnal dengan Google
 *    Sheet — dipanggil otomatis oleh tombol "Segarkan Data" di Dasbor.
 * 2. UPLOAD DOKUMEN — menerima berkas dari menu "Input Dokumen" lalu
 *    menyimpannya ke folder Google Drive sekolah (fungsi ini SAMA seperti
 *    skrip upload sebelumnya, hanya digabung ke sini).
 *
 * Skrip ini MENGGANTIKAN skrip "Upload Dokumen" yang lama — silakan ganti
 * ISI kode pada proyek Apps Script yang SAMA (jangan buat proyek baru),
 * supaya URL Web App tidak berubah dan aplikasi tidak perlu diatur ulang.
 *
 * -------------------------------------------------------------------------
 * CARA MEMASANG / MEMPERBARUI (± 5 menit):
 * -------------------------------------------------------------------------
 * 1. Buka https://script.google.com, buka proyek yang SUDAH ADA (yang berisi
 *    kode upload dokumen sebelumnya) — JANGAN buat proyek baru.
 * 2. Hapus SELURUH isi Code.gs yang lama, lalu SALIN-TEMPEL seluruh isi
 *    berkas ini menggantikannya.
 * 3. Cek bagian "KONFIGURASI" di bawah — pastikan SPREADSHEET_ID sudah sesuai
 *    dengan Google Sheet data Ananda (defaultnya sudah diisi otomatis sesuai
 *    link Spreadsheet yang tersimpan di aplikasi; ganti kalau ternyata beda).
 * 4. Klik ikon 💾 Simpan.
 * 5. Klik "Deploy" (Sebarkan) → "Manage deployments" (Kelola sebaran) →
 *    klik ikon pensil (Edit) pada sebaran yang aktif → di kolom "Version"
 *    pilih "New version" (Versi baru) → klik "Deploy" (Sebarkan).
 *    (PENTING: pakai "Manage deployments", BUKAN "New deployment", supaya
 *    URL Web App tetap SAMA seperti sebelumnya — aplikasi tidak perlu diatur
 *    ulang URL-nya.)
 * 6. Karena skrip ini sekarang juga mengakses Google Sheet (sebelumnya cuma
 *    Drive), Google mungkin akan minta izin akses TAMBAHAN. Kalau muncul
 *    layar izin: klik "Authorize access" (Izinkan akses) → pilih akun
 *    Google Ananda → kalau ada peringatan "belum diverifikasi", klik
 *    "Advanced"/"Lanjutan" → "Go to (nama proyek) (unsafe)" → "Allow"/
 *    "Izinkan". Ini AMAN karena skrip ini murni buatan/kendali Ananda
 *    sendiri.
 * 7. Selesai — URL Web App yang sudah tersimpan di aplikasi (menu
 *    Pengaturan & Guru → "Sinkronisasi & Upload Dokumen") TIDAK perlu
 *    diganti. Coba tekan "Segarkan Data" di Dasbor untuk menguji sinkron,
 *    dan coba menu "Input Dokumen" untuk menguji upload.
 *
 * CATATAN TAB/SHEET:
 * - Skrip ini otomatis membuat tab "siswa", "tugas", "guru", "jadwal", "jurnal",
 *   "literasi", "Numerasi log", dan "numerasiKaliBagi" di Spreadsheet kalau belum
 *   ada, lengkap dengan judul kolomnya.
 * - Kalau tab-tab tersebut SUDAH ADA (seperti pada Spreadsheet Ananda saat
 *   ini) dengan urutan kolom yang mungkin berbeda dari daftar di bawah,
 *   TIDAK APA-APA — skrip membaca/menulis berdasarkan NAMA judul kolom
 *   (baris pertama), bukan berdasarkan urutan kolom, jadi tetap kompatibel.
 * - Tab lama "numerasiLog" (tanpa spasi) otomatis diganti namanya menjadi
 *   "Numerasi log" saat skrip ini pertama kali berjalan — data yang sudah ada
 *   TIDAK hilang, hanya berpindah nama tab.
 * - Kolom "namaManual" pada tab "literasi" sudah digantikan kolom "nama".
 *   Untuk melengkapi baris data LAMA yang kolom "nama"-nya masih kosong (dan
 *   merapikan tampilan tanggal lama jadi "08 Agustus 2026"), jalankan SEKALI
 *   saja fungsi migrasiKolomLiterasi() lalu migrasiFormatTanggal() lewat
 *   editor Apps Script (pilih nama fungsinya di dropdown sebelah tombol Run,
 *   lalu klik Run). Data baru yang masuk setelahnya sudah otomatis rapi.
 * ===========================================================================
 */

// ====== KONFIGURASI ======

// ID Google Spreadsheet tempat data Siswa/Tugas/Guru/Jadwal/Jurnal disimpan.
// (diambil dari link Spreadsheet yang tersimpan di aplikasi — ganti kalau beda)
const SPREADSHEET_ID = "1kiBe13IFbWyM8iz5Rk9du0y9CLJzsWj3uNCbU6A6uks";

// ID folder Google Drive tujuan upload dokumen
// [PERBAIKAN] ID lama ("1hoIT8v8Fus_L34nL0B4hkPV0t50oT3Yc") sudah tidak berlaku/tidak bisa
// diakses oleh skrip ini — itu sebabnya upload dari menu "Input Dokumen" selalu gagal. Diganti
// sesuai link folder yang diberikan:
// https://drive.google.com/drive/u/0/folders/19lfD9WndPkYFuoIQtGGLToIKEBgsrYqs
const FOLDER_ID = "19lfD9WndPkYFuoIQtGGLToIKEBgsrYqs";

// Batas ukuran berkas yang diterima (MB) — sejalan dengan batas di sisi aplikasi
const MAX_FILE_MB = 15;

// [BARU] Token keamanan sederhana — HARUS SAMA PERSIS dengan SYNC_TOKEN di app.js. Web App
// ini dideploy dengan akses "Anyone" (supaya bisa dipanggil dari HP guru tanpa login Google),
// yang berarti URL-nya sendirian TIDAK cukup aman kalau sampai tersebar. Token ini jadi lapis
// pengaman tambahan: permintaan yang tidak menyertakan token yang cocok akan DITOLAK, walau
// URL Web App-nya diketahui orang lain.
const SYNC_TOKEN = "07346906d44542abb737b1acf2b6e83a";

// Cek token dari permintaan GET (query string ?token=...) maupun POST (field "token" di body
// JSON). Mengembalikan true kalau cocok. object `e` pada doGet selalu ada; pada doPost dicek
// lewat field token di `data` yang sudah di-parse (lihat pemanggilannya di doPost).
function cekToken_(tokenDiterima) {
  return typeof tokenDiterima === "string" && tokenDiterima === SYNC_TOKEN;
}

// Nama tab & daftar kolom per tabel. Kunci unik ("key") dipakai untuk
// mencocokkan baris yang sudah ada saat upsert (perbarui, bukan duplikat).
const TABLES = {
  siswa:  { sheet: "siswa",  key: "nis", headers: ["nis","nama","lp","hpOrtu","updatedAt"] },
  tugas:  { sheet: "tugas",  key: "id",  headers: ["id","nis","nama","mapel","tugas","tujuan","pekan","tanggal","status","catatan","updatedAt"] },
  guru:   { sheet: "guru",   key: "id",  headers: ["id","nama","hp","updatedAt"] },
  jadwal: { sheet: "jadwal", key: "id",  headers: ["id","hari","jam","waktu","mapel","updatedAt"] },
  jurnal: { sheet: "jurnal", key: "id",  headers: ["id","mapelKey","babNo","pertemuanNo","hariTanggal","realisasi","kendala","hadir","tidakHadir","ket","catatan","tercapai","updatedAt"] },
  // [BARU] Jurnal Literasi Siswa — 1 baris = 1 catatan bacaan peserta didik. Urutan kolom
  // disesuaikan PERSIS dengan urutan isian pada formulir "Isi Jurnal Literasi" di aplikasi
  // (Peserta Didik → Tanggal → Judul Buku → Buku Ke- → Halaman → Kesan → Paraf Ortu).
  // Kolom "namaManual" DIHAPUS — sekarang kolom "nama" SELALU berisi nama yang benar-benar
  // ditampilkan di aplikasi (baik dari Data Siswa maupun nama yang diisi manual), supaya kalau
  // Sheet ini dibuka langsung, nama peserta didik tetap terbaca tanpa perlu mencocokkan NIS.
  literasi: { sheet: "literasi", key: "id", headers: ["id","nis","nama","tanggal","judulBuku","bukuKe","halaman","kesan","parafOrtu","updatedAt"] },
  // [BARU] Numerasi — dipecah jadi 2 tab: "Numerasi log" (catatan tiap pertemuan 30 Menit
  // Numerasi) dan "numerasiKaliBagi" (penguasaan perkalian & pembagian per siswa, kunci NIS).
  // Nama TAB di Google Sheet sengaja diberi spasi ("Numerasi log") supaya enak dibaca kalau
  // Sheet dibuka manual — beda dengan "key" konfigurasi (numerasiLog) yang tidak boleh diubah
  // karena dipakai sebagai nama penyimpanan data di dalam aplikasi.
  // [PERBARUI] Catatan Numerasi sekarang PER SISWA (boleh pilih lebih dari 1 siswa sekaligus
  // di aplikasi — setiap siswa yang dipilih akan tersimpan sebagai 1 baris tersendiri di
  // Sheet ini). Kolom Jumlah Siswa/Rata-rata/Tuntas/Belum Tuntas (rekap gabungan per kelas)
  // SUDAH TIDAK DIPAKAI — digantikan kolom "nis"+"nama" supaya tiap baris jelas milik siswa
  // yang mana. Urutan kolom mengikuti urutan formulir "Catatan Hasil Pertemuan (Monitoring)".
  numerasiLog: { sheet: "Numerasi log", legacyNames: ["numerasiLog"], key: "id", headers: ["id","nis","nama","tanggal","materi","catatan","kategori","updatedAt"] },
  numerasiKaliBagi: { sheet: "numerasiKaliBagi", key: "nis", headers: ["nis","nama","perkalian1_5","perkalian6_10","pembagian1_5","pembagian6_10","catatan","updatedAt"] },
  // [BARU] Ujian — nilai per siswa, per mata pelajaran, per semester, per jenis ujian
  // (Formatif 1-10 disingkat F1-F10, Sumatif Tengah Semester = STS, Sumatif Akhir Semester = SAS).
  ujian: { sheet: "ujian", key: "id", headers: ["id","nis","nama","mapel","semester","jenisUjian","nilai","catatan","updatedAt"] },
  // [BARU] Penilaian Proyek Kokurikuler (rubrik 4 kriteria, per pertemuan Jumat).
  // "tanggal" ikut diformat otomatis (lihat upsertRow) kalau formatnya YYYY-MM-DD.
  kokurikulerNilai: { sheet: "kokurikulerNilai", key: "id", headers: ["id","nis","nama","babNo","bulan","pertemuanNo","topik","tanggal","k1","k2","k3","k4","totalSkor","nilaiAkhir","predikat","catatan","updatedAt"] }
};

// ====== doGet — DIPANGGIL SAAT "Segarkan Data" MENARIK DATA DARI SHEET ======
function doGet(e) {
  try {
    // [BARU] Tolak permintaan yang token-nya tidak ada/tidak cocok.
    const token = e && e.parameter ? e.parameter.token : null;
    if (!cekToken_(token)) {
      return jsonResponse({ ok: false, error: "Token tidak valid atau tidak disertakan." });
    }
    const out = { ok: true };
    for (const key of Object.keys(TABLES)) {
      out[key] = readTable(key);
    }
    return jsonResponse(out);
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

// ====== doPost — DIPANGGIL SAAT MENGIRIM PERUBAHAN (sinkron) ATAU UPLOAD BERKAS ======
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse({ ok: false, error: "Tidak ada data yang dikirim." });
    }
    const data = JSON.parse(e.postData.contents);

    // [BARU] Tolak permintaan yang token-nya tidak ada/tidak cocok.
    if (!cekToken_(data.token)) {
      return jsonResponse({ ok: false, error: "Token tidak valid atau tidak disertakan." });
    }

    if (data.mode === "upload") return handleUpload(data);
    if (data.mode === "single") return handleSingle(data);
    if (data.mode === "bulk") return handleBulk(data);

    return jsonResponse({ ok: false, error: "Mode tidak dikenali." });
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

// ---------- Upload Dokumen ke Google Drive (sama seperti skrip sebelumnya) ----------
function handleUpload(data) {
  if (!data.filename || !data.dataBase64) {
    return jsonResponse({ ok: false, error: "Berkas atau nama berkas tidak lengkap." });
  }
  const approxBytes = Math.floor((data.dataBase64.length * 3) / 4);
  if (approxBytes > MAX_FILE_MB * 1024 * 1024) {
    return jsonResponse({ ok: false, error: "Berkas melebihi batas ukuran " + MAX_FILE_MB + "MB." });
  }
  // [PERBAIKAN] Dibungkus try/catch tersendiri dengan pesan yang lebih jelas — sebelumnya
  // kalau FOLDER_ID salah/tidak bisa diakses, errornya cuma pesan teknis bawaan Google yang
  // membingungkan. Sekarang tegas menyebut kemungkinan penyebabnya.
  let folder;
  try {
    folder = DriveApp.getFolderById(FOLDER_ID);
  } catch (err) {
    return jsonResponse({ ok: false, error: "Folder Google Drive tujuan (FOLDER_ID di Code.gs) tidak ditemukan atau tidak bisa diakses oleh akun yang men-deploy skrip ini. Pastikan FOLDER_ID sudah benar dan akun tersebut punya akses Editor ke folder itu. Detail: " + String(err && err.message ? err.message : err) });
  }
  const bytes = Utilities.base64Decode(data.dataBase64);
  const blob = Utilities.newBlob(bytes, data.mimeType || "application/octet-stream", data.filename);
  const file = folder.createFile(blob);
  return jsonResponse({
    ok: true,
    fileId: file.getId(),
    fileUrl: file.getUrl(),
    fileName: file.getName()
  });
}

// ---------- Sinkron: 1 baris (upsert / delete) — dipakai saat ada 1 perubahan lokal ----------
function handleSingle(data) {
  const cfg = TABLES[data.store];
  if (!cfg) return jsonResponse({ ok: false, error: "Tabel tidak dikenali: " + data.store });

  const lock = LockService.getScriptLock();
  lock.waitLock(25000);
  try {
    const sheet = getOrCreateSheet(cfg);
    if (data.action === "delete") {
      deleteRowByKey(sheet, cfg, (data.record || {})[cfg.key]);
    } else {
      upsertRow(sheet, cfg, data.record || {});
    }
    return jsonResponse({ ok: true });
  } finally {
    lock.releaseLock();
  }
}

// ---------- Sinkron: banyak baris sekaligus (upsert) — dipakai saat push data awal ----------
function handleBulk(data) {
  const cfg = TABLES[data.store];
  if (!cfg) return jsonResponse({ ok: false, error: "Tabel tidak dikenali: " + data.store });

  const records = Array.isArray(data.records) ? data.records : [];
  const lock = LockService.getScriptLock();
  lock.waitLock(25000);
  try {
    const sheet = getOrCreateSheet(cfg);
    for (const rec of records) upsertRow(sheet, cfg, rec);
    return jsonResponse({ ok: true, count: records.length });
  } finally {
    lock.releaseLock();
  }
}

// ====== Fungsi bantu (helper) — akses Spreadsheet & Sheet ======

function getSpreadsheet() {
  const ss = SPREADSHEET_ID ? SpreadsheetApp.openById(SPREADSHEET_ID) : SpreadsheetApp.getActive();
  // [BARU] Pastikan locale Spreadsheet Indonesia, supaya format tanggal "dd mmmm yyyy" yang
  // dipasang di upsertRow() SELALU tampil dengan nama bulan Indonesia (mis. "Agustus"),
  // bukan bahasa lain, apa pun pengaturan locale Spreadsheet sebelumnya.
  try { if (ss.getSpreadsheetLocale() !== "id_ID") ss.setSpreadsheetLocale("id_ID"); } catch (e) {}
  return ss;
}

// Buka tab sesuai konfigurasi; buat baru + tulis judul kolom kalau belum ada.
// Kalau tab sudah ada tapi ada kolom yang belum tercatat di judulnya, kolom
// yang kurang otomatis ditambahkan di ujung kanan (tidak mengubah kolom lain).
function getOrCreateSheet(cfg) {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(cfg.sheet);
  // [BARU] Kalau tab dengan nama BARU (cfg.sheet, mis. "Numerasi log") belum ada, tapi tab
  // dengan nama LAMA (cfg.legacyNames, mis. "numerasiLog" dari versi skrip sebelumnya) sudah
  // ada dan berisi data — GANTI NAMA tab lama itu, jangan buat tab baru yang kosong. Ini
  // mencegah data yang sudah ada "hilang" (sebenarnya cuma pindah nama tab) saat skrip
  // diperbarui.
  if (!sheet && cfg.legacyNames) {
    for (const namaLama of cfg.legacyNames) {
      const legacy = ss.getSheetByName(namaLama);
      if (legacy) { legacy.setName(cfg.sheet); sheet = legacy; break; }
    }
  }
  if (!sheet) {
    sheet = ss.insertSheet(cfg.sheet);
  }
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, cfg.headers.length).setValues([cfg.headers]);
  } else {
    const lastCol = sheet.getLastColumn();
    const existingHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(h => String(h).trim());
    const missing = cfg.headers.filter(h => existingHeaders.indexOf(h) === -1);
    if (missing.length) {
      sheet.getRange(1, lastCol + 1, 1, missing.length).setValues([missing]);
    }
  }
  return sheet;
}

// Baca seluruh baris data sebuah tabel jadi array of object, berdasarkan
// judul kolom pada baris pertama (fleksibel walau urutan kolom di Sheet
// berbeda dari daftar TABLES di atas).
function readTable(key) {
  const cfg = TABLES[key];
  const sheet = getOrCreateSheet(cfg);
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow < 2) return [];

  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(h => String(h).trim());
  const values = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  const out = [];
  for (const row of values) {
    if (row.every(v => v === "" || v === null)) continue; // lewati baris kosong
    const obj = {};
    headers.forEach((h, i) => {
      if (!h) return;
      let v = row[i];
      if (v instanceof Date) {
        v = Utilities.formatDate(v, Session.getScriptTimeZone(), "yyyy-MM-dd");
      }
      obj[h] = v;
    });
    out.push(obj);
  }
  return out;
}

// Cari nomor baris (1-indexed, termasuk baris judul) yang kolom kuncinya
// cocok dengan keyValue. Mengembalikan -1 kalau tidak ditemukan.
function findRowIndexByKey(sheet, cfg, keyValue) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;
  const lastCol = sheet.getLastColumn();
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const keyCol = headers.indexOf(cfg.key);
  if (keyCol === -1) return -1;
  const values = sheet.getRange(2, keyCol + 1, lastRow - 1, 1).getValues();
  for (let i = 0; i < values.length; i++) {
    if (String(values[i][0]).trim() === String(keyValue).trim()) return i + 2;
  }
  return -1;
}

// [BARU] Ubah teks tanggal "YYYY-MM-DD" (format bawaan kotak tanggal aplikasi) menjadi
// objek Date asli. Dipakai supaya kolom "tanggal" di Sheet BENAR-BENAR bertipe tanggal
// (bukan teks) sehingga bisa ditampilkan dengan format panjang "08 Agustus 2026" lewat
// setNumberFormat — dan supaya bisa diurutkan/difilter dengan benar kalau dibuka manual.
function toDateJikaFormatISO_(v) {
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const p = v.split("-").map(Number);
    return new Date(p[0], p[1] - 1, p[2]);
  }
  return v;
}

// Simpan 1 baris: perbarui kalau kuncinya sudah ada (kolom yang tidak
// dikirim tetap dipertahankan nilainya), atau tambah baris baru kalau belum.
function upsertRow(sheet, cfg, record) {
  const lastCol = sheet.getLastColumn();
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const keyValue = record[cfg.key];
  if (keyValue === undefined || keyValue === null || keyValue === "") return;

  const tulisNilai = (h, v) => (h === "tanggal") ? toDateJikaFormatISO_(v) : v;

  const rowIdx = findRowIndexByKey(sheet, cfg, keyValue);
  let targetRow;
  if (rowIdx > 0) {
    const existing = sheet.getRange(rowIdx, 1, 1, headers.length).getValues()[0];
    const merged = headers.map((h, i) => (record[h] !== undefined ? tulisNilai(h, record[h]) : existing[i]));
    sheet.getRange(rowIdx, 1, 1, headers.length).setValues([merged]);
    targetRow = rowIdx;
  } else {
    const newRow = headers.map(h => (record[h] !== undefined ? tulisNilai(h, record[h]) : ""));
    sheet.appendRow(newRow);
    targetRow = sheet.getLastRow();
  }

  // [BARU] Kalau tabel ini punya kolom "tanggal", set format tampilannya jadi
  // "08 Agustus 2026" (tanggal - nama bulan - tahun) supaya tidak pernah salah baca
  // (mis. tertukar dengan format bulan/tanggal ala Amerika) saat Sheet dibuka manual.
  const tglCol = headers.indexOf("tanggal");
  if (tglCol !== -1) {
    sheet.getRange(targetRow, tglCol + 1).setNumberFormat("dd mmmm yyyy");
  }
}

// Hapus 1 baris berdasarkan nilai kolom kunci.
function deleteRowByKey(sheet, cfg, keyValue) {
  if (keyValue === undefined || keyValue === null || keyValue === "") return;
  const rowIdx = findRowIndexByKey(sheet, cfg, keyValue);
  if (rowIdx > 0) sheet.deleteRow(rowIdx);
}

// ===========================================================================
// ====== [BARU] FUNGSI MIGRASI SATU KALI (jalankan manual lewat editor) =====
// ===========================================================================
// Kedua fungsi di bawah TIDAK dipanggil otomatis oleh aplikasi (tidak
// dipanggil dari doGet/doPost) — sengaja harus dijalankan SEKALI SAJA secara
// manual oleh operator lewat editor Apps Script, khusus untuk merapikan data
// LAMA yang sudah ada di Sheet sebelum pembaruan ini dipasang. Cara menjalankan:
// buka https://script.google.com pada proyek ini → pilih nama fungsi di
// dropdown sebelah tombol "Run" (▷) di bagian atas editor → klik "Run".
// Data baru yang masuk setelah skrip ini di-deploy akan otomatis rapi tanpa
// perlu migrasi ini.

// Merapikan tab "literasi": ganti judul kolom "namaManual" (kalau masih ada)
// menjadi "nama", lalu isi otomatis kolom "nama" yang masih kosong dengan
// mencocokkan NIS ke tab "siswa" — supaya catatan literasi lama (yang
// tersambung ke Data Siswa) ikut menampilkan nama, bukan kosong.
function migrasiKolomLiterasi() {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName("literasi");
  if (!sheet || sheet.getLastRow() < 1) { return "Tab literasi tidak ditemukan atau masih kosong."; }

  const lastCol = sheet.getLastColumn();
  const headerRange = sheet.getRange(1, 1, 1, lastCol);
  const headers = headerRange.getValues()[0].map(h => String(h).trim());

  const idxManual = headers.indexOf("namaManual");
  if (idxManual !== -1 && headers.indexOf("nama") === -1) {
    sheet.getRange(1, idxManual + 1).setValue("nama");
    headers[idxManual] = "nama";
  }

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return "Judul kolom sudah diperbarui. Belum ada baris data untuk dilengkapi.";

  const idxNama = headers.indexOf("nama");
  const idxNis = headers.indexOf("nis");
  if (idxNama === -1 || idxNis === -1) return "Kolom nama/nis tidak ditemukan di tab literasi.";

  // Ambil peta NIS -> Nama dari tab siswa.
  const siswaSheet = ss.getSheetByName("siswa");
  const petaNama = {};
  if (siswaSheet && siswaSheet.getLastRow() > 1) {
    const sHeaders = siswaSheet.getRange(1, 1, 1, siswaSheet.getLastColumn()).getValues()[0];
    const sNisCol = sHeaders.indexOf("nis");
    const sNamaCol = sHeaders.indexOf("nama");
    if (sNisCol !== -1 && sNamaCol !== -1) {
      const sVals = siswaSheet.getRange(2, 1, siswaSheet.getLastRow() - 1, siswaSheet.getLastColumn()).getValues();
      sVals.forEach(r => { if (r[sNisCol] !== "") petaNama[String(r[sNisCol]).trim()] = r[sNamaCol]; });
    }
  }

  const data = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  let terisi = 0;
  for (let i = 0; i < data.length; i++) {
    const namaSaatIni = String(data[i][idxNama] || "").trim();
    const nis = String(data[i][idxNis] || "").trim();
    if (!namaSaatIni && nis && petaNama[nis]) {
      data[i][idxNama] = petaNama[nis];
      terisi++;
    }
  }
  if (terisi > 0) sheet.getRange(2, 1, data.length, lastCol).setValues(data);
  return `Selesai. Kolom "nama" dilengkapi otomatis untuk ${terisi} baris data lama.`;
}

// Merapikan format tampilan kolom "tanggal" (jadi "08 Agustus 2026") untuk
// SEMUA baris yang SUDAH ADA di tab tugas, literasi, dan "Numerasi log" —
// termasuk baris lama yang tanggalnya masih tersimpan sebagai teks biasa.
function migrasiFormatTanggal() {
  const ss = getSpreadsheet();
  const hasil = [];
  ["tugas", "literasi", "Numerasi log", "numerasiLog"].forEach(namaTab => {
    const sheet = ss.getSheetByName(namaTab);
    if (!sheet || sheet.getLastRow() < 2) return;
    const lastCol = sheet.getLastColumn();
    const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    const tglCol = headers.indexOf("tanggal");
    if (tglCol === -1) return;
    const lastRow = sheet.getLastRow();
    const range = sheet.getRange(2, tglCol + 1, lastRow - 1, 1);
    const values = range.getValues();
    let diubah = 0;
    for (let i = 0; i < values.length; i++) {
      const v = toDateJikaFormatISO_(values[i][0]);
      if (v !== values[i][0]) { values[i][0] = v; diubah++; }
    }
    range.setValues(values);
    range.setNumberFormat("dd mmmm yyyy");
    hasil.push(`${namaTab}: ${diubah} baris dirapikan.`);
  });
  return hasil.length ? hasil.join(" | ") : "Tidak ada tab yang cocok ditemukan.";
}

// [BARU] Jalankan SEKALI lewat editor Apps Script (pilih "buatSemuaTab" di dropdown
// sebelah tombol Run ▷, lalu klik Run) untuk memaksa SEMUA tab (siswa, tugas, guru, jadwal,
// jurnal, literasi, Numerasi log, numerasiKaliBagi, ujian, kokurikulerNilai) langsung dibuat
// di Spreadsheet ini kalau belum ada — lengkap dengan judul kolomnya, walau masih kosong.
// Berguna untuk memastikan tab tertentu (mis. "kokurikulerNilai") langsung muncul tanpa perlu
// menunggu tersentuh sinkron dari aplikasi dulu.
function buatSemuaTab() {
  const dibuat = [];
  for (const key of Object.keys(TABLES)) {
    const ss = getSpreadsheet();
    const sudahAda = !!ss.getSheetByName(TABLES[key].sheet);
    getOrCreateSheet(TABLES[key]);
    if (!sudahAda) dibuat.push(TABLES[key].sheet);
  }
  return dibuat.length ? `Tab baru dibuat: ${dibuat.join(", ")}` : "Semua tab sudah ada, tidak ada yang perlu dibuat.";
}

// [BARU] Jalankan SEKALI lewat editor Apps Script (pilih "cekAksesFolder" di dropdown
// sebelah tombol Run ▷, lalu klik Run) KHUSUS untuk memicu layar izin akses Google Drive.
// Kalau upload dokumen gagal dengan pesan "Anda tidak memiliki izin untuk memanggil
// DriveApp...", itu tandanya skrip ini belum pernah disetujui akses Drive-nya — deploy web
// app biasa TIDAK SELALU memunculkan layar izin tambahan untuk scope baru, jadi harus dipicu
// manual dengan menjalankan fungsi ini langsung dari editor. Setelah menjalankan ini dan
// mengklik "Authorize access" (lalu "Advanced" → "Go to ... (unsafe)" → "Allow" kalau muncul
// peringatan belum diverifikasi), ULANGI langkah Deploy → Manage deployments → New version →
// Deploy supaya Web App-nya ikut memakai izin yang baru saja disetujui.
function cekAksesFolder() {
  const folder = DriveApp.getFolderById(FOLDER_ID);
  return "Akses folder OK — nama folder: " + folder.getName();
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
