/* ============================================================
   Catatan Pengumpulan Tugas — SDIT Muhammadiyah Harjamukti
   app.js — logic, storage, rendering
   ============================================================ */

/* [BARU] ---------- Helper DOM "aman" (null-safe) ----------
   Dipakai supaya kalau berkas index.html yang ter-pasang di hosting BELUM
   versi terbaru (mis. saat proses upload berkas belum lengkap/tercampur versi
   lama & baru), aplikasi TIDAK LANGSUNG CRASH TOTAL ("Cannot set properties
   of null") hanya karena satu elemen yang belum ada — cukup elemen itu saja
   yang dilewati (skip), fungsi lain tetap lanjut jalan normal. Ini lapis
   pertahanan tambahan; perbaikan utamanya tetap: pastikan SEMUA berkas
   (index.html, app.js, style.css, dst.) selalu diganti bersamaan versi
   terbarunya, jangan campur versi lama & baru. */
function $id(id){ return document.getElementById(id); }
function setVal(id, val){ const el = $id(id); if(el) el.value = val; else console.warn(`[app] Elemen #${id} tidak ditemukan di HTML — lewati (kemungkinan index.html belum versi terbaru).`); return el; }
function setHidden(id, val){ const el = $id(id); if(el) el.hidden = val; else console.warn(`[app] Elemen #${id} tidak ditemukan di HTML — lewati (kemungkinan index.html belum versi terbaru).`); return el; }
function setText(id, val){ const el = $id(id); if(el) el.textContent = val; else console.warn(`[app] Elemen #${id} tidak ditemukan di HTML — lewati (kemungkinan index.html belum versi terbaru).`); return el; }
function onClick(id, fn){ const el = $id(id); if(el) el.addEventListener("click", fn); else console.warn(`[app] Elemen #${id} tidak ditemukan di HTML — lewati (kemungkinan index.html belum versi terbaru).`); return el; }

/* [BARU] ---------- Pemuatan pustaka berat secara "malas" (lazy-load) ----------
   jsPDF (~420KB), jsPDF-autoTable (~32KB), dan XLSX (~880KB) — total lebih dari
   1,3 MB kode — SEBELUMNYA dimuat otomatis lewat <script> di index.html setiap
   kali aplikasi dibuka, padahal hanya benar-benar dipakai kalau guru menekan
   tombol Ekspor PDF/Excel, Impor Excel, Unduh Template, atau Kirim WA. Dasbor,
   Input Tugas, Jurnal Mengajar, dsb. sama sekali tidak menyentuhnya.
   Supaya aplikasi terasa lebih ringan & cepat dibuka sehari-hari (unduhan awal
   lebih kecil, HP tidak perlu mem-parsing/menjalankan 1,3 MB kode yang belum
   tentu dipakai, baterai/RAM lebih hemat), sekarang pustaka-pustaka ini HANYA
   diunduh sekali, TEPAT SEBELUM dipakai pertama kali (baru muncul toast
   "Menyiapkan modul…" sesaat), lalu disimpan di memori supaya panggilan
   berikutnya dalam sesi yang sama tidak mengunduh ulang. Chart.js (dipakai
   Dasbor, yang memang dibuka di awal hampir setiap sesi) tetap dimuat seperti
   biasa lewat index.html, cukup dengan atribut "defer" agar tidak memblokir
   tampilan awal halaman. */
const LIB_URLS = {
  jspdf:     "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
  autotable: "https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.1/jspdf.plugin.autotable.min.js",
  xlsx:      "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"
};
const _libLoadPromises = {};
function loadScriptOnce(key){
  if(_libLoadPromises[key]) return _libLoadPromises[key];
  _libLoadPromises[key] = new Promise((resolve, reject)=>{
    const s = document.createElement("script");
    s.src = LIB_URLS[key];
    s.onload = ()=>resolve(true);
    s.onerror = ()=>{ delete _libLoadPromises[key]; reject(new Error("Gagal memuat "+key)); };
    document.head.appendChild(s);
  });
  return _libLoadPromises[key];
}
/* Pastikan jsPDF + plugin autoTable siap dipakai sebelum membuat PDF apa pun.
   Mengembalikan true kalau berhasil; kalau gagal (mis. tidak ada internet saat
   pertama kali dipakai), menampilkan toast dan mengembalikan false — pemanggil
   tinggal `if(!(await ensurePdfLib())) return;` lalu lanjut seperti biasa. */
async function ensurePdfLib(){
  try{
    if(!window.jspdf){ toast("Menyiapkan modul PDF…", "info"); await loadScriptOnce("jspdf"); }
    if(typeof window.jspdf.jsPDF.API.autoTable !== "function") await loadScriptOnce("autotable");
    return true;
  }catch(e){
    toast("Gagal memuat modul PDF. Pastikan koneksi internet aktif, lalu coba lagi.");
    return false;
  }
}
/* Sama seperti ensurePdfLib() tapi untuk pustaka XLSX (Ekspor/Impor/Template Excel). */
async function ensureXlsxLib(){
  try{
    if(!window.XLSX){ toast("Menyiapkan modul Excel…", "info"); await loadScriptOnce("xlsx"); }
    return true;
  }catch(e){
    toast("Gagal memuat modul Excel. Pastikan koneksi internet aktif, lalu coba lagi.");
    return false;
  }
}

/* ---------- Master seed data ---------- */
const SEED_STUDENTS = [
  ["3160169851","ADZKIYA KAMILIA SYAFA","P"],
  ["3163197679","ARFAN KHAIRUL ANAM","L"],
  ["3178334464","ARIMBI AL FATIH","P"],
  ["3172689526","ATHAFARIZ BIMA MAHENDRA","L"],
  ["3169935080","AZKADINA GIANTARA BILQIS","P"],
  ["3172967664","BINAR MIKHAYLA","P"],
  ["3160268656","DAMAR PRAMUDIA NUGRAHA","L"],
  ["3169970983","DZAKIYA SYAKIRA ALA'LA","P"],
  ["3179284419","FARIZ HAMIZAN PRATIKTO","L"],
  ["0133784113","HADIL MAHASIN ALI","L"],
  ["3171202211","KHIAR FIRZA RAMADHAN ADITAMA","L"],
  ["3161958909","MUHAMAD AZKA RAFASYA","L"],
  ["3170055398","MUHAMMAD ZAYIN BRIAN AZKA","L"],
  ["3171159628","MUHAMMAD RIZAL AHNAF FILLAH","L"],
  ["3161966545","QAISHARA AZRINA ATMAKALYANI","P"],
  ["3163663651","WIRDAN DZAKI HAIDAR HIDAYAT","L"],
  ["3165249588","VARISHA AZZAHRA HANDIANA","P"]
].map(([nis,nama,lp])=>({nis,nama,lp}));

/* [BARU] Nomor HP Orang Tua/Wali — urutan sejajar dengan SEED_STUDENTS di atas
   (baris ke-1 SEED_PHONES_ORTU = nomor ortu baris ke-1 SEED_STUDENTS, dst).
   Dipakai untuk tombol "Kirim WA" pada Data Tugas. */
const SEED_PHONES_ORTU = [
  "081220573110","081808808714","081318010444","0881023673479","081350019914",
  "08996300481","081323866189","08997110911","082321413985","081312628240",
  "087829966136","085295370200","085882525868","085797310038","08567679236",
  "082246504325","087700037907"
];
SEED_STUDENTS.forEach((s,i)=>{ s.hpOrtu = SEED_PHONES_ORTU[i] || ""; });

/* [BARU] Daftar kontak "Guru" pada menu Pengaturan (terpisah dari nomor ortu di atas).
   Hanya diisi 1 nama contoh (Guru Kelas) — silakan ganti nama & nomor HP-nya lewat
   menu Pengaturan & Guru, atau tambah guru lain lewat menu yang sama bila perlu. */
/* [PERBAIKAN] id guru SEBELUMNYA berupa ANGKA (1), beda sendiri dari semua store lain yang
   selalu memakai id bertipe TEKS (uuid() atau "seed-jadwal-1" dst). Ini penyebab sinkron Guru
   "macet": saat id angka ini ditarik balik dari Google Sheet, kode sinkron memaksanya jadi
   TEKS ("1") supaya bisa dibandingkan — tapi IndexedDB membedakan kunci angka 1 dari kunci
   teks "1" sebagai DUA baris yang berbeda, bukan satu. Baris LAMA (kunci angka) selalu
   "menang" tampil duluan (angka diurutkan sebelum teks), sehingga data guru yang baru ditarik
   dari Sheet seolah tidak pernah masuk ke aplikasi walau sudah tersinkron di baliknya. Sudah
   diperbaiki jadi id teks dari awal + ada migrasi otomatis (migrateGuruIdTypes()) untuk
   merapikan pemasangan yang sudah telanjur punya baris ganda. */
const SEED_GURU = [
  { id:"guru-1", Agung Surya Permadi, S.Pd.I:"", hp:"081220573110" }
];

const SCHOOL = {
  nama:"SDIT Muhammadiyah Harjamukti Kota Cirebon",
  tahun:"2026/2027"
};

/* [BARU] ---------- Pengaturan Sekolah & Kelas (Kelas, Tahun Pelajaran, Semester) ----------
   Disimpan di localStorage supaya otomatis dipakai di judul halaman Jadwal, pesan WhatsApp,
   Ekspor PDF, Ekspor Excel, dan Cetak. Guru tinggal mengubahnya sekali lewat menu Pengaturan
   tanpa perlu mengedit kode aplikasi.
   Catatan: pengaturan "Nama Kepala Sekolah" & tanda tangannya sudah dihapus dari seluruh
   ekspor sesuai permintaan — yang dicetak/ditandatangani sekarang hanya Guru Kelas.
   [BARU] Field "Wali Kelas" di panel ini juga sudah dihapus — nama guru kini diambil
   langsung dari satu-satunya entri pada panel "Data Guru / Kontak" (lihat getGuruName()). */
const SET_KEYS = {
  kelas:"sditmuha_kelas",
  tahun:"sditmuha_tahun_pelajaran",
  semester:"sditmuha_semester"
};
const DEFAULT_KELAS = "4 Ubay bin Kaab";
function getSchoolSettings(){
  return {
    kelas: localStorage.getItem(SET_KEYS.kelas) || DEFAULT_KELAS,
    tahun: localStorage.getItem(SET_KEYS.tahun) || SCHOOL.tahun,
    semester: localStorage.getItem(SET_KEYS.semester) || "Ganjil"
  };
}
function saveSchoolSettings(){
  const kelas = document.getElementById("set_kelas").value.trim() || DEFAULT_KELAS;
  const tahun = document.getElementById("set_tahun").value.trim() || SCHOOL.tahun;
  const semester = document.getElementById("set_semester").value;
  localStorage.setItem(SET_KEYS.kelas, kelas);
  localStorage.setItem(SET_KEYS.tahun, tahun);
  localStorage.setItem(SET_KEYS.semester, semester);
  updateSidebarTahun();
  if(STATE.view==="jadwal") renderJadwalKelasTitle();
  toast("Pengaturan kelas & sekolah berhasil disimpan.");
}
/* [BARU] ---------- Riwayat Nama Guru (untuk autocomplete di Data Guru / Kontak) ----------
   Setiap kali nama guru disimpan, namanya dicatat ke riwayat (localStorage) supaya
   lain waktu — mis. saat pindah semester lalu kembali memakai nama yang sama, atau
   sekadar mengingat ejaan nama & gelarnya — guru cukup ketik sedikit huruf lalu
   pilih dari daftar riwayat yang muncul, tanpa perlu mengetik ulang dari awal. */
const GURU_HISTORY_KEY = "sditmuha_guru_nama_history";
const GURU_HISTORY_MAX = 15;
function getGuruNameHistory(){
  try{
    const raw = localStorage.getItem(GURU_HISTORY_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.filter(Boolean) : [];
  }catch(e){ return []; }
}
function addGuruNameToHistory(nama){
  const n = (nama||"").trim();
  if(!n) return;
  let list = getGuruNameHistory();
  list = list.filter(x=> x.toLowerCase() !== n.toLowerCase());
  list.unshift(n);
  if(list.length > GURU_HISTORY_MAX) list = list.slice(0, GURU_HISTORY_MAX);
  try{ localStorage.setItem(GURU_HISTORY_KEY, JSON.stringify(list)); }catch(e){}
}
/* Pasang autocomplete pada input nama guru: menampilkan daftar riwayat (difilter
   sesuai apa yang sudah diketik) begitu kolom difokus/diketik, supaya guru bisa
   memilih nama yang sama seperti sebelumnya kalau ternyata sudah pernah dipakai. */
function wireGuruNameAutocomplete(){
  document.querySelectorAll(".guru-name-input").forEach(inp=>{
    const list = inp.parentElement ? inp.parentElement.querySelector(".autocomplete-list") : null;
    if(!list) return;
    const renderSuggestions = ()=>{
      const q = inp.value.trim().toLowerCase();
      const history = getGuruNameHistory();
      const matches = (q ? history.filter(n=> n.toLowerCase().includes(q) && n.toLowerCase()!==q) : history).slice(0,8);
      if(matches.length===0){ list.hidden = true; list.innerHTML = ""; return; }
      list.innerHTML = matches.map(n=>`<div class="autocomplete-item" data-val="${escapeHtml(n)}">${escapeHtml(n)}</div>`).join("");
      list.hidden = false;
    };
    inp.addEventListener("focus", renderSuggestions);
    inp.addEventListener("input", renderSuggestions);
    inp.addEventListener("blur", ()=>{ setTimeout(()=>{ list.hidden = true; }, 150); });
    list.addEventListener("mousedown", (e)=>{
      const item = e.target.closest(".autocomplete-item");
      if(!item) return;
      e.preventDefault();
      inp.value = item.dataset.val || "";
      list.hidden = true;
      inp.focus();
    });
  });
}
/* [BARU] Nama guru satu-satunya dari panel "Data Guru / Kontak", dipakai sebagai pengganti
   field "Wali Kelas" yang sudah dihapus — dipakai di tanda tangan WhatsApp & Jurnal. */
function getGuruName(){
  const g = STATE.guru && STATE.guru[0];
  return (g && g.nama ? g.nama : "").trim();
}
function updateSidebarTahun(){
  const set = getSchoolSettings();
  const el = document.getElementById("sidebarTahun");
  if(el) el.textContent = `Tahun Pelajaran ${set.tahun} — Semester ${set.semester}`;
}
/* [BARU] Nama kelas lengkap dgn awalan "Kelas ", dipakai di judul halaman Jadwal & pesan WA */
function getKelasNama(){
  return `Kelas ${getSchoolSettings().kelas}`;
}
/* [BARU] Tampilkan nama Kelas terkini di judul panel halaman Jadwal Pelajaran */
function renderJadwalKelasTitle(){
  const el = document.getElementById("jadwalKelasTitle");
  if(el) el.textContent = getKelasNama();
}

/* [BARU] Tanda tangan WhatsApp — memakai nama guru dari panel "Data Guru / Kontak" bila
   sudah diisi, jika belum diisi tetap memakai format umum "Wali Kelas <nama kelas>". */
function waSignature(){
  const set = getSchoolSettings();
  const namaGuru = getGuruName();
  return namaGuru ? `Wali Kelas ${set.kelas} — ${namaGuru}` : `Wali Kelas ${set.kelas}`;
}

/* ---------- IndexedDB layer ---------- */
const DB_NAME = "sditmuha_tugas_db";
const DB_VERSION = 8;
let dbp = null;

function openDB(){
  if(dbp) return dbp;
  dbp = new Promise((resolve,reject)=>{
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e)=>{
      const db = e.target.result;
      if(!db.objectStoreNames.contains("siswa")) db.createObjectStore("siswa",{keyPath:"nis"});
      if(!db.objectStoreNames.contains("tugas")) db.createObjectStore("tugas",{keyPath:"id", autoIncrement:true});
      if(!db.objectStoreNames.contains("guru")) db.createObjectStore("guru",{keyPath:"id"});
      if(!db.objectStoreNames.contains("meta")) db.createObjectStore("meta",{keyPath:"key"});
      /* [BARU] store Jadwal Pelajaran (bisa tambah/edit/hapus) */
      if(!db.objectStoreNames.contains("jadwal")) db.createObjectStore("jadwal",{keyPath:"id", autoIncrement:true});
      /* [BARU] store Jurnal Mengajar — isian per pertemuan (Hari/Tanggal, Realisasi, Kendala, dst) */
      if(!db.objectStoreNames.contains("jurnal")) db.createObjectStore("jurnal",{keyPath:"id"});
      /* [BARU] antrean sinkronisasi ke Google Sheet — menyimpan perubahan yang belum terkirim (mis. saat offline) */
      if(!db.objectStoreNames.contains("syncQueue")) db.createObjectStore("syncQueue",{keyPath:"qid", autoIncrement:true});
      /* [BARU] store Jurnal Literasi Siswa — catatan bacaan per peserta didik (judul buku, halaman,
         kesan, paraf orang tua), sesuai format Jurnal Literasi Siswa pada Buku Program Literasi Sekolah.
         Catatan: store ini HANYA tersimpan lokal di perangkat (IndexedDB) — belum ikut disinkronkan ke
         Google Sheet karena skrip Apps Script back-end saat ini belum mengenal store ini. */
      if(!db.objectStoreNames.contains("literasi")) db.createObjectStore("literasi",{keyPath:"id"});
      /* [BARU] store Program Numerasi — "numerasiLog" (catatan hasil tiap pertemuan 30 Menit Numerasi)
         dan "numerasiKaliBagi" (menu khusus pencatatan penguasaan perkalian & pembagian per siswa). */
      if(!db.objectStoreNames.contains("numerasiLog")) db.createObjectStore("numerasiLog",{keyPath:"id"});
      if(!db.objectStoreNames.contains("numerasiKaliBagi")) db.createObjectStore("numerasiKaliBagi",{keyPath:"nis"});
      /* [BARU] store Ujian — nilai per siswa, per mapel, per semester, per jenis ujian
         (Formatif 1-10, Sumatif Tengah Semester, Sumatif Akhir Semester). */
      if(!db.objectStoreNames.contains("ujian")) db.createObjectStore("ujian",{keyPath:"id"});
      /* [BARU] store Penilaian Proyek Kokurikuler (rubrik 4 kriteria per pertemuan Jumat). */
      if(!db.objectStoreNames.contains("kokurikulerNilai")) db.createObjectStore("kokurikulerNilai",{keyPath:"id"});
    };
    req.onsuccess = (e)=>resolve(e.target.result);
    req.onerror = (e)=>reject(e.target.error);
  });
  return dbp;
}

let useLocalStorageFallback = false;

async function idbAll(store){
  if(useLocalStorageFallback) return lsAll(store);
  try{
    const db = await openDB();
    return new Promise((resolve,reject)=>{
      const tx = db.transaction(store,"readonly");
      const req = tx.objectStore(store).getAll();
      req.onsuccess = ()=>resolve(req.result);
      req.onerror = ()=>reject(req.error);
    });
  }catch(err){ useLocalStorageFallback = true; return lsAll(store); }
}
async function idbPutRaw(store, val){
  if(useLocalStorageFallback) return lsPut(store,val);
  try{
    const db = await openDB();
    return new Promise((resolve,reject)=>{
      const tx = db.transaction(store,"readwrite");
      const req = tx.objectStore(store).put(val);
      req.onsuccess = ()=>resolve(req.result);
      req.onerror = ()=>reject(req.error);
    });
  }catch(err){ useLocalStorageFallback = true; return lsPut(store,val); }
}
async function idbDeleteRaw(store, key){
  if(useLocalStorageFallback) return lsDelete(store,key);
  try{
    const db = await openDB();
    return new Promise((resolve,reject)=>{
      const tx = db.transaction(store,"readwrite");
      const req = tx.objectStore(store).delete(key);
      req.onsuccess = ()=>resolve();
      req.onerror = ()=>reject(req.error);
    });
  }catch(err){ useLocalStorageFallback = true; return lsDelete(store,key); }
}
/* [BARU] idbPut/idbDelete dibungkus: untuk store "tugas", "siswa", "guru", "jadwal", "jurnal",
   "literasi", "numerasiLog", "numerasiKaliBagi", "ujian", "kokurikulerNilai", otomatis
   menambahkan id unik (UUID bila belum ada, supaya aman lintas perangkat) + updatedAt, lalu
   mengantrekan perubahan untuk dikirim ke Google Sheet (lihat blok Sinkronisasi Online).
   [PERBAIKAN] "ujian" & "kokurikulerNilai" SEBELUMNYA TIDAK ADA di daftar ini — akibatnya
   nilai Ujian & Kokurikuler yang disimpan/dihapus di menu masing-masing HANYA tersimpan lokal
   di HP guru, TIDAK PERNAH ikut terkirim otomatis ke Google Sheet lewat "Segarkan Data" (walau
   Code.gs & SYNC_TABLES sudah menyiapkan tab "ujian"-nya). Ini penyebab utama laporan "nilai
   Ujian tidak masuk ke Sheet". Sekarang keduanya ikut disinkron dua arah seperti tabel lain. */
const SYNCED_STORES = ["tugas","siswa","guru","jadwal","jurnal","literasi","numerasiLog","numerasiKaliBagi","ujian","kokurikulerNilai"];
/* [BARU] Store yang memakai kunci alami sendiri (bukan "id" hasil uuid()) — "siswa" pakai NIS,
   "numerasiKaliBagi" pakai NIS juga (1 baris per siswa). */
const NATURAL_KEY_STORES = ["siswa","numerasiKaliBagi"];
async function idbPut(store, val){
  if(SYNCED_STORES.includes(store)){
    if(!NATURAL_KEY_STORES.includes(store) && !val.id) val.id = uuid();
    val.updatedAt = new Date().toISOString();
    const result = await idbPutRaw(store, val);
    queueSync(store, "upsert", val);
    return result;
  }
  return idbPutRaw(store, val);
}
async function idbDelete(store, key){
  const result = await idbDeleteRaw(store, key);
  if(NATURAL_KEY_STORES.includes(store)) queueSync(store, "delete", { nis:key });
  else if(SYNCED_STORES.includes(store)) queueSync(store, "delete", { id:key });
  return result;
}
async function idbClear(store){
  if(useLocalStorageFallback) return lsClear(store);
  try{
    const db = await openDB();
    return new Promise((resolve,reject)=>{
      const tx = db.transaction(store,"readwrite");
      const req = tx.objectStore(store).clear();
      req.onsuccess = ()=>resolve();
      req.onerror = ()=>reject(req.error);
    });
  }catch(err){ useLocalStorageFallback = true; return lsClear(store); }
}

/* LocalStorage fallback helpers */
function lsKey(store){ return `sditmuha_${store}`; }
function lsAll(store){ return JSON.parse(localStorage.getItem(lsKey(store)) || "[]"); }
function lsPut(store, val){
  const arr = lsAll(store);
  if(store!=="siswa" && (val.id===undefined || val.id===null)){
    const maxId = arr.reduce((m,x)=>Math.max(m,x.id||0),0);
    val.id = maxId+1;
  }
  const keyField = store==="siswa"?"nis":"id";
  const idx = arr.findIndex(x=>x[keyField]===val[keyField]);
  if(idx>=0) arr[idx]=val; else arr.push(val);
  localStorage.setItem(lsKey(store), JSON.stringify(arr));
  return val[keyField];
}
function lsDelete(store, key){
  const keyField = store==="siswa"?"nis":"id";
  let arr = lsAll(store).filter(x=>x[keyField]!==key);
  localStorage.setItem(lsKey(store), JSON.stringify(arr));
}
function lsClear(store){ localStorage.setItem(lsKey(store), "[]"); }

/* ---------- App state ---------- */
let STATE = {
  siswa: [],
  tugas: [],
  guru: [],
  jadwal: [],
  view: "dashboard",
  editId: null,
  filters: { q:"", pekan:"", mapel:"", siswa:"", status:"", dari:"", sampai:"" },
  sort: { key:"tanggal", dir:"desc" },
  page: 1,
  pageSize: 12,
  chartPekan: null,
  chartMapel: null,
  chartTrend: null,
  trendMode: "minggu",
  jadwalEditId: null,
  /* [BARU] state navigasi & data isian Jurnal Mengajar */
  jurnalEntries: [],
  jurnal: { view:"mapel", mapelKey:null, babNo:null, openPertemuan:new Set() },
  /* [BARU] Filter Mapel di Data Siswa kini bisa pilih lebih dari satu (checklist) */
  siswaMapelFilter: new Set(),
  /* [BARU] state Jurnal Literasi Siswa */
  literasi: [],
  literasiEditId: null,
  literasiFilters: { q:"", siswa:"", paraf:"", dari:"", sampai:"" },
  /* [BARU] state Numerasi — dipisah sesuai tab Google Sheet-nya masing-masing,
     supaya ikut tersinkron dua arah lewat "Segarkan Data" (lihat SYNC_TABLES). */
  numerasiLog: [],
  numerasiKaliBagi: [],
  /* [BARU] state Ujian — nilai per siswa/mapel/semester/jenis ujian */
  ujian: [],
  /* [BARU] state Penilaian Proyek Kokurikuler (rubrik 4 kriteria per pertemuan Jumat) */
  kokurikulerNilai: []
};

/* [BARU] Data awal Jadwal Pelajaran — hanya mapel yang diampu (Matematika, IPAS,
   Seni, Pendidikan Pancasila, Literasi Numerasi), sumber: Jadwal Pelajaran Kelas IV
   Ubay bin Kaab Tahun Pelajaran 2026/2027. Dipakai sekali saat pertama kali dibuka
   (seed) — setelah itu sepenuhnya bisa diedit/ditambah/dihapus lewat menu Jadwal. */
/* [PERBAIKAN] Setiap entri sekarang punya "id" TETAP (bukan dibiarkan kosong).
   Sebelumnya id kosong ini membuat idbPut() men-generate UUID BARU setiap kali
   seedIfEmpty() berjalan di perangkat/instalasi baru — akibatnya jam pelajaran
   yang SAMA persis (hari/jam/mapel sama) tersimpan sebagai baris terpisah di
   Google Sheet setiap ada perangkat baru yang membuka aplikasi ini (itu salah
   satu penyebab "data jadwal ganda"). Dengan id tetap, penyemaian ulang di
   perangkat manapun akan selalu memperbarui baris yang sama, bukan menambah baru. */
const SEED_JADWAL = [
  { id:"seed-jadwal-1", hari:"Senin", jam:"4-5", waktu:"08.40 - 09.40", mapel:"Matematika" },
  { id:"seed-jadwal-2", hari:"Senin", jam:"11-13", waktu:"13.00 - 14.30", mapel:"Pendidikan Pancasila" },
  { id:"seed-jadwal-3", hari:"Senin", jam:"14", waktu:"14.30 - 15.00", mapel:"Literasi Numerasi (BI/Literasi)" },
  { id:"seed-jadwal-4", hari:"Selasa", jam:"11-12", waktu:"13.00 - 14.00", mapel:"IPAS" },
  { id:"seed-jadwal-5", hari:"Rabu", jam:"12-13", waktu:"13.30 - 14.30", mapel:"Matematika" },
  { id:"seed-jadwal-6", hari:"Rabu", jam:"14", waktu:"14.30 - 15.00", mapel:"Literasi Numerasi (MAT/Numerasi)" },
  { id:"seed-jadwal-7", hari:"Kamis", jam:"7-9", waktu:"10.00 - 11.30", mapel:"IPAS" },
  { id:"seed-jadwal-8", hari:"Kamis", jam:"11-12", waktu:"13.00 - 14.00", mapel:"Seni" }
];

/* ---------- Init & seed ---------- */
async function seedIfEmpty(){
  const siswa = await idbAll("siswa");
  if(siswa.length===0){
    for(const s of SEED_STUDENTS) await idbPut("siswa", s);
  }
  const guru = await idbAll("guru");
  if(guru.length===0){
    for(const g of SEED_GURU) await idbPut("guru", g);
  }
  /* [BARU] Seed Jadwal Pelajaran hanya pada pemasangan baru (belum pernah ada data jadwal) */
  const jadwal = await idbAll("jadwal");
  if(jadwal.length===0){
    for(const j of SEED_JADWAL) await idbPut("jadwal", j);
  }
}

async function loadAll(){
  STATE.siswa = (await idbAll("siswa")).sort((a,b)=>a.nama.localeCompare(b.nama));
  STATE.tugas = await idbAll("tugas");
  STATE.guru = await idbAll("guru");
  STATE.jadwal = await idbAll("jadwal");
  STATE.jurnalEntries = await idbAll("jurnal");
  STATE.literasi = (await idbAll("literasi")).sort((a,b)=> (b.tanggal||"").localeCompare(a.tanggal||""));
  /* [BARU] Numerasi — dimuat juga ke STATE (sebelumnya dibaca langsung lewat idbAll() di
     tempat lain) supaya ikut terdeteksi oleh proses tarik-data dua arah (pullFromSheet). */
  STATE.numerasiLog = (await idbAll("numerasiLog")).sort((a,b)=> (b.tanggal||"").localeCompare(a.tanggal||""));
  STATE.numerasiKaliBagi = await idbAll("numerasiKaliBagi");
  /* [BARU] Ujian — nilai per siswa per mapel/semester/jenis ujian. */
  STATE.ujian = await idbAll("ujian");
  /* [BARU] Penilaian Proyek Kokurikuler */
  STATE.kokurikulerNilai = await idbAll("kokurikulerNilai");
}

/* [BARU] Migrasi otomatis: mengubah label "Pekan N" yang lama menjadi "Bab N"
   pada data tugas yang sudah tersimpan di perangkat, supaya sejalan dengan
   penamaan baru (Bab 1–10) tanpa kehilangan data lama. */
async function migratePekanToBab(){
  let changed = false;
  for(const t of STATE.tugas){
    if(t.pekan && /^Pekan\s*\d+$/i.test(t.pekan)){
      t.pekan = t.pekan.replace(/^Pekan/i, "Bab");
      await idbPut("tugas", t);
      changed = true;
    }
  }
  if(changed) STATE.tugas = await idbAll("tugas");
}

/* [BARU] Migrasi otomatis: mengisi No. HP Ortu pada perangkat yang datanya
   sudah lebih dulu terpasang (dari versi sebelum fitur ini ada), dengan
   mencocokkan NIS terhadap SEED_STUDENTS. Nomor yang sudah diisi manual
   tidak akan ditimpa. */
async function migrateHpOrtu(){
  let changed = false;
  for(const s of STATE.siswa){
    if(!s.hpOrtu){
      const seed = SEED_STUDENTS.find(x=>String(x.nis)===String(s.nis));
      if(seed && seed.hpOrtu){ s.hpOrtu = seed.hpOrtu; await idbPut("siswa", s); changed = true; }
    }
  }
  if(changed) STATE.siswa = (await idbAll("siswa")).sort((a,b)=>a.nama.localeCompare(b.nama));
}

/* [BARU] Migrasi otomatis: NIS yang tersimpan sebagai ANGKA (biasanya karena kolom NIS
   di Google Sheet berformat Angka, bukan Teks, saat data pertama kali ditarik) diubah
   jadi teks. Tanpa ini, NIS angka tidak akan pernah cocok dengan NIS teks saat
   dibandingkan, sehingga kolom Tugas Tercatat/Sudah/Belum di Data Siswa selalu tampil 0
   walau datanya sebenarnya sudah ada. Berjalan sekali saja lalu tidak akan terulang lagi
   (lihat juga normalisasi di pullFromSheet). */
async function migrateNisTypes(){
  let changed = false;
  for(const s of STATE.siswa){
    if(typeof s.nis !== "string"){ s.nis = String(s.nis); await idbPut("siswa", s); changed = true; }
  }
  for(const t of STATE.tugas){
    let dirty = false;
    if(typeof t.nis !== "string"){ t.nis = String(t.nis); dirty = true; }
    if(typeof t.id !== "string"){ t.id = String(t.id); dirty = true; }
    if(dirty){ await idbPut("tugas", t); changed = true; }
  }
  if(changed){ STATE.siswa = await idbAll("siswa"); STATE.tugas = await idbAll("tugas"); }
}

/* [BARU] Bersihkan jam pelajaran yang ISINYA sama persis (hari + jam + mapel)
   tapi ID-nya berbeda-beda — sisa dari bug lama (edit jadwal / seed di
   perangkat baru sempat membuat baris duplikat, lihat catatan di atas).
   Baris yang DIPERTAHANKAN adalah yang updatedAt-nya PALING BARU; sisanya
   dihapus lewat idbDelete supaya penghapusan ini ikut tersinkron dan
   membersihkan duplikat di Google Sheet juga. Berjalan otomatis sekali di
   setiap boot; kalau tidak ada duplikat, tidak melakukan apa-apa. */
async function dedupJadwal(){
  const all = await idbAll("jadwal");
  const groups = {};
  for(const j of all){
    const key = [String(j.hari||""), String(j.jam||""), String(j.mapel||"").trim().toLowerCase()].join("||");
    (groups[key] = groups[key] || []).push(j);
  }
  let removed = false;
  for(const key of Object.keys(groups)){
    const items = groups[key];
    if(items.length < 2) continue;
    items.sort((a,b)=> String(a.updatedAt||"") < String(b.updatedAt||"") ? 1 : -1); // terbaru dulu
    const toDelete = items.slice(1);
    for(const d of toDelete){ await idbDelete("jadwal", d.id); removed = true; }
  }
  if(removed) STATE.jadwal = await idbAll("jadwal");
  return removed;
}

/* [PERBAIKAN] Migrasi otomatis id Guru: rapikan pemasangan LAMA yang masih punya baris guru
   dengan id ANGKA (seed lama, id:1) — termasuk kalau sempat ke-duplikat jadi 2 baris (angka
   & teks) akibat bug sinkron sebelum perbaikan ini. Baris yang DIPERTAHANKAN adalah yang
   updatedAt-nya PALING BARU (data paling relevan, baik dari lokal maupun yang sempat tersimpan
   di Sheet), dengan id ditulis ulang jadi teks "guru-1" supaya konsisten dengan store lain dan
   tidak lagi bikin baris ganda kalau ditarik/dikirim ke Google Sheet lagi. Berjalan otomatis
   sekali di setiap boot; kalau tidak ada yang perlu dirapikan, tidak melakukan apa-apa. */
async function migrateGuruIdTypes(){
  const all = await idbAll("guru");
  const bermasalah = all.filter(g=> typeof g.id !== "string" || /^\d+$/.test(g.id));
  if(!bermasalah.length) return false;

  // Baris "sehat" (id teks non-angka, mis. "guru-1") yang sudah ada — jangan sampai id barunya bentrok.
  const sehat = all.filter(g=> typeof g.id === "string" && !/^\d+$/.test(g.id));

  // Gabungkan semua baris bermasalah + baris sehat pertama (kalau ada) jadi SATU baris "guru-1",
  // pilih data dari yang updatedAt-nya paling baru (paling relevan).
  const kandidat = [...bermasalah, ...sehat];
  kandidat.sort((a,b)=> String(b.updatedAt||"") < String(a.updatedAt||"") ? -1 : 1); // terbaru dulu
  const terpilih = { ...kandidat[0], id:"guru-1" };

  for(const g of all) await idbDelete("guru", g.id);
  await idbPut("guru", terpilih);
  STATE.guru = await idbAll("guru");
  return true;
}

/* ---------- Utilities ---------- */
function fmtDate(iso){
  if(!iso) return "-";
  /* [PERBAIKAN] Kalau nilainya sudah berupa timestamp LENGKAP (mis. dari sel
     Google Sheet yang sempat otomatis berubah jadi tipe Tanggal, contoh:
     "2026-08-14T11:04:49.359Z"), ambil bagian TANGGAL-nya saja (10 karakter
     pertama, YYYY-MM-DD) sebelum diproses. Sebelumnya kode ini menempelkan
     "T00:00:00" ke string yang sudah punya "T...", hasilnya jadi tidak valid
     dan fungsi ini malah menampilkan timestamp mentahnya apa adanya. */
  const datePart = /^\d{4}-\d{2}-\d{2}/.test(String(iso)) ? String(iso).slice(0,10) : String(iso);
  const d = new Date(datePart+"T00:00:00");
  if(isNaN(d)) return iso;
  return d.toLocaleDateString("id-ID",{day:"2-digit",month:"long",year:"numeric"});
}
function todayISO(){
  const d = new Date();
  return d.toISOString().slice(0,10);
}
/* [BARU] toast() sekarang otomatis mendeteksi jenis aksi (tambah/perbarui/hapus/info)
   dari kata kunci pada pesannya sendiri, lalu menampilkan ikon + warna aksen yang
   sesuai — supaya popup yang muncul dari bawah ini tidak cuma teks polos, tapi juga
   langsung memberi informasi jenis perubahan apa yang baru saja terjadi (mis. lonceng
   hijau untuk data baru, biru untuk pembaruan, merah untuk penghapusan). Parameter
   `type` opsional dapat dipaksa manual ("add"|"update"|"delete"|"warn"|"info") kalau
   deteksi kata kunci tidak diperlukan. */
const TOAST_ICONS = {
  add:    `<svg viewBox="0 0 24 24" width="18" height="18"><circle cx="12" cy="12" r="10" fill="currentColor" opacity=".18"/><path d="M12 7v10M7 12h10" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" fill="none"/></svg>`,
  update: `<svg viewBox="0 0 24 24" width="18" height="18"><circle cx="12" cy="12" r="10" fill="currentColor" opacity=".18"/><path d="M12 7v5l3.2 2" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`,
  delete: `<svg viewBox="0 0 24 24" width="18" height="18"><circle cx="12" cy="12" r="10" fill="currentColor" opacity=".18"/><path d="M8 8l8 8M16 8l-8 8" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" fill="none"/></svg>`,
  warn:   `<svg viewBox="0 0 24 24" width="18" height="18"><circle cx="12" cy="12" r="10" fill="currentColor" opacity=".18"/><path d="M12 7.5v6M12 16.5h.01" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" fill="none"/></svg>`,
  info:   `<svg viewBox="0 0 24 24" width="18" height="18"><circle cx="12" cy="12" r="10" fill="currentColor" opacity=".18"/><path d="M12 10.5v6M12 7.5h.01" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" fill="none"/></svg>`
};
function detectToastType(msg){
  const m = String(msg||"").toLowerCase();
  if(/dihapus|terhapus|hapus seluruh/.test(m)) return "delete";
  if(/ditambahkan|berhasil ditambahkan|diimpor|dipasang/.test(m)) return "add";
  if(/diperbarui|disimpan|tersimpan|diunduh|disalin|disegarkan|diekspor/.test(m)) return "update";
  if(/gagal|belum diisi|belum diatur|belum siap|lengkapi|pilih minimal|wajib diisi|tidak ditemukan/.test(m)) return "warn";
  return "info";
}
function toast(msg, type){
  const t = document.getElementById("toast");
  const kind = type || detectToastType(msg);
  t.innerHTML = `<span class="toast-icon">${TOAST_ICONS[kind] || TOAST_ICONS.info}</span><span class="toast-msg">${escapeHtml(msg)}</span>`;
  t.dataset.kind = kind;
  t.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(()=>t.classList.remove("show"), 2800);
}
function studentByNis(nis){ return STATE.siswa.find(s=>String(s.nis)===String(nis)); }
function uniq(arr){ return [...new Set(arr)].filter(Boolean).sort(); }

/* [BARU] ---------- Kirim WhatsApp ke Orang Tua ---------- */
function formatPhoneWa(hp){
  if(!hp) return "";
  let digits = String(hp).replace(/\D/g,"");
  if(digits.startsWith("0")) digits = "62" + digits.slice(1);
  else if(!digits.startsWith("62")) digits = "62" + digits;
  return digits;
}
function waMessageForTugas(t){
  const s = studentByNis(t.nis);
  const nama = s ? s.nama : t.nis;
  const lines = [
    `Assalamu'alaikum, Bapak/Ibu Wali dari ananda *${nama}*.`,
    ``,
    `Berikut info pengumpulan tugas dari ${getKelasNama()}:`,
    `Mapel: ${t.mapel}`,
    `Tugas: ${t.tugas}`,
    `Bab: ${t.pekan}`,
    `Tanggal: ${fmtDate(t.tanggal)}`,
    `Status: ${t.status}`
  ];
  if(t.catatan) lines.push(`Catatan: ${t.catatan}`);
  lines.push(``, `Jazakumullahu khairan.`, ``, waSignature());
  return lines.join("\n");
}
function shareWaTugas(id){
  const t = STATE.tugas.find(x=>String(x.id)===String(id));
  if(!t){ toast("Data tugas tidak ditemukan."); return; }
  const s = studentByNis(t.nis);
  const hp = s && s.hpOrtu;
  if(!hp){ toast("Nomor WA orang tua untuk siswa ini belum diisi. Lengkapi di menu Data Siswa."); return; }
  const phone = formatPhoneWa(hp);
  const msg = encodeURIComponent(waMessageForTugas(t));
  window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
}

/* [BARU] ---------- Pengingat WA Massal (ke siswa yang belum mengumpulkan) ---------- */
// Kumpulkan tugas "Belum Mengumpulkan" mengikuti filter Data Tugas yang aktif saat ini
// (Bab, Mapel, Peserta, rentang tanggal, pencarian), lalu kelompokkan per siswa.
function getBelumGroupedByFilter(){
  const f = STATE.filters;
  let rows = STATE.tugas.filter(t=>t.status==="Belum Mengumpulkan");
  if(f.q){
    const q = f.q.toLowerCase();
    rows = rows.filter(t=>{
      const s = studentByNis(t.nis);
      const nama = s?s.nama.toLowerCase():"";
      return nama.includes(q) || String(t.nis).includes(q) || t.mapel.toLowerCase().includes(q) || t.tugas.toLowerCase().includes(q);
    });
  }
  if(f.pekan) rows = rows.filter(t=>t.pekan===f.pekan);
  if(f.mapel) rows = rows.filter(t=>t.mapel===f.mapel);
  if(f.siswa) rows = rows.filter(t=>String(t.nis)===String(f.siswa));
  if(f.dari) rows = rows.filter(t=>t.tanggal >= f.dari);
  if(f.sampai) rows = rows.filter(t=>t.tanggal <= f.sampai);

  const byNis = new Map();
  for(const t of rows){
    if(!byNis.has(t.nis)) byNis.set(t.nis, []);
    byNis.get(t.nis).push(t);
  }
  const groups = [...byNis.entries()].map(([nis, tugasList])=>{
    const s = studentByNis(nis);
    tugasList.sort((a,b)=> a.tanggal < b.tanggal ? -1 : a.tanggal > b.tanggal ? 1 : 0);
    return { nis, nama: s?s.nama:"(siswa tidak ditemukan)", hpOrtu: s?s.hpOrtu:"", tugasList };
  });
  groups.sort((a,b)=> a.nama.localeCompare(b.nama, "id"));
  return groups;
}
function waMessageForBelumGroup(g){
  const lines = [
    `Assalamu'alaikum, Bapak/Ibu Wali dari ananda *${g.nama}*.`,
    ``,
    `Mengingatkan, berikut tugas dari ${getKelasNama()} yang belum dikumpulkan:`
  ];
  g.tugasList.forEach((t,i)=>{
    lines.push(`${i+1}. ${t.mapel} — ${t.tugas} (${t.pekan}, ${fmtDate(t.tanggal)})`);
  });
  lines.push(``, `Mohon kesediaannya untuk melengkapi tugas tersebut. Jazakumullahu khairan.`, ``, waSignature());
  return lines.join("\n");
}
let WA_REMINDER_SENT = new Set();
function openWaReminderModal(){
  WA_REMINDER_SENT = new Set();
  renderWaReminderModal();
  document.getElementById("waReminderModal").hidden = false;
}
function closeWaReminderModal(){
  document.getElementById("waReminderModal").hidden = true;
}
function renderWaReminderModal(){
  const groups = getBelumGroupedByFilter();
  const list = document.getElementById("waReminderList");
  const countEl = document.getElementById("waReminderCount");
  if(!groups.length){
    list.innerHTML = `<div class="wa-modal-empty">Alhamdulillah, tidak ada siswa yang belum mengumpulkan tugas pada filter saat ini. 🎉</div>`;
    countEl.textContent = "";
    return;
  }
  const noHp = groups.filter(g=>!g.hpOrtu).length;
  countEl.textContent = `${groups.length} siswa perlu diingatkan${noHp?` · ${noHp} belum ada nomor WA`:""}`;

  list.innerHTML = groups.map(g=>{
    const sent = WA_REMINDER_SENT.has(g.nis);
    const hasHp = !!g.hpOrtu;
    const metaText = `${g.tugasList.length} tugas belum dikumpulkan`;
    const btnLabel = sent ? "Terkirim ✓" : (hasHp ? "Kirim WA" : "No. HP kosong");
    return `<div class="wa-item ${!hasHp?"wa-item-nohp":""} ${sent?"wa-item-sent":""}" data-nis="${g.nis}">
      <div class="wa-item-info">
        <span class="wa-item-name">${escapeHtml(g.nama)}</span>
        <span class="wa-item-meta">${g.nis} · ${metaText}</span>
      </div>
      <button ${(!hasHp || sent)?"disabled":""} onclick="sendWaReminderSingle('${g.nis}')">${btnLabel}</button>
    </div>`;
  }).join("");
}
function sendWaReminderSingle(nis){
  const groups = getBelumGroupedByFilter();
  const g = groups.find(x=>String(x.nis)===String(nis));
  if(!g){ toast("Data siswa tidak ditemukan pada daftar."); return; }
  if(!g.hpOrtu){ toast("Nomor WA orang tua untuk siswa ini belum diisi. Lengkapi di menu Data Siswa."); return; }
  const phone = formatPhoneWa(g.hpOrtu);
  const msg = encodeURIComponent(waMessageForBelumGroup(g));
  window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
  WA_REMINDER_SENT.add(nis);
  renderWaReminderModal();
}

/* [BARU] ---------- Kirim Tugas (Berkas: PDF/JPG/PNG/MP3) ke seluruh WA orang tua ----------
   Catatan penting: WhatsApp tidak mengizinkan situs web mana pun melampirkan berkas secara
   otomatis ke pesan siapa pun (tidak ada API publik untuk itu) — ini berlaku untuk semua
   aplikasi web demi keamanan & privasi pengguna WA, bukan keterbatasan aplikasi ini. Jadi:
   - Di HP/browser yang mendukung Web Share API dengan berkas (kebanyakan Chrome Android),
     tombol "Bagikan" akan membuka kotak bagikan bawaan sistem dengan berkas + pesan sudah
     terisi — guru tinggal memilih WhatsApp lalu kontak orang tua yang dituju.
   - Jika tidak didukung (kebanyakan browser desktop), berkas otomatis diunduh dan WA dibuka
     dengan pesan siap kirim — guru tinggal 1x lampirkan manual (📎) berkas yang baru diunduh.
   Pengiriman tetap dilakukan satu per satu per siswa (bukan sekali kirim ke semua), karena
   WhatsApp memang tidak menyediakan cara resmi untuk broadcast otomatis dari web ke banyak
   kontak sekaligus. */
let KIRIM_TUGAS_FILE = null;   // { file, url, name }
let KIRIM_TUGAS_SENT = new Set();

function openKirimTugasModal(){
  KIRIM_TUGAS_FILE = null;
  KIRIM_TUGAS_SENT = new Set();
  document.getElementById("kt_file").value = "";
  document.getElementById("kirimTugasFormStep").hidden = false;
  document.getElementById("kirimTugasListStep").hidden = true;
  document.getElementById("kirimTugasModal").hidden = false;
}
function closeKirimTugasModal(){
  document.getElementById("kirimTugasModal").hidden = true;
  if(KIRIM_TUGAS_FILE && KIRIM_TUGAS_FILE.url) URL.revokeObjectURL(KIRIM_TUGAS_FILE.url);
  KIRIM_TUGAS_FILE = null;
}
function handleKirimTugasFileChange(e){
  const file = e.target.files[0];
  if(!file){ KIRIM_TUGAS_FILE = null; return; }
  const okTypes = /\.(pdf|jpg|jpeg|png|mp3)$/i;
  if(!okTypes.test(file.name)){
    toast("Format berkas harus PDF, JPG, PNG, atau MP3.");
    e.target.value = "";
    KIRIM_TUGAS_FILE = null;
    return;
  }
  if(KIRIM_TUGAS_FILE && KIRIM_TUGAS_FILE.url) URL.revokeObjectURL(KIRIM_TUGAS_FILE.url);
  KIRIM_TUGAS_FILE = { file, url: URL.createObjectURL(file), name: file.name };
}
function waMessageForKirimTugas(nama){
  const lines = [
    `Assalamu'alaikum, Bapak/Ibu Wali dari ananda *${nama}*.`,
    ``,
    `Mohon izin mengirimkan berkas tugas dari ${getKelasNama()}.`,
    ``,
    `Berkas tugas terlampir, mohon dikerjakan lalu dikumpulkan sesuai arahan. Jazakumullahu khairan.`,
    ``,
    waSignature()
  ];
  return lines.join("\n");
}
async function startKirimTugas(){
  if(!KIRIM_TUGAS_FILE){ toast("Pilih berkas tugas (PDF/JPG/PNG/MP3) terlebih dahulu."); return; }

  KIRIM_TUGAS_SENT = new Set();

  document.getElementById("kirimTugasFormStep").hidden = true;
  document.getElementById("kirimTugasListStep").hidden = false;
  renderKirimTugasList();
}
function renderKirimTugasList(){
  const list = document.getElementById("kirimTugasList");
  const countEl = document.getElementById("kirimTugasCount");
  const subEl = document.getElementById("kirimTugasListSub");
  const students = [...STATE.siswa].sort((a,b)=>a.nama.localeCompare(b.nama,"id"));
  const canShareFile = !!(navigator.canShare && navigator.share && KIRIM_TUGAS_FILE && navigator.canShare({ files:[KIRIM_TUGAS_FILE.file] }));
  subEl.textContent = `Berkas: ${KIRIM_TUGAS_FILE ? KIRIM_TUGAS_FILE.name : "-"} · ${canShareFile ? "berkas bisa dibagikan langsung dari tombol Bagikan" : "berkas akan diunduh, lalu lampirkan manual di WA"}`;

  if(!students.length){
    list.innerHTML = `<div class="wa-modal-empty">Belum ada data siswa.</div>`;
    countEl.textContent = "";
    return;
  }
  const noHp = students.filter(s=>!s.hpOrtu).length;
  countEl.textContent = `${students.length} siswa${noHp?` · ${noHp} belum ada nomor WA`:""}`;

  list.innerHTML = students.map(s=>{
    const sent = KIRIM_TUGAS_SENT.has(s.nis);
    const hasHp = !!s.hpOrtu;
    const btnLabel = sent ? "Terkirim ✓" : (hasHp ? (canShareFile ? "Bagikan" : "Unduh + Buka WA") : "No. HP kosong");
    return `<div class="wa-item ${!hasHp?"wa-item-nohp":""} ${sent?"wa-item-sent":""}" data-nis="${s.nis}">
      <div class="wa-item-info">
        <span class="wa-item-name">${escapeHtml(s.nama)}</span>
        <span class="wa-item-meta">${s.nis}</span>
      </div>
      <button ${(!hasHp)?"disabled":""} onclick="kirimTugasSingle('${s.nis}')">${btnLabel}</button>
    </div>`;
  }).join("");
}
async function kirimTugasSingle(nis){
  const s = studentByNis(nis);
  if(!s){ toast("Data siswa tidak ditemukan."); return; }
  if(!s.hpOrtu){ toast("Nomor WA orang tua untuk siswa ini belum diisi. Lengkapi di menu Data Siswa."); return; }
  if(!KIRIM_TUGAS_FILE){ toast("Berkas tugas tidak ditemukan, ulangi dari awal."); return; }

  const phone = formatPhoneWa(s.hpOrtu);
  const message = waMessageForKirimTugas(s.nama);
  const canShareFile = !!(navigator.canShare && navigator.share && navigator.canShare({ files:[KIRIM_TUGAS_FILE.file] }));

  if(canShareFile){
    try{
      await navigator.share({ files:[KIRIM_TUGAS_FILE.file], text: message, title: KIRIM_TUGAS_FILE.name });
      KIRIM_TUGAS_SENT.add(nis);
      renderKirimTugasList();
    }catch(err){
      // Dibatalkan pengguna dari kotak bagikan — jangan tandai terkirim.
      if(err && err.name === "AbortError") return;
      toast("Gagal membuka kotak bagikan, coba cara unduh + WA manual.");
    }
    return;
  }

  // Fallback: unduh berkas, lalu buka WA dengan pesan siap kirim (lampirkan manual).
  const a = document.createElement("a");
  a.href = KIRIM_TUGAS_FILE.url;
  a.download = KIRIM_TUGAS_FILE.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank");
  toast("Berkas terunduh. Lampirkan manual (📎) di WA yang baru terbuka.");
  KIRIM_TUGAS_SENT.add(nis);
  renderKirimTugasList();
}

function confirmDialog(msg){
  return new Promise((resolve)=>{
    const modal = document.getElementById("confirmModal");
    document.getElementById("confirmMsg").textContent = msg;
    modal.hidden = false;
    const ok = document.getElementById("confirmOk");
    const cancel = document.getElementById("confirmCancel");
    const cleanup = (val)=>{ modal.hidden = true; ok.onclick=null; cancel.onclick=null; resolve(val); };
    ok.onclick = ()=>cleanup(true);
    cancel.onclick = ()=>cleanup(false);
  });
}

/* ---------- Navigation ---------- */
const VIEW_TITLES = {
  dashboard:"Dasbor", jadwal:"Jadwal Pelajaran", jurnal:"Jurnal Mengajar", literasi:"Jurnal Literasi", numerasi:"Numerasi", ujian:"Ujian", input:"Input Tugas", data:"Data Tugas",
  siswa:"Data Siswa", dokumen:"Input Dokumen", pengaturan:"Pengaturan & Guru"
};
function switchView(view){
  STATE.view = view;
  document.querySelectorAll(".view").forEach(v=>v.hidden = true);
  document.getElementById(`view-${view}`).hidden = false;
  document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active", b.dataset.view===view));
  document.getElementById("viewTitle").textContent = VIEW_TITLES[view];
  closeSidebarMobile();
  if(view==="dashboard") renderDashboard();
  if(view==="jadwal") renderJadwal();
  if(view==="jurnal") renderJurnal();
  if(view==="literasi"){ populateLiterasiSiswaSelects(); renderLiterasiView(); }
  if(view==="numerasi") renderNumerasiView();
  if(view==="ujian") renderUjianView();
  if(view==="data") renderDataView();
  if(view==="siswa") renderSiswaView();
  if(view==="dokumen") renderDokumenUploadHistory();
  if(view==="pengaturan"){ renderPengaturan(); renderSyncSettings(); }
  if(view==="input" && STATE.editId===null) resetForm();
}

/* ---------- [BARU] Jadwal Pelajaran (hanya mapel yang diampu) — bisa tambah/edit/hapus ---------- */
const JADWAL_HARI = ["Senin","Selasa","Rabu","Kamis","Jumat"];
/* [BARU] Kategori warna per mata pelajaran, supaya tiap kartu/baris jadwal mudah
   dibedakan sekilas. Pencocokan berdasarkan kata kunci dalam nama mapel — jadi
   tetap berfungsi walau nama mapel diketik dengan variasi (mis. "Literasi
   Numerasi (MAT/Numerasi)"). Mapel di luar 5 kategori ini (kalau user menambah
   mapel lain lewat form) akan memakai kategori "lain" (netral). */
function jadwalKategori(mapel){
  const m = String(mapel||"").toLowerCase();
  if(m.includes("matematika")) return "matematika";
  if(m.includes("ipas")) return "ipas";
  if(m.includes("seni")) return "seni";
  if(m.includes("pancasila")) return "pancasila";
  if(m.includes("literasi") || m.includes("numerasi")) return "literasi";
  return "lain";
}
function todayJadwalHari(){
  const idx = new Date().getDay(); // 0=Minggu..6=Sabtu
  const map = {1:"Senin",2:"Selasa",3:"Rabu",4:"Kamis",5:"Jumat"};
  return map[idx] || "Senin";
}
function jamMulai(waktu){
  // urutkan berdasarkan jam mulai dari teks "08.40 - 09.40"
  const m = String(waktu||"").match(/(\d{1,2})[.:](\d{2})/);
  if(!m) return 0;
  return Number(m[1])*60 + Number(m[2]);
}
function renderJadwal(){
  if(!STATE.jadwalHari) STATE.jadwalHari = todayJadwalHari();
  renderJadwalKelasTitle();

  const group = document.getElementById("jadwalHariGroup");
  group.innerHTML = JADWAL_HARI.map(h=>
    `<div class="hari-chip-wrap">
      <button type="button" class="chip-toggle${h===STATE.jadwalHari?" active":""}" data-hari="${h}">${h}</button>
      <button type="button" class="hari-add-btn" data-hari-add="${h}" title="Tambah jam pelajaran hari ${h}" aria-label="Tambah jam pelajaran hari ${h}">+</button>
    </div>`
  ).join("");
  group.querySelectorAll(".chip-toggle").forEach(btn=>{
    btn.addEventListener("click", ()=>{ STATE.jadwalHari = btn.dataset.hari; STATE.jadwalEditId = null; renderJadwal(); });
  });
  group.querySelectorAll(".hari-add-btn").forEach(btn=>{
    btn.addEventListener("click", (e)=>{ e.stopPropagation(); quickAddJadwal(btn.dataset.hariAdd); });
  });

  const rows = STATE.jadwal
    .filter(j=>j.hari===STATE.jadwalHari)
    .sort((a,b)=>jamMulai(a.waktu)-jamMulai(b.waktu));

  const tbody = document.getElementById("jadwalTableBody");
  const kosongNote = document.getElementById("jadwalKosongNote");
  if(rows.length===0){
    tbody.innerHTML = "";
    kosongNote.hidden = false;
  } else {
    kosongNote.hidden = true;
    tbody.innerHTML = rows.map(r=>{
      const kat = jadwalKategori(r.mapel);
      return `
      <tr class="jadwal-row jadwal-row-${kat}">
        <td data-label="Jam">${escapeHtml(r.jam||"-")}</td>
        <td data-label="Waktu">${escapeHtml(r.waktu||"-")}</td>
        <td data-label="Mata Pelajaran"><span class="badge jadwal-badge-${kat}">${escapeHtml(r.mapel)}</span></td>
        <td data-label="Aksi" class="col-aksi">
          <button type="button" class="btn-icon-sm jadwalEditBtn" data-id="${r.id}" title="Edit">✏️</button>
          <button type="button" class="btn-icon-sm jadwalDeleteBtn" data-id="${r.id}" title="Hapus">🗑️</button>
        </td>
      </tr>`;
    }).join("");
    /* [PERBAIKAN] id jadwal sekarang berupa teks (UUID/kode tetap), BUKAN angka —
       sebelumnya dibungkus Number(...) yang mengubah id UUID menjadi NaN, sehingga
       setiap kali jam pelajaran DIEDIT, aplikasi mengira itu data baru dan membuat
       baris duplikat alih-alih memperbarui baris yang sudah ada. Ini penyebab utama
       "data jadwal ganda". Jangan bungkus dengan Number() lagi. */
    tbody.querySelectorAll(".jadwalEditBtn").forEach(b=>b.addEventListener("click", ()=>startEditJadwal(b.dataset.id)));
    tbody.querySelectorAll(".jadwalDeleteBtn").forEach(b=>b.addEventListener("click", ()=>deleteJadwal(b.dataset.id)));
  }

  renderJadwalRekap();
  fillJadwalForm();
}

function renderJadwalRekap(){
  const rekap = {};
  STATE.jadwal.forEach(r=>{
    const key = String(r.mapel||"").replace(/\s*\(.*?\)\s*/g,"") || "(Tanpa nama)";
    let jumlahJp = 1;
    if(String(r.jam||"").includes("-")){
      const [a,b] = r.jam.split("-").map(Number);
      if(!isNaN(a) && !isNaN(b) && b>=a) jumlahJp = b-a+1;
    }
    rekap[key] = (rekap[key]||0) + jumlahJp;
  });
  const rekapBody = document.getElementById("jadwalRekapBody");
  const keys = Object.keys(rekap);
  rekapBody.innerHTML = keys.length===0
    ? `<tr><td colspan="2" class="muted">Belum ada jadwal.</td></tr>`
    : keys.map(k=>{
        const kat = jadwalKategori(k);
        return `<tr class="jadwal-row jadwal-row-${kat}"><td data-label="Mata Pelajaran"><span class="badge jadwal-badge-${kat}">${escapeHtml(k)}</span></td><td data-label="Jumlah JP">${rekap[k]} JP</td></tr>`;
      }).join("");
}

/* ---- Form tambah/edit satu baris jadwal ---- */
function fillJadwalForm(){
  const hariSel = document.getElementById("jf_hari");
  if(hariSel && !hariSel.dataset.filled){
    hariSel.innerHTML = JADWAL_HARI.map(h=>`<option value="${h}">${h}</option>`).join("");
    hariSel.dataset.filled = "1";
  }
  if(STATE.jadwalEditId===null){
    document.getElementById("jf_id").value = "";
    if(hariSel) hariSel.value = STATE.jadwalHari;
    document.getElementById("jf_jam").value = "";
    document.getElementById("jf_waktu").value = "";
    document.getElementById("jf_mapel").value = "";
    document.getElementById("jadwalFormTitle").textContent = "Tambah Jam Pelajaran";
    document.getElementById("jadwalFormSubmitBtn").textContent = "+ Tambah";
    document.getElementById("jadwalFormCancelBtn").hidden = true;
  } else {
    const j = STATE.jadwal.find(x=>x.id===STATE.jadwalEditId);
    if(!j){ STATE.jadwalEditId = null; return fillJadwalForm(); }
    document.getElementById("jf_id").value = j.id;
    hariSel.value = j.hari;
    document.getElementById("jf_jam").value = j.jam||"";
    document.getElementById("jf_waktu").value = j.waktu||"";
    document.getElementById("jf_mapel").value = j.mapel||"";
    document.getElementById("jadwalFormTitle").textContent = "Edit Jam Pelajaran";
    document.getElementById("jadwalFormSubmitBtn").textContent = "Simpan Perubahan";
    document.getElementById("jadwalFormCancelBtn").hidden = false;
  }
}
function startEditJadwal(id){
  STATE.jadwalEditId = id;
  const j = STATE.jadwal.find(x=>x.id===id);
  if(j) STATE.jadwalHari = j.hari;
  renderJadwal();
  document.getElementById("jadwalFormPanel").scrollIntoView({behavior:"smooth", block:"nearest"});
}
/* [BARU] Tambah cepat lewat ikon "+" pada chip hari — langsung pilih hari
   tersebut, pastikan form dalam mode Tambah (bukan Edit), lalu fokus ke
   field "Jam ke-" supaya guru tinggal mengisi tanpa perlu geser ke form. */
function quickAddJadwal(hari){
  if(!hari) return;
  STATE.jadwalHari = hari;
  STATE.jadwalEditId = null;
  renderJadwal();
  const panel = document.getElementById("jadwalFormPanel");
  if(panel) panel.scrollIntoView({behavior:"smooth", block:"nearest"});
  const jamInput = document.getElementById("jf_jam");
  if(jamInput) setTimeout(()=>jamInput.focus(), 250);
}
function cancelEditJadwal(){
  STATE.jadwalEditId = null;
  renderJadwal();
}
async function submitJadwalForm(e){
  e.preventDefault();
  const hari = document.getElementById("jf_hari").value;
  const jam = document.getElementById("jf_jam").value.trim();
  const waktu = document.getElementById("jf_waktu").value.trim();
  const mapel = document.getElementById("jf_mapel").value.trim();
  if(!hari || !waktu || !mapel){ toast("Lengkapi Hari, Waktu, dan Mata Pelajaran."); return; }

  const idVal = document.getElementById("jf_id").value;
  /* [PERBAIKAN] id jadwal adalah teks (UUID), jangan diubah jadi Number() —
     itu yang menyebabkan setiap edit jam pelajaran malah bikin baris baru. */
  const rec = idVal
    ? { id:idVal, hari, jam, waktu, mapel }
    : { hari, jam, waktu, mapel };
  await idbPut("jadwal", rec);
  STATE.jadwal = await idbAll("jadwal");
  STATE.jadwalHari = hari;
  STATE.jadwalEditId = null;
  toast(idVal ? "Jam pelajaran berhasil diperbarui." : "Jam pelajaran berhasil ditambahkan.");
  renderJadwal();
}
async function deleteJadwal(id){
  const ok = await confirmDialog("Hapus jam pelajaran ini dari jadwal?");
  if(!ok) return;
  await idbDelete("jadwal", id);
  STATE.jadwal = await idbAll("jadwal");
  if(STATE.jadwalEditId===id) STATE.jadwalEditId = null;
  toast("Jam pelajaran dihapus.");
  renderJadwal();
}
function closeSidebarMobile(){
  document.getElementById("sidebar").classList.remove("open");
  document.getElementById("scrim").classList.remove("show");
}

/* ---------- [BARU] Jurnal Mengajar ---------- */
/* Daftar mata pelajaran yang diampu. Setiap mapel punya 8 Bab (Bab 1–4 = Semester 1,
   Bab 5–8 = Semester 2). Untuk saat ini baru IPAS Bab 1 yang lengkap isinya (sesuai
   berkas Jurnal Mengajar yang diunggah) — bab & mapel lain berstatus "segera" dan
   tinggal dilengkapi lewat JURNAL_SUBJECTS di bawah ini kapan saja, tanpa mengubah
   struktur/alur aplikasi.
*/
const JURNAL_MAPEL_LIST = [
  { key:"ipas",        nama:"IPAS",                  deskripsi:"Ilmu Pengetahuan Alam dan Sosial", emoji:"🔬" },
  { key:"bindo",        nama:"Bahasa Indonesia",      deskripsi:"Membaca, menulis & berbahasa",       emoji:"📖" },
  { key:"pancasila",    nama:"Pendidikan Pancasila",  deskripsi:"Nilai, norma & kewarganegaraan",     emoji:"🇮🇩" },
  { key:"matematika",   nama:"Matematika",            deskripsi:"Bilangan, operasi & penalaran",      emoji:"🔢" },
  { key:"kokurikuler",  nama:"Kokurikuler",           deskripsi:"Proyek penguatan profil pelajar",    emoji:"🧩",
    unit:"bulan", unitLabel:"Bulan", ptLabel:"Pekan", hasRingkasan:true },
  { key:"senirupa",     nama:"Seni Rupa",             deskripsi:"Menggambar, membentuk & berkarya",   emoji:"🎨" }
  /* [BARU] kartu "Literasi" (Bab 1-8) dihapus dari sini karena sudah terwakili penuh oleh
     menu navigasi tersendiri "Jurnal Literasi" & "Numerasi" (lihat view-literasi &
     view-numerasi), yang punya struktur & fungsinya sendiri, bukan berbasis Bab. */
];

/* Info umum Bab 1 IPAS — dikutip dari header Jurnal Mengajar yang diunggah */
const IPAS_BAB1_INFO = {
  namaSekolah:"SDIT Muhammadiyah Harjamukti - Kota Cirebon",
  kelasFase:"IV (Ubay bin Ka'ab) / Fase B",
  semesterTahun:"I (Satu) / Tahun Pelajaran 2026-2027",
  kodeTP:"TP 4.1.1 s.d. TP 4.1.9",
  alokasiKeseluruhan:"25 JP × 35 menit (10 Pertemuan)",
  alokasiMinggu:"2-3 JP per minggu (1 Pertemuan)",
  guruMapel:"Agung Surya Permadi, S.Pd.I."
};

const IPAS_BAB1_PERTEMUAN = [
  { no:1, kodeTP:"4.1.1", judul:"Mengidentifikasi Berbagai Bentuk Energi di Lingkungan Sekitar",
    alokasi:"2 JP × 35 menit (70 menit)",
    tujuan:"Murid dapat mengidentifikasi minimal 5 bentuk energi di lingkungan sekitar (energi panas, cahaya, gerak, listrik, bunyi, dan kimia) secara tepat, serta memberikan 2 contoh sumber dari masing-masing bentuk energi yang diamati.",
    materi:"Bentuk-bentuk energi di lingkungan sekitar (panas, cahaya, gerak, listrik, bunyi, kimia)." },
  { no:2, kodeTP:"4.1.2", judul:"Menjelaskan Perubahan Bentuk Energi dalam Kehidupan Sehari-hari",
    alokasi:"3 JP × 35 menit (105 menit)",
    tujuan:"Murid dapat menjelaskan konsep perubahan bentuk energi dengan kata-kata sendiri, memberikan minimal 3 contoh perubahan bentuk energi dalam kehidupan sehari-hari beserta penjelasannya, serta membuat diagram alur sederhana perubahan energi.",
    materi:"Konsep dan contoh perubahan bentuk energi dalam kehidupan sehari-hari." },
  { no:3, kodeTP:"4.1.3", judul:"Menyajikan Laporan Sederhana tentang Perubahan Energi",
    alokasi:"2 JP × 35 menit (70 menit)",
    tujuan:"Murid dapat menyusun laporan sederhana tentang contoh perubahan energi di lingkungan sekitar dengan format yang benar (judul, tujuan, alat/bahan, langkah pengamatan, hasil, kesimpulan), serta mempresentasikan laporan secara lisan dengan percaya diri.",
    materi:"Penyusunan dan penyajian laporan sederhana perubahan energi." },
  { no:4, kodeTP:"4.1.4", judul:"Mengidentifikasi Kebutuhan Tumbuhan dalam Proses Fotosintesis",
    alokasi:"3 JP × 35 menit (105 menit)",
    tujuan:"Murid dapat mengidentifikasi minimal 4 bahan yang dibutuhkan tumbuhan untuk fotosintesis (air, karbon dioksida/CO₂, cahaya matahari, dan klorofil), serta menjelaskan fungsi masing-masing bahan tersebut dalam proses fotosintesis.",
    materi:"Kebutuhan tumbuhan dalam proses fotosintesis (air, CO₂, cahaya matahari, klorofil)." },
  { no:5, kodeTP:"4.1.5", judul:"Menjelaskan Tahapan Proses Fotosintesis sebagai Perubahan Energi",
    alokasi:"2 JP × 35 menit (70 menit)",
    tujuan:"Murid dapat menjelaskan tahapan proses fotosintesis secara berurutan: penyerapan cahaya oleh klorofil, pengambilan air dan CO₂, pembuatan glukosa, dan pelepasan oksigen, serta mengidentifikasi bahwa fotosintesis adalah proses perubahan energi cahaya menjadi energi kimia.",
    materi:"Tahapan proses fotosintesis sebagai perubahan energi cahaya menjadi energi kimia." },
  { no:6, kodeTP:"4.1.5", judul:"Menjelaskan Hasil Fotosintesis dan Kaitannya dengan Perubahan Energi",
    alokasi:"3 JP × 35 menit (105 menit)",
    tujuan:"Murid dapat menjelaskan hasil fotosintesis (glukosa sebagai energi kimia dan oksigen) beserta fungsinya, mengaitkan fotosintesis sebagai sumber energi dalam rantai makanan dan kehidupan makhluk hidup, serta membuat diagram sederhana yang menggambarkan hubungan tersebut.",
    materi:"Hasil fotosintesis (glukosa dan oksigen) dan kaitannya dengan rantai makanan." },
  { no:7, kodeTP:"4.1.6", judul:"Menjelaskan Pentingnya Fotosintesis bagi Makhluk Hidup dan Lingkungan",
    alokasi:"2 JP × 35 menit (70 menit)",
    tujuan:"Murid dapat menjelaskan minimal 3 manfaat fotosintesis bagi makhluk hidup (menyediakan oksigen, makanan, dan pengatur iklim), serta mengaitkan pentingnya menjaga kelestarian tumbuhan dengan kelangsungan fotosintesis dan kehidupan.",
    materi:"Manfaat fotosintesis bagi makhluk hidup dan pentingnya kelestarian tumbuhan." },
  { no:8, kodeTP:"4.1.7", judul:"Mengidentifikasi Teknologi yang Memanfaatkan Perubahan Energi",
    alokasi:"3 JP × 35 menit (105 menit)",
    tujuan:"Murid dapat mengidentifikasi minimal 5 jenis teknologi yang memanfaatkan perubahan energi (panel surya, PLTA, turbin angin, generator, dll.), serta menjelaskan prinsip perubahan energi yang terjadi pada masing-masing teknologi tersebut.",
    materi:"Teknologi yang memanfaatkan perubahan energi (panel surya, PLTA, turbin angin, generator)." },
  { no:9, kodeTP:"4.1.8", judul:"Menjelaskan Manfaat Perubahan Energi bagi Aktivitas Manusia",
    alokasi:"2 JP × 35 menit (70 menit)",
    tujuan:"Murid dapat menjelaskan manfaat perubahan energi bagi berbagai aktivitas manusia (memasak, transportasi, komunikasi, penerangan, produksi), serta mengidentifikasi aktivitas manusia yang bergantung pada perubahan energi tertentu.",
    materi:"Manfaat perubahan energi bagi aktivitas manusia sehari-hari." },
  { no:10, kodeTP:"4.1.9", judul:"Menyajikan Hasil Analisis Penggunaan Energi Secara Bijak",
    alokasi:"3 JP × 35 menit (105 menit)",
    tujuan:"Murid dapat menganalisis pola penggunaan energi di rumah/sekolah dan mengidentifikasi pemborosan energi, merancang dan menyajikan minimal 3 solusi penggunaan energi secara bijak dalam bentuk poster/presentasi yang persuasif, serta merencanakan aksi nyata penghematan energi.",
    materi:"Analisis penggunaan energi dan penyusunan solusi hemat energi (poster/presentasi)." }
];

/* Info umum Bab 2 IPAS */
const IPAS_BAB2_INFO = {
  namaSekolah:"SDIT Muhammadiyah Harjamukti - Kota Cirebon",
  kelasFase:"IV (Ubay bin Ka'ab) / Fase B",
  semesterTahun:"I (Satu) / Tahun Pelajaran 2026-2027",
  kodeTP:"TP 4.2.1 s.d. TP 4.2.9",
  alokasiKeseluruhan:"22 JP × 35 menit (9 Pertemuan)",
  alokasiMinggu:"2-3 JP per minggu (1 Pertemuan)",
  guruMapel:"Agung Surya Permadi, S.Pd.I."
};

const IPAS_BAB2_PERTEMUAN = [
  { no:1, kodeTP:"4.2.1", judul:"Mengidentifikasi Pengertian Gaya Melalui Pengamatan",
    alokasi:"2 JP × 35 menit (70 menit)",
    tujuan:"Murid mampu mengidentifikasi pengertian gaya sebagai dorongan atau tarikan yang dapat menyebabkan benda bergerak, berhenti, atau berubah bentuk melalui kegiatan pengamatan sederhana.",
    materi:"Pengertian gaya sebagai dorongan/tarikan yang memengaruhi gerak dan bentuk benda." },
  { no:2, kodeTP:"4.2.2", judul:"Menjelaskan Pengaruh Gaya terhadap Gerak dan Bentuk Benda",
    alokasi:"3 JP × 35 menit (105 menit)",
    tujuan:"Murid mampu menjelaskan pengaruh gaya terhadap benda, yaitu menggerakkan benda diam, menghentikan benda bergerak, mengubah arah gerak benda, dan mengubah bentuk benda, melalui percobaan sederhana.",
    materi:"Pengaruh gaya terhadap gerak dan bentuk benda." },
  { no:3, kodeTP:"4.2.3", judul:"Menyimpulkan Hubungan Gaya dan Gerak Berdasarkan Percobaan",
    alokasi:"2 JP × 35 menit (70 menit)",
    tujuan:"Murid mampu merancang percobaan sederhana dan menyimpulkan hubungan gaya dan gerak, yaitu benda bergerak ke arah gaya yang diberikan dan semakin besar gaya maka semakin cepat/jauh benda bergerak.",
    materi:"Hubungan antara besar gaya dengan kecepatan dan jarak gerak benda." },
  { no:4, kodeTP:"4.2.4", judul:"Mengidentifikasi Gaya Gesek pada Berbagai Permukaan",
    alokasi:"3 JP × 35 menit (105 menit)",
    tujuan:"Murid mampu mengidentifikasi gaya gesek sebagai gaya yang menghambat gerak benda ketika dua permukaan bersentuhan, serta menjelaskan faktor jenis dan kekasaran permukaan yang memengaruhi besar gaya gesek.",
    materi:"Konsep gaya gesek dan faktor yang memengaruhinya (jenis dan kekasaran permukaan)." },
  { no:5, kodeTP:"4.2.5", judul:"Membandingkan Besar Kecilnya Gaya Gesek pada Berbagai Permukaan",
    alokasi:"2 JP × 35 menit (70 menit)",
    tujuan:"Murid mampu membandingkan besar gaya gesek pada permukaan kasar, sedang, dan halus menggunakan alat pengukur sederhana, serta menjelaskan pengaruh tekstur permukaan dan berat benda terhadap gaya gesek.",
    materi:"Perbandingan gaya gesek pada permukaan kasar, sedang, dan halus." },
  { no:6, kodeTP:"4.2.6", judul:"Menjelaskan Manfaat dan Kerugian Gaya Gesek dalam Kehidupan Sehari-hari",
    alokasi:"3 JP × 35 menit (105 menit)",
    tujuan:"Murid mampu menjelaskan manfaat gaya gesek (membantu gerak, memberikan keamanan) dan kerugiannya (menghambat gerak, mengikis permukaan), serta cara memperbesar atau memperkecil gaya gesek sesuai kebutuhan.",
    materi:"Manfaat dan kerugian gaya gesek dalam kehidupan sehari-hari." },
  { no:7, kodeTP:"4.2.7", judul:"Mengidentifikasi Sifat-Sifat Magnet Melalui Eksperimen Sederhana",
    alokasi:"2 JP × 35 menit (70 menit)",
    tujuan:"Murid mampu mengidentifikasi sifat-sifat magnet melalui eksperimen sederhana, yaitu dapat menarik benda tertentu, memiliki dua kutub, kutub senama tolak-menolak, kutub berbeda tarik-menarik, dan gaya magnet dapat menembus benda tertentu.",
    materi:"Sifat-sifat magnet (menarik benda magnetis, dua kutub, tolak-menarik antar kutub)." },
  { no:8, kodeTP:"4.2.8", judul:"Mengelompokkan Benda Magnetis dan Nonmagnetis",
    alokasi:"3 JP × 35 menit (105 menit)",
    tujuan:"Murid mampu mengelompokkan benda magnetis dan nonmagnetis melalui kegiatan menguji sifat kemagnetan benda dengan mendekatkan magnet, serta memahami bahwa tidak semua logam bersifat magnetis.",
    materi:"Pengelompokan benda magnetis dan nonmagnetis." },
  { no:9, kodeTP:"4.2.9", judul:"Menjelaskan Pemanfaatan Magnet dalam Kehidupan Sehari-hari",
    alokasi:"2 JP × 35 menit (70 menit)",
    tujuan:"Murid mampu menjelaskan pemanfaatan magnet dalam berbagai teknologi kehidupan sehari-hari, seperti navigasi (kompas), penyimpanan data (hard disk), kesehatan (MRI), transportasi (kereta maglev), industri (derek magnet), dan peralatan rumah tangga.",
    materi:"Pemanfaatan magnet dalam teknologi kehidupan sehari-hari." }
];

/* ---------- Seni Rupa ---------- */
const SENIRUPA_INFO_BASE = {
  namaSekolah:"SDIT Muhammadiyah Harjamukti - Kota Cirebon",
  kelasFase:"IV (Ubay bin Ka'ab) / Fase B",
  semesterTahun:"I (Satu) / Tahun Pelajaran 2026-2027",
  alokasiKeseluruhan:"18 JP × 35 menit (6 Pertemuan)",
  alokasiMinggu:"6 JP per minggu (2 Pertemuan × 3 JP)",
  guruMapel:"Agung Surya Permadi, S.Pd.I."
};

const SENIRUPA_BAB1_INFO = { ...SENIRUPA_INFO_BASE, kodeTP:"TP 4.1.1 s.d. TP 4.1.4" };
const SENIRUPA_BAB1_PERTEMUAN = [
  { no:1, kodeTP:"4.1.1 (P1)", judul:"Mengenal Bentuk Dasar Pakaian",
    alokasi:"3 JP × 35 menit (105 menit)",
    tujuan:"Murid mampu mengenali minimal 5 bentuk dasar pakaian (seragam sekolah, kemeja, kaos, jaket, rok/celana) melalui pengamatan contoh sketsa, dan menyebutkan nama bentuk tersebut dengan benar.",
    materi:"Bentuk dasar pakaian (seragam sekolah, kemeja, kaos, jaket, rok/celana); pengenalan nama bentuk melalui pengamatan sketsa." },
  { no:2, kodeTP:"4.1.1 (P2)", judul:"Mengidentifikasi Proporsi Bagian Pakaian",
    alokasi:"3 JP × 35 menit (105 menit)",
    tujuan:"Murid mampu mengidentifikasi dan menunjukkan bagian-bagian proporsi pakaian (panjang badan, lebar bahu, panjang lengan) pada gambar sketsa dengan tepat, serta menjelaskan hubungan antarbagian menggunakan kosakata seni rupa yang sesuai.",
    materi:"Proporsi pakaian: panjang badan, lebar bahu, panjang lengan; kosakata seni rupa terkait proporsi." },
  { no:3, kodeTP:"4.1.2 (P3)", judul:"Menggambar Bentuk Dasar Sketsa Pakaian",
    alokasi:"3 JP × 35 menit (105 menit)",
    tujuan:"Murid mampu menggambar bentuk dasar sketsa pakaian pilihan dengan memperhatikan bentuk dan ukuran yang sesuai, menggunakan garis ringan dan teknik pensil secara mandiri.",
    materi:"Teknik menggambar bentuk dasar sketsa pakaian menggunakan garis ringan dan pensil." },
  { no:4, kodeTP:"4.1.2 (P4)", judul:"Menyempurnakan Sketsa dengan Detail Pendukung",
    alokasi:"3 JP × 35 menit (105 menit)",
    tujuan:"Murid mampu menyempurnakan sketsa pakaian dengan menambahkan detail pendukung (kerah, lengan, kancing, saku, motif) serta memperhatikan proporsi keseluruhan objek secara sesuai.",
    materi:"Detail pendukung sketsa pakaian: kerah, lengan, kancing, saku, dan motif." },
  { no:5, kodeTP:"4.1.3 (P5)", judul:"Menyusun Komposisi Sketsa yang Seimbang",
    alokasi:"3 JP × 35 menit (105 menit)",
    tujuan:"Murid mampu menyusun komposisi sketsa yang seimbang dengan mengatur tata letak objek utama (pakaian) dan objek pendukung (aksesori, latar sederhana) secara harmonis pada bidang gambar.",
    materi:"Komposisi: tata letak objek utama (pakaian) dan objek pendukung (aksesori, latar) secara harmonis." },
  { no:6, kodeTP:"4.1.4 (P6)", judul:"Melengkapi Sketsa dengan Keterangan Pendukung",
    alokasi:"3 JP × 35 menit (105 menit)",
    tujuan:"Murid mampu melengkapi sketsa pakaian dengan keterangan pendukung yang meliputi nama bagian pakaian, warna yang direncanakan, bahan, dan informasi lain yang relevan sehingga gagasan menjadi jelas dan komunikatif.",
    materi:"Keterangan pendukung sketsa: nama bagian pakaian, warna rencana, bahan, dan informasi relevan lainnya (penutup Bab 1)." }
];

const SENIRUPA_BAB2_INFO = { ...SENIRUPA_INFO_BASE, kodeTP:"TP 4.2.1 s.d. TP 4.2.4" };
const SENIRUPA_BAB2_PERTEMUAN = [
  { no:1, kodeTP:"4.2.1 (Bag. 1)", judul:"Mengenal Karya Seni Rupa Berdasarkan Dimensi",
    alokasi:"3 JP × 35 menit (105 menit)",
    tujuan:"Peserta didik mengidentifikasi ciri karya seni rupa berdasarkan bentuk dimensinya (dua dimensi dan tiga dimensi).",
    materi:"Ciri-ciri karya seni rupa berdasarkan bentuk; pengenalan karya 2D dan 3D." },
  { no:2, kodeTP:"4.2.1 (Bag. 2)", judul:"Membedakan Karya 2D dan 3D Melalui Pengamatan",
    alokasi:"3 JP × 35 menit (105 menit)",
    tujuan:"Peserta didik membedakan karya dua dimensi dan tiga dimensi melalui pengamatan langsung terhadap contoh karya.",
    materi:"Perbedaan karya seni rupa dua dimensi dan tiga dimensi beserta contoh-contohnya." },
  { no:3, kodeTP:"4.2.2 (Bag. 1)", judul:"Mengenal Karakteristik Bahan Lunak",
    alokasi:"3 JP × 35 menit (105 menit)",
    tujuan:"Peserta didik mengenal karakteristik bahan lunak (tanah liat, lilin, plastisin) yang digunakan dalam berkarya seni rupa.",
    materi:"Jenis dan karakteristik bahan lunak (tanah liat, lilin, plastisin) untuk berkarya seni." },
  { no:4, kodeTP:"4.2.2 (Bag. 2)", judul:"Membandingkan Bahan Lunak dan Bahan Keras",
    alokasi:"3 JP × 35 menit (105 menit)",
    tujuan:"Peserta didik membandingkan karakteristik bahan lunak dan bahan keras serta kesesuaian penggunaannya dalam berkarya seni rupa.",
    materi:"Perbandingan karakteristik bahan lunak dan bahan keras dalam karya seni rupa." },
  { no:5, kodeTP:"4.2.3", judul:"Membedakan Pewarna Kering dan Pewarna Basah",
    alokasi:"3 JP × 35 menit (105 menit)",
    tujuan:"Peserta didik membedakan dan memilih penggunaan pewarna kering (krayon, pensil warna) dan pewarna basah (cat air, cat poster) sesuai karakteristik karya seni rupa.",
    materi:"Jenis pewarna kering (krayon, pensil warna) dan pewarna basah (cat air, cat poster) beserta karakteristiknya." },
  { no:6, kodeTP:"4.2.4", judul:"Menggunakan Alat Menggambar, Membentuk, dan Mewarnai",
    alokasi:"3 JP × 35 menit (105 menit)",
    tujuan:"Peserta didik mencoba berbagai alat menggambar, membentuk, dan mewarnai serta memahami fungsi dan karakteristiknya sebagai penutup Bab 2.",
    materi:"Ragam alat seni rupa (alat menggambar, membentuk, mewarnai) dan karakteristiknya — sebagai penutup Bab 2." }
];

const SENIRUPA_BAB3_INFO = { ...SENIRUPA_INFO_BASE, kodeTP:"TP 4.3.1 s.d. TP 4.3.4" };
const SENIRUPA_BAB3_PERTEMUAN = [
  { no:1, kodeTP:"4.3.1 (1/2)", judul:"Mengamati dan Mengenal Komponen Rumah Adat Indonesia",
    alokasi:"3 JP × 35 menit (105 menit)",
    tujuan:"Melalui kegiatan mengamati video dan gambar rumah adat, peserta didik mampu mengenali komponen utama rumah adat (atap, dinding, lantai) beserta ciri khasnya pada berbagai contoh rumah adat Indonesia.",
    materi:"Ragam rumah adat Indonesia (Rumah Gadang, Rumah Joglo, Rumah Tongkonan, dll.); komponen utama rumah adat: atap, dinding, lantai." },
  { no:2, kodeTP:"4.3.1 (2/2)", judul:"Mengidentifikasi dan Mempresentasikan Komponen Rumah Adat",
    alokasi:"3 JP × 35 menit (105 menit)",
    tujuan:"Melalui kegiatan mengamati rumah adat Indonesia, peserta didik mampu mengidentifikasi komponen utama rumah adat seperti atap, dinding, dan lantai dengan tepat, serta mempresentasikan hasil identifikasi kelompok.",
    materi:"Pengisian LKM identifikasi rumah adat (nama, asal daerah, ciri atap/dinding/lantai, bahan material); presentasi hasil kelompok." },
  { no:3, kodeTP:"4.3.2 (1/2)", judul:"Membuat Sketsa Awal Gambar Rumah Adat",
    alokasi:"3 JP × 35 menit (105 menit)",
    tujuan:"Melalui kegiatan menggambar, peserta didik mampu membuat sketsa awal rumah adat pilihan dengan bentuk dasar dan proporsi yang sesuai.",
    materi:"Teknik membuat sketsa awal: bentuk dasar atap, dinding, dan lantai rumah adat pilihan." },
  { no:4, kodeTP:"4.3.2 (2/2)", judul:"Menyempurnakan Gambar Rumah Adat dengan Komponen Lengkap",
    alokasi:"3 JP × 35 menit (105 menit)",
    tujuan:"Melalui kegiatan menggambar, peserta didik mampu membuat gambar rumah adat dengan komponen utama yang lengkap (atap, dinding, lantai) sesuai karakteristik bentuknya.",
    materi:"Penyempurnaan gambar dengan detail komponen utama rumah adat secara lengkap dan proporsional." },
  { no:5, kodeTP:"4.3.3", judul:"Menerapkan Prinsip Keseimbangan dalam Komposisi Gambar Rumah Adat",
    alokasi:"3 JP × 35 menit (105 menit)",
    tujuan:"Melalui kegiatan pengembangan karya, peserta didik mampu menerapkan prinsip keseimbangan dalam menyusun komposisi gambar rumah adat agar terlihat harmonis.",
    materi:"Prinsip keseimbangan dan komposisi: penempatan objek utama dan latar agar harmonis." },
  { no:6, kodeTP:"4.3.4", judul:"Mewarnai Karya dan Mempresentasikan Hasil Gambar Rumah Adat",
    alokasi:"3 JP × 35 menit (105 menit)",
    tujuan:"Melalui kegiatan pewarnaan karya, peserta didik mampu memberikan warna yang sesuai antara objek utama dan latar serta menjelaskan hasil karya yang dibuat.",
    materi:"Teknik pewarnaan objek utama dan latar; presentasi dan penjelasan hasil karya sebagai penutup Bab 3." }
];

/* Struktur lengkap: JURNAL_SUBJECTS[mapelKey] = { babList: [ {no, judul, semester, status, info, pertemuan[]} x8 ] }
   status "ready" = sudah ada isi lengkap, "segera" = placeholder, tinggal dilengkapi kapan saja. */
function buildBabPlaceholder(no){
  return { no, judul:"Segera Dilengkapi", semester: no<=4 ? 1 : 2, status:"segera", info:null, pertemuan:[] };
}
const JURNAL_SUBJECTS = {};
JURNAL_MAPEL_LIST.forEach(m=>{
  JURNAL_SUBJECTS[m.key] = { babList: Array.from({length:8}, (_,i)=>buildBabPlaceholder(i+1)) };
});
/* Info umum Bab 3 IPAS */
const IPAS_BAB3_INFO = {
  namaSekolah:"SDIT Muhammadiyah Harjamukti - Kota Cirebon",
  kelasFase:"IV (Ubay bin Ka'ab) / Fase B",
  semesterTahun:"I (Satu) / Tahun Pelajaran 2026-2027",
  kodeTP:"TP 4.3.1 s.d. TP 4.3.6",
  alokasiKeseluruhan:"18 JP × 35 menit (7 Pertemuan)",
  alokasiMinggu:"±5 JP per minggu (2 Pertemuan; alokasi bervariasi 3 JP + 2 JP per TP)",
  guruMapel:"Agung Surya Permadi, S.Pd.I."
};

const IPAS_BAB3_PERTEMUAN = [
  { no:1, kodeTP:"4.3.1", judul:"Mengidentifikasi Komponen-Komponen Peta",
    alokasi:"3 JP × 35 menit (105 menit)",
    tujuan:"Murid dapat mengidentifikasi komponen-komponen peta (judul, skala, legenda, arah mata angin, koordinat) melalui pengamatan peta nyata.",
    materi:"Komponen-komponen peta (judul, skala, legenda, arah mata angin, koordinat) beserta fungsinya." },
  { no:2, kodeTP:"4.3.2", judul:"Membaca Informasi Sederhana pada Peta",
    alokasi:"2 JP × 35 menit (70 menit)",
    tujuan:"Murid dapat membaca informasi sederhana pada peta (lokasi, jarak, arah) dengan menggunakan komponen peta yang telah dipelajari.",
    materi:"Cara membaca lokasi, arah, dan jarak (skala) pada peta." },
  { no:3, kodeTP:"4.3.3 (Bag. 1)", judul:"Membuat Peta Sederhana Lingkungan Sekitar (Bag. 1)",
    alokasi:"3 JP × 35 menit (105 menit)",
    tujuan:"Murid dapat membuat peta sederhana lingkungan sekitar (rumah, sekolah, atau kampung) menggunakan komponen peta yang benar.",
    materi:"Langkah membuat peta sederhana: menentukan wilayah, menggambar denah awal, dan menambahkan komponen peta." },
  { no:4, kodeTP:"4.3.3 (Bag. 2)", judul:"Melanjutkan & Mempresentasikan Peta Sederhana (Bag. 2)",
    alokasi:"2 JP × 35 menit (70 menit)",
    tujuan:"Murid dapat menyelesaikan, mewarnai, melengkapi legenda dan skala, serta mempresentasikan peta sederhana lingkungan sekitar yang telah dibuat.",
    materi:"Penyempurnaan peta (pewarnaan, legenda, skala) dan presentasi hasil karya kelompok." },
  { no:5, kodeTP:"4.3.4", judul:"Mengidentifikasi Bentang Alam di Daerah Sekitar",
    alokasi:"3 JP × 35 menit (105 menit)",
    tujuan:"Murid dapat mengidentifikasi berbagai bentang alam di daerah sekitar melalui pengamatan gambar/video dan observasi lingkungan.",
    materi:"Ragam bentang alam Indonesia (pantai, dataran rendah, dataran tinggi, pegunungan, sungai, danau) beserta ciri-cirinya." },
  { no:6, kodeTP:"4.3.5", judul:"Hubungan Bentang Alam dengan Aktivitas Masyarakat",
    alokasi:"2 JP × 35 menit (70 menit)",
    tujuan:"Murid dapat menjelaskan hubungan antara bentang alam dengan aktivitas masyarakat di daerah sekitar.",
    materi:"Keterkaitan kondisi bentang alam dengan jenis pekerjaan, makanan, dan budaya masyarakat setempat." },
  { no:7, kodeTP:"4.3.6", judul:"Menyajikan Hasil Identifikasi Bentang Alam Daerah",
    alokasi:"3 JP × 35 menit (105 menit)",
    tujuan:"Murid dapat menyajikan hasil identifikasi bentang alam daerah dalam bentuk laporan/presentasi sederhana.",
    materi:"Penyusunan dan presentasi laporan/poster hasil identifikasi bentang alam daerah sebagai penutup Bab 3." }
];

/* Info umum Bab 4 IPAS */
const IPAS_BAB4_INFO = {
  namaSekolah:"SDIT Muhammadiyah Harjamukti - Kota Cirebon",
  kelasFase:"IV (Ubay bin Ka'ab) / Fase B",
  semesterTahun:"I (Satu) / Tahun Pelajaran 2026-2027",
  kodeTP:"TP 4.4.1 s.d. TP 4.4.8",
  alokasiKeseluruhan:"25 JP × 35 menit (10 Pertemuan)",
  alokasiMinggu:"±5 JP per minggu (2 Pertemuan; alokasi bervariasi 3 JP + 2 JP per TP)",
  guruMapel:"Agung Surya Permadi, S.Pd.I."
};

const IPAS_BAB4_PERTEMUAN = [
  { no:1, kodeTP:"4.4.1", judul:"Membedakan Cuaca, Musim, dan Iklim",
    alokasi:"2 JP × 35 menit (70 menit)",
    tujuan:"Murid dapat membedakan pengertian cuaca, musim, dan iklim berdasarkan karakteristiknya dengan tepat.",
    materi:"Pengertian dan perbedaan cuaca, musim, dan iklim; ciri-ciri masing-masing berdasarkan durasi dan cakupan wilayah." },
  { no:2, kodeTP:"4.4.2 (1/2)", judul:"Menjelaskan Karakteristik Musim di Indonesia",
    alokasi:"3 JP × 35 menit (105 menit)",
    tujuan:"Murid dapat menjelaskan karakteristik musim hujan dan musim kemarau di Indonesia dengan benar.",
    materi:"Ciri-ciri musim hujan dan musim kemarau di Indonesia; faktor penyebab pergantian musim." },
  { no:3, kodeTP:"4.4.2 (2/2)", judul:"Menjelaskan Karakteristik Iklim Tropis Indonesia",
    alokasi:"2 JP × 35 menit (70 menit)",
    tujuan:"Murid dapat menjelaskan karakteristik iklim tropis di Indonesia dan dampaknya terhadap kehidupan.",
    materi:"Ciri-ciri iklim tropis; dampak iklim tropis terhadap kehidupan sehari-hari masyarakat Indonesia." },
  { no:4, kodeTP:"4.4.3", judul:"Menghubungkan Kondisi Musim dengan Aktivitas Manusia",
    alokasi:"3 JP × 35 menit (105 menit)",
    tujuan:"Murid dapat menghubungkan kondisi musim dengan berbagai aktivitas manusia di Indonesia secara kontekstual.",
    materi:"Keterkaitan musim dengan aktivitas pertanian, nelayan, pakaian, dan kegiatan sehari-hari masyarakat." },
  { no:5, kodeTP:"4.4.4", judul:"Menjelaskan Pengertian Efek Rumah Kaca",
    alokasi:"2 JP × 35 menit (70 menit)",
    tujuan:"Murid dapat menjelaskan pengertian dan mekanisme efek rumah kaca dengan kalimat sendiri.",
    materi:"Pengertian efek rumah kaca; mekanisme pemantulan dan penyerapan panas oleh gas rumah kaca di atmosfer." },
  { no:6, kodeTP:"4.4.5", judul:"Mengidentifikasi Dampak Efek Rumah Kaca",
    alokasi:"3 JP × 35 menit (105 menit)",
    tujuan:"Murid dapat mengidentifikasi dampak efek rumah kaca terhadap lingkungan dan kehidupan makhluk hidup.",
    materi:"Dampak efek rumah kaca: kenaikan suhu bumi, mencairnya es kutub, dan perubahan pola cuaca ekstrem." },
  { no:7, kodeTP:"4.4.6", judul:"Mengidentifikasi Sumber Gas Karbon di Lingkungan Sekitar",
    alokasi:"2 JP × 35 menit (70 menit)",
    tujuan:"Murid dapat mengidentifikasi sumber-sumber gas karbon di lingkungan sekitar dari berbagai aktivitas manusia.",
    materi:"Sumber-sumber emisi karbon: kendaraan bermotor, pembakaran sampah, penggunaan listrik, dan industri." },
  { no:8, kodeTP:"4.4.7", judul:"Menjelaskan Hubungan Gas Karbon dengan Perubahan Iklim",
    alokasi:"3 JP × 35 menit (105 menit)",
    tujuan:"Murid dapat menjelaskan hubungan antara emisi gas karbon dengan terjadinya perubahan iklim global.",
    materi:"Hubungan sebab-akibat emisi karbon dengan pemanasan global dan perubahan iklim." },
  { no:9, kodeTP:"4.4.8 (1/2)", judul:"Merancang Tindakan Sederhana Pengurangan Emisi Karbon",
    alokasi:"2 JP × 35 menit (70 menit)",
    tujuan:"Murid dapat merancang rencana tindakan sederhana untuk mengurangi emisi karbon di lingkungan sekitar.",
    materi:"Langkah menyusun rencana aksi sederhana: hemat energi, mengurangi sampah, menanam pohon, dan hemat penggunaan kendaraan." },
  { no:10, kodeTP:"4.4.8 (2/2)", judul:"Implementasi dan Presentasi Aksi Pengurangan Emisi Karbon",
    alokasi:"3 JP × 35 menit (105 menit)",
    tujuan:"Murid dapat mempresentasikan dan mengimplementasikan tindakan nyata pengurangan emisi karbon.",
    materi:"Implementasi rencana aksi pengurangan emisi karbon; presentasi hasil dan refleksi akhir Bab 4." }
];

/* Lengkapi Bab 1 & 2 IPAS dengan data dari berkas yang diunggah */
JURNAL_SUBJECTS.ipas.babList[0] = {
  no:1, judul:"Mengubah Bentuk Energi", semester:1, status:"ready",
  info: IPAS_BAB1_INFO, pertemuan: IPAS_BAB1_PERTEMUAN
};
JURNAL_SUBJECTS.ipas.babList[1] = {
  no:2, judul:"Gaya di Sekitar Kita", semester:1, status:"ready",
  info: IPAS_BAB2_INFO, pertemuan: IPAS_BAB2_PERTEMUAN
};
JURNAL_SUBJECTS.ipas.babList[2] = {
  no:3, judul:"Di Sini Tempat Tinggalku!", semester:1, status:"ready",
  info: IPAS_BAB3_INFO, pertemuan: IPAS_BAB3_PERTEMUAN
};
JURNAL_SUBJECTS.ipas.babList[3] = {
  no:4, judul:"Iklim dan Perubahannya", semester:1, status:"ready",
  info: IPAS_BAB4_INFO, pertemuan: IPAS_BAB4_PERTEMUAN
};
/* Seni Rupa Bab 1–3 */
JURNAL_SUBJECTS.senirupa.babList[0] = {
  no:1, judul:"Menggambar Sketsa", semester:1, status:"ready",
  info: SENIRUPA_BAB1_INFO, pertemuan: SENIRUPA_BAB1_PERTEMUAN
};
JURNAL_SUBJECTS.senirupa.babList[1] = {
  no:2, judul:"Menelaah Karakteristik Alat dan Bahan", semester:1, status:"ready",
  info: SENIRUPA_BAB2_INFO, pertemuan: SENIRUPA_BAB2_PERTEMUAN
};
JURNAL_SUBJECTS.senirupa.babList[2] = {
  no:3, judul:"Mengkreasikan Karya Seni Rupa Dua Dimensi dan Tiga Dimensi (Menggambar Rumah Adat Indonesia)", semester:1, status:"ready",
  info: SENIRUPA_BAB3_INFO, pertemuan: SENIRUPA_BAB3_PERTEMUAN
};

/* Pendidikan Pancasila — Bab 1: Mengenal Lingkungan Sekitar (Topik A-D digabung jadi 1 Bab, 18 Pertemuan) */
const PANCASILA_BAB1_INFO = {
  namaSekolah:"SDIT Muhammadiyah Harjamukti - Kota Cirebon",
  kelasFase:"IV (Ubay bin Ka'ab) / Fase B",
  semesterTahun:"I (Satu) / Tahun Pelajaran 2026-2027",
  kodeTP:"TP 4.1.1 s.d. TP 4.1.8",
  alokasiKeseluruhan:"36 JP × 35 menit (18 Pertemuan)",
  alokasiMinggu:"2 JP per minggu (1 Pertemuan × 2 JP)",
  guruMapel:"Agung Surya Permadi, S.Pd.I."
};
const PANCASILA_BAB1_PERTEMUAN = [
  // Topik A: Identitas Masyarakat di Lingkungan Tempat Tinggalku
  { no:1, kodeTP:"4.1.1 (1/2)", judul:"Topik A · Mengenal Identitas: Siapa Kita di Tengah Masyarakat?",
    alokasi:"2 JP × 35 menit (70 menit)",
    tujuan:"Murid mampu menyebutkan dan menjelaskan pengertian identitas masyarakat serta menyebutkan minimal 5 jenis identitas masyarakat (nama, suku, agama, pekerjaan, adat istiadat) di lingkungan tempat tinggal secara tepat.",
    materi:"Pengertian identitas masyarakat; jenis-jenis identitas (nama, suku, agama, pekerjaan, adat istiadat) di lingkungan tempat tinggal." },
  { no:2, kodeTP:"4.1.1 (2/2)", judul:"Topik A · Detektif Identitas: Menyelidiki Siapa Warga Sekitar Kita",
    alokasi:"2 JP × 35 menit (70 menit)",
    tujuan:"Murid mampu mengidentifikasi identitas masyarakat di lingkungan sekitar melalui kegiatan pengamatan dan pengumpulan data sederhana, serta mengklasifikasikan jenis-jenis identitas yang ditemukan.",
    materi:"Pengamatan dan pengumpulan data identitas masyarakat di lingkungan sekitar; klasifikasi jenis identitas." },
  { no:3, kodeTP:"4.1.2 (1/3)", judul:"Topik A · Ragam Warna Suku dan Bahasa di Lingkunganku",
    alokasi:"2 JP × 35 menit (70 menit)",
    tujuan:"Murid mampu menjelaskan keragaman identitas masyarakat berdasarkan suku dan bahasa daerah di lingkungan sekitar dengan disertai contoh nyata dari kehidupan sehari-hari.",
    materi:"Keragaman suku dan bahasa daerah di lingkungan sekitar; contoh nyata kehidupan sehari-hari." },
  { no:4, kodeTP:"4.1.2 (2/3)", judul:"Topik A · Menghitung Keberagaman: Agama, Kepercayaan, dan Pekerjaan Warga",
    alokasi:"2 JP × 35 menit (70 menit)",
    tujuan:"Murid mampu menganalisis keragaman identitas masyarakat berdasarkan agama/kepercayaan dan pekerjaan, serta menjelaskan keterkaitan antara identitas dengan kehidupan harmonis bermasyarakat.",
    materi:"Keragaman agama/kepercayaan dan pekerjaan warga; keterkaitan identitas dengan kehidupan harmonis bermasyarakat." },
  { no:5, kodeTP:"4.1.2 (3/3)", judul:"Topik A · Infografis Keberagaman: Ceritakan Lingkunganku kepada Dunia!",
    alokasi:"2 JP × 35 menit (70 menit)",
    tujuan:"Murid mampu menyajikan hasil pemetaan keragaman identitas masyarakat di lingkungan tempat tinggal dalam bentuk infografis sederhana dan merefleksikan sikap menghargai keberagaman.",
    materi:"Penyusunan infografis hasil pemetaan keragaman identitas; refleksi sikap menghargai keberagaman." },
  // Topik B: Menghargai Perbedaan Identitas Masyarakat
  { no:6, kodeTP:"4.1.3 (1/2)", judul:"Topik B · Apa Itu Menghargai? Kenapa Kita Harus Menghargai Perbedaan?",
    alokasi:"2 JP × 35 menit (70 menit)",
    tujuan:"Murid mampu menjelaskan pengertian toleransi dan pentingnya menghargai perbedaan identitas, serta menganalisis dampak positif perilaku menghargai dan dampak negatif perilaku tidak menghargai keberagaman dalam kehidupan bermasyarakat.",
    materi:"Pengertian toleransi; dampak positif dan negatif sikap menghargai/tidak menghargai keberagaman." },
  { no:7, kodeTP:"4.1.3 (2/2)", judul:"Topik B · Cermin Sikap: Mengevaluasi Perilaku Menghargai dalam Kehidupan Nyata",
    alokasi:"2 JP × 35 menit (70 menit)",
    tujuan:"Murid mampu menganalisis contoh nyata sikap menghargai dan tidak menghargai perbedaan identitas dari berbagai situasi, serta merefleksikan nilai-nilai Pancasila yang mendasari pentingnya menghargai keberagaman identitas masyarakat.",
    materi:"Contoh nyata sikap menghargai/tidak menghargai perbedaan identitas; nilai-nilai Pancasila terkait keberagaman." },
  { no:8, kodeTP:"4.1.4 (1/2)", judul:"Topik B · Aku Bisa! Bermain Peran Menghargai Keberagaman",
    alokasi:"2 JP × 35 menit (70 menit)",
    tujuan:"Murid mampu menerapkan sikap menghargai perbedaan identitas melalui kegiatan bermain peran (role play) dalam berbagai skenario kehidupan nyata, dan menunjukkan perilaku empati serta kerja sama lintas perbedaan identitas.",
    materi:"Bermain peran (role play) sikap menghargai perbedaan identitas; empati dan kerja sama lintas identitas." },
  { no:9, kodeTP:"4.1.4 (2/2)", judul:"Topik B · Piagam Kerukunanku: Komitmen Nyataku untuk Menghargai Keberagaman",
    alokasi:"2 JP × 35 menit (70 menit)",
    tujuan:"Murid mampu mencipta 'Piagam Kerukunanku' sebagai wujud komitmen nyata menghargai keberagaman, dan merefleksikan penerapan nilai Pancasila sila ke-2 dan ke-3 dalam kehidupan sehari-hari di lingkungan tempat tinggal.",
    materi:"Pembuatan Piagam Kerukunanku; refleksi penerapan nilai Pancasila sila ke-2 dan ke-3." },
  // Topik C: Perangkat Desa dan Kelurahan
  { no:10, kodeTP:"4.1.5 (1/2)", judul:"Topik C · Menyebutkan Nama Perangkat Desa/Kelurahan dan Tugas Pokoknya",
    alokasi:"2 JP × 35 menit (70 menit)",
    tujuan:"Melalui pengamatan gambar/video dan diskusi, murid mampu menyebutkan minimal 5 nama perangkat desa/kelurahan beserta tugasnya, serta mengidentifikasi tugas pokok masing-masing perangkat desa/kelurahan secara tepat.",
    materi:"Nama-nama perangkat desa/kelurahan dan tugas pokoknya." },
  { no:11, kodeTP:"4.1.5 (2/2)", judul:"Topik C · Membedakan Perangkat Desa dan Kelurahan Berdasarkan Fungsinya",
    alokasi:"2 JP × 35 menit (70 menit)",
    tujuan:"Melalui diskusi kelompok, murid mampu menjelaskan perbedaan antara perangkat desa dan perangkat kelurahan, serta mengelompokkan perangkat desa/kelurahan berdasarkan fungsinya dengan benar.",
    materi:"Perbedaan perangkat desa dan kelurahan; klasifikasi berdasarkan fungsi." },
  { no:12, kodeTP:"4.1.6 (1/2)", judul:"Topik C · Peran Perangkat Desa dalam Melayani Kebutuhan Masyarakat",
    alokasi:"2 JP × 35 menit (70 menit)",
    tujuan:"Melalui tanya jawab, analisis studi kasus, dan diskusi kelompok, murid mampu menjelaskan peran perangkat desa dalam melayani masyarakat dan menghubungkannya dengan kebutuhan nyata masyarakat secara logis.",
    materi:"Peran perangkat desa dalam melayani masyarakat; studi kasus kebutuhan masyarakat." },
  { no:13, kodeTP:"4.1.6 (2/2)", judul:"Topik C · Bermain Peran Berinteraksi dengan Perangkat Desa & Refleksi",
    alokasi:"2 JP × 35 menit (70 menit)",
    tujuan:"Melalui permainan peran (role play), murid mampu mempraktikkan cara berinteraksi dengan perangkat desa dalam situasi kehidupan nyata, serta mengevaluasi pentingnya peran perangkat desa bagi kehidupan masyarakat secara kritis.",
    materi:"Bermain peran interaksi dengan perangkat desa; refleksi pentingnya peran perangkat desa." },
  // Topik D: Menjelajah Lingkungan Tempat Tinggalku
  { no:14, kodeTP:"4.1.7 (1/3)", judul:"Topik D · Mengenal Fasilitas Umum di Lingkungan Tempat Tinggal",
    alokasi:"2 JP × 35 menit (70 menit)",
    tujuan:"Murid mampu menyebutkan minimal 5 fasilitas umum di lingkungan tempat tinggalnya melalui pengamatan gambar dan diskusi kelas.",
    materi:"Fasilitas umum di lingkungan tempat tinggal." },
  { no:15, kodeTP:"4.1.7 (2/3)", judul:"Topik D · Mengobservasi Potensi Alam dan Sosial Lingkungan",
    alokasi:"2 JP × 35 menit (70 menit)",
    tujuan:"Murid mampu mengidentifikasi potensi alam dan sosial di lingkungan tempat tinggalnya melalui kegiatan observasi lapangan secara langsung.",
    materi:"Observasi lapangan potensi alam dan sosial lingkungan." },
  { no:16, kodeTP:"4.1.7 (3/3)", judul:"Topik D · Mengklasifikasikan Fasilitas dan Potensi Lingkungan",
    alokasi:"2 JP × 35 menit (70 menit)",
    tujuan:"Murid mampu mengklasifikasikan fasilitas dan potensi lingkungan berdasarkan fungsi dan manfaatnya bagi masyarakat.",
    materi:"Klasifikasi fasilitas dan potensi lingkungan berdasarkan fungsi dan manfaat." },
  { no:17, kodeTP:"4.1.8 (1/2)", judul:"Topik D · Menyusun Draft Laporan Hasil Observasi",
    alokasi:"2 JP × 35 menit (70 menit)",
    tujuan:"Murid mampu menyusun draft laporan hasil observasi lingkungan tempat tinggal secara runtut berdasarkan data yang dikumpulkan.",
    materi:"Penyusunan draft laporan hasil observasi lingkungan." },
  { no:18, kodeTP:"4.1.8 (2/2)", judul:"Topik D · Menyajikan Laporan Hasil Observasi",
    alokasi:"2 JP × 35 menit (70 menit)",
    tujuan:"Murid mampu menyajikan laporan hasil observasi lingkungan secara lisan dan tertulis dengan menggunakan kalimat yang jelas dan bertanggung jawab.",
    materi:"Presentasi/penyajian laporan hasil observasi lingkungan (penutup Bab 1)." }
];

/* Pendidikan Pancasila — Bab 2: Aku Anak yang Disiplin (Topik A-C digabung jadi 1 Bab, 16 Pertemuan) */
const PANCASILA_BAB2_INFO = {
  namaSekolah:"SDIT Muhammadiyah Harjamukti - Kota Cirebon",
  kelasFase:"IV (Ubay bin Ka'ab) / Fase B",
  semesterTahun:"I (Satu) / Tahun Pelajaran 2026-2027",
  kodeTP:"TP 4.2.1 s.d. TP 4.2.7",
  alokasiKeseluruhan:"32 JP × 35 menit (16 Pertemuan)",
  alokasiMinggu:"2 JP per minggu (1 Pertemuan × 2 JP)",
  guruMapel:"Agung Surya Permadi, S.Pd.I."
};
const PANCASILA_BAB2_PERTEMUAN = [
  // Topik A: Aturan di Lingkungan Sekitar
  { no:1, kodeTP:"4.2.1 (1/3)", judul:"Topik A · Aturan di Lingkungan Keluarga",
    alokasi:"2 JP × 35 menit (70 menit)",
    tujuan:"Melalui kegiatan membaca teks dan mengamati gambar, murid mampu mengidentifikasi minimal 3 aturan di lingkungan keluarga secara tepat.",
    materi:"Aturan-aturan di lingkungan keluarga." },
  { no:2, kodeTP:"4.2.1 (2/3)", judul:"Topik A · Aturan di Lingkungan Sekolah",
    alokasi:"2 JP × 35 menit (70 menit)",
    tujuan:"Melalui kegiatan diskusi kelompok dan pengamatan gambar, murid mampu mengidentifikasi minimal 3 aturan di lingkungan sekolah dengan benar.",
    materi:"Aturan-aturan di lingkungan sekolah." },
  { no:3, kodeTP:"4.2.1 (3/3)", judul:"Topik A · Aturan di Lingkungan Masyarakat",
    alokasi:"2 JP × 35 menit (70 menit)",
    tujuan:"Melalui kegiatan pengamatan gambar dan bermain peran, murid mampu mengidentifikasi minimal 3 aturan di lingkungan masyarakat secara tepat dan percaya diri.",
    materi:"Aturan-aturan di lingkungan masyarakat; bermain peran." },
  { no:4, kodeTP:"4.2.2 (1/2)", judul:"Topik A · Manfaat Mematuhi Aturan (Keluarga & Sekolah)",
    alokasi:"2 JP × 35 menit (70 menit)",
    tujuan:"Melalui analisis cerita dan diskusi kelompok, murid mampu menjelaskan minimal 3 manfaat mematuhi aturan di lingkungan keluarga dan sekolah dengan benar.",
    materi:"Manfaat mematuhi aturan di keluarga dan sekolah." },
  { no:5, kodeTP:"4.2.2 (2/2)", judul:"Topik A · Manfaat Mematuhi Aturan di Masyarakat & Kaitannya dengan Pancasila",
    alokasi:"2 JP × 35 menit (70 menit)",
    tujuan:"Melalui kegiatan studi kasus dan presentasi kelompok, murid mampu menjelaskan manfaat mematuhi aturan di lingkungan masyarakat serta mengaitkannya dengan nilai Pancasila secara tepat.",
    materi:"Manfaat mematuhi aturan di masyarakat; keterkaitan dengan nilai Pancasila." },
  // Topik B: Membuat dan Melaksanakan Aturan
  { no:6, kodeTP:"4.2.3 (1/2)", judul:"Topik B · Mengidentifikasi Kebutuhan Aturan & Merumuskan Draf Aturan",
    alokasi:"2 JP × 35 menit (70 menit)",
    tujuan:"Murid mampu mengidentifikasi kebutuhan aturan di lingkungan kelas dengan tepat melalui diskusi kelompok, serta merumuskan draf aturan sederhana bersama teman secara demokratis dengan sikap saling menghargai.",
    materi:"Kebutuhan aturan kelas; perumusan draf aturan sederhana secara demokratis." },
  { no:7, kodeTP:"4.2.3 (2/2)", judul:"Topik B · Menyempurnakan dan Menetapkan Aturan Kelas",
    alokasi:"2 JP × 35 menit (70 menit)",
    tujuan:"Murid mampu menyempurnakan dan menetapkan aturan kelas yang disepakati bersama melalui musyawarah, serta mendokumentasikan aturan yang telah disepakati dalam bentuk poster aturan kelas.",
    materi:"Musyawarah penetapan aturan kelas; pembuatan poster aturan kelas." },
  { no:8, kodeTP:"4.2.4 (1/2)", judul:"Topik B · Menerapkan Aturan yang Telah Disepakati",
    alokasi:"2 JP × 35 menit (70 menit)",
    tujuan:"Murid mampu menerapkan aturan yang telah disepakati dalam kegiatan pembelajaran dengan penuh tanggung jawab, serta mengamati dan mencatat pelaksanaan aturan selama kegiatan berlangsung.",
    materi:"Penerapan aturan kelas; pengamatan dan pencatatan pelaksanaan aturan." },
  { no:9, kodeTP:"4.2.4 (2/2)", judul:"Topik B · Refleksi Ketaatan pada Aturan",
    alokasi:"2 JP × 35 menit (70 menit)",
    tujuan:"Murid mampu merefleksi diri terkait ketaatan pada aturan yang telah dibuat melalui lembar refleksi, serta mempresentasikan hasil refleksi pelaksanaan aturan secara jujur dan bertanggung jawab.",
    materi:"Refleksi diri ketaatan pada aturan; presentasi hasil refleksi." },
  // Topik C: Mendapatkan Hak dan Melakukan Kewajiban
  { no:10, kodeTP:"4.2.5 (1/2)", judul:"Topik C · Mengidentifikasi Hak di Keluarga dan Sekolah",
    alokasi:"2 JP × 35 menit (70 menit)",
    tujuan:"Melalui kegiatan mengamati gambar dan berdiskusi kelompok, murid mampu mengidentifikasi pengertian hak sebagai anggota keluarga dan sekolah, serta menyebutkan contoh-contoh hak yang diperoleh anak di lingkungan keluarga dan sekolah dengan tepat.",
    materi:"Pengertian dan contoh hak anak di lingkungan keluarga dan sekolah." },
  { no:11, kodeTP:"4.2.5 (2/2)", judul:"Topik C · Mengidentifikasi Kewajiban di Keluarga dan Sekolah",
    alokasi:"2 JP × 35 menit (70 menit)",
    tujuan:"Melalui kegiatan mengamati gambar, berdiskusi kelompok, dan penugasan, murid mampu mengidentifikasi pengertian kewajiban sebagai anggota keluarga dan sekolah, serta mengklasifikasikan contoh-contoh hak dan kewajiban anak di lingkungan keluarga, sekolah, dan masyarakat dengan tepat.",
    materi:"Pengertian dan contoh kewajiban anak; klasifikasi hak dan kewajiban." },
  { no:12, kodeTP:"4.2.6 (1/2)", judul:"Topik C · Menjelaskan Hubungan Hak dan Kewajiban (Keluarga & Sekolah)",
    alokasi:"2 JP × 35 menit (70 menit)",
    tujuan:"Melalui kegiatan mengamati ilustrasi cerita dan diskusi kelompok, murid mampu menjelaskan hubungan antara hak dan kewajiban dalam kehidupan sehari-hari, serta memberikan contoh hubungan timbal balik antara pelaksanaan kewajiban dan perolehan hak di lingkungan keluarga dan sekolah dengan benar.",
    materi:"Hubungan timbal balik hak dan kewajiban di keluarga dan sekolah." },
  { no:13, kodeTP:"4.2.6 (2/2)", judul:"Topik C · Menganalisis Hubungan Hak dan Kewajiban di Masyarakat",
    alokasi:"2 JP × 35 menit (70 menit)",
    tujuan:"Melalui penyelesaian masalah kontekstual (studi kasus), murid mampu menganalisis hubungan antara pelaksanaan kewajiban dan perolehan hak di lingkungan masyarakat, serta mengomunikasikan hasil analisis secara runtut dan percaya diri melalui presentasi.",
    materi:"Studi kasus hubungan hak dan kewajiban di lingkungan masyarakat." },
  { no:14, kodeTP:"4.2.7 (1/3)", judul:"Topik C · Bermain Peran Mengamalkan Hak dan Kewajiban",
    alokasi:"2 JP × 35 menit (70 menit)",
    tujuan:"Melalui kegiatan bermain peran (role play), murid mampu mendemonstrasikan contoh pelaksanaan kewajiban dan penghargaan terhadap hak orang lain di lingkungan keluarga dan sekolah dengan percaya diri, serta mengaitkan pengamalan hak dan kewajiban dengan nilai-nilai sila Pancasila dengan tepat.",
    materi:"Bermain peran pengamalan hak dan kewajiban; keterkaitan dengan nilai Pancasila." },
  { no:15, kodeTP:"4.2.7 (2/3)", judul:"Topik C · Proyek Kampanye Hak dan Kewajiban",
    alokasi:"2 JP × 35 menit (70 menit)",
    tujuan:"Melalui kegiatan proyek kelompok, murid mampu menyusun produk kampanye sederhana (poster/kartu komitmen) tentang pengamalan hak dan kewajiban dengan kreatif, serta membuat komitmen pribadi untuk melaksanakan kewajiban dan menghargai hak orang lain secara konsisten dalam kehidupan sehari-hari.",
    materi:"Proyek poster/kartu komitmen kampanye hak dan kewajiban." },
  { no:16, kodeTP:"4.2.7 (3/3)", judul:"Topik C · Asesmen Sumatif & Refleksi Akhir Topik",
    alokasi:"2 JP × 35 menit (70 menit)",
    tujuan:"Melalui kegiatan asesmen sumatif, murid mampu menunjukkan pemahaman tentang pengertian, hubungan, dan pengamalan hak serta kewajiban sebagai bentuk pengamalan Pancasila dengan benar, serta mengevaluasi sejauh mana dirinya telah melaksanakan kewajiban dan menghargai hak orang lain secara konsisten melalui refleksi akhir topik.",
    materi:"Asesmen sumatif Topik C; refleksi akhir pengamalan hak dan kewajiban (penutup Bab 2)." }
];

/* Lengkapi Bab 1 & 2 Pendidikan Pancasila dengan data dari berkas yang diunggah */
JURNAL_SUBJECTS.pancasila.babList[0] = {
  no:1, judul:"Mengenal Lingkungan Sekitar", semester:1, status:"ready",
  info: PANCASILA_BAB1_INFO, pertemuan: PANCASILA_BAB1_PERTEMUAN
};
JURNAL_SUBJECTS.pancasila.babList[1] = {
  no:2, judul:"Aku Anak yang Disiplin", semester:1, status:"ready",
  info: PANCASILA_BAB2_INFO, pertemuan: PANCASILA_BAB2_PERTEMUAN
};

/* ===== [BARU] Bahasa Indonesia — Bab 1-4 (data dari berkas Jurnal Mengajar yang diunggah) ===== */
const BINDO_BAB1_INFO = {
  namaSekolah:"SDIT Muhammadiyah Harjamukti - Kota Cirebon",
  kelasFase:"IV (Ubay bin Ka'ab) / Fase B",
  semesterTahun:"I (Satu) / Tahun Pelajaran 2026-2027",
  kodeTP:"TP 4.1.1 s.d. TP 4.1.4",
  alokasiKeseluruhan:"27 JP × 35 menit (9 Pertemuan)",
  alokasiMinggu:"6 JP per minggu (2 Pertemuan × 3 JP)",
  guruMapel:"Agung Surya Permadi, S.Pd.I."
};

const BINDO_BAB1_PERTEMUAN = [
  { no:1, kodeTP:"4.1.1", judul:"Membaca Teks Narasi ‘Sudah Besar’",
    alokasi:"3 JP × 35 menit (105 menit)",
    tujuan:"Murid mampu membaca teks narasi ‘Sudah Besar’ dengan lancar dan memahami isi secara keseluruhan melalui kegiatan membaca nyaring dan dalam hati.",
    materi:"Teks narasi ‘Sudah Besar’; ciri-ciri teks narasi; kegiatan membaca nyaring dan membaca dalam hati." },
  { no:2, kodeTP:"4.1.1", judul:"Memaknai Isi dan Pesan Teks Narasi",
    alokasi:"3 JP × 35 menit (105 menit)",
    tujuan:"Murid mampu menemukan informasi penting, memaknai isi teks narasi, dan menyimpulkan pesan yang terkandung di dalamnya melalui diskusi kelompok.",
    materi:"Informasi penting dalam teks; pesan/nilai moral teks narasi ‘Sudah Besar’; diskusi kelompok." },
  { no:3, kodeTP:"4.1.2", judul:"Tujuan Teks dan Kalimat Transitif–Intransitif",
    alokasi:"3 JP × 35 menit (105 menit)",
    tujuan:"Murid mampu mengidentifikasi tujuan penulisan teks narasi dan mengenali kalimat transitif serta intransitif dalam teks melalui pengamatan contoh.",
    materi:"Tujuan penulisan teks narasi; konsep kalimat transitif (memerlukan objek) dan intransitif (tidak memerlukan objek)." },
  { no:4, kodeTP:"4.1.2", judul:"Pesan Teks dan Penggunaan Tanda Baca",
    alokasi:"3 JP × 35 menit (105 menit)",
    tujuan:"Murid mampu memahami pesan teks narasi menggunakan kaidah kebahasaan berupa penggunaan tanda baca yang benar dan menerapkannya melalui latihan.",
    materi:"Tanda baca titik, koma, tanda tanya, dan tanda seru; hubungan tanda baca dengan pesan teks." },
  { no:5, kodeTP:"4.1.3", judul:"Memahami Makna Denotatif",
    alokasi:"3 JP × 35 menit (105 menit)",
    tujuan:"Murid mampu memahami pengertian makna denotatif dan membedakannya dengan makna konotatif melalui berbagai contoh kalimat dalam konteks sehari-hari.",
    materi:"Konsep makna denotatif (makna sebenarnya) dibandingkan dengan makna konotatif (makna kiasan)." },
  { no:6, kodeTP:"4.1.3", judul:"Menggunakan Kosakata Denotatif dalam Kalimat",
    alokasi:"3 JP × 35 menit (105 menit)",
    tujuan:"Murid mampu menggunakan kosakata bermakna denotatif dengan tepat dalam kalimat sederhana yang sesuai konteks melalui kegiatan menulis terbimbing.",
    materi:"Penggunaan kosakata bermakna denotatif dalam kalimat sederhana bertema ‘Sudah Besar’." },
  { no:7, kodeTP:"4.1.4", judul:"Mengenal dan Berlatih Huruf Tegak Bersambung",
    alokasi:"3 JP × 35 menit (105 menit)",
    tujuan:"Murid mampu mengenal dan mempraktikkan bentuk huruf tegak bersambung kapital dan huruf kecil dengan benar melalui latihan terstruktur.",
    materi:"Bentuk huruf kapital dan huruf kecil tegak bersambung; posisi duduk dan cara memegang pensil yang benar." },
  { no:8, kodeTP:"4.1.4", judul:"Menyalin Kalimat dengan Tulisan Tegak Bersambung",
    alokasi:"3 JP × 35 menit (105 menit)",
    tujuan:"Murid mampu menyalin kalimat sederhana menggunakan tulisan tegak bersambung dengan kerapian dan keterbacaan yang baik.",
    materi:"Teknik menyalin kalimat dengan tulisan tegak bersambung yang rapi dan terbaca." },
  { no:9, kodeTP:"4.1.4", judul:"Menulis Kalimat Sendiri dengan Tulisan Tegak Bersambung (Asesmen Sumatif Bab)",
    alokasi:"3 JP × 35 menit (105 menit)",
    tujuan:"Murid mampu menulis kalimat sendiri menggunakan tulisan tegak bersambung dengan memperhatikan bentuk huruf, kerapian, dan keterbacaan secara mandiri.",
    materi:"Penulisan mandiri minimal 5 kalimat bertema ‘Sudah Besar’ menggunakan tulisan tegak bersambung sebagai asesmen sumatif Bab 1." }
];

const BINDO_BAB2_INFO = {
  namaSekolah:"SDIT Muhammadiyah Harjamukti - Kota Cirebon",
  kelasFase:"IV (Ubay bin Ka'ab) / Fase B",
  semesterTahun:"I (Satu) / Tahun Pelajaran 2026-2027",
  kodeTP:"TP 4.2.1 s.d. TP 4.2.5",
  alokasiKeseluruhan:"30 JP × 35 menit (10 Pertemuan)",
  alokasiMinggu:"6 JP per minggu (2 Pertemuan × 3 JP)",
  guruMapel:"Agung Surya Permadi, S.Pd.I."
};

const BINDO_BAB2_PERTEMUAN = [
  { no:1, kodeTP:"4.2.1", judul:"Menjelaskan Ide Pokok dan Menyimak Teks (Pengenalan Konsep)",
    alokasi:"3 JP × 35 menit (105 menit)",
    tujuan:"Murid mampu menjelaskan pengertian ide pokok dan menyimak teks dengan seksama untuk menemukan kalimat utama pada setiap paragraf.",
    materi:"Pengertian ide pokok; letak ide pokok (awal/akhir/tengah paragraf); cara menemukan kalimat utama." },
  { no:2, kodeTP:"4.2.1", judul:"Menentukan Ide Pokok Seluruh Paragraf dari Teks yang Disimak",
    alokasi:"3 JP × 35 menit (105 menit)",
    tujuan:"Murid mampu menentukan ide pokok setiap paragraf dari teks yang disimak dan menuliskannya dengan kalimat sendiri.",
    materi:"Identifikasi kalimat utama dan ide pokok pada seluruh paragraf teks ‘Di Bawah Atap’." },
  { no:3, kodeTP:"4.2.2", judul:"Membaca Kata-Kata Baru dengan Lafal yang Benar",
    alokasi:"3 JP × 35 menit (105 menit)",
    tujuan:"Murid mampu membaca kata-kata baru dalam teks dengan lafal yang benar dan melafalkannya secara mandiri.",
    materi:"Kosakata baru dalam teks ‘Di Bawah Atap’ (merawat, menjaga, melindungi, dsb.) beserta lafal dan maknanya." },
  { no:4, kodeTP:"4.2.2", judul:"Membaca dengan Intonasi yang Tepat Sesuai Konteks Kalimat",
    alokasi:"3 JP × 35 menit (105 menit)",
    tujuan:"Murid mampu membaca paragraf panjang dengan intonasi yang sesuai konteks kalimat (pernyataan, tanya, seru).",
    materi:"Pola intonasi dasar: naik (kalimat tanya), turun (pernyataan), bervariasi (kalimat seru)." },
  { no:5, kodeTP:"4.2.3", judul:"Menjelaskan Kaidah Kata Berimbuhan Awalan ‘me-’ dan Identifikasi",
    alokasi:"3 JP × 35 menit (105 menit)",
    tujuan:"Murid mampu menjelaskan kaidah pembentukan kata berawalan ‘me-’ dan mengidentifikasi perubahannya sesuai huruf awal kata dasar.",
    materi:"Kaidah perubahan awalan ‘me-’ (mem-, men-, meny-, me-, meng-) sesuai konsonan awal kata dasar." },
  { no:6, kodeTP:"4.2.3", judul:"Menggunakan Kata Berimbuhan ‘me-’ dalam Kalimat Orisinal",
    alokasi:"3 JP × 35 menit (105 menit)",
    tujuan:"Murid mampu menggunakan kata berimbuhan ‘me-’ secara benar dalam kalimat orisinal.",
    materi:"Penyusunan kalimat efektif menggunakan kata berimbuhan ‘me-’ bertema kehidupan di rumah." },
  { no:7, kodeTP:"4.2.4", judul:"Membuat Kerangka Cerita dan Menyusun Informasi Secara Runtut",
    alokasi:"3 JP × 35 menit (105 menit)",
    tujuan:"Murid mampu membuat kerangka cerita berdasarkan teks yang dibaca dan menyusun informasi secara runtut.",
    materi:"Peta Cerita (Story Map): unsur 5W+1H dan struktur awal–tengah–akhir." },
  { no:8, kodeTP:"4.2.4", judul:"Menceritakan Kembali Informasi di Depan Kelas dengan Santun dan Percaya Diri",
    alokasi:"3 JP × 35 menit (105 menit)",
    tujuan:"Murid mampu menceritakan kembali isi teks di depan kelas dengan bahasa yang santun, runtut, dan percaya diri.",
    materi:"Teknik bercerita kembali: kata penghubung, kontak mata, intonasi; kriteria keruntutan dan kesantunan." },
  { no:9, kodeTP:"4.2.5", judul:"Menjelaskan Kalimat Majemuk dan Menemukan Contohnya dalam Teks",
    alokasi:"3 JP × 35 menit (105 menit)",
    tujuan:"Murid mampu menjelaskan pengertian dan ciri kalimat majemuk setara dan bertingkat serta menemukan contohnya dalam teks.",
    materi:"Kalimat majemuk setara (dan, tetapi, atau, lalu, sedangkan) dan bertingkat (karena, ketika, jika, agar, sehingga)." },
  { no:10, kodeTP:"4.2.5", judul:"Mengidentifikasi Kalimat Majemuk Secara Mandiri (Asesmen Sumatif Topik)",
    alokasi:"3 JP × 35 menit (105 menit)",
    tujuan:"Murid mampu mengidentifikasi dan menganalisis kalimat majemuk dalam teks secara mandiri sebagai asesmen sumatif topik.",
    materi:"Asesmen sumatif topik: ide pokok, kata berimbuhan ‘me-’, dan identifikasi kalimat majemuk." }
];

const BINDO_BAB3_INFO = {
  namaSekolah:"SDIT Muhammadiyah Harjamukti - Kota Cirebon",
  kelasFase:"IV (Ubay bin Ka'ab) / Fase B",
  semesterTahun:"I (Satu) / Tahun Pelajaran 2026-2027",
  kodeTP:"TP 4.3.1 s.d. TP 4.3.3",
  alokasiKeseluruhan:"24 JP × 35 menit (8 Pertemuan)",
  alokasiMinggu:"6 JP per minggu (2 Pertemuan × 3 JP)",
  guruMapel:"Agung Surya Permadi, S.Pd.I."
};

const BINDO_BAB3_PERTEMUAN = [
  { no:1, kodeTP:"4.3.1", judul:"Detektif Informasi: Teks Bergambar Tunggal",
    alokasi:"3 JP × 35 menit (105 menit)",
    tujuan:"Peserta didik mengidentifikasi minimal 4 informasi penting dari teks bergambar tunggal menggunakan strategi baca-amati-hubungkan secara individu.",
    materi:"Strategi baca-amati-hubungkan; informasi penting vs. informasi pendukung dalam teks bergambar." },
  { no:2, kodeTP:"4.3.1", judul:"Perbandingan Dua Teks Bergambar (Kelompok)",
    alokasi:"3 JP × 35 menit (105 menit)",
    tujuan:"Peserta didik membandingkan informasi dari dua teks bergambar berbeda secara berkelompok dan mempresentasikan hasil temuannya.",
    materi:"Perbandingan informasi antar-teks bergambar; kerja kelompok dan presentasi hasil temuan." },
  { no:3, kodeTP:"4.3.1", judul:"Asesmen Formatif & Refleksi Metakognitif (Mandiri)",
    alokasi:"3 JP × 35 menit (105 menit)",
    tujuan:"Peserta didik secara mandiri menemukan dan merefleksi strategi yang digunakan dalam mengidentifikasi informasi penting dari teks dan ilustrasi (asesmen formatif).",
    materi:"Refleksi metakognitif strategi menemukan informasi; asesmen formatif TP 4.3.1." },
  { no:4, kodeTP:"4.3.2", judul:"Kaidah Berpendapat Santun & Latihan Berpasangan",
    alokasi:"3 JP × 35 menit (105 menit)",
    tujuan:"Peserta didik menyusun kalimat pendapat yang disertai alasan logis menggunakan frasa pembuka pendapat yang santun secara berpasangan.",
    materi:"Struktur pendapat: pernyataan–alasan–penutup; frasa pembuka pendapat yang santun." },
  { no:5, kodeTP:"4.3.2", judul:"Debat Mini & Menulis Pendapat Individual",
    alokasi:"3 JP × 35 menit (105 menit)",
    tujuan:"Peserta didik menyampaikan dan mempertahankan pendapat dalam kegiatan debat mini kelompok, serta menuliskan pendapat secara mandiri.",
    materi:"Debat mini kelompok; penulisan pendapat individu dengan alasan logis dan santun." },
  { no:6, kodeTP:"4.3.3", judul:"Mengenal & Berlatih Kata Penghubung Antarkalimat",
    alokasi:"3 JP × 35 menit (105 menit)",
    tujuan:"Peserta didik mengidentifikasi fungsi kata penghubung antarkalimat dan menggunakannya dalam latihan melengkapi dan menyusun kalimat.",
    materi:"Kata penghubung antarkalimat (oleh karena itu, namun, dengan demikian, selain itu, setelah itu, bahkan, meskipun demikian) sebagai penanda hubungan logis." },
  { no:7, kodeTP:"4.3.3", judul:"Menulis Terbimbing: Kerangka & Draf Narasi Pertama",
    alokasi:"3 JP × 35 menit (105 menit)",
    tujuan:"Peserta didik menulis draf teks narasi minimal 3 paragraf menggunakan minimal 4 kata penghubung antarkalimat yang bervariasi.",
    materi:"Langkah menulis narasi: topik → kerangka → draf; penggunaan kata penghubung antarkalimat dalam draf." },
  { no:8, kodeTP:"4.3.3", judul:"Karya Final, Pameran & Refleksi Akhir Bab 3 (Puncak)",
    alokasi:"3 JP × 35 menit (105 menit)",
    tujuan:"Peserta didik menyempurnakan dan mempresentasikan teks narasi final sebagai produk akhir bab (asesmen sumatif).",
    materi:"Penyuntingan (self-editing) dan penyempurnaan draf narasi; presentasi/pameran karya final sebagai asesmen sumatif Bab 3." }
];

const BINDO_BAB4_INFO = {
  namaSekolah:"SDIT Muhammadiyah Harjamukti - Kota Cirebon",
  kelasFase:"IV (Ubay bin Ka'ab) / Fase B",
  semesterTahun:"I (Satu) / Tahun Pelajaran 2026-2027",
  kodeTP:"TP 4.4.1 s.d. TP 4.4.4",
  alokasiKeseluruhan:"27 JP × 35 menit (9 Pertemuan)",
  alokasiMinggu:"6 JP per minggu (2 Pertemuan × 3 JP)",
  guruMapel:"Agung Surya Permadi, S.Pd.I."
};

const BINDO_BAB4_PERTEMUAN = [
  { no:1, kodeTP:"4.4.1", judul:"Mengidentifikasi Permasalahan Tokoh (Pengenalan)",
    alokasi:"3 JP × 35 menit (105 menit)",
    tujuan:"Peserta didik mampu menemukan dan menyebutkan permasalahan yang dihadapi tokoh dalam cerita.",
    materi:"Cerita fiksi bertema olahraga/petualangan; unsur intrinsik tokoh dan permasalahan; identifikasi permasalahan melalui peristiwa, dialog, dan reaksi tokoh." },
  { no:2, kodeTP:"4.4.1", judul:"Mengidentifikasi Permasalahan Tokoh (Pendalaman)",
    alokasi:"3 JP × 35 menit (105 menit)",
    tujuan:"Peserta didik mampu mengidentifikasi permasalahan tokoh beserta penyebabnya pada cerita baru melalui latihan mandiri dan diskusi.",
    materi:"Permasalahan tokoh dan penyebabnya; Peta Permasalahan Tokoh (LKM Pertemuan 1 & 2)." },
  { no:3, kodeTP:"4.4.2", judul:"Menilai Kesesuaian Ilustrasi (Pengenalan)",
    alokasi:"3 JP × 35 menit (105 menit)",
    tujuan:"Peserta didik mampu menilai kesesuaian ilustrasi dengan isi bacaan berdasarkan bukti dari teks.",
    materi:"Konsep ilustrasi sebagai representasi visual isi teks; kriteria menilai kesesuaian ilustrasi dengan bacaan." },
  { no:4, kodeTP:"4.4.2", judul:"Menilai Kesesuaian Ilustrasi (Penerapan)",
    alokasi:"3 JP × 35 menit (105 menit)",
    tujuan:"Peserta didik mampu memprediksi peristiwa cerita dari ilustrasi dan menyusun penilaian ilustrasi yang didukung bukti teks dan argumen logis.",
    materi:"Penilaian ilustrasi berbasis bukti dan argumen logis; LKM Penilaian Ilustrasi (Pertemuan 3 & 4)." },
  { no:5, kodeTP:"4.4.3", judul:"Membedakan Fakta dan Opini (Pengenalan)",
    alokasi:"3 JP × 35 menit (105 menit)",
    tujuan:"Peserta didik mampu membedakan kalimat fakta (dapat dibuktikan) dan opini (pendapat/penilaian) dalam teks.",
    materi:"Pengertian fakta dan opini; ciri-ciri kalimat fakta dan kalimat opini." },
  { no:6, kodeTP:"4.4.3", judul:"Membedakan Fakta dan Opini (Latihan Mandiri)",
    alokasi:"3 JP × 35 menit (105 menit)",
    tujuan:"Peserta didik mampu mendeteksi dan mengklasifikasikan kalimat fakta dan opini secara mandiri dalam berbagai teks.",
    materi:"Latihan klasifikasi fakta dan opini melalui permainan ‘Detektif Fakta’; LKM Fakta dan Opini (Pertemuan 5 & 6)." },
  { no:7, kodeTP:"4.4.4", judul:"Menulis Teks Utuh Berstruktur (Pramenulis & Draf Awal)",
    alokasi:"3 JP × 35 menit (105 menit)",
    tujuan:"Peserta didik mampu menyusun kerangka dan draf awal teks utuh dengan struktur awal (orientasi), tengah (komplikasi-resolusi), dan akhir (koda).",
    materi:"Tahapan menulis: pramenulis dan menulis draf pertama; struktur teks awal-tengah-akhir." },
  { no:8, kodeTP:"4.4.4", judul:"Menulis Teks Utuh Berstruktur (Revisi & Penyuntingan)",
    alokasi:"3 JP × 35 menit (105 menit)",
    tujuan:"Peserta didik mampu merevisi dan menyunting (self-editing) draf tulisannya sendiri untuk menghasilkan teks yang lebih baik.",
    materi:"Tahapan merevisi dan menyunting draf tulisan; kaidah bahasa Indonesia dalam penulisan." },
  { no:9, kodeTP:"4.4.4", judul:"Mempublikasikan Karya & Asesmen Sumatif Bab 4",
    alokasi:"3 JP × 35 menit (105 menit)",
    tujuan:"Peserta didik mampu mempublikasikan dan mempresentasikan teks utuh final sebagai produk akhir Bab 4 (asesmen sumatif).",
    materi:"Publikasi dan presentasi karya tulis final; refleksi menyeluruh Bab 4: identifikasi tokoh, penilaian ilustrasi, fakta-opini, dan menulis berstruktur." }
];

/* Lengkapi Bab 1-4 Bahasa Indonesia dengan data dari berkas yang diunggah */
JURNAL_SUBJECTS.bindo.babList[0] = {
  no:1, judul:"Sudah Besar", semester:1, status:"ready",
  info: BINDO_BAB1_INFO, pertemuan: BINDO_BAB1_PERTEMUAN
};
JURNAL_SUBJECTS.bindo.babList[1] = {
  no:2, judul:"Di Bawah Atap", semester:1, status:"ready",
  info: BINDO_BAB2_INFO, pertemuan: BINDO_BAB2_PERTEMUAN
};
JURNAL_SUBJECTS.bindo.babList[2] = {
  no:3, judul:"Lihat Sendiri", semester:1, status:"ready",
  info: BINDO_BAB3_INFO, pertemuan: BINDO_BAB3_PERTEMUAN
};
JURNAL_SUBJECTS.bindo.babList[3] = {
  no:4, judul:"Meliuk dan Menerjang", semester:1, status:"ready",
  info: BINDO_BAB4_INFO, pertemuan: BINDO_BAB4_PERTEMUAN
};

/* ===== [BARU] Matematika — Bab 1-3 (data dari berkas Jurnal Mengajar yang diunggah) ===== */
const MATEMATIKA_INFO_BASE = {
  namaSekolah:"SDIT Muhammadiyah Harjamukti - Kota Cirebon",
  kelasFase:"IV (Ubay bin Ka'ab) / Fase B",
  semesterTahun:"I (Satu) / Tahun Pelajaran 2026-2027",
  guruMapel:"Agung Surya Permadi, S.Pd.I."
};

const MATEMATIKA_BAB1_INFO = {
  ...MATEMATIKA_INFO_BASE,
  kodeTP:"TP 4.1.1 s.d. TP 4.1.9",
  alokasiKeseluruhan:"50 JP × 35 menit (20 Pertemuan)",
  alokasiMinggu:"2-3 JP per minggu (1 Pertemuan)"
};
const MATEMATIKA_BAB1_PERTEMUAN = [
  { no:1, kodeTP:"4.1.1", judul:"Membaca Bilangan Cacah sampai 10.000", alokasi:"3 JP × 35 menit (105 menit)",
    tujuan:"Peserta didik mampu membaca bilangan cacah 1.001 s.d. 10.000 dengan lafal yang benar dan menghubungkan lambang bilangan dengan namanya dalam konteks sehari-hari.",
    materi:"Membaca bilangan cacah 1.001–10.000 dengan lafal yang benar; hubungan lambang bilangan dengan namanya." },
  { no:2, kodeTP:"4.1.1", judul:"Menulis Bilangan Cacah sampai 10.000", alokasi:"2 JP × 35 menit (70 menit)",
    tujuan:"Peserta didik mampu menulis lambang bilangan cacah sampai 10.000 dari nama bilangan yang diucapkan/tertulis dengan benar dan merefleksi strategi baca-tulisnya.",
    materi:"Menulis lambang bilangan cacah sampai 10.000 dari nama bilangan yang diucapkan/tertulis." },
  { no:3, kodeTP:"4.1.2", judul:"Mengidentifikasi Nilai Tempat Bilangan Cacah", alokasi:"3 JP × 35 menit (105 menit)",
    tujuan:"Murid dapat mengidentifikasi nilai tempat ribuan, ratusan, puluhan, dan satuan menggunakan media konkret.",
    materi:"Nilai tempat ribuan, ratusan, puluhan, dan satuan menggunakan media konkret." },
  { no:4, kodeTP:"4.1.2", judul:"Menentukan Nilai Angka pada Nilai Tempat", alokasi:"2 JP × 35 menit (70 menit)",
    tujuan:"Murid dapat menentukan nilai angka pada setiap posisi nilai tempat dan menerapkannya dalam soal kontekstual.",
    materi:"Nilai angka pada setiap posisi nilai tempat dalam soal kontekstual." },
  { no:5, kodeTP:"4.1.3", judul:"Membandingkan Bilangan Cacah sampai 10.000", alokasi:"3 JP × 35 menit (105 menit)",
    tujuan:"Peserta didik mampu membandingkan dua bilangan cacah sampai 10.000 menggunakan simbol >, <, = dan menjelaskan alasan berdasarkan nilai tempat.",
    materi:"Perbandingan dua bilangan cacah sampai 10.000 menggunakan simbol >, <, =." },
  { no:6, kodeTP:"4.1.3", judul:"Mengurutkan Bilangan Cacah sampai 10.000", alokasi:"2 JP × 35 menit (70 menit)",
    tujuan:"Peserta didik mampu mengurutkan bilangan cacah sampai 10.000 secara menaik dan menurun, serta merefleksi dan mengevaluasi strategi pengurutan yang digunakan.",
    materi:"Pengurutan bilangan cacah sampai 10.000 secara menaik dan menurun." },
  { no:7, kodeTP:"4.1.4", judul:"Komposisi & Dekomposisi Standar Bilangan Cacah", alokasi:"3 JP × 35 menit (105 menit)",
    tujuan:"Peserta didik mampu melakukan komposisi dan dekomposisi standar bilangan cacah sampai 10.000, serta menjelaskan hubungan keduanya sebagai operasi yang saling kebalikan.",
    materi:"Komposisi dan dekomposisi standar bilangan cacah sampai 10.000." },
  { no:8, kodeTP:"4.1.4", judul:"Dekomposisi Non-Standar (Fleksibel) Bilangan Cacah", alokasi:"2 JP × 35 menit (70 menit)",
    tujuan:"Peserta didik mampu melakukan dekomposisi non-standar bilangan cacah sampai 10.000 dengan lebih dari satu cara dan memverifikasi kebenarannya.",
    materi:"Dekomposisi non-standar (fleksibel) bilangan cacah sampai 10.000." },
  { no:9, kodeTP:"4.1.5", judul:"Penjumlahan Bilangan Cacah Tanpa Teknik Menyimpan", alokasi:"3 JP × 35 menit (105 menit)",
    tujuan:"Murid mampu menjelaskan konsep penjumlahan bilangan cacah sampai 1.000 menggunakan benda konkret dan nilai tempat, serta menerapkan teknik penjumlahan bersusun tanpa teknik menyimpan untuk menyelesaikan soal kontekstual sederhana.",
    materi:"Konsep penjumlahan; penjumlahan bersusun tanpa teknik menyimpan." },
  { no:10, kodeTP:"4.1.5", judul:"Penjumlahan Bilangan Cacah Dengan Teknik Menyimpan", alokasi:"2 JP × 35 menit (70 menit)",
    tujuan:"Murid mampu menerapkan teknik penjumlahan bersusun dengan teknik menyimpan (regrouping) pada bilangan cacah sampai 1.000 untuk menyelesaikan masalah kontekstual, dan merefleksikan strategi penjumlahan yang digunakan beserta cara memeriksa kewajaran hasil.",
    materi:"Penjumlahan bersusun dengan teknik menyimpan (regrouping)." },
  { no:11, kodeTP:"4.1.6", judul:"Pengurangan Bilangan Cacah Tanpa Teknik Meminjam", alokasi:"3 JP × 35 menit (105 menit)",
    tujuan:"Murid mampu menjelaskan konsep pengurangan bilangan cacah sampai 1.000 menggunakan benda konkret dan nilai tempat, serta menerapkan teknik pengurangan bersusun tanpa teknik meminjam untuk menyelesaikan soal kontekstual sederhana.",
    materi:"Konsep pengurangan; pengurangan bersusun tanpa teknik meminjam." },
  { no:12, kodeTP:"4.1.6", judul:"Pengurangan Bilangan Cacah Dengan Teknik Meminjam", alokasi:"2 JP × 35 menit (70 menit)",
    tujuan:"Murid mampu menerapkan teknik pengurangan bersusun dengan teknik meminjam (borrowing) pada bilangan cacah sampai 1.000 untuk menyelesaikan masalah kontekstual, dan merefleksikan strategi pengurangan yang digunakan beserta cara memeriksa kewajaran hasil menggunakan hubungan invers dengan penjumlahan.",
    materi:"Pengurangan bersusun dengan teknik meminjam (borrowing); hubungan invers dengan penjumlahan." },
  { no:13, kodeTP:"4.1.7", judul:"Perkalian sebagai Penjumlahan Berulang & Eksplorasi Array", alokasi:"3 JP × 35 menit (105 menit)",
    tujuan:"Murid memahami konsep perkalian sebagai penjumlahan berulang dan merepresentasikannya dalam array.",
    materi:"Konsep perkalian sebagai penjumlahan berulang; representasi array." },
  { no:14, kodeTP:"4.1.7", judul:"Sifat Komutatif & Tabel Perkalian 6–10", alokasi:"2 JP × 35 menit (70 menit)",
    tujuan:"Murid menerapkan sifat komutatif dan menguasai tabel perkalian 6–10.",
    materi:"Sifat komutatif perkalian; tabel perkalian 6–10." },
  { no:15, kodeTP:"4.1.7", judul:"Perkalian dalam Konteks Masalah Nyata & Asesmen Akhir TP", alokasi:"3 JP × 35 menit (105 menit)",
    tujuan:"Murid mengaplikasikan perkalian sampai 100 dalam soal cerita dan merefleksikan strategi belajarnya.",
    materi:"Perkalian dalam soal cerita kontekstual; asesmen akhir TP 4.1.7." },
  { no:16, kodeTP:"4.1.8", judul:"Konsep Dasar Pembagian (Pengurangan Berulang & Kebalikan Perkalian)", alokasi:"2 JP × 35 menit (70 menit)",
    tujuan:"Murid mampu memahami konsep pembagian sebagai pengurangan berulang dan kebalikan perkalian menggunakan benda konkret dan gambar.",
    materi:"Konsep pembagian sebagai pengurangan berulang dan kebalikan perkalian." },
  { no:17, kodeTP:"4.1.8", judul:"Strategi Pembagian Bilangan Cacah sampai 100", alokasi:"3 JP × 35 menit (105 menit)",
    tujuan:"Murid mampu melakukan operasi pembagian bilangan cacah sampai 100 menggunakan berbagai strategi (tabel perkalian, pembagian bersusun sederhana) dan menyelesaikan masalah kontekstual sederhana.",
    materi:"Strategi pembagian bilangan cacah sampai 100 (tabel perkalian, pembagian bersusun)." },
  { no:18, kodeTP:"4.1.8", judul:"Penerapan Pembagian dalam Masalah Kehidupan Nyata & Refleksi TP", alokasi:"2 JP × 35 menit (70 menit)",
    tujuan:"Murid mampu menyelesaikan berbagai masalah kontekstual yang melibatkan pembagian bilangan cacah sampai 100 secara mandiri dan melakukan refleksi terhadap proses belajar keseluruhan TP 4.1.8.",
    materi:"Penerapan pembagian dalam masalah kontekstual; refleksi TP 4.1.8." },
  { no:19, kodeTP:"4.1.9", judul:"Faktor Bilangan", alokasi:"3 JP × 35 menit (105 menit)",
    tujuan:"Murid dapat menjelaskan pengertian faktor suatu bilangan, menentukan semua faktor suatu bilangan cacah melalui metode pembagian, dan menyajikan faktor suatu bilangan secara sistematis.",
    materi:"Pengertian dan penentuan faktor suatu bilangan cacah." },
  { no:20, kodeTP:"4.1.9", judul:"Kelipatan Bilangan & Perbedaannya dengan Faktor", alokasi:"2 JP × 35 menit (70 menit)",
    tujuan:"Murid dapat menjelaskan pengertian kelipatan suatu bilangan, menentukan kelipatan suatu bilangan cacah melalui perkalian berulang, dan membedakan konsep faktor dan kelipatan suatu bilangan.",
    materi:"Pengertian dan penentuan kelipatan bilangan; perbedaan faktor dan kelipatan." }
];

const MATEMATIKA_BAB2_INFO = {
  ...MATEMATIKA_INFO_BASE,
  kodeTP:"TP 4.2.2 s.d. TP 4.2.5",
  alokasiKeseluruhan:"25 JP × 35 menit (10 Pertemuan)",
  alokasiMinggu:"2-3 JP per minggu (1 Pertemuan)"
};
const MATEMATIKA_BAB2_PERTEMUAN = [
  { no:1, kodeTP:"4.2.2", judul:"Membandingkan Pecahan Berpenyebut Sama", alokasi:"3 JP × 35 menit (105 menit)",
    tujuan:"Murid dapat menjelaskan konsep membandingkan dua pecahan berpenyebut sama menggunakan media konkret dan gambar, membandingkan dua pecahan berpenyebut sama menggunakan simbol <, >, dan =, serta mengurutkan tiga atau lebih pecahan berpenyebut sama dari yang terkecil hingga terbesar.",
    materi:"Membandingkan dan mengurutkan pecahan berpenyebut sama." },
  { no:2, kodeTP:"4.2.2", judul:"Operasi Pecahan Berpenyebut Sama", alokasi:"2 JP × 35 menit (70 menit)",
    tujuan:"Murid dapat menjelaskan prosedur penjumlahan dan pengurangan pecahan berpenyebut sama, menghitung hasil penjumlahan dan pengurangan dua pecahan berpenyebut sama, serta menyelesaikan masalah kontekstual yang melibatkan penjumlahan dan pengurangan pecahan berpenyebut sama.",
    materi:"Penjumlahan dan pengurangan pecahan berpenyebut sama." },
  { no:3, kodeTP:"4.2.3", judul:"Menentukan Pecahan Senilai (Mengalikan Pembilang & Penyebut)", alokasi:"3 JP × 35 menit (105 menit)",
    tujuan:"Melalui eksplorasi benda konkret dan model gambar, peserta didik dapat menjelaskan konsep pecahan senilai, menentukan pecahan senilai suatu pecahan dengan mengalikan pembilang dan penyebut dengan bilangan yang sama, serta menyajikan minimal 3 pasang pecahan senilai dalam bentuk gambar dan simbol.",
    materi:"Konsep dan penentuan pecahan senilai dengan mengalikan pembilang dan penyebut." },
  { no:4, kodeTP:"4.2.3", judul:"Menentukan dan Membuktikan Pecahan Senilai (Membagi Pembilang & Penyebut)", alokasi:"2 JP × 35 menit (70 menit)",
    tujuan:"Melalui diskusi dan pemecahan masalah, peserta didik dapat menentukan pecahan senilai dengan cara membagi pembilang dan penyebut dengan bilangan yang sama, menganalisis dan membuktikan kesetaraan dua pecahan, serta merefleksikan cara-cara menentukan pecahan senilai dan memilih cara yang paling efisien.",
    materi:"Penentuan pecahan senilai dengan membagi pembilang dan penyebut; pembuktian kesetaraan pecahan." },
  { no:5, kodeTP:"4.2.4", judul:"Pecahan Desimal Persepuluhan", alokasi:"3 JP × 35 menit (105 menit)",
    tujuan:"Murid mampu menyatakan pecahan persepuluhan ke dalam bentuk desimal melalui eksplorasi media konkret dan gambar dengan tepat.",
    materi:"Pecahan persepuluhan dalam bentuk desimal." },
  { no:6, kodeTP:"4.2.4", judul:"Pecahan Desimal Perseratusan", alokasi:"2 JP × 35 menit (70 menit)",
    tujuan:"Murid mampu menyatakan pecahan perseratusan ke dalam bentuk desimal melalui eksplorasi media grid perseratusan dengan tepat.",
    materi:"Pecahan perseratusan dalam bentuk desimal." },
  { no:7, kodeTP:"4.2.4", judul:"Menghubungkan Pecahan Desimal Persepuluhan dan Perseratusan", alokasi:"3 JP × 35 menit (105 menit)",
    tujuan:"Murid mampu menghubungkan, mengonversi, dan merefleksikan hubungan pecahan desimal persepuluhan dengan perseratusan melalui penyelesaian masalah kontekstual secara tepat.",
    materi:"Hubungan dan konversi pecahan desimal persepuluhan dengan perseratusan." },
  { no:8, kodeTP:"4.2.5", judul:"Mengenal Persen melalui Grid 100 Kotak", alokasi:"2 JP × 35 menit (70 menit)",
    tujuan:"Murid memahami konsep persen sebagai bentuk lain dari pecahan desimal perseratusan melalui pengamatan dan eksplorasi model konkret grid 100 kotak.",
    materi:"Konsep persen sebagai bentuk lain pecahan desimal perseratusan." },
  { no:9, kodeTP:"4.2.5", judul:"Persen dalam Kehidupan Sehari-hari", alokasi:"3 JP × 35 menit (105 menit)",
    tujuan:"Murid menerapkan dan menganalisis hubungan pecahan desimal perseratusan dengan persen untuk menyelesaikan masalah kontekstual sehari-hari (diskon, nilai, cuaca).",
    materi:"Penerapan hubungan pecahan desimal perseratusan dengan persen dalam masalah kontekstual." },
  { no:10, kodeTP:"4.2.5", judul:"Refleksi Penerapan Hubungan Pecahan Desimal Perseratusan dengan Persen", alokasi:"2 JP × 35 menit (70 menit)",
    tujuan:"Murid menganalisis dan merefleksikan penerapan hubungan pecahan desimal perseratusan dengan persen dalam menyelesaikan masalah kontekstual secara mandiri.",
    materi:"Refleksi dan analisis mandiri penerapan pecahan desimal perseratusan-persen." }
];

const MATEMATIKA_BAB3_INFO = {
  ...MATEMATIKA_INFO_BASE,
  kodeTP:"TP 4.3.1 s.d. TP 4.3.2",
  alokasiKeseluruhan:"10 JP × 35 menit (4 Pertemuan)",
  alokasiMinggu:"2-3 JP per minggu (1 Pertemuan)"
};
const MATEMATIKA_BAB3_PERTEMUAN = [
  { no:1, kodeTP:"4.3.1", judul:"Mengenali dan Melanjutkan Pola Gambar Sederhana", alokasi:"3 JP × 35 menit (105 menit)",
    tujuan:"Peserta didik mampu mengenali pola gambar sederhana berdasarkan pengamatan urutan objek, menjelaskan aturan yang membentuk pola, dan menerapkan pemahaman aturan pola untuk melanjutkan pola gambar sederhana.",
    materi:"Pola gambar sederhana; unit pengulangan (core pattern) dan aturan pola; melanjutkan pola gambar sesuai aturan yang ditemukan." },
  { no:2, kodeTP:"4.3.1", judul:"Menganalisis Pola Gambar Bervariasi & Membuat Pola Kreatif", alokasi:"2 JP × 35 menit (70 menit)",
    tujuan:"Peserta didik mampu menganalisis aturan pola gambar yang lebih bervariasi (pola warna, bentuk, dan ukuran), serta merefleksi strategi yang digunakan dalam mengenali dan melanjutkan pola gambar.",
    materi:"Analisis pola gambar bervariasi (bentuk, warna, ukuran); membuat pola gambar kreatif sendiri minimal 3 unit pengulangan." },
  { no:3, kodeTP:"4.3.2", judul:"Mengenali dan Melanjutkan Pola Bilangan", alokasi:"3 JP × 35 menit (105 menit)",
    tujuan:"Melalui eksplorasi barisan bilangan dan diskusi kelompok, peserta didik mampu mengenali pola bilangan membesar dan mengecil, menentukan aturan keteraturannya, serta melanjutkan pola bilangan berdasarkan aturan yang ditemukan.",
    materi:"Pola bilangan membesar dan mengecil; keteraturan pola (selisih tetap); melanjutkan pola bilangan sesuai aturan." },
  { no:4, kodeTP:"4.3.2", judul:"Membuat Pola Bilangan & Menjelaskan Keteraturannya", alokasi:"2 JP × 35 menit (70 menit)",
    tujuan:"Melalui kegiatan kreatif, presentasi, dan refleksi, peserta didik mampu membuat pola bilangan sendiri dengan aturan yang konsisten dan menjelaskan keteraturan pola bilangan yang dibuat dengan bahasa yang jelas dan logis.",
    materi:"Membuat pola bilangan sendiri dengan aturan konsisten; presentasi dan penjelasan keteraturan pola bilangan." }
];

/* Lengkapi Bab 1-3 Matematika dengan data dari berkas yang diunggah */
JURNAL_SUBJECTS.matematika.babList[0] = {
  no:1, judul:"Bilangan Cacah sampai 10.000", semester:1, status:"ready",
  info: MATEMATIKA_BAB1_INFO, pertemuan: MATEMATIKA_BAB1_PERTEMUAN
};
JURNAL_SUBJECTS.matematika.babList[1] = {
  no:2, judul:"Pecahan", semester:1, status:"ready",
  info: MATEMATIKA_BAB2_INFO, pertemuan: MATEMATIKA_BAB2_PERTEMUAN
};
JURNAL_SUBJECTS.matematika.babList[2] = {
  no:3, judul:"Pola Gambar dan Pola Bilangan", semester:1, status:"ready",
  info: MATEMATIKA_BAB3_INFO, pertemuan: MATEMATIKA_BAB3_PERTEMUAN
};

/* ============================================================================================
   [BARU] Jurnal Kokurikuler — memakai satuan "Bulan" (bukan "Bab"), sesuai Rancangan Detail
   Tahapan Kegiatan Kokurikuler per bulan (Juli–Desember, Tahun Pelajaran 2026/2027) yang
   diunggah. Rancangan Garis Besar Semester 1 (menu ringkasan lintas bulan + RAB) ditampilkan
   terpisah lewat KOKURIKULER_RINGKASAN & view "ringkasan", tidak dicampur dengan isian jurnal
   per bulan di bawah ini.
   ============================================================================================ */
const KOKURIKULER_GURU = "Agung Surya Permadi, S.Pd.I.";
const KOKURIKULER_KELASFASE = "IV (Sa'ad Bin Abi Waqash / Sa'ad Bin Ka'ab) / Fase B";
const KOKURIKULER_SEMTAHUN = "I (Satu) / Tahun Pelajaran 2026-2027";

function kokurikulerInfo(kodeTP, alokasiKeseluruhan, alokasiMinggu){
  return {
    namaSekolah:"SDIT Muhammadiyah Harjamukti - Kota Cirebon",
    kelasFase: KOKURIKULER_KELASFASE,
    semesterTahun: KOKURIKULER_SEMTAHUN,
    kodeTP, alokasiKeseluruhan, alokasiMinggu,
    guruMapel: KOKURIKULER_GURU
  };
}

/* ---- Juli — Proyek Lapbook Keragaman Budaya & Makanan Tradisional ---- */
const KOKURIKULER_JULI_INFO = kokurikulerInfo(
  "Pendidikan Pancasila (Bab 1) — terintegrasi",
  "5 JP (2 Pekan x 2 Jam 30 Menit)",
  "2 Jam 30 Menit (150 Menit) per pekan"
);
const KOKURIKULER_JULI_PERTEMUAN = [
  { no:1, kodeTP:"Pekan 1", judul:"Orientasi & Sosialisasi Proyek Budaya Nusantara", alokasi:"2 Jam 30 Menit (150 Menit)",
    tujuan:"Siswa memahami target proyek kokurikuler satu semester, mengenal konsep keberagaman suku di Indonesia, ragam adat, serta sejarah kuliner khas Cirebon (Empal Gentong, Tahu Gejrot, Nasi Lengko), dan terbentuk dalam kelompok kerja untuk memulai proyek Lapbook Budaya Nusantara.",
    materi:"Orientasi Awal (45'): sosialisasi target proyek kokurikuler & pengenalan keberagaman suku. Eksplorasi Lokal (60'): pembahasan ragam suku, tradisi adat, dan sejarah kuliner khas Cirebon. Pembentukan Kelompok (45'): pembagian kelompok 4-5 siswa & LKPD panduan awal." },
  { no:2, kodeTP:"Pekan 2", judul:"Perencanaan Struktur Lapbook & Brainstorming Kuliner", alokasi:"2 Jam 30 Menit (150 Menit)",
    tujuan:"Siswa mengaitkan keragaman budaya dengan materi Pendidikan Pancasila Bab 1 (Lingkungan Sekitar), setiap kelompok menentukan 1 jenis makanan khas Cirebon beserta suku asalnya, dan menyusun draf wireframe layout Lapbook di kertas plano/karton.",
    materi:"Refleksi & Kajian (45'): mengaitkan keragaman budaya dengan Pendidikan Pancasila Bab 1. Brainstorming Proyek (60'): menentukan makanan khas Cirebon & suku asal per kelompok. Penyusunan Draf (45'): merancang wireframe layout awal Lapbook." }
];
const KOKURIKULER_JULI_ASESMEN = [
  { aspek:"Ketertarikan Budaya (Civic Disposition)", indikator:"Siswa mampu mengenali dan menyebutkan minimal 3 makanan khas daerahnya beserta asal suku dengan tepat.", metode:"Tanya Jawab Lisan & Lembar Kerja (LKPD) Kelompok" },
  { aspek:"Kolaborasi & Gotong Royong", indikator:"Siswa berpartisipasi aktif dalam pembagian tugas kelompok tanpa membeda-bedakan teman.", metode:"Lembar Observasi Perilaku (Jurnal Guru)" },
  { aspek:"Perencanaan Kreatif", indikator:"Kelompok berhasil menelurkan lembar sketsa rancangan layout lapbook orisinal sebelum waktu habis.", metode:"Penilaian Portofolio Produk Draf Awal" }
];

/* ---- Agustus — Lembar Kerja Hasil Wawancara & Kamus Mini Kosakata Adat ---- */
const KOKURIKULER_AGUSTUS_INFO = kokurikulerInfo(
  "Bahasa Indonesia (Bab 1) & Pendidikan Pancasila (Bab 2) — terintegrasi",
  "10 JP (4 Pekan x 2 Jam 30 Menit)",
  "2 Jam 30 Menit (150 Menit) per pekan"
);
const KOKURIKULER_AGUSTUS_PERTEMUAN = [
  { no:1, kodeTP:"Pekan 1", judul:"Konseptualisasi & Pembekalan Metode Wawancara", alokasi:"2 Jam 30 Menit (150 Menit)",
    tujuan:"Siswa memahami esensi komunikasi & wawancara ramah anak (B. Indonesia Bab 1), menyusun daftar pertanyaan wawancara mengenai adat istiadat lokal, dan berlatih roleplay peran pewawancara-narasumber.",
    materi:"Penguatan Konsep (45'): review draf ide proyek Juli & pengenalan wawancara ramah anak. Penyusunan Instrumen (60'): menyusun daftar pertanyaan wawancara adat istiadat lokal. Simulasi/Roleplay (45'): praktik mandiri peran pewawancara & narasumber." },
  { no:2, kodeTP:"Pekan 2", judul:"Pelaksanaan Wawancara Terbimbing / Studi Tokoh", alokasi:"2 Jam 30 Menit (150 Menit)",
    tujuan:"Siswa melakukan wawancara langsung (atau rekaman terstruktur) kepada keluarga/tokoh sekitar sekolah guna mencari tahu asal-usul makanan dan adat Cirebon, lalu melaporkan kendala lapangan kepada guru pembimbing.",
    materi:"Pengondisian (30'): arahan teknis pengumpulan data orisinal. Ekspedisi Mandiri/Wawancara (90'): wawancara langsung/rekaman terstruktur. Debriefing (30'): re-grouping & laporan kendala lapangan." },
  { no:3, kodeTP:"Pekan 3", judul:"Pengolahan Data & Kamus Mini Kreasi Kosakata Baru", alokasi:"2 Jam 30 Menit (150 Menit)",
    tujuan:"Siswa mentranskrip & memilah jawaban penting hasil wawancara ke lembar kerja resmi, mengumpulkan kata-kata unik/daerah untuk dijadikan Kamus Mini Istilah Adat, dan menerima koreksi ejaan/struktur kalimat dari guru.",
    materi:"Redaksi Informasi (60'): transkrip & pemilahan jawaban wawancara. Inventarisasi Kata (60'): mengumpulkan kosakata unik daerah (mis. sega, amparan, lumping) untuk Kamus Mini. Review Guru (30'): koreksi ejaan & struktur kalimat deskripsi." },
  { no:4, kodeTP:"Pekan 4", judul:"Finalisasi Laporan Wawancara & Presentasi Kelompok", alokasi:"2 Jam 30 Menit (150 Menit)",
    tujuan:"Siswa menyelesaikan & menghias lembar hasil wawancara agar siap ditempel di portofolio/lapbook, mempresentasikan temuan menarik di depan kelas, dan mengisi jurnal refleksi profil pelajar Pancasila.",
    materi:"Finishing Karya (45'): menghias lembar hasil wawancara untuk portofolio. Sidang Mini Proyek (75'): presentasi temuan menarik tiap kelompok. Refleksi Bulanan (30'): penilaian antarteman & jurnal refleksi profil pelajar Pancasila." }
];
const KOKURIKULER_AGUSTUS_ASESMEN = [
  { aspek:"Kemampuan Komunikasi (B. Indonesia)", indikator:"Siswa mampu menyampaikan pertanyaan secara sopan, jelas, dan menggunakan intonasi yang tepat saat wawancara.", metode:"Lembar Observasi / Rubrik Wawancara" },
  { aspek:"Berpikir Kritis (Analisis Data)", indikator:"Siswa mampu menuangkan hasil wawancara ke dalam bentuk deskripsi tulisan yang logis dan runtut.", metode:"Penilaian Portofolio Tulisan" },
  { aspek:"Kebhinekaan Global", indikator:"Siswa menunjukkan sikap menghargai variasi adat istiadat yang mereka temukan dari narasumber yang berbeda.", metode:"Jurnal Refleksi Sikap Siswa" }
];

/* ---- September (Revisi) — Produk Kuliner Tradisional & Maket Denah Terpadu ---- */
const KOKURIKULER_SEPTEMBER_INFO = kokurikulerInfo(
  "Pendidikan Pancasila & Bahasa Indonesia (Bab 1) — terintegrasi (Revisi Asesmen)",
  "7,5 JP Kokurikuler (3 Pekan) + 1 Pekan Jeda UTS/ATS",
  "2 Jam 30 Menit (150 Menit) per pekan (Pekan 3 diliburkan untuk ATS)"
);
const KOKURIKULER_SEPTEMBER_PERTEMUAN = [
  { no:1, kodeTP:"Pekan 1", judul:"Tahap Aksi: Desain Produk & Pola Spasial Denah", alokasi:"2 Jam 30 Menit (150 Menit)",
    tujuan:"Siswa mengintegrasikan hasil wawancara Agustus ke dalam peta/maket denah sederhana lokasi peninggalan kuliner tradisional (B. Indonesia Bab 1), merancang sketsa kemasan ramah lingkungan, dan menyusun list belanja kelompok untuk Cooking Day.",
    materi:"Aplikasi Skala & Spasial (60'): integrasi hasil wawancara ke peta/maket denah sederhana. Desain Kemasan Proyek (60'): sketsa wadah/kemasan ramah lingkungan. Ploting Kebutuhan (30'): pembagian list belanja final kelompok untuk Cooking Day." },
  { no:2, kodeTP:"Pekan 2", judul:"Tahap Aksi Eksekusi: Cooking Day Kuliner Tradisional", alokasi:"2 Jam 30 Menit (150 Menit)",
    tujuan:"Siswa mempraktikkan memasak makanan tradisional khas Cirebon secara berkelompok bersama wali kelas & orang tua murid (mitra kelas), dengan memperhatikan sanitasi & keselamatan kerja, lalu mendokumentasikan hasil karya untuk portofolio.",
    materi:"Pengondisian Lab/Ruang Kelas (20'): briefing sanitasi, kebersihan, dan keselamatan kerja. Produksi Bersama (100'): praktik memasak berkelompok dipandu wali kelas & orang tua. Plating & Dokumentasi (30'): penyajian produk estetis & sesi foto portofolio." },
  { no:3, kodeTP:"Pekan 3", judul:"Jeda Asesmen Tengah Semester (ATS) I", alokasi:"0 JP Kokurikuler (Fokus Sekolah)",
    tujuan:"Kegiatan proyek kokurikuler ditiadakan sementara; seluruh siswa fokus mengikuti agenda rutin evaluasi tertulis/asesmen tengah semester dari kurikulum sekolah.",
    materi:"Tidak ada aktivitas kokurikuler pada pekan ini. Komponen bahan proyek disimpan rapi untuk dilanjutkan pekan berikutnya." },
  { no:4, kodeTP:"Pekan 4", judul:"Tahap Refleksi & Tindak Lanjut: Lapbook & Gelar Karya", alokasi:"2 Jam 30 Menit (150 Menit)",
    tujuan:"Siswa menyusun foto memasak, hasil wawancara, dan kamus mini ke dalam Lapbook, menggelar Mini Exhibition/Gallery Walk di selasar kelas untuk saling mengapresiasi karya antar kelompok, dan mengisi jurnal pencapaian Profil Pelajar Pancasila.",
    materi:"Assembling Portofolio & Lapbook (60'): menyusun foto memasak, hasil wawancara, kamus mini ke dalam Lapbook. Mini Exhibition/Gallery Walk (60'): pameran meja & apresiasi karya antar kelompok. Refleksi & Rubrik Akhir (30'): jurnal pencapaian Profil Pelajar Pancasila & penilaian sumatif guru." }
];
const KOKURIKULER_SEPTEMBER_CATATAN = "Penyesuaian strategi pembelajaran: sehubungan adanya jeda 1 pekan asesmen sekolah pada Pekan 3, materi penyusunan Lapbook dan Gelar Karya pada rencana awal dipadatkan dan diintegrasikan sepenuhnya pada Pekan 4 setelah pekan asesmen berakhir, agar target output proyek triwulan I tetap tercapai tanpa membebani waktu belajar mandiri siswa.";

/* ---- Oktober — Pohon Kedisiplinan Kelas & Pizza Pecahan Geometris ---- */
const KOKURIKULER_OKTOBER_INFO = kokurikulerInfo(
  "Pendidikan Pancasila & Matematika (Bab 2) — terintegrasi",
  "10 JP (4 Pekan x 2 Jam 30 Menit)",
  "2 Jam 30 Menit (150 Menit) per pekan"
);
const KOKURIKULER_OKTOBER_PERTEMUAN = [
  { no:1, kodeTP:"Pekan 1", judul:"Tahap Pengenalan: Konsep Kedisiplinan & Pola Bilangan", alokasi:"2 Jam 30 Menit (150 Menit)",
    tujuan:"Siswa memahami narasi kedisiplinan (Pancasila Bab 2) & contoh kepatuhan aturan sekolah, mengenal visualisasi pecahan sederhana (setengah, sepertiga, seperempat) melalui lipatan kertas berwarna, dan membentuk struktur tugas pembuatan Pohon Kedisiplinan.",
    materi:"Edukasi Karakter (60'): narasi kedisiplinan & identifikasi contoh kepatuhan aturan sekolah. Matematika Logika (60'): visualisasi pecahan sederhana dengan media lipatan kertas berwarna. Pembentukan Kelompok (30'): struktur tugas pembuatan Pohon Kedisiplinan per baris meja." },
  { no:2, kodeTP:"Pekan 2", judul:"Tahap Kontekstualisasi: Pembuatan Kartu Aturan & Pecahan", alokasi:"2 Jam 30 Menit (150 Menit)",
    tujuan:"Siswa menuliskan komitmen disiplin harian pada daun-daun origami, dan membuat tiruan Pizza Pecahan menggunakan jangka dengan membagi lingkaran karton tebal menjadi juring-juring geometri sesuai nilai pecahan.",
    materi:"Produksi Komponen Pancasila (75'): menuliskan komitmen disiplin harian pada daun origami. Produksi Komponen Matematika (75'): membuat Pizza Pecahan dari karton tebal dengan jangka, dibagi menjadi juring sesuai nilai pecahan." },
  { no:3, kodeTP:"Pekan 3", judul:"Tahap Aksi: Konstruksi Pohon Kedisiplinan Kelas", alokasi:"2 Jam 30 Menit (150 Menit)",
    tujuan:"Siswa merakit maket batang pohon dari styrofoam/kardus bekas ke dinding pajangan kelas, memasang daun komitmen & ornamen juring Pizza Pecahan sebagai buah di ranting pohon, serta mengevaluasi kerapian tata letak dan ketepatan pecahan.",
    materi:"Assembling Maket Utama (60'): menempelkan batang pohon styrofoam/kardus ke dinding pajangan. Instalasi Daun Komitmen (60'): memasang daun komitmen & ornamen juring Pizza Pecahan sebagai buah. Evaluasi Keselarasan (30'): pemeriksaan kerapian estetika & ketepatan matematika pecahan." },
  { no:4, kodeTP:"Pekan 4", judul:"Tahap Refleksi: Deklarasi Komitmen & Jurnal Penilaian", alokasi:"2 Jam 30 Menit (150 Menit)",
    tujuan:"Siswa mendeklarasikan komitmen disiplinnya di depan kelas sebagai janji bersama, bermain kuis kelompok mencocokkan pecahan pada Pizza Pecahan, dan dinilai melalui rubrik observasi sikap disiplin serta penghargaan bintang kelompok terdisiplin.",
    materi:"Simulasi Deklarasi (45'): membacakan komitmen di depan kelas sebagai janji bersama. Game Pecahan Interaktif (60'): kuis kelompok mencocokkan buah pizza pecahan dengan angka pecahan di papan tulis. Penilaian Otentik (45'): rubrik observasi sikap disiplin & penyerahan penghargaan kelompok terdisiplin." }
];

/* ---- November — Instalasi Apotek Hidup/Hidroponik & Diorama Rumah Impian ---- */
const KOKURIKULER_NOVEMBER_INFO = kokurikulerInfo(
  "IPAS (Bab 1) & Seni Rupa (Bab 1) — terintegrasi",
  "10 JP (4 Pekan x 2 Jam 30 Menit)",
  "2 Jam 30 Menit (150 Menit) per pekan"
);
const KOKURIKULER_NOVEMBER_PERTEMUAN = [
  { no:1, kodeTP:"Pekan 1", judul:"Tahap Pengenalan: Fotosintesis & Sketsa Konstruksi", alokasi:"2 Jam 30 Menit (150 Menit)",
    tujuan:"Siswa memahami materi kebutuhan tumbuhan & proses fotosintesis (IPAS Bab 1) lewat video demonstrasi, merancang draf sketsa arsitektur Diorama Rumah Impian yang memiliki area pekarangan hijau (Seni Rupa Bab 1), dan menginventarisasi botol plastik/kardus bekas.",
    materi:"Sains Dasar (60'): kebutuhan tumbuhan & proses fotosintesis lewat video demonstrasi interaktif. Sketsa Seni (60'): draf arsitektur/sketsa 2 dimensi Diorama Rumah Impian berpekarangan hijau. Alokasi Tugas (30'): inventarisasi botol plastik bekas 1,5L & kardus tebal dari rumah." },
  { no:2, kodeTP:"Pekan 2", judul:"Tahap Kontekstualisasi: Konstruksi Rumah & Wadah Hidroponik", alokasi:"2 Jam 30 Menit (150 Menit)",
    tujuan:"Siswa memotong botol plastik, memasang kain flanel sebagai sumbu resapan, dan melarutkan nutrisi hidroponik AB Mix bersama kelompok, sekaligus memotong kardus bekas & merakit dinding serta bangunan inti diorama sesuai sketsa pekan pertama.",
    materi:"Upcycling IPAS (75'): memotong botol plastik, memasang sumbu flanel, melarutkan nutrisi AB Mix. Konstruksi Seni Rupa (75'): memotong kardus bekas & merakit bangunan inti diorama dengan lem tembak sesuai sketsa." },
  { no:3, kodeTP:"Pekan 3", judul:"Tahap Aksi: Penanaman Benih & Dekorasi Estetika", alokasi:"2 Jam 30 Menit (150 Menit)",
    tujuan:"Siswa memindahkan bibit tanaman (sawi/selada atau TOGA) ke media rockwool/tanah dalam wadah botol, menyelesaikan finishing diorama dengan cat akrilik & miniatur pagar/pohon plastisin, dan mengintegrasikan instalasi hidroponik ke dalam pekarangan diorama sebagai satu kesatuan maket.",
    materi:"Aksi Tanam (60'): pemindahan bibit tanaman ke media rockwool/tanah dalam wadah botol. Finishing Diorama (60'): mewarnai dinding kardus & memasang miniatur pagar/pohon dari plastisin. Integrasi Maket (30'): meletakkan instalasi hidroponik mini ke pekarangan diorama sebagai satu kesatuan." },
  { no:4, kodeTP:"Pekan 4", judul:"Tahap Refleksi: Presentasi Maket & Rubrik Sumatif", alokasi:"2 Jam 30 Menit (150 Menit)",
    tujuan:"Setiap kelompok mempresentasikan maket & cara merawat tanaman serta keterkaitannya dengan proses fotosintesis, saling memberi peer review antar kelompok, dan dinilai guru melalui rubrik keterampilan Seni Rupa & pemahaman fungsi ekologis IPAS.",
    materi:"Presentasi Kelompok (65'): presentasi draf maket, cara merawat tanaman & keterkaitan fotosintesis. Observasi Silang/Peer Review (40'): penilaian bintang antar kelompok berdasarkan kerapian konstruksi & kesehatan tanaman. Asesmen Guru (45'): rubrik keterampilan Seni Rupa (teknik gunting/rekat) & pemahaman fungsi ekologis IPAS." }
];
const KOKURIKULER_NOVEMBER_ASESMEN = [
  { aspek:"Maket Rumah Hijau Hidroponik (Diorama Terpadu)", indikator:"Konstruksi bangunan maket berdiri kokoh & seimbang, kombinasi warna estetis, dan sistem sumbu hidroponik berfungsi menyerap air nutrisi dengan baik." }
];

/* ---- Desember — Evaluasi Semester I (SAS) & Pelaporan Rapor ---- */
const KOKURIKULER_DESEMBER_INFO = kokurikulerInfo(
  "Evaluasi Akhir Semester I (SAS) & Pelaporan Rapor — Akademik & Kokurikuler",
  "1 Pekan Pembelajaran KBM Efektif (selebihnya evaluasi mandiri)",
  "Menyesuaikan agenda SAS & pelaporan rapor sekolah"
);
const KOKURIKULER_DESEMBER_PERTEMUAN = [
  { no:1, kodeTP:"Pekan 1", judul:"Review Materi & Tuntas Portofolio Proyek (KBM Efektif Terakhir)", alokasi:"KBM Efektif Terakhir",
    tujuan:"Siswa mereview kisi-kisi asesmen Sumatif Akhir Semester (SAS) I untuk mapel Matematika (Bilangan & Pecahan) serta IPAS, menuntaskan assembly akhir dokumen proyek bulanan (Lapbook, Pohon Disiplin, & Maket Hidroponik) ke lemari pajangan portofolio kelas, dan melakukan refleksi capaian belajar mandiri.",
    materi:"Penguatan Konsep (60'): review kisi-kisi SAS I mapel Matematika & IPAS. Koleksi Portofolio (60'): penyelesaian & assembly akhir dokumen proyek bulanan ke lemari pajangan portofolio kelas. Penilaian Diri (30'): refleksi akhir semester mengenai capaian target belajar siswa." },
  { no:2, kodeTP:"Pekan 2", judul:"Pelaksanaan Sumatif Akhir Semester (SAS) Ganjil", alokasi:"Asesmen SAS I",
    tujuan:"Siswa menempuh ujian tertulis berkala tingkat sekolah untuk seluruh mata pelajaran intrakurikuler wajib Kurikulum Merdeka, dengan pengawasan guru yang objektif dan tertib.",
    materi:"Siswa menempuh ujian tertulis berkala tingkat pangkalan sekolah untuk seluruh mata pelajaran intrakurikuler wajib. Guru melaksanakan pengawasan ujian secara objektif dan tertib." },
  { no:3, kodeTP:"Pekan 3", judul:"Sidang Pleno & Input Elektronik Rapor (e-Rapor)", alokasi:"Pengolahan Nilai",
    tujuan:"Dewan guru kelas 4 mengoreksi massal lembar jawaban SAS I dan menggabungkan bobot nilai harian, nilai tugas portofolio kokurikuler, dan nilai SAS menjadi Nilai Akhir Raport Semester Ganjil.",
    materi:"Koreksi massal lembar jawaban SAS I oleh dewan guru kelas 4. Penggabungan bobot nilai harian, nilai tugas portofolio kokurikuler, dan nilai SAS menjadi Nilai Akhir Raport Semester Ganjil." },
  { no:4, kodeTP:"Pekan 4", judul:"Penyerahan Buku Laporan Hasil Belajar & Libur Semester", alokasi:"Pembagian Rapor",
    tujuan:"Wali kelas mengundang pertemuan wali murid, menyerahkan buku rapor hasil belajar (akademik & deskripsi portofolio perkembangan karakter proyek) kepada orang tua, dan melepas siswa memasuki masa libur akhir semester I.",
    materi:"Undangan pertemuan wali murid kelas 4. Penyerahan buku rapor hasil belajar (Akademik & Deskripsi Portofolio Perkembangan Karakter Proyek) oleh wali kelas kepada orang tua. Pelepasan siswa memasuki masa Libur Akhir Semester I." }
];
const KOKURIKULER_DESEMBER_ASESMEN = [
  { aspek:"Nilai Capaian Proyek", indikator:"Nilai proses pembentukan karakter & kreativitas dari pengerjaan proyek bulanan: Lapbook Nusantara (Agustus), Pohon Kedisiplinan (Oktober), dan Maket Hidroponik (November)." },
  { aspek:"Nilai Kognitif Intrakurikuler", indikator:"Akumulasi nilai sumatif harian bab ditambah bobot murni hasil tes Sumatif Akhir Semester (SAS) I bulan Desember." }
];

/* Susunan 6 Bulan Kokurikuler Semester 1 — menggantikan struktur 8 "Bab" bawaan */
JURNAL_SUBJECTS.kokurikuler.babList = [
  { no:1, judul:"Juli", sub:"Proyek Lapbook Keragaman Budaya & Makanan Tradisional", semester:1, status:"ready",
    info: KOKURIKULER_JULI_INFO, pertemuan: KOKURIKULER_JULI_PERTEMUAN, asesmen: KOKURIKULER_JULI_ASESMEN },
  { no:2, judul:"Agustus", sub:"Lembar Kerja Hasil Wawancara & Kamus Mini Kosakata Adat", semester:1, status:"ready",
    info: KOKURIKULER_AGUSTUS_INFO, pertemuan: KOKURIKULER_AGUSTUS_PERTEMUAN, asesmen: KOKURIKULER_AGUSTUS_ASESMEN },
  { no:3, judul:"September", sub:"Produk Kuliner Tradisional & Maket Denah Terpadu (Revisi)", semester:1, status:"ready",
    info: KOKURIKULER_SEPTEMBER_INFO, pertemuan: KOKURIKULER_SEPTEMBER_PERTEMUAN, catatan: KOKURIKULER_SEPTEMBER_CATATAN },
  { no:4, judul:"Oktober", sub:"Pohon Kedisiplinan Kelas & Pizza Pecahan Geometris", semester:1, status:"ready",
    info: KOKURIKULER_OKTOBER_INFO, pertemuan: KOKURIKULER_OKTOBER_PERTEMUAN },
  { no:5, judul:"November", sub:"Instalasi Apotek Hidup/Hidroponik & Diorama Rumah Impian", semester:1, status:"ready",
    info: KOKURIKULER_NOVEMBER_INFO, pertemuan: KOKURIKULER_NOVEMBER_PERTEMUAN, asesmen: KOKURIKULER_NOVEMBER_ASESMEN },
  { no:6, judul:"Desember", sub:"Evaluasi Semester I (SAS) & Pelaporan Rapor", semester:1, status:"ready",
    info: KOKURIKULER_DESEMBER_INFO, pertemuan: KOKURIKULER_DESEMBER_PERTEMUAN, asesmen: KOKURIKULER_DESEMBER_ASESMEN }
];

/* ---- [BARU] Rancangan Garis Besar Semester 1 — menu ringkasan terpisah dari jurnal per bulan.
   Diambil dari berkas "Rancangan Garis Besar Semester1 Kelas4.pdf": matriks distribusi bulanan
   proyek & agenda akademik, serta Rencana Anggaran Biaya (RAB) estimasi proyek Semester I. ---- */
const KOKURIKULER_RINGKASAN = {
  periode:"Juli – Desember 2026 · Tahun Pelajaran 2026/2027",
  bulanan: [
    { bulan:"Juli", integrasi:"Pendidikan Pancasila (Bab 1) & Bahasa Indonesia (Bab 1)",
      proyek:"Proyek Lapbook Keragaman Budaya & Makanan Tradisional.",
      alat:"Kertas karton manila tebal, gunting, lem kertas, gambar/print pakaian adat, bahan dasar masakan lokal." },
    { bulan:"Agustus", integrasi:"Bahasa Indonesia (Bab 2) & Pendidikan Pancasila (Bab 2)",
      proyek:"Proyek Wawancara Tokoh & Pohon Kedisiplinan: (1) merancang instrumen & riset wawancara kepada narasumber budaya; (2) membuat instalasi Pohon Komitmen Disiplin kelas.",
      alat:"Kertas origami berwarna, styrofoam besar, pin kertas mading, spidol warna, lembar panduan wawancara." },
    { bulan:"September", integrasi:"Seni Rupa (Bab 1) & Bahasa Indonesia (Bab 3)",
      proyek:"Proyek Denah Kreatif & Sketsa Diorama: menuangkan hasil riset ke peta denah lokasi kuliner tradisional & sketsa detail pakaian adat/modern.",
      alat:"Kertas HVS warna, kardus bekas box sepatu, kertas koran/majalah lama, pensil gambar, krayon." },
    { bulan:"Oktober", integrasi:"Matematika (Bab 2) & Bahasa Indonesia (Bab 4)",
      proyek:"Proyek Pizza Pecahan & Teater Fabel: (1) membuat model Pizza Pecahan konkret untuk matematika visual; (2) latihan pementasan cerita pendek berdasarkan legenda nusantara.",
      alat:"Kertas origami lingkaran besar, jangka matematika, naskah cerita fabel ringkas, properti kertas buatan sendiri." },
    { bulan:"November", integrasi:"IPAS (Bab 1 & Bab 2) & Matematika (Bab 3)",
      proyek:"Proyek Hidroponik Sumbu & Mainan Magnetik: (1) instalasi botol hidroponik/apotek hidup mini kelas; (2) eksperimen fisika dasar mainan bertenaga magnet/baterai.",
      alat:"Botol plastik bekas 1,5L, sumbu kain flanel, nutrisi AB Mix, magnet batang, baterai AA, dinamo mini, kabel." },
    { bulan:"Desember", integrasi:"Evaluasi Semester I & IPAS (Bab 3)",
      proyek:"Pameran Portofolio & Refleksi: (1) pembuatan proyek maket rangkaian listrik seri dekoratif; (2) Penilaian Akhir Semester (PAS) & display portofolio proyek di hadapan orang tua.",
      alat:"Lampu bohlam mini, saklar kecil, dudukan baterai, papan triplek mini, lem tembak." }
  ],
  rab: [
    { mapel:"Pendidikan Pancasila & Seni (Lapbook)", komponen:"Kertas Karton Manila Tebal", vol:"10 Lembar", harga:"Rp 3.000", total:"Rp 30.000" },
    { mapel:"", komponen:"Bahan Kuliner Tradisional Lokal", vol:"1 Paket", harga:"Rp 150.000", total:"Rp 150.000" },
    { mapel:"Bahasa Indonesia & Disiplin (Wawancara)", komponen:"Kertas Origami Berwarna", vol:"4 Pack", harga:"Rp 12.000", total:"Rp 48.000" },
    { mapel:"", komponen:"Styrofoam Mading Besar", vol:"2 Lembar", harga:"Rp 20.000", total:"Rp 40.000" },
    { mapel:"Seni Rupa & Bahasa (Diorama Maket)", komponen:"Lem Rajawali / Glukol", vol:"5 Pcs", harga:"Rp 8.000", total:"Rp 40.000" },
    { mapel:"", komponen:"Kertas Buffalo Warna-Warni", vol:"2 Pak", harga:"Rp 45.000", total:"Rp 90.000" },
    { mapel:"Matematika & Teater (Pizza Pecahan)", komponen:"Kertas Brief Card Tebal", vol:"1 Pack", harga:"Rp 35.000", total:"Rp 35.000" },
    { mapel:"IPAS Proyek Hidroponik & Listrik", komponen:"Nutrisi Hidroponik AB Mix", vol:"2 Set", harga:"Rp 25.000", total:"Rp 50.000" },
    { mapel:"", komponen:"Paket Kabel & Bohlam Mini", vol:"15 Set", harga:"Rp 10.000", total:"Rp 150.000" },
    { mapel:"", komponen:"Baterai AA", vol:"20 Pcs", harga:"Rp 4.000", total:"Rp 80.000" },
    { mapel:"Perlengkapan Umum Kelas", komponen:"Lem Tembak / Isian Glue Gun", vol:"2 Pack", harga:"Rp 20.000", total:"Rp 40.000" }
  ],
  totalAnggaran:"Rp 753.000"
};

/* ================= [BARU] Sinkronisasi Online — Google Sheet via Apps Script ================= */
/* Cara kerja singkat:
   1) SEMUA data aplikasi (Tugas, Siswa, Guru, Jadwal Pelajaran, Jurnal Mengajar) disinkronkan.
   2) Setiap ada perubahan (simpan/hapus) lewat idbPut/idbDelete, perubahan diantrekan di store
      "syncQueue" lalu langsung dicoba dikirim (push) ke Web App Google Apps Script.
   3) Setiap ~20 detik (dan setiap kali aplikasi kembali aktif/online), aplikasi menarik (pull)
      data terbaru dari Sheet dan menggabungkannya secara "last write wins" berdasarkan updatedAt.
   4) Saat URL Sheet pertama kali diatur (atau ditekan "Sinkron Sekarang" pertama kali), aplikasi
      melakukan FULL SYNC: seluruh data yang SUDAH ADA di perangkat ini digabung (upsert berdasarkan
      kunci unik) ke Sheet dalam SATU kali kirim per tabel — bukan menambah baris baru berulang —
      sehingga data yang sudah ada di Sheet tidak pernah terduplikasi; begitu juga sebaliknya, data
      yang sudah ada di Sheet ditarik masuk tanpa menduplikasi data lokal (dicocokkan lewat id/NIS).
   Ini BUKAN realtime instan (push notification) — melainkan sinkron berkala (polling) yang ringan,
   cukup untuk kebutuhan catatan tugas/jurnal harian & tetap berfungsi offline (antre lalu terkirim
   otomatis saat online kembali). URL Web App diatur pengguna sendiri di menu Pengaturan. */
function uuid(){
  return (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : ('id_'+Date.now()+'_'+Math.random().toString(36).slice(2));
}

/* Konfigurasi per-tabel: nama store lokal -> nama koleksi di payload & kolom kunci uniknya */
const SYNC_TABLES = {
  siswa:   { key:"nis" },
  tugas:   { key:"id" },
  guru:    { key:"id" },
  jadwal:  { key:"id" },
  jurnal:  { key:"id" },
  /* [BARU] Jurnal Literasi Siswa & Numerasi — kini punya tab tersendiri di Google Sheet dan
     ikut disinkron dua arah lewat "Segarkan Data" seperti tabel lain, tanpa tombol terpisah. */
  literasi:          { key:"id" },
  numerasiLog:       { key:"id" },
  numerasiKaliBagi:  { key:"nis" },
  ujian:             { key:"id" },
  kokurikulerNilai:  { key:"id" }
};

let SYNC_URL_CACHE = null;
/* [BARU] URL Web App Google Apps Script & token keamanan sudah ditanam langsung di kode ini
   (diminta supaya guru tidak perlu mengisi manual lewat menu Pengaturan). URL ini dipakai
   sebagai NILAI BAWAAN kalau menu Pengaturan belum/kosong diisi — kalau suatu saat URL Web
   App-nya berganti (mis. Apps Script di-deploy ulang sebagai "New deployment", bukan "Manage
   deployments", sehingga URL berubah), operator masih bisa menimpanya lewat menu Pengaturan
   seperti biasa tanpa perlu mengubah kode ini.
   TOKEN dikirim di SETIAP permintaan (baik menarik/pull maupun mengirim/push data, dan saat
   unggah dokumen) sebagai lapis keamanan tambahan — supaya Web App yang aksesnya "Anyone" ini
   tidak bisa dipakai baca/tulis data oleh sembarang orang yang kebetulan tahu URL-nya, HANYA
   permintaan yang menyertakan token yang cocok yang akan dilayani (lihat pengecekan token di
   Code.gs bagian cekToken_()). */
const DEFAULT_SYNC_URL = "https://script.google.com/macros/s/AKfycbywG45f4-v3KSNE5j5CePcbbKdN_f6fmTgPlw0vRX4J-nAs4LOahUt_GxShnQVECqmFew/exec";
const SYNC_TOKEN = "07346906d44542abb737b1acf2b6e83a";
async function getSyncUrl(){
  if(SYNC_URL_CACHE !== null) return SYNC_URL_CACHE;
  try{
    const db = await openDB();
    const val = await new Promise((resolve)=>{
      const tx = db.transaction("meta","readonly");
      const req = tx.objectStore("meta").get("syncUrl");
      req.onsuccess = ()=>resolve(req.result ? req.result.value : "");
      req.onerror = ()=>resolve("");
    });
    SYNC_URL_CACHE = val || "";
  }catch(e){ SYNC_URL_CACHE = ""; }
  // [BARU] Kalau belum pernah diatur sama sekali di Pengaturan, pakai URL bawaan di atas
  // supaya aplikasi langsung siap sinkron tanpa perlu diisi manual dulu.
  if(!SYNC_URL_CACHE) SYNC_URL_CACHE = DEFAULT_SYNC_URL;
  return SYNC_URL_CACHE;
}
async function setSyncUrl(url){
  SYNC_URL_CACHE = (url||"").trim();
  await idbPutRaw("meta", { key:"syncUrl", value: SYNC_URL_CACHE });
}
/* [BARU] Tambahkan URL Web App ke query string ?token=... — dipakai khusus untuk
   permintaan GET (pullFromSheet), karena permintaan GET tidak punya body JSON. */
function urlDenganToken(url){
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}token=${encodeURIComponent(SYNC_TOKEN)}`;
}

/* [BARU] Link Google Spreadsheet — berbeda dari URL Web App sinkron di atas.
   Ini hanya tautan pintas untuk membuka berkas spreadsheet-nya langsung di Google Sheets. */
const SPREADSHEET_URL_KEY = "sditmuha_spreadsheet_url";
const DEFAULT_SPREADSHEET_URL = "https://docs.google.com/spreadsheets/d/1kiBe13IFbWyM8iz5Rk9du0y9CLJzsWj3uNCbU6A6uks/edit?usp=drivesdk";
function getSpreadsheetUrl(){
  return localStorage.getItem(SPREADSHEET_URL_KEY) || DEFAULT_SPREADSHEET_URL;
}
function setSpreadsheetUrl(url){
  localStorage.setItem(SPREADSHEET_URL_KEY, (url||"").trim());
}

/* [DIPERBAIKI] ---------- Upload Dokumen ke Google Drive (Input Dokumen) ----------
   Sebelumnya memakai URL Web App TERPISAH dari URL sinkron Google Sheet — ini penyebab
   utama sinkron/unggah gagal: guru hanya sempat mengisi salah satu dari dua kolom URL,
   padahal keduanya memang dilayani oleh 1 Apps Script Web App yang sama. Sekarang HANYA
   ADA SATU URL (lihat getSyncUrl()/setSyncUrl() di atas) yang dipakai bersama untuk
   sinkron Google Sheet maupun unggah berkas ke Drive, supaya tidak lagi tertukar/kosong
   sebelah. Kalau URL ini belum diatur, tombol "Kirim ke Google Drive" akan meminta guru
   mengaturnya dulu di menu Pengaturan — sebagai jalan pintas, folder Drive tetap bisa
   dibuka/disalin manual dari bagian "alternatif manual" pada menu Input Dokumen. */
const DOKUMEN_WEBAPP_URL_KEY_LEGACY = "sditmuha_dokumen_webapp_url"; // [LAMA] hanya dipakai utk migrasi 1x
const DOKUMEN_HISTORY_KEY = "sditmuha_dokumen_upload_history";
const DOKUMEN_MAX_MB = 15; // batas ukuran berkas supaya aman dikirim sebagai base64
/* [BARU] Berkas yang baru dipilih tapi BELUM dikirim — menunggu guru menekan tombol
   "Kirim ke Google Drive" (lihat handleDokumenFileSelected() & sendDokumenToServer()). */
let selectedDokumenFile = null;
/* [BARU] Migrasi 1x: kalau dulu pernah mengisi URL Upload Dokumen terpisah (localStorage lama)
   sementara URL sinkron utama masih kosong, pindahkan nilainya jadi satu-satunya URL supaya
   guru tidak perlu mengisi ulang. Dijalankan sekali saat aplikasi dibuka (lihat boot()). */
async function migrateDokumenWebappUrl(){
  try{
    const old = (localStorage.getItem(DOKUMEN_WEBAPP_URL_KEY_LEGACY) || "").trim();
    if(!old) return;
    const current = await getSyncUrl();
    if(!current) await setSyncUrl(old);
    localStorage.removeItem(DOKUMEN_WEBAPP_URL_KEY_LEGACY);
  }catch(e){ /* abaikan, tidak fatal */ }
}
function getDokumenUploadHistory(){
  try{
    const raw = localStorage.getItem(DOKUMEN_HISTORY_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  }catch(e){ return []; }
}
function addDokumenUploadHistory(entry){
  let list = getDokumenUploadHistory();
  list.unshift(entry);
  if(list.length > 10) list = list.slice(0,10);
  try{ localStorage.setItem(DOKUMEN_HISTORY_KEY, JSON.stringify(list)); }catch(e){}
}
function renderDokumenUploadHistory(){
  const wrap = document.getElementById("dokumenUploadHistory");
  if(!wrap) return;
  const list = getDokumenUploadHistory();
  if(list.length===0){ wrap.innerHTML = ""; return; }
  wrap.innerHTML = list.map(it=>{
    const waktu = it.ts ? new Date(it.ts).toLocaleString("id-ID",{dateStyle:"medium",timeStyle:"short"}) : "";
    if(it.ok){
      return `<div class="dokumen-upload-item">✅ <a href="${it.url}" target="_blank" rel="noopener">${escapeHtml(it.filename)}</a><span class="muted" style="margin-left:auto;">${waktu}</span></div>`;
    }
    return `<div class="dokumen-upload-item status-error">⚠️ ${escapeHtml(it.filename)} — gagal diunggah<span class="muted" style="margin-left:auto;">${waktu}</span></div>`;
  }).join("");
}
function readFileAsBase64(file){
  return new Promise((resolve, reject)=>{
    const reader = new FileReader();
    reader.onload = ()=>{
      const result = String(reader.result || "");
      const idx = result.indexOf(",");
      resolve(idx>=0 ? result.slice(idx+1) : result);
    };
    reader.onerror = ()=> reject(reader.error || new Error("Gagal membaca berkas"));
    reader.readAsDataURL(file);
  });
}
/* [BARU] Langkah 1 — memilih berkas TIDAK langsung mengunggah lagi. Berkas hanya disimpan
   di memori (selectedDokumenFile) dan tombol "Kirim ke Google Drive" ditampilkan, supaya
   guru bisa memastikan dulu berkas yang dipilih sudah benar sebelum benar-benar dikirim. */
function handleDokumenFileSelected(e){
  const file = e.target.files && e.target.files[0];
  const nameEl = document.getElementById("dokumenUploadFileName");
  const statusEl = document.getElementById("dokumenUploadStatus");
  const kirimBtn = document.getElementById("dokumenKirimBtn");
  if(!file){
    selectedDokumenFile = null;
    if(kirimBtn) kirimBtn.hidden = true;
    return;
  }
  if(file.size > DOKUMEN_MAX_MB*1024*1024){
    if(statusEl) statusEl.textContent = `Berkas terlalu besar (maks ${DOKUMEN_MAX_MB}MB untuk unggah otomatis). Gunakan unggah manual lewat folder Drive.`;
    toast(`Berkas melebihi ${DOKUMEN_MAX_MB}MB, gunakan unggah manual.`, "warn");
    selectedDokumenFile = null;
    if(kirimBtn) kirimBtn.hidden = true;
    e.target.value = "";
    return;
  }
  selectedDokumenFile = file;
  if(nameEl) nameEl.textContent = file.name;
  if(statusEl) statusEl.textContent = `Berkas "${file.name}" siap dikirim — tekan tombol "Kirim ke Google Drive" di sebelahnya.`;
  if(kirimBtn) kirimBtn.hidden = false;
}

/* [BARU] Langkah 2 — dipanggil saat tombol "Kirim ke Google Drive" ditekan. Memakai URL
   Web App yang SAMA dengan Sinkronisasi Google Sheet (getSyncUrl()), jadi guru cukup
   mengatur 1 URL saja di menu Pengaturan & Guru. */
async function sendDokumenToServer(){
  const file = selectedDokumenFile;
  const statusEl = document.getElementById("dokumenUploadStatus");
  const kirimBtn = document.getElementById("dokumenKirimBtn");
  if(!file){ toast("Pilih berkas terlebih dahulu.", "warn"); return; }

  const webappUrl = await getSyncUrl();
  if(!webappUrl){
    if(statusEl) statusEl.textContent = "URL Web App belum diatur. Buka menu Pengaturan & Guru → \"Sinkronisasi & Upload Dokumen\" untuk mengaturnya, atau unggah manual lewat tombol \"Buka Folder Google Drive\" di bawah.";
    toast("URL Web App belum diatur di menu Pengaturan.", "warn");
    return;
  }

  if(kirimBtn){ kirimBtn.disabled = true; kirimBtn.textContent = "Mengirim…"; }
  if(statusEl) statusEl.textContent = `Mengunggah "${file.name}" ke Google Drive…`;
  try{
    const dataBase64 = await readFileAsBase64(file);
    const res = await fetch(webappUrl, {
      method:"POST",
      headers:{ "Content-Type":"text/plain;charset=utf-8" }, // hindari CORS preflight ke Apps Script
      body: JSON.stringify({ mode:"upload", filename:file.name, mimeType:file.type || "application/octet-stream", dataBase64, token: SYNC_TOKEN })
    });
    let json = null;
    try{ json = await res.json(); }catch(err){ json = null; }
    if(!json || json.ok !== true) throw new Error((json && json.error) || "Server tidak mengonfirmasi keberhasilan.");
    addDokumenUploadHistory({ ok:true, filename:file.name, url:json.fileUrl, ts:Date.now() });
    if(statusEl) statusEl.textContent = `Berhasil! "${file.name}" tersimpan di Google Drive.`;
    toast(`Berkas "${file.name}" berhasil diunggah ke Google Drive.`, "add");
    selectedDokumenFile = null;
    const nameEl = document.getElementById("dokumenUploadFileName");
    if(nameEl) nameEl.textContent = "Belum ada berkas dipilih.";
    const inputEl = document.getElementById("dokumenUploadInput");
    if(inputEl) inputEl.value = "";
    if(kirimBtn) kirimBtn.hidden = true;
  }catch(err){
    addDokumenUploadHistory({ ok:false, filename:file.name, ts:Date.now() });
    /* [PERBAIKAN] SEBELUMNYA pesan error asli dari server (err.message) tidak pernah
       ditampilkan ke guru — selalu diganti teks generik "Periksa koneksi/URL Web App...",
       walau server sebenarnya sudah mengirim alasan yang jelas (mis. folder Drive tidak
       ditemukan/tidak bisa diakses). Sekarang alasan aslinya ikut ditampilkan supaya kalau
       gagal lagi, penyebabnya langsung kelihatan tanpa perlu menebak. */
    const alasan = err && err.message ? err.message : "";
    if(statusEl) statusEl.textContent = `Gagal mengunggah "${file.name}". ${alasan || "Periksa koneksi/URL Web App, atau unggah manual lewat folder Drive."}`;
    toast(alasan ? `Gagal mengunggah: ${alasan}` : "Gagal mengunggah berkas ke Google Drive.", "warn");
  } finally {
    if(kirimBtn){ kirimBtn.disabled = false; kirimBtn.textContent = "📤 Kirim ke Google Drive"; }
  }
  renderDokumenUploadHistory();
}
async function getSyncFlag(key){
  try{
    const db = await openDB();
    return await new Promise((resolve)=>{
      const tx = db.transaction("meta","readonly");
      const req = tx.objectStore("meta").get(key);
      req.onsuccess = ()=>resolve(!!(req.result && req.result.value));
      req.onerror = ()=>resolve(false);
    });
  }catch(e){ return false; }
}
async function setSyncFlag(key, val){ await idbPutRaw("meta", { key, value: !!val }); }

function setSyncStatusText(text){
  const el = document.getElementById("syncStatusText");
  if(el) el.textContent = text;
  const dashEl = document.getElementById("dashSyncStatus"); // [BARU] cerminkan status sinkron di Dasbor
  if(dashEl) dashEl.textContent = text;
}

let syncPushInFlight = false;
async function queueSync(store, action, record){
  if(!SYNC_TABLES[store]) return;
  const rec = { ...record };
  if(store==="tugas" && action!=="delete"){
    const s = (STATE.siswa||[]).find(x=>String(x.nis)===String(rec.nis));
    if(s) rec.nama = s.nama; // biar kolom di Sheet mudah dibaca manusia
  }
  /* [BARU] Sama seperti "tugas" di atas — kirim nama yang SUDAH DIPASTIKAN (bukan kolom
     terpisah nis/namaManual) supaya kolom "nama" di Google Sheet langsung menampilkan nama
     asli peserta didik, baik yang dipilih dari Data Siswa maupun yang diisi manual. Ini
     menggantikan pendekatan lama yang mengirim kolom "namaManual" terpisah (sering kosong
     untuk siswa terdaftar, sehingga membingungkan kalau Sheet dibuka langsung). */
  if(store==="literasi" && action!=="delete"){
    const s = rec.nis ? (STATE.siswa||[]).find(x=>String(x.nis)===String(rec.nis)) : null;
    rec.nama = s ? s.nama : (rec.namaManual || "");
  }
  try{ await idbPutRaw("syncQueue", { store, action, record: rec, ts: Date.now() }); }catch(e){}
  /* Tidak lagi otomatis mengirim ke Google Sheet setiap ada perubahan.
     Perubahan hanya disimpan ke antrean lokal dan baru dikirim saat tombol
     "Segarkan Data" di Dasbor diklik (sinkron manual saja, tidak otomatis). */
  await refreshSyncStatusDisplay();
}

async function processSyncQueue(){
  if(syncPushInFlight) return;
  const url = await getSyncUrl();
  if(!url) return;
  syncPushInFlight = true;
  try{
    let items = await idbAll("syncQueue");
    items = items.sort((a,b)=>a.ts-b.ts);
    if(items.length) setSyncStatusText(`Mengirim & menarik data dari Google Sheet…`);
    /* [PERBAIKAN] Sebelumnya: kalau SATU item gagal (mis. server merespons ok:false karena
       tabel "literasi"/"numerasiLog"/"numerasiKaliBagi" belum dikenali oleh Apps Script yang
       BELUM di-deploy ulang ke versi terbaru), seluruh antrean langsung dihentikan lewat
       "break" — akibatnya SEMUA perubahan lain yang antre SETELAH item itu (termasuk tabel
       lain seperti Tugas/Jurnal yang sebenarnya baik-baik saja) ikut tidak pernah terkirim,
       walau ditekan "Segarkan Data" berkali-kali. Ini penyebab utama laporan "data Literasi/
       Numerasi tidak masuk ke Sheet". Sekarang dibedakan:
       - Server BISA dihubungi tapi menolak (ok:false) -> item ini SAJA dilewati (skip, tetap
         menunggu di antrean untuk dicoba lagi), tabel/perubahan lain tetap lanjut dikirim.
       - Server SAMA SEKALI tidak bisa dihubungi (offline/timeout, fetch melempar error) ->
         baru berhenti, karena percobaan berikutnya juga pasti gagal sampai koneksi pulih. */
    let anyRejected = false;
    let lastRejectReason = "";
    for(const item of items){
      try{
        const res = await fetch(url, {
          method:"POST",
          headers:{ "Content-Type":"text/plain;charset=utf-8" }, // hindari CORS preflight ke Apps Script
          body: JSON.stringify({ mode:"single", store:item.store, action:item.action, record:item.record, token: SYNC_TOKEN })
        });
        let json = null;
        try{ json = await res.json(); }catch(e){ json = null; }
        if(!json || json.ok !== true){
          /* Server menjawab tapi menolak item ini — jangan hentikan antrean, lanjut ke
             item berikutnya supaya perubahan tabel lain tetap terkirim. */
          anyRejected = true;
          lastRejectReason = (json && json.error) ? json.error : "Server belum mengonfirmasi (mungkin sedang sibuk)";
          continue;
        }
        await idbDeleteRaw("syncQueue", item.qid);
      }catch(err){ break; /* kemungkinan offline sama sekali — coba lagi nanti */ }
    }
    const remaining = await idbAll("syncQueue");
    if(remaining.length && anyRejected){
      setSyncStatusText(`${remaining.length} perubahan DITOLAK server: ${lastRejectReason}. Pastikan skrip Apps Script (Code.gs) sudah di-deploy ke "New version" terbaru.`);
    }else{
      setSyncStatusText(remaining.length ? `${remaining.length} perubahan menunggu koneksi…` : "Tersinkron ✓");
    }
  } finally { syncPushInFlight = false; }
}

/* [BARU] Kirim SELURUH data lokal yang sudah ada (semua tabel) dalam satu kali kirim per tabel.
   Di sisi server, data digabung berdasarkan kunci unik (upsert) — bukan ditambahkan sebagai baris
   baru — sehingga tidak pernah terjadi duplikasi walau tombol ini ditekan berkali-kali. */
async function pushAllLocalData(){
  const url = await getSyncUrl();
  if(!url) return false;
  setSyncStatusText("Mengirim seluruh data yang ada…");
  let allOk = true;
  for(const store of Object.keys(SYNC_TABLES)){
    try{
      let records = await idbAll(store);
      if(store==="tugas"){
        records = records.map(t=>{
          const s = (STATE.siswa||[]).find(x=>String(x.nis)===String(t.nis));
          return s ? { ...t, nama:s.nama } : t;
        });
      }
      if(store==="literasi"){
        records = records.map(r=>{
          const s = r.nis ? (STATE.siswa||[]).find(x=>String(x.nis)===String(r.nis)) : null;
          return { ...r, nama: s ? s.nama : (r.namaManual || "") };
        });
      }
      if(!records.length) continue;
      const res = await fetch(url, {
        method:"POST",
        headers:{ "Content-Type":"text/plain;charset=utf-8" },
        body: JSON.stringify({ mode:"bulk", store, records, token: SYNC_TOKEN })
      });
      /* [BARU] Cek konfirmasi ok:true dari server sebelum menganggap tabel ini berhasil
         terkirim — server bisa merespons ok:false kalau sedang sibuk (lock terpakai). */
      let json = null;
      try{ json = await res.json(); }catch(e){ json = null; }
      if(!json || json.ok !== true) allOk = false;
    }catch(err){ allOk = false; /* lanjutkan tabel lain; akan dicoba lagi lain kali */ }
  }
  return allOk;
}

/* [BARU] Bersihkan tugas "yatim" — tugas yang NIS-nya sudah tidak ada di Data Siswa
   (biasanya sisa dari siswa yang pernah dihapus sebelum fitur hapus-berantai ini ada,
   atau data uji coba lama). Penghapusan diantrekan lewat idbDelete seperti biasa,
   sehingga ikut terkirim ke Google Sheet saat "Segarkan Data" berikutnya ditekan.
   Pengaman: hanya berjalan kalau Data Siswa memang tidak kosong, supaya tidak
   menghapus semua tugas kalau daftar siswa kebetulan belum termuat. */
async function cleanupOrphanTugas(){
  await loadAll();
  if(!STATE.siswa || !STATE.siswa.length) return false;
  const validNis = new Set(STATE.siswa.map(s=>String(s.nis)));
  const orphans = (STATE.tugas||[]).filter(t=> !validNis.has(String(t.nis)));
  if(!orphans.length) return false;
  for(const t of orphans){
    await idbDelete("tugas", t.id);
  }
  await loadAll();
  return true;
}

let syncPullInFlight = false;
async function pullFromSheet(){
  const url = await getSyncUrl();
  if(!url) return;
  if(syncPullInFlight) return;
  syncPullInFlight = true;
  try{
    const res = await fetch(urlDenganToken(url), { method:"GET" });
    const data = await res.json();
    let changed = false;
    for(const [store, cfg] of Object.entries(SYNC_TABLES)){
      const rows = Array.isArray(data[store]) ? data[store] : [];
      const localList = STATE[store==="jurnal" ? "jurnalEntries" : store] || [];
      for(const row of rows){
        const keyVal = row[cfg.key];
        if(keyVal===undefined || keyVal===null || keyVal==="") continue;
        /* [BARU] Google Sheet kadang mengembalikan NIS/ID sebagai ANGKA (kalau kolomnya
           berformat Angka, bukan Teks). Kalau dibiarkan, nilai angka ini tidak akan
           pernah cocok dengan versi teks yang dipakai di aplikasi (mis. "3160169851"
           !== 3160169851 secara tipe), sehingga hitungan Tugas Tercatat/Sudah/Belum
           bisa tampil 0 padahal datanya ada. Maka semua field kunci & NIS dipaksa jadi
           teks begitu masuk ke aplikasi. */
        row[cfg.key] = String(keyVal).trim();
        if(row.nis!==undefined && row.nis!==null) row.nis = String(row.nis).trim();
        /* [PERBAIKAN] Kalau kolom "Tanggal" di Sheet sempat otomatis berubah jadi
           tipe Tanggal (bukan Teks), Code.gs mengirimkannya sebagai timestamp
           LENGKAP (mis. "2026-08-14T11:04:49.359Z") alih-alih "2026-08-14" saja —
           itu penyebab tanggal tampil mentah/tidak akurat di aplikasi. Rapikan di
           sini begitu data masuk, lalu antrekan lagi supaya Sheet ikut diperbaiki. */
        if(row.tanggal && /^\d{4}-\d{2}-\d{2}T/.test(String(row.tanggal))){
          row.tanggal = String(row.tanggal).slice(0,10);
          queueSync(store, "upsert", row);
        }
        const local = localList.find(x=>String(x[cfg.key])===String(row[cfg.key]));
        if(!local || (row.updatedAt && (!local.updatedAt || row.updatedAt > local.updatedAt))){
          await idbPutRaw(store, row); changed = true;
        }
      }

      /* Selaraskan penuh DUA ARAH untuk SEMUA tabel (bukan cuma Data Siswa): data lokal
         yang sudah TIDAK ADA lagi di Sheet ikut dihapus dari aplikasi, supaya data di
         aplikasi selalu sama persis dengan Google Sheet. Pengaman: hanya berjalan kalau
         Sheet memang mengirim baris untuk tabel ybs (rows.length>0), dan record yang
         BARU SAJA ditambah/diubah secara lokal (masih menunggu terkirim di syncQueue)
         tidak ikut terhapus, supaya tidak hilang sebelum sempat tersinkron ke Sheet. */
      if(rows.length){
        const sheetKeys = new Set(rows.map(r=>String(r[cfg.key])).filter(k=>k));
        const pendingQueue = await idbAll("syncQueue");
        const pendingKeys = new Set(
          pendingQueue.filter(q=>q.store===store && q.action!=="delete").map(q=>String(q.record[cfg.key]))
        );
        const toRemove = localList.filter(x=> !sheetKeys.has(String(x[cfg.key])) && !pendingKeys.has(String(x[cfg.key])));
        for(const rec of toRemove){
          await idbDeleteRaw(store, rec[cfg.key]);
          changed = true;
        }
      }
    }
    if(changed) await loadAll();
    const cleanedOrphans = await cleanupOrphanTugas();
    if(changed || cleanedOrphans){
      if(STATE.view==="dashboard") renderDashboard();
      if(STATE.view==="data") renderDataView();
      if(STATE.view==="siswa") renderSiswaView();
      if(STATE.view==="input") populateStudentSelect();
      if(STATE.view==="jadwal") renderJadwal();
      if(STATE.view==="jurnal") renderJurnal();
      if(STATE.view==="pengaturan") renderPengaturan();
      if(STATE.view==="literasi"){ populateLiterasiSiswaSelects(); renderLiterasiView(); }
      if(STATE.view==="numerasi") renderNumerasiView();
      if(STATE.view==="ujian") renderUjianView();
    }
    setSyncStatusText(`Tersinkron ✓ — ${new Date().toLocaleTimeString("id-ID")}`);
  }catch(err){
    setSyncStatusText("Gagal menghubungi Google Sheet (cek URL/koneksi).");
  } finally { syncPullInFlight = false; }
}

/* Sinkronisasi TIDAK berjalan otomatis (tanpa interval berkala, tanpa trigger saat
   online/kembali aktif). Sinkron hanya berjalan ketika pengguna menekan tombol
   "Segarkan Data" di Dasbor — lihat manualSyncNow(). Tombol "Simpan" di Pengaturan
   hanya menyimpan URL, tidak memicu koneksi ke Google Sheet sama sekali. */

/* Tampilkan status jumlah perubahan yang masih menunggu dikirim (tanpa melakukan
   koneksi apa pun ke Google Sheet) — dipanggil setiap kali ada perubahan data lokal
   dan saat aplikasi baru dibuka, supaya pengguna tahu kapan perlu menekan Segarkan Data. */
async function refreshSyncStatusDisplay(){
  const url = await getSyncUrl();
  if(!url){ setSyncStatusText("Belum diatur."); return; }
  try{
    const pending = await idbAll("syncQueue");
    setSyncStatusText(pending.length
      ? `${pending.length} perubahan menunggu — klik "Segarkan Data" di Dasbor untuk mengirim.`
      : "Tersimpan lokal. Klik \"Segarkan Data\" di Dasbor untuk sinkron.");
  }catch(e){ setSyncStatusText("Siap disinkronkan."); }
}

/* Satu-satunya jalur yang benar-benar menghubungi Google Sheet. Hanya dipanggil dari
   tombol "Segarkan Data" di Dasbor (dashRefreshData). Melakukan sinkron dua arah penuh:
   kirim antrean perubahan lokal, lalu tarik & selaraskan seluruh tabel dari Sheet
   (termasuk menghapus data lokal yang sudah tidak ada di Sheet) supaya data di aplikasi
   & Google Sheet selalu sama persis. */
async function manualSyncNow(){
  const url = await getSyncUrl();
  if(!url){ setSyncStatusText("Belum diatur."); return; }
  setSyncStatusText("Menyinkronkan…");
  /* Saat URL baru pertama kali dipakai: tarik dulu apa yang sudah ada di Sheet (hindari
     menimpa data), lalu gabungkan seluruh data lokal (upsert, bukan duplikat). Ditandai
     dengan flag supaya tidak mengirim ulang seluruh data setiap kali tombol diklik. */
  const didInitialPush = await getSyncFlag("syncInitialPushDone_"+url);
  if(!didInitialPush){
    await pullFromSheet();
    const pushOk = await pushAllLocalData();
    /* [BARU] Flag "sudah push pertama" HANYA disimpan kalau seluruh tabel benar-benar
       terkonfirmasi tersimpan di Sheet — kalau sempat gagal/server sibuk, biarkan
       tetap belum ditandai supaya percobaan push penuh diulang lagi di sinkron berikutnya
       (mencegah data yang gagal terkirim malah dianggap "sudah" dan tidak pernah dicoba lagi). */
    if(pushOk) await setSyncFlag("syncInitialPushDone_"+url, true);
  }
  await processSyncQueue();
  await pullFromSheet();
}

async function saveSyncSettings(){
  const input = document.getElementById("sync_url");
  if(!input) return;
  await setSyncUrl(input.value);
  toast("URL sinkronisasi disimpan.");
  /* Tidak lagi otomatis menyinkron setelah disimpan — hanya menyimpan URL.
     Pengguna harus membuka Dasbor dan menekan "Segarkan Data" untuk mulai sinkron. */
  await refreshSyncStatusDisplay();
}
async function renderSyncSettings(){
  const input = document.getElementById("sync_url");
  if(!input) return;
  // [DIPERBAIKI] Satu URL ini sekarang dipakai bersama untuk sinkron Google Sheet & upload dokumen
  input.value = await getSyncUrl();
  await refreshSyncStatusDisplay();
  // [BARU] Link Google Spreadsheet (tautan pintas, terpisah dari URL Web App di atas)
  const spreadsheetInput = document.getElementById("spreadsheet_url");
  if(spreadsheetInput) spreadsheetInput.value = getSpreadsheetUrl();
}

/* Simpan/ambil isian jurnal (per mapel+bab+pertemuan) dari IndexedDB */
function jurnalEntryId(mapelKey, babNo, pertemuanNo){ return `${mapelKey}__bab${babNo}__p${pertemuanNo}`; }
function getJurnalEntry(mapelKey, babNo, pertemuanNo){
  const id = jurnalEntryId(mapelKey, babNo, pertemuanNo);
  return (STATE.jurnalEntries||[]).find(e=>e.id===id) || null;
}
async function saveJurnalEntry(mapelKey, babNo, pertemuanNo, data){
  const id = jurnalEntryId(mapelKey, babNo, pertemuanNo);
  const entry = { id, mapelKey, babNo, pertemuanNo, ...data, updatedAt: new Date().toISOString() };
  await idbPut("jurnal", entry);
  STATE.jurnalEntries = await idbAll("jurnal");
  return entry;
}

function jurnalGo(view, mapelKey, babNo){
  STATE.jurnal = { view, mapelKey: mapelKey||null, babNo: babNo||null, openPertemuan: new Set() };
  renderJurnal();
}

function renderJurnalBreadcrumb(){
  const el = document.getElementById("jurnalBreadcrumb");
  const st = STATE.jurnal;
  const parts = [];
  if(st.view==="mapel"){
    parts.push(`<span class="crumb-current">Jurnal Mengajar</span>`);
  }else{
    parts.push(`<button type="button" data-go="mapel">Jurnal Mengajar</button>`);
    const mapel = JURNAL_MAPEL_LIST.find(m=>m.key===st.mapelKey);
    const isBulan = mapel?.unit==="bulan";
    const unitLabel = mapel?.unitLabel || "Bab";
    if(st.view==="bab"){
      parts.push(`<span class="crumb-sep">/</span><span class="crumb-current">${escapeHtml(mapel?.nama||"")}</span>`);
    }else if(st.view==="ringkasan"){
      parts.push(`<span class="crumb-sep">/</span><button type="button" data-go="bab">${escapeHtml(mapel?.nama||"")}</button>`);
      parts.push(`<span class="crumb-sep">/</span><span class="crumb-current">Rancangan Garis Besar</span>`);
    }else if(st.view==="pertemuan"){
      parts.push(`<span class="crumb-sep">/</span><button type="button" data-go="bab">${escapeHtml(mapel?.nama||"")}</button>`);
      const bab = JURNAL_SUBJECTS[st.mapelKey]?.babList[st.babNo-1];
      const label = isBulan
        ? (bab&&bab.status==="ready" ? escapeHtml(bab.judul) : `${unitLabel} ${st.babNo}`)
        : `${unitLabel} ${st.babNo}${bab&&bab.status==="ready" ? " — "+escapeHtml(bab.judul) : ""}`;
      parts.push(`<span class="crumb-sep">/</span><span class="crumb-current">${label}</span>`);
    }
  }
  el.innerHTML = parts.join("");
  el.querySelectorAll("button[data-go]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      if(btn.dataset.go==="mapel") jurnalGo("mapel");
      else if(btn.dataset.go==="bab") jurnalGo("bab", st.mapelKey);
    });
  });
}

function renderJurnal(){
  if(!STATE.jurnal) STATE.jurnal = { view:"mapel", mapelKey:null, babNo:null, openPertemuan:new Set() };
  renderJurnalBreadcrumb();
  const st = STATE.jurnal;
  if(st.view==="mapel") renderJurnalMapelView();
  else if(st.view==="bab") renderJurnalBabView();
  else if(st.view==="ringkasan") renderJurnalRingkasanView();
  else renderJurnalPertemuanView();
}

function renderJurnalMapelView(){
  const wrap = document.getElementById("jurnalContent");
  const cards = JURNAL_MAPEL_LIST.map(m=>{
    const subj = JURNAL_SUBJECTS[m.key];
    const unitLabel = m.unitLabel || "Bab";
    const readyCount = subj.babList.filter(b=>b.status==="ready").length;
    const badge = readyCount>0 ? `<span class="mapel-badge ready">${readyCount}/${subj.babList.length} ${unitLabel} siap</span>` : `<span class="mapel-badge">Segera Hadir</span>`;
    return `<button type="button" class="jurnal-mapel-card" data-mapel="${m.key}">
      ${badge}
      <span class="mapel-icon">${m.emoji}</span>
      <span class="mapel-nama">${escapeHtml(m.nama)}</span>
      <span class="mapel-desk">${escapeHtml(m.deskripsi)}</span>
    </button>`;
  }).join("");
  wrap.innerHTML = `
    <div class="jurnal-hero">
      <h2>Jurnal Mengajar</h2>
      <p>Pilih mata pelajaran untuk melihat pembagian Bab per semester, lalu isi jurnal setiap pertemuan langsung dari HP atau perangkat lain. Data tersimpan otomatis di perangkat ini.</p>
    </div>
    <div class="jurnal-mapel-grid">${cards}</div>`;
  wrap.querySelectorAll(".jurnal-mapel-card").forEach(card=>{
    card.addEventListener("click", ()=>jurnalGo("bab", card.dataset.mapel));
  });
}

function renderJurnalBabView(){
  const wrap = document.getElementById("jurnalContent");
  const mapelKey = STATE.jurnal.mapelKey;
  const mapel = JURNAL_MAPEL_LIST.find(m=>m.key===mapelKey);
  const babList = JURNAL_SUBJECTS[mapelKey].babList;
  const isBulan = mapel.unit === "bulan";
  const unitLabel = mapel.unitLabel || "Bab";

  const babCard = (b)=>{
    const isReady = b.status==="ready";
    return `<button type="button" class="jurnal-bab-card" data-bab="${b.no}">
      <div class="bab-no">${isBulan ? escapeHtml(b.judul.slice(0,3)) : String(b.no).padStart(2,"0")}</div>
      <div class="bab-judul">${isReady ? escapeHtml(b.judul) : "Isi Manual"}</div>
      ${ (isReady && b.sub) ? `<div class="bab-sub">${escapeHtml(b.sub)}</div>` : "" }
      <span class="bab-status ${isReady?"ready":"segera"}">${isReady?"Siap diisi":"Materi menyusul &middot; Isi manual"}</span>
    </button>`;
  };

  const ringkasanBtn = mapel.hasRingkasan ? `
    <button type="button" class="jurnal-ringkasan-btn" id="jurnalRingkasanBtn">
      <span class="jurnal-ringkasan-btn-icon">📋</span>
      <span class="jurnal-ringkasan-btn-text">
        <strong>Rancangan Garis Besar Semester 1</strong>
        <span>Ringkasan proyek 6 bulan &amp; Rencana Anggaran Biaya (RAB) &mdash; terpisah dari jurnal per bulan di bawah.</span>
      </span>
      <span class="jurnal-ringkasan-btn-arrow">&rarr;</span>
    </button>` : "";

  let bodyHtml;
  if(isBulan){
    const cards = babList.map(babCard).join("");
    bodyHtml = `<div class="jurnal-sem-block">
      <h3 class="jurnal-sem-title"><span class="dot"></span>Semester 1 &middot; Juli–Desember 2026</h3>
      <div class="jurnal-bab-grid jurnal-bulan-grid">${cards}</div>
    </div>`;
  }else{
    const renderGroup = (semester)=>{
      const babs = babList.filter(b=>b.semester===semester);
      const cards = babs.map(babCard).join("");
      return `<div class="jurnal-sem-block">
        <h3 class="jurnal-sem-title"><span class="dot"></span>Semester ${semester} &middot; ${unitLabel} ${semester===1?"1–4":"5–8"}</h3>
        <div class="jurnal-bab-grid">${cards}</div>
      </div>`;
    };
    bodyHtml = renderGroup(1) + renderGroup(2);
  }

  wrap.innerHTML = `
    <div class="jurnal-hero">
      <h2>${escapeHtml(mapel.nama)}</h2>
      <p>${escapeHtml(mapel.deskripsi)} &mdash; ${isBulan
        ? `terdiri dari ${babList.length} ${unitLabel} pada Semester 1 (Juli–Desember 2026), sesuai Rancangan Detail Tahapan Kegiatan Kokurikuler tiap bulan.`
        : `terdiri dari 8 ${unitLabel}, dibagi rata untuk Semester 1 (${unitLabel} 1–4) dan Semester 2 (${unitLabel} 5–8). ${unitLabel} yang materinya belum tersedia tetap bisa diisi secara manual.`}</p>
    </div>
    ${ringkasanBtn}
    ${bodyHtml}
  `;
  wrap.querySelectorAll(".jurnal-bab-card").forEach(card=>{
    card.addEventListener("click", ()=>{
      const babNo = Number(card.dataset.bab);
      jurnalGo("pertemuan", mapelKey, babNo);
    });
  });
  const rb = document.getElementById("jurnalRingkasanBtn");
  if(rb) rb.addEventListener("click", ()=>jurnalGo("ringkasan", mapelKey));
}

/* [BARU] Rancangan Garis Besar Semester 1 — ringkasan lintas bulan + RAB, terpisah dari
   jurnal isian per bulan (bersifat referensi/read-only, bukan formulir yang diisi guru). */
function renderJurnalRingkasanView(){
  const wrap = document.getElementById("jurnalContent");
  const R = KOKURIKULER_RINGKASAN;
  const rowsBulan = R.bulanan.map(x=>`
    <tr>
      <td><strong>${escapeHtml(x.bulan)}</strong></td>
      <td>${escapeHtml(x.integrasi)}</td>
      <td>${escapeHtml(x.proyek)}</td>
      <td>${escapeHtml(x.alat)}</td>
    </tr>`).join("");
  const rowsRab = R.rab.map(x=>`
    <tr>
      <td>${escapeHtml(x.mapel)}</td>
      <td>${escapeHtml(x.komponen)}</td>
      <td>${escapeHtml(x.vol)}</td>
      <td>${escapeHtml(x.harga)}</td>
      <td>${escapeHtml(x.total)}</td>
    </tr>`).join("");
  wrap.innerHTML = `
    <div class="jurnal-hero">
      <h2>Rancangan Garis Besar Semester 1</h2>
      <p>Ringkasan proyek kokurikuler lintas bulan (${escapeHtml(R.periode)}) beserta Rencana Anggaran Biaya (RAB). Halaman ini bersifat referensi umum satu semester &mdash; isian jurnal per pertemuan tetap dilakukan lewat menu tiap bulan.</p>
    </div>
    <div class="panel">
      <div class="panel-head"><h3>Matriks Distribusi Bulanan Proyek &amp; Agenda Akademik</h3></div>
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>Bulan</th><th>Integrasi Mapel / Target Bab</th><th>Rencana Proyek &amp; Aktivitas Utama</th><th>Kebutuhan Alat &amp; Bahan Utama</th></tr></thead>
          <tbody>${rowsBulan}</tbody>
        </table>
      </div>
    </div>
    <div class="panel">
      <div class="panel-head"><h3>Rencana Anggaran Biaya (RAB) Estimasi Proyek Semester I</h3></div>
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>Mata Pelajaran / Rencana Proyek</th><th>Nama Komponen / Bahan Utama</th><th>Vol</th><th>Harga Satuan</th><th>Total Biaya</th></tr></thead>
          <tbody>${rowsRab}</tbody>
        </table>
      </div>
      <p class="muted" style="margin-top:10px;text-align:right;"><strong>TOTAL ESTIMASI ANGGARAN: ${escapeHtml(R.totalAnggaran)}</strong></p>
    </div>
  `;
}

const REALISASI_OPTIONS = ["Sesuai rencana","Dengan penyesuaian","Tidak terlaksana"];

/* [BARU] Pilihan cepat "isi otomatis" untuk Kendala & Catatan/Refleksi Guru — ketuk salah
   satu chip untuk menempelkan teksnya ke kolom, boleh diedit lagi sebelum disimpan. */
const KENDALA_PRESETS = [
  "Tidak ada kendala berarti",
  "Sebagian siswa belum fokus",
  "Waktu pembelajaran kurang",
  "Keterbatasan alat/media pembelajaran",
  "Sebagian siswa belum memahami materi"
];
const CATATAN_PRESETS = [
  "Pembelajaran berjalan lancar dan sesuai rencana.",
  "Peserta didik aktif dan antusias mengikuti pembelajaran.",
  "Sebagian besar tujuan pembelajaran tercapai dengan baik.",
  "Perlu pengulangan materi pada pertemuan berikutnya."
];

/* [BARU] ---------- Pertemuan manual untuk Bab yang materinya "menyusul" ----------
   Bab yang belum punya berkas resmi (status "segera", info & pertemuan bawaan kosong) tetap
   bisa dipakai mengisi jurnal — guru menambahkan sendiri daftar pertemuannya (Judul, Kode TP,
   Alokasi, Tujuan, Materi), lalu mengisi jurnal tiap pertemuan seperti Bab lain. Daftar
   pertemuan manual disimpan di store "jurnal" yang sama (id berakhiran "__custom") supaya
   ikut tersinkron seperti isian jurnal lainnya. */
function customPertemuanId(mapelKey, babNo){ return `${mapelKey}__bab${babNo}__custom`; }
function getCustomPertemuanList(mapelKey, babNo){
  const id = customPertemuanId(mapelKey, babNo);
  const rec = (STATE.jurnalEntries||[]).find(e=>e.id===id);
  return (rec && Array.isArray(rec.list)) ? rec.list : [];
}
async function saveCustomPertemuanList(mapelKey, babNo, list){
  await idbPut("jurnal", { id: customPertemuanId(mapelKey, babNo), list });
  STATE.jurnalEntries = await idbAll("jurnal");
}
async function addCustomPertemuan(mapelKey, babNo, def){
  const list = getCustomPertemuanList(mapelKey, babNo).slice();
  const nextNo = list.length ? Math.max(...list.map(p=>p.no)) + 1 : 1;
  list.push({
    no: nextNo,
    kodeTP: def.kodeTP || "-",
    judul: def.judul || `Pertemuan ${nextNo}`,
    alokasi: def.alokasi || "-",
    tujuan: def.tujuan || "",
    materi: def.materi || ""
  });
  await saveCustomPertemuanList(mapelKey, babNo, list);
}
async function deleteCustomPertemuan(mapelKey, babNo, no){
  const list = getCustomPertemuanList(mapelKey, babNo).filter(p=>p.no!==no);
  await saveCustomPertemuanList(mapelKey, babNo, list);
  await idbDelete("jurnal", jurnalEntryId(mapelKey, babNo, no)); // hapus juga isian jurnalnya bila ada
  STATE.jurnalEntries = await idbAll("jurnal");
}
/* [BARU] Daftar pertemuan yang berlaku untuk sebuah Bab: bawaan aplikasi (status "ready")
   atau daftar manual yang ditambahkan guru sendiri (status "segera"). Dipakai bersama oleh
   tampilan jurnal, Unduh Template, dan Impor Excel supaya konsisten. */
function getPertemuanList(mapelKey, babNo){
  const bab = JURNAL_SUBJECTS[mapelKey].babList[babNo-1];
  return bab.status==="ready" ? bab.pertemuan : getCustomPertemuanList(mapelKey, babNo);
}

/* [BARU] Info Umum otomatis untuk Bab manual (belum ada berkas resmi) — diambil dari
   Pengaturan Kelas & Sekolah supaya guru tak perlu mengetik ulang identitas kelas. */
function buildAutoInfo(){
  const set = getSchoolSettings();
  return {
    namaSekolah: SCHOOL.nama,
    kelasFase: set.kelas,
    semesterTahun: `Semester ${set.semester} / Tahun Pelajaran ${set.tahun}`,
    kodeTP: "Diisi manual per pertemuan",
    alokasiKeseluruhan: "Menyesuaikan jumlah pertemuan yang ditambahkan",
    alokasiMinggu: "-",
    guruMapel: getGuruName() || "-"
  };
}

/* [BARU] Hitung & pasang tinggi accordion "Jurnal Pertemuan" sesuai isi SESUNGGUHNYA (bukan
   angka tebakan seperti max-height:1400px sebelumnya) — supaya di layar sempit (HP), yang mana
   isian form tersusun vertikal jauh lebih tinggi dari desktop, tidak ada bagian form yang
   terpotong/tersembunyi. scrollHeight tetap terbaca dengan benar walau elemen sedang
   max-height:0, karena scrollHeight mengukur tinggi konten aslinya, bukan tinggi yang terlihat. */
function aturJurnalPertemuanTinggi(card){
  const body = card.querySelector(".jurnal-pertemuan-body");
  if(!body) return;
  body.style.maxHeight = card.classList.contains("open") ? (body.scrollHeight + "px") : "0px";
}
/* [BARU] Saat layar diputar (potret/lanskap) atau ukuran jendela berubah, tinggi konten yang
   sedang terbuka bisa ikut berubah (mis. teks yang tadinya 1 baris jadi 2 baris) — hitung ulang
   supaya tidak pernah ada bagian yang balik terpotong. */
window.addEventListener("resize", debounce(()=>{
  document.querySelectorAll(".jurnal-pertemuan.open").forEach(aturJurnalPertemuanTinggi);
}, 200));

function renderJurnalPertemuanView(){
  const wrap = document.getElementById("jurnalContent");
  const { mapelKey, babNo } = STATE.jurnal;
  const mapel = JURNAL_MAPEL_LIST.find(m=>m.key===mapelKey);
  const bab = JURNAL_SUBJECTS[mapelKey].babList[babNo-1];
  const isManual = bab.status !== "ready";
  const isBulan = mapel.unit === "bulan";
  const unitLabel = mapel.unitLabel || "Bab";
  const ptLabel = mapel.ptLabel || "Pertemuan";
  const pertemuanList = getPertemuanList(mapelKey, babNo);
  const info = isManual ? buildAutoInfo() : bab.info;
  const totalPertemuan = pertemuanList.length;
  const filledCount = pertemuanList.filter(p=>{
    const e = getJurnalEntry(mapelKey, babNo, p.no);
    return e && (e.hariTanggal || e.catatan || e.realisasi);
  }).length;
  const pct = totalPertemuan ? Math.round((filledCount/totalPertemuan)*100) : 0;

  const infoHtml = info ? `
    <div class="panel">
      <div class="panel-head"><h3>Informasi Umum</h3></div>
      <div class="jurnal-info-panel">
        <div class="jurnal-info-item"><span>Nama Sekolah</span><strong>${escapeHtml(info.namaSekolah)}</strong></div>
        <div class="jurnal-info-item"><span>Kelas / Fase</span><strong>${escapeHtml(info.kelasFase)}</strong></div>
        <div class="jurnal-info-item"><span>Semester / Tahun</span><strong>${escapeHtml(info.semesterTahun)}</strong></div>
        <div class="jurnal-info-item"><span>Cakupan TP</span><strong>${escapeHtml(info.kodeTP)}</strong></div>
        <div class="jurnal-info-item"><span>Alokasi Keseluruhan</span><strong>${escapeHtml(info.alokasiKeseluruhan)}</strong></div>
        <div class="jurnal-info-item"><span>Alokasi per Minggu</span><strong>${escapeHtml(info.alokasiMinggu)}</strong></div>
        <div class="jurnal-info-item"><span>Guru Mapel</span><strong>${escapeHtml(info.guruMapel)}</strong></div>
      </div>
    </div>` : "";

  const catatanHtml = (!isManual && bab.catatan) ? `
    <div class="panel jurnal-catatan-panel">
      <div class="panel-head"><h3>Catatan Penyesuaian</h3></div>
      <p class="readtext" style="margin:0;">${escapeHtml(bab.catatan)}</p>
    </div>` : "";

  const asesmenHtml = (!isManual && bab.asesmen && bab.asesmen.length) ? `
    <div class="panel">
      <div class="panel-head"><h3>Rencana Asesmen / Penilaian</h3></div>
      ${bab.asesmen.map(a=>`
        <div class="jurnal-field-block">
          <span>${escapeHtml(a.aspek)}</span>
          <p class="readtext">${escapeHtml(a.indikator)}${a.metode ? ` <em>&middot; Metode: ${escapeHtml(a.metode)}</em>` : ""}</p>
        </div>`).join("")}
    </div>` : "";

  const presetChips = (field, presets)=> presets.map(txt=>
    `<button type="button" class="jurnal-preset-chip" data-preset-field="${field}" data-preset-text="${escapeHtml(txt)}">${escapeHtml(txt)}</button>`
  ).join("");

  const pertemuanHtml = pertemuanList.map(p=>{
    const e = getJurnalEntry(mapelKey, babNo, p.no) || {};
    const isOpen = STATE.jurnal.openPertemuan.has(p.no);
    const isFilled = !!(e.hariTanggal || e.catatan || e.realisasi);
    return `
    <div class="jurnal-pertemuan ${isOpen?"open":""}" data-pertemuan="${p.no}">
      <div class="jurnal-pertemuan-head ${isFilled?"filled":""}" data-toggle="${p.no}">
        <div class="jurnal-pertemuan-num">${p.no}</div>
        <div class="jurnal-pertemuan-titlewrap">
          <div class="pt-title">${ptLabel} ${p.no} &middot; ${escapeHtml(p.judul)}</div>
          <div class="pt-meta">${isBulan ? escapeHtml(p.alokasi) : `Kode TP ${escapeHtml(p.kodeTP)} &middot; ${escapeHtml(p.alokasi)}`}</div>
        </div>
        <span class="jurnal-pertemuan-status ${e.tercapai?"done":""}">${e.tercapai ? "Tercapai" : (isFilled ? "Terisi" : "Belum diisi")}</span>
        ${isManual ? `<button type="button" class="jurnal-pertemuan-del" data-del-pertemuan="${p.no}" title="Hapus pertemuan ini" aria-label="Hapus pertemuan ini">&times;</button>` : ""}
        <svg class="jurnal-pertemuan-chev" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg>
      </div>
      <div class="jurnal-pertemuan-body">
        <div class="jurnal-pertemuan-inner">
          <div class="jurnal-field-block"><span>Tujuan Pembelajaran</span><p class="readtext">${escapeHtml(p.tujuan)}</p></div>
          <div class="jurnal-field-block"><span>Materi Pokok / Kegiatan</span><p class="readtext">${escapeHtml(p.materi)}</p></div>
          <div class="jurnal-field-block">
            <span>Hari, Tanggal Pelaksanaan</span>
            <input type="date" data-field="hariTanggal" value="${e.hariTanggal||""}">
          </div>
          <div class="jurnal-field-block">
            <span>Realisasi Pembelajaran</span>
            <div class="jurnal-radio-row">
              ${REALISASI_OPTIONS.map(opt=>`<label><input type="radio" name="realisasi-${mapelKey}-${babNo}-${p.no}" value="${opt}" data-field="realisasi" ${e.realisasi===opt?"checked":""}>${opt}</label>`).join("")}
            </div>
          </div>
          <div class="jurnal-field-block">
            <span>Kendala (jika ada)</span>
            <div class="jurnal-preset-row">${presetChips("kendala", KENDALA_PRESETS)}</div>
            <textarea rows="2" data-field="kendala" placeholder="Tuliskan kendala saat pembelajaran, bila ada&hellip;">${escapeHtml(e.kendala||"")}</textarea>
          </div>
          <div class="jurnal-field-block">
            <span>Kehadiran Siswa</span>
            <div class="jurnal-hadir-row">
              <label>Hadir<input type="text" inputmode="numeric" data-field="hadir" value="${escapeHtml(e.hadir||"")}" placeholder="0"></label>
              <label>Tidak Hadir<input type="text" inputmode="numeric" data-field="tidakHadir" value="${escapeHtml(e.tidakHadir||"")}" placeholder="0"></label>
              <label>Keterangan<input type="text" data-field="ket" value="${escapeHtml(e.ket||"")}" placeholder="cth. 1 sakit"></label>
            </div>
          </div>
          <div class="jurnal-field-block">
            <span>Catatan / Refleksi Guru</span>
            <div class="jurnal-preset-row">${presetChips("catatan", CATATAN_PRESETS)}</div>
            <textarea rows="3" data-field="catatan" placeholder="Refleksi pembelajaran hari ini&hellip;">${escapeHtml(e.catatan||"")}</textarea>
          </div>
          <div class="jurnal-tercapai-toggle">
            <label><input type="checkbox" data-field="tercapai" ${e.tercapai?"checked":""}> ${isBulan ? "Tujuan Kegiatan Pekan ini tercapai" : `Tujuan Pembelajaran (${escapeHtml(p.kodeTP)}) tercapai`}</label>
          </div>
          <div class="jurnal-pertemuan-actions">
            <span class="jurnal-saved-note" data-savednote hidden>Tersimpan &#10003;</span>
            <button type="button" class="btn btn-primary" data-save="${p.no}">Simpan ${ptLabel} Ini</button>
          </div>
        </div>
      </div>
    </div>`;
  }).join("");

  const tambahPertemuanHtml = isManual ? `
    <div class="panel" id="tambahPertemuanPanel">
      <div class="panel-head"><h3>Tambah ${ptLabel} Manual</h3></div>
      <p class="muted" style="margin-bottom:10px;">Materi resmi ${unitLabel} ini belum tersedia di aplikasi — tambahkan sendiri daftar ${ptLabel.toLowerCase()}nya di sini, lalu isi jurnalnya seperti ${unitLabel} lain.</p>
      <div class="grid-form">
        <label class="field field-wide">
          <span>Judul ${ptLabel}</span>
          <input type="text" id="cp_judul" placeholder="cth. Mengenal Bagian Tumbuhan">
        </label>
        <label class="field">
          <span>Kode TP (opsional)</span>
          <input type="text" id="cp_kodetp" placeholder="cth. 4.5.1">
        </label>
        <label class="field">
          <span>Alokasi Waktu (opsional)</span>
          <input type="text" id="cp_alokasi" placeholder="cth. 2 JP x 35 menit (70 menit)">
        </label>
        <label class="field field-wide">
          <span>Tujuan Pembelajaran</span>
          <textarea rows="2" id="cp_tujuan" placeholder="Tuliskan tujuan pembelajaran pertemuan ini&hellip;"></textarea>
        </label>
        <label class="field field-wide">
          <span>Materi Pokok / Kegiatan</span>
          <textarea rows="2" id="cp_materi" placeholder="Tuliskan materi pokok/kegiatan pertemuan ini&hellip;"></textarea>
        </label>
        <div class="form-actions">
          <button type="button" class="btn btn-primary" id="cp_add_btn">+ Tambah ${ptLabel}</button>
        </div>
      </div>
    </div>` : "";

  const emptyManualNote = (isManual && !totalPertemuan) ? `
    <div class="panel"><p class="muted" style="margin:0;">Belum ada ${ptLabel.toLowerCase()} pada ${unitLabel} ini. Tambahkan ${ptLabel.toLowerCase()} pertama lewat form di atas.</p></div>` : "";

  const headerTitle = isBulan
    ? `${escapeHtml(mapel.nama)} &middot; ${isManual ? "Isi Manual" : escapeHtml(bab.judul)}`
    : `${escapeHtml(mapel.nama)} &middot; ${unitLabel} ${babNo}: ${isManual ? "Isi Manual" : escapeHtml(bab.judul)}`;
  const headerSub = (isBulan && !isManual && bab.sub) ? `<p style="margin:2px 0 6px;font-weight:600;">${escapeHtml(bab.sub)}</p>` : "";

  wrap.innerHTML = `
    <div class="jurnal-hero">
      <h2>${headerTitle}</h2>
      ${headerSub}
      <p>${isManual ? `Materi ${unitLabel} ini belum tersedia otomatis di aplikasi — tambahkan ${ptLabel.toLowerCase()} secara manual, lalu isi jurnalnya seperti biasa.` : `Ketuk salah satu ${ptLabel.toLowerCase()} di bawah untuk membuka dan mengisi jurnal mengajarnya.`} Isian tersimpan otomatis di perangkat ini walau tanpa koneksi internet.</p>
    </div>
    ${infoHtml}
    ${catatanHtml}
    ${asesmenHtml}
    ${tambahPertemuanHtml}
    ${totalPertemuan ? `
    <div class="panel">
      <div class="panel-head"><h3>Progres Pengisian &middot; ${totalPertemuan} ${ptLabel}</h3></div>
      <div class="jurnal-progress-row">
        <div class="progress-track"><div class="progress-fill" style="width:${pct}%;"></div></div>
        <strong>${filledCount}/${totalPertemuan} (${pct}%)</strong>
      </div>
      <div class="btn-row" style="flex-wrap:wrap;margin-top:12px;">
        <button type="button" class="btn btn-outline" id="jurnalTemplateBtn">Unduh Template Excel</button>
        <label class="btn btn-outline file-btn">Impor dari Excel<input type="file" id="jurnalImportInput" accept=".xlsx,.xls" hidden></label>
      </div>
      <p class="muted" style="margin-top:8px;font-size:.8rem;">Unduh template untuk ${unitLabel} ini, isi kolomnya di Excel/HP, lalu impor kembali agar semua ${ptLabel.toLowerCase()} terisi sekaligus.</p>
    </div>` : ""}
    ${emptyManualNote}
    ${pertemuanHtml}
  `;

  /* [BARU] Kartu yang dirender LANGSUNG dalam kondisi terbuka (dari STATE.jurnal.openPertemuan)
     juga perlu tinggi yang dihitung ulang, bukan cuma yang dibuka lewat klik — supaya tidak ada
     lagi bagian form yang terpotong begitu halaman selesai dimuat. */
  wrap.querySelectorAll(".jurnal-pertemuan.open").forEach(aturJurnalPertemuanTinggi);

  wrap.querySelectorAll("[data-toggle]").forEach(head=>{
    head.addEventListener("click", (ev)=>{
      if(ev.target.closest("[data-del-pertemuan]")) return;
      const no = Number(head.dataset.toggle);
      const card = wrap.querySelector(`.jurnal-pertemuan[data-pertemuan="${no}"]`);
      const wasOpen = STATE.jurnal.openPertemuan.has(no);
      if(wasOpen) STATE.jurnal.openPertemuan.delete(no);
      else STATE.jurnal.openPertemuan.add(no);
      card.classList.toggle("open", !wasOpen);
      aturJurnalPertemuanTinggi(card);
    });
  });

  /* [BARU] Chip isi otomatis untuk Kendala & Catatan/Refleksi Guru */
  wrap.querySelectorAll("[data-preset-field]").forEach(chip=>{
    chip.addEventListener("click", ()=>{
      const inner = chip.closest(".jurnal-pertemuan-inner");
      const ta = inner.querySelector(`[data-field="${chip.dataset.presetField}"]`);
      if(!ta) return;
      ta.value = ta.value.trim() ? `${ta.value.trim()}. ${chip.dataset.presetText}` : chip.dataset.presetText;
      ta.focus();
    });
  });

  wrap.querySelectorAll("[data-save]").forEach(btn=>{
    btn.addEventListener("click", async ()=>{
      const no = Number(btn.dataset.save);
      const card = wrap.querySelector(`.jurnal-pertemuan[data-pertemuan="${no}"]`);
      const data = {
        hariTanggal: card.querySelector('[data-field="hariTanggal"]').value,
        realisasi: (card.querySelector('[data-field="realisasi"]:checked')||{}).value || "",
        kendala: card.querySelector('[data-field="kendala"]').value,
        hadir: card.querySelector('[data-field="hadir"]').value,
        tidakHadir: card.querySelector('[data-field="tidakHadir"]').value,
        ket: card.querySelector('[data-field="ket"]').value,
        catatan: card.querySelector('[data-field="catatan"]').value,
        tercapai: card.querySelector('[data-field="tercapai"]').checked
      };
      await saveJurnalEntry(mapelKey, babNo, no, data);
      const note = card.querySelector("[data-savednote]");
      note.hidden = false;
      toast(`Jurnal Pertemuan ${no} berhasil disimpan.`);
      renderJurnalPertemuanView();
      STATE.jurnal.openPertemuan.add(no);
      const reopened = document.querySelector(`.jurnal-pertemuan[data-pertemuan="${no}"]`);
      if(reopened){
        reopened.classList.add("open");
        aturJurnalPertemuanTinggi(reopened);
      }
    });
  });

  /* [BARU] Hapus pertemuan manual (beserta isian jurnalnya) */
  wrap.querySelectorAll("[data-del-pertemuan]").forEach(btn=>{
    btn.addEventListener("click", async (ev)=>{
      ev.stopPropagation();
      const no = Number(btn.dataset.delPertemuan);
      if(!confirm(`Hapus Pertemuan ${no} beserta isian jurnalnya?`)) return;
      await deleteCustomPertemuan(mapelKey, babNo, no);
      toast(`Pertemuan ${no} dihapus.`);
      renderJurnalPertemuanView();
    });
  });

  /* [BARU] Tambah pertemuan manual baru */
  const cpAddBtn = document.getElementById("cp_add_btn");
  if(cpAddBtn) cpAddBtn.addEventListener("click", async ()=>{
    const judulEl = document.getElementById("cp_judul");
    const judul = judulEl.value.trim();
    if(!judul){ toast("Judul pertemuan wajib diisi."); judulEl.focus(); return; }
    const def = {
      judul,
      kodeTP: document.getElementById("cp_kodetp").value.trim(),
      alokasi: document.getElementById("cp_alokasi").value.trim(),
      tujuan: document.getElementById("cp_tujuan").value.trim(),
      materi: document.getElementById("cp_materi").value.trim()
    };
    await addCustomPertemuan(mapelKey, babNo, def);
    toast("Pertemuan baru berhasil ditambahkan.");
    renderJurnalPertemuanView();
  });

  /* [BARU] Unduh Template Excel & Impor Excel — pengisian jurnal massal per Bab */
  const jurnalTemplateBtn = document.getElementById("jurnalTemplateBtn");
  if(jurnalTemplateBtn) jurnalTemplateBtn.addEventListener("click", ()=>downloadJurnalTemplate(mapelKey, babNo));
  const jurnalImportInput = document.getElementById("jurnalImportInput");
  if(jurnalImportInput) jurnalImportInput.addEventListener("change", (e)=>{
    if(e.target.files[0]) importJurnalXlsx(mapelKey, babNo, e.target.files[0]);
    e.target.value = "";
  });
}

/* [BARU] Susun baris template/ekspor jurnal untuk satu Bab — 1 baris per Pertemuan.
   Kolom "No. Pertemuan", "Kode TP", "Judul Pertemuan" bersifat referensi (JANGAN diubah/dihapus
   saat impor) karena dipakai importJurnalXlsx() untuk mencocokkan baris ke pertemuan yang benar.
   Jika sudah ada isian tersimpan sebelumnya, nilainya ikut disertakan supaya template juga
   berfungsi sebagai "ekspor lalu edit lalu impor ulang". */
function jurnalTemplateRows(mapelKey, babNo){
  const pertemuanList = getPertemuanList(mapelKey, babNo);
  return pertemuanList.map(p=>{
    const e = getJurnalEntry(mapelKey, babNo, p.no) || {};
    return {
      "No. Pertemuan": p.no,
      "Kode TP": p.kodeTP,
      "Judul Pertemuan (referensi, jangan diubah)": p.judul,
      "Hari, Tanggal Pelaksanaan (YYYY-MM-DD)": e.hariTanggal || "",
      "Realisasi Pembelajaran (Sesuai rencana / Dengan penyesuaian / Tidak terlaksana)": e.realisasi || "",
      "Kendala (jika ada)": e.kendala || "",
      "Hadir": e.hadir || "",
      "Tidak Hadir": e.tidakHadir || "",
      "Keterangan Kehadiran": e.ket || "",
      "Catatan / Refleksi Guru": e.catatan || "",
      "Tujuan Pembelajaran Tercapai (Ya/Tidak)": e.tercapai ? "Ya" : "Tidak"
    };
  });
}

/* [BARU] Unduh template Excel untuk impor massal Jurnal Mengajar per Bab (mis. IPAS Bab 3).
   Baris sudah otomatis terisi No. Pertemuan/Kode TP/Judul sesuai jumlah pertemuan pada Bab
   tsb, guru tinggal melengkapi kolom isian lalu impor kembali lewat tombol "Impor dari Excel". */
function downloadJurnalTemplate(mapelKey, babNo){
  if(!window.XLSX){ toast("Modul Excel belum siap."); return; }
  const mapel = JURNAL_MAPEL_LIST.find(m=>m.key===mapelKey);
  const bab = JURNAL_SUBJECTS[mapelKey].babList[babNo-1];
  const rows = jurnalTemplateRows(mapelKey, babNo);
  if(!rows.length){ toast("Belum ada pertemuan untuk diunduh templatenya."); return; }
  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = [{wch:12},{wch:14},{wch:42},{wch:26},{wch:44},{wch:30},{wch:8},{wch:12},{wch:20},{wch:35},{wch:24}];
  const wb = XLSX.utils.book_new();
  const unitLabel = mapel.unitLabel || "Bab";
  const sheetName = `${unitLabel} ${babNo}`.slice(0,31);
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  const namaMapelFile = (mapel.nama||"Mapel").replace(/\s+/g,"");
  const judulFile = (bab.status==="ready" ? bab.judul : "IsiManual").replace(/[^\w]+/g,"");
  XLSX.writeFile(wb, `Template-Jurnal-${namaMapelFile}-${unitLabel}${babNo}-${judulFile}.xlsx`);
  toast("Template jurnal berhasil diunduh.");
}

/* [BARU] Ubah nilai tanggal dari Excel (Date object, serial, atau teks dd/mm/yyyy) menjadi
   format YYYY-MM-DD yang dipakai <input type="date"> pada form jurnal. */
function excelDateToISO(val){
  if(val===undefined || val===null || val==="") return "";
  if(val instanceof Date && !isNaN(val)){
    const y=val.getFullYear(), m=String(val.getMonth()+1).padStart(2,"0"), d=String(val.getDate()).padStart(2,"0");
    return `${y}-${m}-${d}`;
  }
  const s = String(val).trim();
  if(!s) return "";
  let m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/); // dd/mm/yyyy atau dd-mm-yyyy
  if(m) return `${m[3]}-${m[2].padStart(2,"0")}-${m[1].padStart(2,"0")}`;
  m = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/); // yyyy-mm-dd (sudah benar)
  if(m) return `${m[1]}-${m[2].padStart(2,"0")}-${m[3].padStart(2,"0")}`;
  return s;
}

/* [BARU] Impor massal isian Jurnal Mengajar dari Excel (mengikuti kolom template Bab terkait).
   Dicocokkan lewat kolom "No. Pertemuan" ke pertemuan yang sesuai pada Bab yang sedang dibuka,
   baris dengan No. Pertemuan kosong/tidak dikenal akan dilewati. */
async function importJurnalXlsx(mapelKey, babNo, file){
  if(!window.XLSX){ toast("Modul Excel belum siap."); return; }
  const pertemuanList = getPertemuanList(mapelKey, babNo);
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type:"array", cellDates:true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { defval:"" });
  let count = 0;
  for(const row of rows){
    const no = Number(row["No. Pertemuan"] ?? row["No Pertemuan"] ?? row["No"] ?? "");
    if(!no || !pertemuanList.find(p=>p.no===no)) continue;

    const realisasiRaw = String(
      row["Realisasi Pembelajaran (Sesuai rencana / Dengan penyesuaian / Tidak terlaksana)"] ??
      row["Realisasi Pembelajaran"] ?? ""
    ).trim();
    const realisasi = REALISASI_OPTIONS.includes(realisasiRaw) ? realisasiRaw : "";

    const tercapaiRaw = String(
      row["Tujuan Pembelajaran Tercapai (Ya/Tidak)"] ?? row["Tercapai"] ?? ""
    ).trim().toLowerCase();

    const data = {
      hariTanggal: excelDateToISO(
        row["Hari, Tanggal Pelaksanaan (YYYY-MM-DD)"] ?? row["Hari, Tanggal Pelaksanaan"] ?? ""
      ),
      realisasi,
      kendala: String(row["Kendala (jika ada)"] ?? "").trim(),
      hadir: String(row["Hadir"] ?? "").trim(),
      tidakHadir: String(row["Tidak Hadir"] ?? "").trim(),
      ket: String(row["Keterangan Kehadiran"] ?? "").trim(),
      catatan: String(row["Catatan / Refleksi Guru"] ?? "").trim(),
      tercapai: (tercapaiRaw==="ya" || tercapaiRaw==="yes" || tercapaiRaw==="true" || tercapaiRaw==="1")
    };
    await saveJurnalEntry(mapelKey, babNo, no, data);
    count++;
  }
  toast(count ? `${count} pertemuan berhasil diimpor ke jurnal.` : "Tidak ada baris valid yang ditemukan pada file Excel.");
  if(STATE.jurnal && STATE.jurnal.view==="pertemuan") renderJurnalPertemuanView();
}

/* ---------- [BARU] Running text kata motivasi mengajar (di atas Dasbor) ----------
   Dipilih SATU kali secara acak setiap aplikasi dibuka (bukan tiap ganti tampilan),
   supaya setiap kali guru membuka aplikasi, kalimatnya selalu berbeda. */
const MOTIVASI_QUOTES = [
  "Guru yang hebat menginspirasi murid untuk percaya pada diri sendiri.",
  "Mendidik hari ini adalah menanam untuk masa depan yang lebih baik.",
  "Setiap anak adalah bintang yang menunggu waktunya untuk bersinar.",
  "Ilmu yang diajarkan dengan hati akan sampai ke hati juga.",
  "Kesabaran seorang guru adalah kunci lahirnya generasi hebat.",
  "Sedikit demi sedikit, lama-lama menjadi bukit — begitu pula ilmu anak didik kita.",
  "Guru bukan hanya mengajar, tapi juga menuntun dan menemani.",
  "Senyum guru pagi ini adalah semangat murid sepanjang hari.",
  "Anak-anak belajar lebih banyak dari sikap kita daripada dari kata-kata kita.",
  "Setiap tugas yang dikumpulkan adalah satu langkah kecil menuju cita-cita besar.",
  "Mengajar dengan ikhlas, hasilnya akan berkah.",
  "Hari ini lelah, besok berbuah — teruslah menyalakan pelita ilmu.",
  "Kelas yang hangat lahir dari guru yang sabar dan penuh cinta."
];
/* [BARU] Pemutar lagu Dasbor — memutar berkas audio/lagu-dasbor.mp3 (sesuai unggahan project)
   lewat tombol Putar/Jeda + slider volume di toolbar Dasbor. */
function initDashAudioPlayer(){
  const audio = document.getElementById("dashLaguAudio");
  const btn = document.getElementById("dashAudioToggle");
  if(!audio || !btn) return;
  const vol = document.getElementById("dashAudioVolume");
  const label = document.getElementById("dashAudioLabel");
  audio.volume = vol ? Number(vol.value) : 0.6;

  btn.addEventListener("click", ()=>{
    if(audio.paused){
      audio.play().catch(()=> toast("Gagal memutar lagu. Coba lagi."));
    } else {
      audio.pause();
    }
  });
  audio.addEventListener("play", ()=>{
    setHidden("dashAudioIcPlay", true);
    setHidden("dashAudioIcPause", false);
    if(label) label.textContent = "Jeda Lagu";
    btn.classList.add("is-playing");
  });
  audio.addEventListener("pause", ()=>{
    setHidden("dashAudioIcPlay", false);
    setHidden("dashAudioIcPause", true);
    if(label) label.textContent = "Putar Lagu";
    btn.classList.remove("is-playing");
  });
  if(vol) vol.addEventListener("input", ()=>{ audio.volume = Number(vol.value); });
}

function initMotivasiMarquee(){
  const el = document.getElementById("motivasiMarqueeText");
  if(!el) return;
  const quote = MOTIVASI_QUOTES[Math.floor(Math.random()*MOTIVASI_QUOTES.length)];
  el.textContent = `✨ ${quote} ✨`;
}

/* ---------- [BARU] Jadwal mengajar hari ini (tampil di bawah jam pada Dasbor) ---------- */
function renderTodayScheduleWidget(){
  const dayEl = document.getElementById("todayScheduleDay");
  const list = document.getElementById("todayScheduleList");
  if(!list) return;
  const idx = new Date().getDay(); // 0=Minggu..6=Sabtu
  const map = {1:"Senin",2:"Selasa",3:"Rabu",4:"Kamis",5:"Jumat"};
  const hari = map[idx] || null;
  if(dayEl) dayEl.textContent = hari || "Libur";
  if(!hari){
    list.innerHTML = `<span class="today-schedule-empty">Hari ini libur, tidak ada jadwal mengajar.</span>`;
    return;
  }
  const rows = (STATE.jadwal||[])
    .filter(j=>j.hari===hari)
    .sort((a,b)=>jamMulai(a.waktu)-jamMulai(b.waktu));
  if(!rows.length){
    list.innerHTML = `<span class="today-schedule-empty">Belum ada jadwal mengajar untuk hari ini. Atur di menu Jadwal Pelajaran.</span>`;
    return;
  }
  list.innerHTML = rows.map(r=>{
    const kat = jadwalKategori(r.mapel);
    return `<div class="today-schedule-item jadwal-badge-${kat}">
      <span class="today-schedule-time">${escapeHtml(r.waktu||"-")}</span>
      <span class="today-schedule-mapel">${escapeHtml(r.mapel)}</span>
    </div>`;
  }).join("");
}

/* ---------- [BARU] Jam Analog + Tanggal Digital (di puncak Dasbor) ---------- */
let clockIntervalHandle = null;
function buildClockTicks(){
  const g = document.getElementById("clockTicks");
  if(!g || g.childElementCount) return; // sudah dibuat sekali saja
  const cx = 100, cy = 100, rOuter = 96;
  for(let i=0;i<60;i++){
    const angle = (i * 6) * (Math.PI/180);
    const isMajor = i % 5 === 0;
    const rInner = isMajor ? rOuter - 10 : rOuter - 5;
    const x1 = cx + rInner * Math.sin(angle), y1 = cy - rInner * Math.cos(angle);
    const x2 = cx + rOuter * Math.sin(angle), y2 = cy - rOuter * Math.cos(angle);
    const line = document.createElementNS("http://www.w3.org/2000/svg","line");
    line.setAttribute("x1", x1); line.setAttribute("y1", y1);
    line.setAttribute("x2", x2); line.setAttribute("y2", y2);
    line.setAttribute("class", isMajor ? "clock-tick clock-tick-major" : "clock-tick");
    g.appendChild(line);
  }
}
function tickClock(){
  const now = new Date();
  const h = now.getHours() % 12, m = now.getMinutes(), s = now.getSeconds();

  const hourDeg = (h * 30) + (m * 0.5);
  const minDeg = (m * 6) + (s * 0.1);
  const secDeg = s * 6;

  const hh = document.getElementById("clockHourHand");
  const mh = document.getElementById("clockMinuteHand");
  const sh = document.getElementById("clockSecondHand");
  if(hh) hh.style.transform = `rotate(${hourDeg}deg)`;
  if(mh) mh.style.transform = `rotate(${minDeg}deg)`;
  if(sh) sh.style.transform = `rotate(${secDeg}deg)`;

  const timeEl = document.getElementById("digitalTime");
  const dateEl = document.getElementById("digitalDate");
  if(timeEl) timeEl.textContent = now.toLocaleTimeString("id-ID", { hour:"2-digit", minute:"2-digit", second:"2-digit" });
  if(dateEl) dateEl.textContent = now.toLocaleDateString("id-ID", { weekday:"long", day:"numeric", month:"long", year:"numeric" });
}
function initClock(){
  buildClockTicks();
  tickClock();
  if(clockIntervalHandle) clearInterval(clockIntervalHandle);
  clockIntervalHandle = setInterval(tickClock, 1000);
}

/* ---------- [BARU] Tombol "Segarkan Data" di Dasbor — tarik & kirim perubahan dari/ke Google Sheet ---------- */
async function dashRefreshData(){
  const btn = document.getElementById("dashRefreshBtn");
  const ic = document.getElementById("dashRefreshIc");
  if(btn) btn.disabled = true;
  if(ic) ic.classList.add("spinning");
  try{
    const url = await getSyncUrl();
    if(!url){
      toast("URL Google Sheet belum diatur. Buka menu Pengaturan untuk mengisinya.");
      switchView("pengaturan");
      return;
    }
    await manualSyncNow();
    if(STATE.view==="dashboard") renderDashboard();
    toast("Data berhasil disegarkan.");
  }catch(e){
    toast("Gagal menyegarkan data. Periksa koneksi internet.");
  }finally{
    if(btn) btn.disabled = false;
    if(ic) ic.classList.remove("spinning");
  }
}

/* ---------- Dashboard ---------- */
function renderDashboard(){
  const total = STATE.tugas.length;
  const sudah = STATE.tugas.filter(t=>t.status==="Sudah Mengumpulkan").length;
  const belum = total - sudah;
  const pct = total? Math.round((sudah/total)*100) : 0;

  document.getElementById("statSiswa").textContent = STATE.siswa.length;
  document.getElementById("statTugas").textContent = total;
  document.getElementById("statSudah").textContent = sudah;
  document.getElementById("statBelum").textContent = belum;
  document.getElementById("statSudahPct").textContent = total? `${pct}% dari total` : "0%";
  document.getElementById("statBelumPct").textContent = total? `${100-pct}% dari total` : "0%";
  document.getElementById("progressPct").textContent = `${pct}%`;
  document.getElementById("progressFill").style.width = `${pct}%`;

  renderRecentTable();
  renderChartPekan();
  renderChartMapel();
  renderChartTrend();
  renderRanking();
  renderTodayScheduleWidget();
}

function renderRecentTable(){
  const tbody = document.querySelector("#recentTable tbody");
  const rows = [...STATE.tugas].sort((a,b)=> (b.tanggal||"").localeCompare(a.tanggal||"") || b.id-a.id).slice(0,8);
  tbody.innerHTML = rows.length ? rows.map(t=>{
    const s = studentByNis(t.nis);
    return `<tr>
      <td>${s?s.nama:t.nis}</td>
      <td>${escapeHtml(t.mapel)}</td>
      <td>${escapeHtml(t.tugas)}</td>
      <td>${t.pekan}</td>
      <td class="mono">${fmtDate(t.tanggal)}</td>
      <td>${statusBadge(t.status)}</td>
    </tr>`;
  }).join("") : `<tr><td colspan="6" class="muted" style="text-align:center;padding:20px;">Belum ada data tugas.</td></tr>`;
}

function statusBadge(status){
  const good = status==="Sudah Mengumpulkan";
  return `<span class="badge ${good?"badge-good":"badge-bad"}">${status}</span>`;
}
function escapeHtml(s){
  return String(s??"").replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}

let ChartLib = null;
function renderChartPekan(){
  const canvas = document.getElementById("chartPekan");
  if(!window.Chart){ return; }
  const pekans = ["Bab 1","Bab 2","Bab 3","Bab 4","Bab 5","Bab 6","Bab 7","Bab 8","Bab 9","Bab 10"];
  const sudah = pekans.map(p=>STATE.tugas.filter(t=>t.pekan===p && t.status==="Sudah Mengumpulkan").length);
  const belum = pekans.map(p=>STATE.tugas.filter(t=>t.pekan===p && t.status==="Belum Mengumpulkan").length);
  const styles = getComputedStyle(document.body);
  const green = styles.getPropertyValue("--green-700").trim();
  const brick = styles.getPropertyValue("--brick-600").trim();
  const textc = styles.getPropertyValue("--text-soft").trim();

  if(STATE.chartPekan) STATE.chartPekan.destroy();
  STATE.chartPekan = new Chart(canvas, {
    type:"bar",
    data:{ labels:pekans, datasets:[
      {label:"Sudah", data:sudah, backgroundColor:green, borderRadius:6, maxBarThickness:22},
      {label:"Belum", data:belum, backgroundColor:brick, borderRadius:6, maxBarThickness:22}
    ]},
    options:{
      responsive:true,
      plugins:{ legend:{ position:"bottom", labels:{color:textc, boxWidth:12, font:{size:11}} } },
      scales:{
        x:{ stacked:true, ticks:{color:textc,font:{size:10}}, grid:{display:false} },
        y:{ stacked:true, beginAtZero:true, ticks:{color:textc,precision:0,font:{size:11}}, grid:{color:"rgba(120,120,120,.12)"} }
      }
    }
  });
}
function renderChartMapel(){
  const canvas = document.getElementById("chartMapel");
  if(!window.Chart) return;
  const mapels = uniq(STATE.tugas.map(t=>t.mapel));
  const styles = getComputedStyle(document.body);
  const textc = styles.getPropertyValue("--text-soft").trim();
  const gold = styles.getPropertyValue("--gold-600").trim();
  const green = styles.getPropertyValue("--green-700").trim();
  const palette = [green, gold, "#5B8C6B", "#B3441E", "#6E8FA6", "#9C7A12", "#4B5A50", "#7FA08D"];

  const data = mapels.map(m=>STATE.tugas.filter(t=>t.mapel===m).length);
  if(STATE.chartMapel) STATE.chartMapel.destroy();
  if(mapels.length===0){
    STATE.chartMapel = new Chart(canvas,{type:"doughnut",data:{labels:["Belum ada data"],datasets:[{data:[1],backgroundColor:["#DDD8C4"]}]},options:{plugins:{legend:{display:false}}}});
    return;
  }
  STATE.chartMapel = new Chart(canvas, {
    type:"doughnut",
    data:{ labels:mapels, datasets:[{ data, backgroundColor:mapels.map((_,i)=>palette[i%palette.length]) }] },
    options:{ responsive:true, cutout:"62%", plugins:{ legend:{ position:"bottom", labels:{color:textc, boxWidth:11, font:{size:10.5}, padding:10} } } }
  });
}

/* [BARU] ---------- Grafik Tren Pengumpulan (Mingguan/Bulanan) ---------- */
// Nomor pekan ISO (Senin—Minggu) dipakai supaya pengelompokan mingguan konsisten
// lintas tahun, terlepas dari field "Bab" yang sudah dipakai untuk keperluan lain.
function isoWeekInfo(dateStr){
  const d = new Date(dateStr+"T00:00:00");
  d.setDate(d.getDate() + 4 - (d.getDay()||7));
  const yearStart = new Date(d.getFullYear(),0,1);
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1)/7);
  return { year: d.getFullYear(), week: weekNo };
}
function weekKey(dateStr){
  const { year, week } = isoWeekInfo(dateStr);
  return `${year}-W${String(week).padStart(2,"0")}`;
}
function weekLabel(key){
  const [y,w] = key.split("-W");
  return `Mg ${parseInt(w,10)} '${y.slice(2)}`;
}
function computeTrendData(mode){
  // [BARU] Mode "bab" mengelompokkan berdasarkan Bab 1–10 (bukan periode tanggal),
  // supaya tren bisa dilihat per tahapan materi, bukan cuma per minggu/bulan.
  if(mode==="bab"){
    const babs = ["Bab 1","Bab 2","Bab 3","Bab 4","Bab 5","Bab 6","Bab 7","Bab 8","Bab 9","Bab 10"];
    const map = new Map(babs.map(b=>[b,{total:0,sudah:0}]));
    STATE.tugas.forEach(t=>{
      if(!map.has(t.pekan)) return;
      const o = map.get(t.pekan);
      o.total++;
      if(t.status==="Sudah Mengumpulkan") o.sudah++;
    });
    const usedBabs = babs.filter(b=>map.get(b).total>0);
    const keys = usedBabs.length ? usedBabs : babs;
    return {
      labels: keys,
      pct: keys.map(k=>{ const o=map.get(k); return o.total ? Math.round((o.sudah/o.total)*100) : 0; }),
      total: keys.map(k=> map.get(k).total)
    };
  }
  const keyFn = mode==="minggu" ? weekKey : (d)=> (d||"").slice(0,7);
  const labelFn = mode==="minggu" ? weekLabel : monthLabel;
  const map = new Map();
  STATE.tugas.forEach(t=>{
    if(!t.tanggal) return;
    const k = keyFn(t.tanggal);
    if(!map.has(k)) map.set(k, { total:0, sudah:0 });
    const o = map.get(k);
    o.total++;
    if(t.status==="Sudah Mengumpulkan") o.sudah++;
  });
  const keys = [...map.keys()].sort().slice(-12); // 12 periode terakhir supaya grafik tetap terbaca
  return {
    labels: keys.map(labelFn),
    pct: keys.map(k=>{ const o=map.get(k); return o.total ? Math.round((o.sudah/o.total)*100) : 0; }),
    total: keys.map(k=> map.get(k).total)
  };
}
function setTrendMode(mode){
  STATE.trendMode = mode;
  const btnMinggu = document.getElementById("trendModeMinggu");
  const btnBulan = document.getElementById("trendModeBulan");
  const btnBab = document.getElementById("trendModeBab");
  if(btnMinggu) btnMinggu.classList.toggle("active", mode==="minggu");
  if(btnBulan) btnBulan.classList.toggle("active", mode==="bulan");
  if(btnBab) btnBab.classList.toggle("active", mode==="bab");
  renderChartTrend();
}
function renderChartTrend(){
  const canvas = document.getElementById("chartTrend");
  if(!canvas || !window.Chart) return;
  const mode = STATE.trendMode || "minggu";
  const { labels, pct, total } = computeTrendData(mode);
  const styles = getComputedStyle(document.body);
  const green = styles.getPropertyValue("--green-700").trim();
  const gold = styles.getPropertyValue("--gold-600").trim();
  const textc = styles.getPropertyValue("--text-soft").trim();

  if(STATE.chartTrend) STATE.chartTrend.destroy();
  if(!labels.length){
    STATE.chartTrend = new Chart(canvas, {
      type:"line",
      data:{ labels:["Belum ada data"], datasets:[{ data:[0], borderColor:green }] },
      options:{ plugins:{ legend:{ display:false } } }
    });
    return;
  }
  STATE.chartTrend = new Chart(canvas, {
    data:{
      labels,
      datasets:[
        { type:"bar", label:"Jumlah Tugas", data: total, backgroundColor:"rgba(201,162,39,.35)", yAxisID:"y1", borderRadius:5, maxBarThickness:26, order:2 },
        { type:"line", label:"% Pengumpulan", data: pct, borderColor:green, backgroundColor:green, tension:.35, yAxisID:"y0", pointRadius:3, pointBackgroundColor:green, order:1 }
      ]
    },
    options:{
      responsive:true,
      interaction:{ mode:"index", intersect:false },
      plugins:{ legend:{ position:"bottom", labels:{color:textc, boxWidth:12, font:{size:11}} } },
      scales:{
        x:{ ticks:{color:textc, font:{size:10}}, grid:{display:false} },
        y0:{ position:"left", min:0, max:100, ticks:{color:textc, callback:v=>v+"%", font:{size:10}}, grid:{color:"rgba(120,120,120,.12)"} },
        y1:{ position:"right", beginAtZero:true, ticks:{color:textc, precision:0, font:{size:10}}, grid:{display:false} }
      }
    }
  });
}

/* [BARU] ---------- Peringkat Kerajinan Siswa (Paling Rajin & Perlu Perhatian) ---------- */
function computeSiswaRanking(){
  return STATE.siswa.map(s=>{
    const rows = STATE.tugas.filter(t=>String(t.nis)===String(s.nis));
    const total = rows.length;
    const sudah = rows.filter(t=>t.status==="Sudah Mengumpulkan").length;
    const belum = total - sudah;
    const pct = total ? Math.round((sudah/total)*100) : 0;
    return { nis:s.nis, nama:s.nama, total, sudah, belum, pct };
  }).filter(x=>x.total>0);
}
function rankRow(x, i, good){
  return `<div class="rank-row">
    <span class="rank-num">${i+1}</span>
    <div class="rank-info">
      <span class="rank-name">${escapeHtml(x.nama)}</span>
      <span class="rank-meta">${x.sudah}/${x.total} tugas &middot; ${x.pct}%</span>
    </div>
    <div class="rank-bar"><div class="rank-bar-fill ${good?"good":"bad"}" style="width:${x.pct}%"></div></div>
  </div>`;
}
function renderRanking(){
  const rajinEl = document.getElementById("rankingRajin");
  const perhatianEl = document.getElementById("rankingPerhatian");
  if(!rajinEl || !perhatianEl) return;
  const data = computeSiswaRanking();
  if(!data.length){
    const empty = `<div class="wa-modal-empty" style="padding:16px 6px;">Belum ada data tugas.</div>`;
    rajinEl.innerHTML = empty;
    perhatianEl.innerHTML = empty;
    return;
  }
  const topRajin = [...data].sort((a,b)=> b.pct-a.pct || b.total-a.total).slice(0,5);
  const topPerhatian = [...data].filter(x=>x.belum>0).sort((a,b)=> b.belum-a.belum || a.pct-b.pct).slice(0,5);

  rajinEl.innerHTML = topRajin.map((x,i)=>rankRow(x,i,true)).join("");
  perhatianEl.innerHTML = topPerhatian.length
    ? topPerhatian.map((x,i)=>rankRow(x,i,false)).join("")
    : `<div class="wa-modal-empty" style="padding:16px 6px;">Semua siswa sudah lengkap mengumpulkan. 🎉</div>`;
}

/* ---------- Input form: student picker (checklist, multi-select) ---------- */
STATE.selectedNis = new Set();
STATE.studentFilter = { q:"", lp:"" };

function populateStudentSelect(){ renderStudentPicker(); renderNumStudentPicker(); }

function renderStudentPicker(){
  const list = document.getElementById("studentList");
  if(!list) return;
  const { q, lp } = STATE.studentFilter;
  let students = STATE.siswa;
  if(lp) students = students.filter(s=>s.lp===lp);
  if(q){
    const qq = q.toLowerCase();
    students = students.filter(s=>s.nama.toLowerCase().includes(qq) || s.nis.includes(qq));
  }
  list.innerHTML = students.length ? students.map(s=>{
    const checked = STATE.selectedNis.has(s.nis);
    return `<label class="student-row ${checked?'checked':''}">
      <input type="checkbox" class="student-check" value="${s.nis}" ${checked?"checked":""}>
      <span class="student-name">${escapeHtml(s.nama)}</span>
      <span class="student-meta mono">${s.nis} &middot; ${s.lp}</span>
    </label>`;
  }).join("") : `<div class="student-empty">Tidak ada siswa yang cocok.</div>`;
  updateSelectedCount();
}
function updateSelectedCount(){
  const el = document.getElementById("selectedCount");
  if(el) el.textContent = `(${STATE.selectedNis.size} dipilih)`;
}

/* [BARU] ---------- Picker siswa (multi-select) KHUSUS untuk Catatan Numerasi ----------
   Sengaja dibuat terpisah (bukan pakai ulang punya Input Tugas) supaya kedua form bisa
   punya pilihan siswa masing-masing sendiri tanpa saling menimpa saat berpindah menu. */
STATE.numSelectedNis = new Set();
STATE.numStudentFilter = { q:"", lp:"" };
STATE.numEditId = null;

function populateNumStudentPicker(){ renderNumStudentPicker(); }

function renderNumStudentPicker(){
  const list = document.getElementById("numStudentList");
  if(!list) return;
  const { q, lp } = STATE.numStudentFilter;
  let students = STATE.siswa;
  if(lp) students = students.filter(s=>s.lp===lp);
  if(q){
    const qq = q.toLowerCase();
    students = students.filter(s=>s.nama.toLowerCase().includes(qq) || s.nis.includes(qq));
  }
  list.innerHTML = students.length ? students.map(s=>{
    const checked = STATE.numSelectedNis.has(s.nis);
    return `<label class="student-row ${checked?'checked':''}">
      <input type="checkbox" class="num-student-check" value="${s.nis}" ${checked?"checked":""}>
      <span class="student-name">${escapeHtml(s.nama)}</span>
      <span class="student-meta mono">${s.nis} &middot; ${s.lp}</span>
    </label>`;
  }).join("") : `<div class="student-empty">Tidak ada siswa yang cocok.</div>`;
  updateNumSelectedCount();
}
function updateNumSelectedCount(){
  const el = document.getElementById("numSelectedCount");
  if(el) el.textContent = `(${STATE.numSelectedNis.size} dipilih)`;
}
document.addEventListener("change", (e)=>{
  if(e.target.classList && e.target.classList.contains("num-student-check")){
    const nis = e.target.value;
    if(STATE.numEditId){
      // mode edit: 1 catatan = 1 siswa, jadi memilih siswa lain MENGGANTIKAN pilihan sebelumnya
      if(e.target.checked){ STATE.numSelectedNis = new Set([nis]); }
      else { STATE.numSelectedNis.delete(nis); }
    }else{
      if(e.target.checked) STATE.numSelectedNis.add(nis);
      else STATE.numSelectedNis.delete(nis);
    }
    renderNumStudentPicker();
  }
});
function populateMapelDatalist(){
  const dl = document.getElementById("mapelList");
  dl.innerHTML = uniq(STATE.tugas.map(t=>t.mapel)).map(m=>`<option value="${escapeHtml(m)}">`).join("");
}
/* [BARU] ---------- Catatan Otomatis (Pujian & Ketuntasan / Motivasi) ---------- */
/* Saat status "Sudah Mengumpulkan": beri pujian + rujuk pencapaian Tujuan Materi.
   Saat status "Belum Mengumpulkan": beri motivasi agar Tujuan Materi tetap tercapai. */
const CATATAN_PUJIAN_TEMPLATES = [
  "Masya Allah, tabarakallah! Ananda telah menyelesaikan tugas dengan baik dan tuntas mencapai tujuan pembelajaran{tujuanClause}. Pertahankan semangat belajarnya, ya, Nak!",
  "Alhamdulillah, kerja bagus! Tugas sudah dikumpulkan dan tujuan pembelajaran{tujuanClause} tercapai dengan baik. Teruslah semangat belajar!",
  "Barakallahu fiik, luar biasa! Ananda berhasil menuntaskan tugas ini dan mencapai tujuan pembelajaran{tujuanClause}. Semoga ilmunya berkah dan bermanfaat.",
  "Selamat, Nak! Tugas telah tuntas dikerjakan dan tujuan pembelajaran{tujuanClause} berhasil dicapai. Pertahankan terus prestasi belajarnya!",
  "Masya Allah, hebat sekali! Ketuntasan tugas ini menunjukkan tujuan pembelajaran{tujuanClause} sudah tercapai. Semoga terus istiqamah belajarnya."
];
const CATATAN_MOTIVASI_TEMPLATES = [
  "Ayo semangat, Nak! Tugas ini penting agar tujuan pembelajaran{tujuanClause} dapat tercapai. Yuk segera diselesaikan, Bapak/Ibu mohon dukungan orang tua di rumah.",
  "Jangan menyerah, ya! Sedikit usaha lagi untuk mencapai tujuan pembelajaran{tujuanClause}. Bapak/Ibu guru yakin Ananda pasti bisa menyelesaikannya.",
  "Semangat belajar, Nak! Tugas ini akan membantu Ananda mencapai tujuan pembelajaran{tujuanClause}. Mohon Bapak/Ibu di rumah membantu mengingatkan dan mendampingi.",
  "Yuk, jangan ditunda! Tujuan pembelajaran{tujuanClause} menanti untuk dicapai. Ananda pasti bisa menyelesaikan tugas ini dengan baik, InsyaAllah.",
  "Tetap semangat, Nak! Dengan menyelesaikan tugas ini, tujuan pembelajaran{tujuanClause} akan tercapai. Bapak/Ibu guru selalu mendukung usaha Ananda."
];

/* [BARU] ---------- Catatan Otomatis KHUSUS Literasi/Numerasi ----------
   Berbeda dari mapel lain, catatan Literasi/Numerasi disusun dari beberapa
   "kepingan" kalimat (pembuka, isi, sorotan kompetensi, saran/ajakan, penutup)
   yang masing-masing punya beberapa pilihan acak. Kepingan-kepingan itu
   digabung jadi satu catatan yang lebih panjang/lengkap kalimatnya, dan
   karena jumlah kombinasinya sangat banyak (ratusan-ribuan kombinasi),
   kemungkinan dua catatan berbunyi persis sama jadi sangat kecil — sehingga
   tiap kali guru mencatat tugas Literasi/Numerasi (walau kompetensinya sama),
   redaksi catatannya tetap terasa berbeda/tidak monoton. */
const LN_OPENER_SELESAI = [
  "Masya Allah, tabarakallah!",
  "Alhamdulillah, kerja yang sangat baik!",
  "Barakallahu fiik, luar biasa sekali!",
  "Subhanallah, usaha yang membanggakan!",
  "Selamat, Nak, hasil yang menggembirakan!",
  "Masya Allah, semangat belajarnya patut diapresiasi!"
];
const LN_BODY_SELESAI = [
  "Ananda telah menuntaskan latihan hari ini dengan sikap yang tekun dan penuh semangat.",
  "Latihan hari ini sudah dikerjakan Ananda sampai selesai dengan cukup baik.",
  "Ananda menunjukkan usaha yang sungguh-sungguh dalam menyelesaikan latihan kali ini.",
  "Tugas hari ini berhasil dituntaskan Ananda dengan kesungguhan yang patut dicontoh.",
  "Ananda mengerjakan seluruh latihan hari ini dengan rapi dan penuh perhatian.",
  "Alhamdulillah, latihan hari ini dapat diselesaikan Ananda dengan lancar."
];
const LN_SOROTAN_SELESAI = [
  "Meski demikian, Bapak/Ibu guru masih mencatat perlunya penguatan lebih lanjut pada {kompetensi}, agar pemahaman Ananda semakin mantap.",
  "Namun begitu, ada satu bagian yang masih perlu diulang dan dilatih kembali, yaitu {kompetensi}, supaya benar-benar dikuasai.",
  "Sebagai catatan, kompetensi {kompetensi} masih tergolong belum lancar dan sebaiknya terus dilatih secara bertahap di rumah.",
  "Di sisi lain, {kompetensi} masih perlu mendapat perhatian khusus supaya tidak tertinggal dari materi berikutnya.",
  "Perlu diketahui pula, Ananda masih memerlukan pendampingan ekstra dalam hal {kompetensi} sebelum benar-benar lancar.",
  "Satu hal yang perlu terus dilatih adalah {kompetensi}, sebab bagian ini masih belum sepenuhnya dipahami Ananda."
];
const LN_SARAN_SELESAI = [
  "Ajaklah Ananda berlatih singkat setiap hari di rumah, meski hanya beberapa menit, agar kompetensinya semakin terasah.",
  "Pengulangan ringan dan rutin di rumah akan sangat membantu Ananda memantapkan kemampuannya.",
  "Latihan tambahan berupa membaca atau berhitung ringan bersama orang tua akan sangat bermanfaat bagi Ananda.",
  "Pendampingan Bapak/Ibu di rumah, walau singkat, akan sangat membantu mempercepat pemahaman Ananda.",
  "Sesi latihan kecil sebelum tidur atau sepulang sekolah bisa menjadi cara yang menyenangkan untuk terus berlatih."
];
const LN_PENUTUP_SELESAI = [
  "Semoga Ananda terus istiqamah dan semakin lancar dari hari ke hari, aamiin.",
  "Bapak/Ibu guru yakin dengan latihan rutin, Ananda akan semakin lancar dan percaya diri.",
  "Teruslah semangat belajar, ya, Nak — sedikit demi sedikit pasti akan terasa hasilnya.",
  "Semoga ilmu yang dipelajari hari ini berkah dan bermanfaat bagi Ananda.",
  "Jazakumullahu khairan atas kerja samanya, semoga perkembangan Ananda terus membaik."
];

const LN_OPENER_BELUM = [
  "Ayo semangat, Nak!",
  "Jangan menyerah, ya, Nak!",
  "Yuk, kita coba lagi bersama!",
  "Semangat belajar terus, Nak!",
  "Tetap semangat, jangan berkecil hati!"
];
const LN_BODY_BELUM = [
  "Hari ini Ananda belum sempat menyelesaikan latihan yang diberikan.",
  "Latihan hari ini masih belum tuntas dikerjakan oleh Ananda.",
  "Ananda belum menyelesaikan tugas literasi/numerasi pada kesempatan kali ini.",
  "Sampai saat ini latihan yang diberikan belum berhasil diselesaikan Ananda.",
  "Ananda tampaknya masih memerlukan waktu tambahan untuk menuntaskan latihan hari ini."
];
const LN_SOROTAN_BELUM = [
  "Perhatian perlu difokuskan pada {kompetensi}, karena bagian ini yang paling membutuhkan pendampingan.",
  "Bagian yang paling perlu dibantu saat ini adalah {kompetensi}, mohon dukungan Bapak/Ibu di rumah.",
  "Kesulitan yang dialami Ananda terutama pada {kompetensi}, sehingga latihan tambahan sangat diperlukan.",
  "Kompetensi {kompetensi} masih menjadi tantangan utama bagi Ananda dan perlu segera dibantu.",
  "Mohon perhatian khusus pada {kompetensi}, agar Ananda tidak semakin tertinggal dari teman-temannya."
];
const LN_AJAKAN_BELUM = [
  "Mohon kerja sama Bapak/Ibu untuk membimbing dan mengingatkan Ananda berlatih secara rutin di rumah.",
  "Dukungan dan pendampingan dari rumah akan sangat berarti agar Ananda segera bisa mengejar ketertinggalannya.",
  "Bapak/Ibu guru mohon bantuan orang tua untuk meluangkan waktu mendampingi Ananda belajar setiap harinya.",
  "Sangat diharapkan peran orang tua di rumah untuk terus memotivasi dan menemani Ananda berlatih.",
  "Kerja sama antara sekolah dan rumah sangat dibutuhkan agar Ananda dapat segera menyusul teman-temannya."
];
const LN_PENUTUP_BELUM = [
  "InsyaAllah dengan usaha dan doa, Ananda pasti bisa menyusul, aamiin.",
  "Bapak/Ibu guru percaya Ananda mampu, asal terus dilatih dengan sabar.",
  "Sedikit demi sedikit, InsyaAllah kemampuan Ananda akan semakin membaik.",
  "Semangat terus, ya, Nak, Bapak/Ibu guru selalu mendukung usaha Ananda.",
  "Mari kita bantu Ananda bersama-sama agar segera bisa mengikuti dengan lancar."
];

function pickRandom(arr){ return arr[Math.floor(Math.random()*arr.length)]; }

/* Susun catatan khusus Literasi/Numerasi dari beberapa kepingan kalimat acak
   di atas. `kompetensi` = isi kolom "Kompetensi/Bagian yang Kurang Dipahami". */
function generateCatatanLiterasiNumerasi(status, kompetensi){
  const kmp = (kompetensi||"").trim();
  const parts = [];
  if(status === "Sudah Mengumpulkan"){
    parts.push(pickRandom(LN_OPENER_SELESAI));
    parts.push(pickRandom(LN_BODY_SELESAI));
    if(kmp) parts.push(pickRandom(LN_SOROTAN_SELESAI).replace("{kompetensi}", kmp));
    parts.push(pickRandom(LN_SARAN_SELESAI));
    parts.push(pickRandom(LN_PENUTUP_SELESAI));
  }else{
    parts.push(pickRandom(LN_OPENER_BELUM));
    parts.push(pickRandom(LN_BODY_BELUM));
    if(kmp) parts.push(pickRandom(LN_SOROTAN_BELUM).replace("{kompetensi}", kmp));
    parts.push(pickRandom(LN_AJAKAN_BELUM));
    parts.push(pickRandom(LN_PENUTUP_BELUM));
  }
  return parts.join(" ");
}

/* `mapel` dipakai untuk mendeteksi apakah perlu memakai versi khusus
   Literasi/Numerasi (kalimat lebih panjang & bervariasi, merujuk ke
   "Kompetensi/Bagian yang Kurang Dipahami") atau versi umum mapel lain. */
function generateCatatanOtomatis(status, tujuan, mapel){
  if(isLiterasiNumerasiMapel(mapel)){
    return generateCatatanLiterasiNumerasi(status, tujuan);
  }
  const list = status==="Sudah Mengumpulkan" ? CATATAN_PUJIAN_TEMPLATES : CATATAN_MOTIVASI_TEMPLATES;
  const tpl = pickRandom(list);
  const t = (tujuan||"").trim();
  const tujuanClause = t ? `, yaitu ${t}` : "";
  return tpl.replace("{tujuanClause}", tujuanClause);
}
function isiCatatanOtomatis(){
  const statusEl = document.getElementById("f_status");
  const tujuanEl = document.getElementById("f_tujuan");
  const catatanEl = document.getElementById("f_catatan");
  const mapelEl = document.getElementById("f_mapel");
  if(!statusEl || !catatanEl) return;
  catatanEl.value = generateCatatanOtomatis(statusEl.value, tujuanEl ? tujuanEl.value : "", mapelEl ? mapelEl.value : "");
}

/* [BARU] ---------- Bab: dukung isi manual (untuk mapel seperti Literasi/Numerasi
   yang tidak memakai penomoran Bab 1..10) ----------
   Pilihan "Lainnya (isi manual)…" pada select #f_pekan menampilkan input teks
   bebas #f_pekan_manual; nilai yang dipakai & disimpan tetap teks polos (mis.
   "Literasi"), sama seperti "Bab 1".."Bab 10" — jadi filter, laporan PDF, dan
   impor/ekspor Excel tetap bekerja apa adanya tanpa perlu diubah. */
function togglePekanManual(){
  const sel = document.getElementById("f_pekan");
  const manual = document.getElementById("f_pekan_manual");
  if(!sel || !manual) return;
  if(sel.value === "__manual__"){
    manual.hidden = false;
    manual.focus();
  }else{
    manual.hidden = true;
    manual.value = "";
  }
}
function getPekanValue(){
  const sel = document.getElementById("f_pekan");
  if(sel.value === "__manual__"){
    return document.getElementById("f_pekan_manual").value.trim();
  }
  return sel.value;
}
function setPekanValue(pekan){
  const sel = document.getElementById("f_pekan");
  const manual = document.getElementById("f_pekan_manual");
  const isPreset = [...sel.options].some(o=>o.value===pekan && o.value!=="__manual__");
  if(isPreset){
    sel.value = pekan;
    manual.hidden = true;
    manual.value = "";
  }else{
    sel.value = "__manual__";
    manual.hidden = false;
    manual.value = pekan || "";
  }
}

/* [BARU] ---------- Perlakuan khusus Mapel Literasi/Numerasi ----------
   Literasi & Numerasi tidak memakai konsep "Bab" seperti mapel lain, jadi:
   - Kolom Bab disembunyikan otomatis & nilainya diisi otomatis sama dengan
     nama Mapel (mis. "Literasi") supaya tetap konsisten dipakai di filter/laporan.
   - Label "Tujuan Materi" berubah jadi "Kompetensi/Bagian yang Kurang Dipahami"
     (kolom & data yang dipakai tetap sama persis, cuma label yang berubah),
     karena untuk Literasi/Numerasi guru mencatat kompetensi yang belum
     dikuasai anak, bukan tujuan materi per bab.
   autoFillBab=true dipakai saat guru mengetik Mapel (nilai Bab ikut diisi
   otomatis); autoFillBab=false dipakai saat memuat data untuk diedit (nilai
   Bab yang sudah tersimpan tidak boleh ditimpa, cukup tampilan yang disesuaikan). */
function isLiterasiNumerasiMapel(mapelValue){
  const v = String(mapelValue||"").trim().toLowerCase();
  return v === "literasi" || v === "numerasi";
}
function applyMapelSpecialFields(autoFillBab){
  const mapelInput = document.getElementById("f_mapel");
  const mapelVal = mapelInput ? mapelInput.value : "";
  const special = isLiterasiNumerasiMapel(mapelVal);
  const babWrap = document.getElementById("f_pekan_wrap");
  const tujuanLabel = document.getElementById("f_tujuan_label");
  const tujuanTextarea = document.getElementById("f_tujuan");
  if(babWrap) babWrap.hidden = special;
  if(special){
    if(tujuanLabel) tujuanLabel.textContent = "Kompetensi/Bagian yang Kurang Dipahami";
    if(tujuanTextarea) tujuanTextarea.placeholder = "cth. Belum lancar membaca suku kata berakhiran -ng (opsional)";
    if(autoFillBab){
      const trimmed = mapelVal.trim();
      const normalized = trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
      setPekanValue(normalized);
    }
  }else{
    if(tujuanLabel) tujuanLabel.textContent = "Tujuan Materi";
    if(tujuanTextarea) tujuanTextarea.placeholder = "cth. Siswa mampu menjumlahkan pecahan berpenyebut sama (opsional)";
  }
}

function resetForm(){
  STATE.editId = null;
  STATE.selectedNis = new Set();
  STATE.studentFilter = { q:"", lp:"" };
  const tf = $id("tugasForm");
  if(tf) tf.reset();
  setVal("f_id", "");
  setVal("f_tanggal", todayISO());
  setText("f_submit", "Simpan Data");
  setText("formTitle", "Form Pengumpulan Tugas");
  setHidden("editModeNote", true);
  const manualPekan = document.getElementById("f_pekan_manual");
  if(manualPekan){ manualPekan.value = ""; manualPekan.hidden = true; }
  applyMapelSpecialFields(false);
  const autoBelumWrap = document.getElementById("f_autoBelumWrap");
  if(autoBelumWrap) autoBelumWrap.hidden = false;
  const autoBelum = document.getElementById("f_autoBelum");
  if(autoBelum) autoBelum.checked = true;
  const autoBelumTotal = document.getElementById("autoBelumTotal");
  if(autoBelumTotal) autoBelumTotal.textContent = STATE.siswa.length;
  const search = document.getElementById("studentSearch");
  if(search) search.value = "";
  document.querySelectorAll("#lpFilter .chip").forEach(c=>c.classList.toggle("active", c.dataset.lp===""));
  renderStudentPicker();
}

document.addEventListener("change", (e)=>{
  if(e.target.classList && e.target.classList.contains("student-check")){
    const nis = e.target.value;
    if(STATE.editId){
      // edit mode: enforce single selection
      if(e.target.checked){ STATE.selectedNis = new Set([nis]); }
      else { STATE.selectedNis.delete(nis); }
    }else{
      if(e.target.checked) STATE.selectedNis.add(nis);
      else STATE.selectedNis.delete(nis);
    }
    renderStudentPicker();
  }
});

async function handleFormSubmit(e){
  e.preventDefault();
  if(STATE.selectedNis.size===0){ toast("Pilih minimal satu peserta didik."); return; }
  const pekanValue = getPekanValue();
  if(document.getElementById("f_pekan").value === "__manual__" && !pekanValue){
    toast("Isi kolom Bab secara manual (mis. Literasi, Numerasi).");
    return;
  }
  const common = {
    mapel: document.getElementById("f_mapel").value.trim(),
    tugas: document.getElementById("f_tugas").value.trim(),
    tujuan: document.getElementById("f_tujuan").value.trim(),
    pekan: pekanValue,
    tanggal: document.getElementById("f_tanggal").value,
    status: document.getElementById("f_status").value,
    catatan: document.getElementById("f_catatan").value.trim()
  };
  if(!common.mapel || !common.tugas || !common.tanggal){ toast("Lengkapi semua kolom wajib."); return; }

  const nisList = [...STATE.selectedNis];

  if(STATE.editId){
    const rec = { ...common, nis: nisList[0], id: STATE.editId };
    await idbPut("tugas", rec);
    await loadAll();
    toast("Data tugas diperbarui.");
  }else{
    /* [BARU] Auto-lengkapi: siswa yang TIDAK dipilih pada tugas yang sama
       (mapel+materi+bab+tanggal identik) otomatis dicatat Belum Mengumpulkan,
       supaya setiap tugas selalu mencakup seluruh siswa (mis. 17 siswa),
       tanpa harus menginput satu per satu. Siswa yang sebelumnya sudah punya
       entri untuk tugas ini (dari input sebelumnya) tidak akan ditimpa. */
    const norm = (v)=> String(v||"").trim().toLowerCase();
    const sameTugas = (t)=> norm(t.mapel)===norm(common.mapel) && norm(t.tugas)===norm(common.tugas)
      && t.pekan===common.pekan && t.tanggal===common.tanggal;
    const existingByNis = new Map(STATE.tugas.filter(sameTugas).map(t=>[t.nis, t]));

    for(const nis of nisList){
      const found = existingByNis.get(nis);
      if(found) await idbPut("tugas", { ...common, nis, id: found.id });
      else await idbPut("tugas", { ...common, nis });
    }

    let autoCount = 0;
    const autoBelumEl = document.getElementById("f_autoBelum");
    const autoBelum = autoBelumEl ? autoBelumEl.checked : true;
    if(autoBelum){
      for(const s of STATE.siswa){
        if(nisList.includes(s.nis)) continue;
        if(existingByNis.has(s.nis)) continue;
        await idbPut("tugas", { ...common, nis: s.nis, status: "Belum Mengumpulkan", catatan: common.catatan || generateCatatanOtomatis("Belum Mengumpulkan", common.tujuan, common.mapel) });
        autoCount++;
      }
    }

    await loadAll();
    toast(autoCount>0
      ? `Data tersimpan untuk ${nisList.length} siswa; ${autoCount} siswa lain otomatis ditandai Belum Mengumpulkan.`
      : `Data tugas tersimpan untuk ${nisList.length} siswa.`);
  }

  resetForm();
  populateMapelDatalist();
  if(STATE.view==="data") renderDataView();
  if(STATE.view==="dashboard") renderDashboard();
}

function editTugas(id){
  const t = STATE.tugas.find(x=>String(x.id)===String(id));
  if(!t) return;
  switchView("input");
  STATE.editId = id;
  STATE.selectedNis = new Set([t.nis]);
  STATE.studentFilter = { q:"", lp:"" };
  document.getElementById("f_id").value = id;
  document.getElementById("f_mapel").value = t.mapel;
  document.getElementById("f_tugas").value = t.tugas;
  document.getElementById("f_tujuan").value = t.tujuan||"";
  applyMapelSpecialFields(false);
  setPekanValue(t.pekan);
  document.getElementById("f_tanggal").value = t.tanggal;
  document.getElementById("f_status").value = t.status;
  document.getElementById("f_catatan").value = t.catatan||"";
  document.getElementById("f_submit").textContent = "Perbarui Data";
  document.getElementById("formTitle").textContent = "Edit Data Tugas";
  document.getElementById("editModeNote").hidden = false;
  const autoBelumWrap = document.getElementById("f_autoBelumWrap");
  if(autoBelumWrap) autoBelumWrap.hidden = true;
  const search = document.getElementById("studentSearch");
  if(search) search.value = "";
  document.querySelectorAll("#lpFilter .chip").forEach(c=>c.classList.toggle("active", c.dataset.lp===""));
  renderStudentPicker();
}
async function deleteTugas(id){
  const ok = await confirmDialog("Hapus data tugas ini? Tindakan tidak dapat dibatalkan.");
  if(!ok) return;
  await idbDelete("tugas", id);
  await loadAll();
  toast("Data tugas dihapus.");
  renderDataView();
  if(STATE.view==="dashboard") renderDashboard();
}

/* ---------- Data table view (filter/sort/paginate) ---------- */
function populateFilterSelects(){
  const mapelSel = document.getElementById("filterMapel");
  const cur1 = mapelSel.value;
  mapelSel.innerHTML = `<option value="">Semua Mapel</option>` + uniq(STATE.tugas.map(t=>t.mapel)).map(m=>`<option>${escapeHtml(m)}</option>`).join("");
  mapelSel.value = cur1;

  const siswaSel = document.getElementById("filterSiswa");
  const cur2 = siswaSel.value;
  siswaSel.innerHTML = `<option value="">Semua Peserta</option>` + STATE.siswa.map(s=>`<option value="${s.nis}">${escapeHtml(s.nama)}</option>`).join("");
  siswaSel.value = cur2;
}

function getFilteredSorted(opts){
  const ignoreStatus = opts && opts.ignoreStatus;
  const f = STATE.filters;
  let rows = STATE.tugas.map(t=>{
    const s = studentByNis(t.nis);
    return { ...t, nama: s?s.nama:"(siswa tidak ditemukan)", lp: s?s.lp:"" };
  });
  if(f.q){
    const q = f.q.toLowerCase();
    rows = rows.filter(r=> r.nama.toLowerCase().includes(q) || r.nis.includes(q) || r.mapel.toLowerCase().includes(q) || r.tugas.toLowerCase().includes(q));
  }
  if(f.pekan) rows = rows.filter(r=>r.pekan===f.pekan);
  if(f.mapel) rows = rows.filter(r=>r.mapel===f.mapel);
  if(f.siswa) rows = rows.filter(r=>String(r.nis)===String(f.siswa));
  if(f.status && !ignoreStatus) rows = rows.filter(r=>r.status===f.status);
  if(f.dari) rows = rows.filter(r=>r.tanggal >= f.dari);
  if(f.sampai) rows = rows.filter(r=>r.tanggal <= f.sampai);

  const { key, dir } = STATE.sort;
  rows.sort((a,b)=>{
    let va = a[key], vb = b[key];
    if(key==="no"){ va=a.id; vb=b.id; }
    if(typeof va === "string") va = va.toLowerCase();
    if(typeof vb === "string") vb = vb.toLowerCase();
    if(va<vb) return dir==="asc"?-1:1;
    if(va>vb) return dir==="asc"?1:-1;
    return 0;
  });
  return rows;
}

/* [BARU] Potong teks Tujuan Materi / Catatan di tabel Data Tugas supaya kolomnya tidak
   melebar — hanya beberapa kata dulu yang tampil, lalu bisa diklik untuk melihat teks
   lengkapnya lewat modal (lihat openTugasTextModal() & #tugasTextModal di index.html). */
function tugasCellRingkas(teks, id, field, maks){
  const t = String(teks || "").trim();
  if(!t) return "-";
  const batas = maks || 34;
  if(t.length <= batas) return escapeHtml(t);
  const pendek = t.slice(0, batas).trim() + "…";
  return `<button type="button" class="cell-clip-btn" onclick="openTugasTextModal('${id}','${field}')" title="Klik untuk lihat teks lengkap">${escapeHtml(pendek)}</button>`;
}
function openTugasTextModal(id, field){
  const r = STATE.tugas.find(x=>x.id===id);
  if(!r) return;
  const isTujuan = field === "tujuan";
  setText("tugasTextModalTitle", isTujuan ? "Tujuan Materi" : "Catatan");
  setText("tugasTextModalSub", `${r.nama || "-"} — ${r.mapel || "-"} — ${fmtDate(r.tanggal)}`);
  setText("tugasTextModalBody", (isTujuan ? r.tujuan : r.catatan) || "(tidak ada isian)");
  setHidden("tugasTextModal", false);
}
function closeTugasTextModal(){ setHidden("tugasTextModal", true); }

function renderDataView(){
  populateFilterSelects();
  const rows = getFilteredSorted();
  document.getElementById("resultCount").textContent = `${rows.length} data`;

  // [BARU] Ringkasan jumlah tugas "Belum Mengumpulkan" yang bisa diklik.
  // Mengikuti filter aktif lainnya (cari, mapel, bab, siswa, tanggal) TAPI mengabaikan filter status,
  // supaya angkanya selalu menunjukkan sisa tugas yang belum dikerjakan sesuai konteks filter saat ini.
  const belumRows = getFilteredSorted({ ignoreStatus: true }).filter(r=>r.status==="Belum Mengumpulkan");
  // [FIX] Angka total "Belum Mengumpulkan" TANPA filter apapun — sama persis dengan
  // angka yang ditampilkan pada kartu "Belum Mengumpulkan" di Dasbor. Dipakai untuk
  // memberi keterangan bila angka di atas berbeda karena masih ada filter lain yang aktif,
  // supaya tidak terlihat seperti data "tidak sinkron".
  const belumTotalGlobal = STATE.tugas.filter(t=>t.status==="Belum Mengumpulkan").length;
  const belumBtn = document.getElementById("belumSummaryBtn");
  if(belumBtn){
    const f = STATE.filters;
    const adaFilterLain = !!(f.q || f.pekan || f.mapel || f.siswa || f.dari || f.sampai);
    belumBtn.textContent = (adaFilterLain && belumRows.length !== belumTotalGlobal)
      ? `${belumRows.length} Belum Dikerjakan (dari ${belumTotalGlobal} total — filter lain aktif)`
      : `${belumRows.length} Belum Dikerjakan`;
    belumBtn.classList.toggle("active", STATE.filters.status==="Belum Mengumpulkan");
  }

  const totalPages = Math.max(1, Math.ceil(rows.length/STATE.pageSize));
  if(STATE.page > totalPages) STATE.page = totalPages;
  const start = (STATE.page-1)*STATE.pageSize;
  const pageRows = rows.slice(start, start+STATE.pageSize);

  const tbody = document.querySelector("#mainTable tbody");
  tbody.innerHTML = pageRows.length? pageRows.map((r,i)=>`
    <tr>
      <td>${start+i+1}</td>
      <td>${r.nis}</td>
      <td>${escapeHtml(r.nama)}</td>
      <td>${r.lp}</td>
      <td>${escapeHtml(r.mapel)}</td>
      <td>${escapeHtml(r.tugas)}</td>
      <td>${tugasCellRingkas(r.tujuan, r.id, "tujuan", 34)}</td>
      <td>${r.pekan}</td>
      <td class="mono">${fmtDate(r.tanggal)}</td>
      <td>${statusBadge(r.status)}</td>
      <td>${tugasCellRingkas(r.catatan, r.id, "catatan", 34)}</td>
      <td><div class="row-actions">
        <button class="wa" onclick="shareWaTugas('${r.id}')" title="Kirim info tugas ini ke WA orang tua">WA</button>
        <button onclick="editTugas('${r.id}')">Edit</button>
        <button class="danger" onclick="deleteTugas('${r.id}')">Hapus</button>
      </div></td>
    </tr>`).join("") : `<tr><td colspan="12" class="muted" style="text-align:center;padding:24px;">Tidak ada data yang cocok dengan filter.</td></tr>`;

  renderPagination(totalPages);
}
function renderPagination(totalPages){
  const el = document.getElementById("pagination");
  if(totalPages<=1){ el.innerHTML=""; return; }
  let html = "";
  for(let i=1;i<=totalPages;i++){
    html += `<button class="${i===STATE.page?'active':''}" data-page="${i}">${i}</button>`;
  }
  el.innerHTML = html;
  el.querySelectorAll("button").forEach(b=>b.onclick=()=>{ STATE.page = +b.dataset.page; renderDataView(); });
}

/* ---------- Siswa view ---------- */
/* [BARU] Filter Bulan pada Data Siswa — mempengaruhi kolom Tugas Tercatat/Sudah/Belum
   di tabel ini DAN isi Laporan PDF per siswa (lihat exportSiswaPdf()). */
function monthLabel(ym){
  if(!ym) return "";
  const [y,m] = ym.split("-");
  const d = new Date(Number(y), Number(m)-1, 1);
  return d.toLocaleDateString("id-ID",{month:"long",year:"numeric"});
}
function getSiswaBulanFilter(){
  const el = document.getElementById("filterSiswaBulan");
  return el ? el.value : "";
}
function populateSiswaBulanFilter(){
  const sel = document.getElementById("filterSiswaBulan");
  if(!sel) return;
  const cur = sel.value;
  const months = uniq(STATE.tugas.map(t=>(t.tanggal||"").slice(0,7)).filter(Boolean)).sort().reverse();
  sel.innerHTML = `<option value="">Semua Bulan</option>` + months.map(m=>`<option value="${m}">${monthLabel(m)}</option>`).join("");
  sel.value = months.includes(cur) ? cur : "";
}
/* [BARU] Filter Mata Pelajaran pada Data Siswa — sama seperti Filter Bulan,
   mempengaruhi kolom Tugas Tercatat/Sudah/Belum DAN isi Laporan PDF per siswa.
   [DIUBAH] Kini bisa memilih LEBIH DARI SATU mapel sekaligus lewat checklist
   (sebelumnya <select> hanya bisa 1 pilihan). Array kosong = semua mapel. */
function getSiswaMapelFilter(){
  return [...STATE.siswaMapelFilter];
}
function populateSiswaMapelFilter(){
  const list = document.getElementById("filterSiswaMapelList");
  if(!list) return;
  const mapels = uniq(STATE.tugas.map(t=>t.mapel)).sort((a,b)=>a.localeCompare(b,"id"));
  // Buang pilihan mapel yang sudah tidak ada lagi di data tugas
  for(const m of [...STATE.siswaMapelFilter]){ if(!mapels.includes(m)) STATE.siswaMapelFilter.delete(m); }
  list.innerHTML = mapels.length ? mapels.map(m=>`
    <label class="multi-select-row">
      <input type="checkbox" data-mapel="${escapeHtml(m)}" ${STATE.siswaMapelFilter.has(m)?"checked":""}>
      <span>${escapeHtml(m)}</span>
    </label>`).join("") : `<div class="multi-select-empty">Belum ada data mapel.</div>`;
  updateSiswaMapelFilterBtn();
}
function updateSiswaMapelFilterBtn(){
  const btn = document.getElementById("filterSiswaMapelBtn");
  if(!btn) return;
  const n = STATE.siswaMapelFilter.size;
  btn.textContent = n===0 ? "Semua Mapel" : n===1 ? [...STATE.siswaMapelFilter][0] : `${n} Mapel dipilih`;
  btn.classList.toggle("active", n>0);
}
/* [BARU] Filter Bab pada Data Siswa — supaya orang tua bisa lebih fokus melihat/menerima
   laporan progres tugas khusus satu Bab tertentu saja. Sama seperti Filter Bulan & Mapel,
   filter ini mempengaruhi kolom Tugas Tercatat/Sudah/Belum DAN isi Laporan PDF per siswa. */
function getSiswaBabFilter(){
  const el = document.getElementById("filterSiswaBab");
  return el ? el.value : "";
}
function renderSiswaView(){
  populateSiswaBulanFilter();
  populateSiswaMapelFilter();
  const bulan = getSiswaBulanFilter();
  const mapel = getSiswaMapelFilter();
  const bab = getSiswaBabFilter();
  document.getElementById("siswaCount").textContent = `${STATE.siswa.length} siswa`;
  const tbody = document.querySelector("#siswaTable tbody");
  tbody.innerHTML = STATE.siswa.length ? STATE.siswa.map((s,i)=>{
    let tugasSiswa = STATE.tugas.filter(t=>String(t.nis)===String(s.nis));
    if(bulan) tugasSiswa = tugasSiswa.filter(t=>(t.tanggal||"").startsWith(bulan));
    if(mapel.length) tugasSiswa = tugasSiswa.filter(t=>mapel.includes(t.mapel));
    if(bab) tugasSiswa = tugasSiswa.filter(t=>t.pekan===bab);
    const sudah = tugasSiswa.filter(t=>t.status==="Sudah Mengumpulkan").length;
    const belum = tugasSiswa.length - sudah;
    /* [BARU] Nama, L/P, dan No. HP Ortu kini bisa diedit langsung di tabel ini,
       plus tombol Hapus per baris (lihat deleteSiswa()). */
    return `<tr>
      <td>${i+1}</td>
      <td class="mono">${s.nis}</td>
      <td><input type="text" data-nis="${s.nis}" class="siswa-nama-input" value="${escapeHtml(s.nama)}" style="width:100%;min-width:160px;padding:6px 8px;border:1px solid var(--border);border-radius:6px;background:var(--cream-1);color:var(--text);"></td>
      <td><select data-nis="${s.nis}" class="siswa-lp-input" style="padding:6px 4px;border:1px solid var(--border);border-radius:6px;background:var(--cream-1);color:var(--text);">
        <option value="L" ${s.lp==="L"?"selected":""}>L</option>
        <option value="P" ${s.lp==="P"?"selected":""}>P</option>
      </select></td>
      <td><input type="text" data-nis="${s.nis}" class="siswa-hp-input" value="${escapeHtml(s.hpOrtu||"")}" placeholder="08xxxxxxxxxx" style="width:100%;min-width:130px;padding:6px 8px;border:1px solid var(--border);border-radius:6px;background:var(--cream-1);color:var(--text);"></td>
      <td>${tugasSiswa.length}</td>
      <td>${sudah ? `<button type="button" class="siswa-status-link siswa-status-good" onclick="gotoSiswaTugasFilter('${s.nis}','Sudah Mengumpulkan')" title="Lihat &amp; edit tugas yang sudah dikumpulkan siswa ini">${sudah}</button>` : `<span class="muted">0</span>`}</td>
      <td>${belum ? `<button type="button" class="siswa-status-link siswa-status-bad" onclick="gotoSiswaTugasFilter('${s.nis}','Belum Mengumpulkan')" title="Lihat &amp; edit tugas yang belum dikumpulkan siswa ini — langsung menuju mata pelajaran terkait">${belum}</button>` : `<span class="muted">0</span>`}</td>
      <td><div class="row-actions">
        <button onclick="exportSiswaPdf('${s.nis}')" title="Tampilkan preview daftar tugas sesuai filter Bulan/Mapel/Bab, lalu unduh PDF & buka WA orang tua siswa ini">Laporan PDF</button>
        <button class="danger" onclick="deleteSiswa('${s.nis}')">Hapus</button>
      </div></td>
    </tr>`;
  }).join("") : `<tr><td colspan="9" class="muted" style="text-align:center;padding:20px;">Belum ada data siswa.</td></tr>`;
}

/* [BARU] Klik angka Sudah/Belum pada Data Siswa -> lompat ke Data Tugas, sudah terfilter
   ke siswa & status yang diklik. Filter Bulan/Mapel/Bab yang sedang aktif di Data Siswa
   ikut dibawa (kalau Mapel yang dipilih persis satu), supaya guru langsung diarahkan ke
   mata pelajaran yang sesuai dan bisa langsung mengedit tanpa mencari-cari lagi. */
function gotoSiswaTugasFilter(nis, status){
  const bulan = getSiswaBulanFilter();
  const mapelAktif = getSiswaMapelFilter();
  const mapelSingle = mapelAktif.length===1 ? mapelAktif[0] : "";
  const bab = getSiswaBabFilter();
  let dari = "", sampai = "";
  if(bulan){
    const [y,m] = bulan.split("-").map(Number);
    dari = `${bulan}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    sampai = `${bulan}-${String(lastDay).padStart(2,"0")}`;
  }
  STATE.filters = { q:"", pekan:bab, mapel:mapelSingle, siswa:String(nis), status, dari, sampai };
  STATE.page = 1;
  switchView("data");
  const searchBox = document.getElementById("searchBox");
  if(searchBox) searchBox.value = "";
  const pekanSel = document.getElementById("filterPekan");
  if(pekanSel) pekanSel.value = bab;
  const mapelSel = document.getElementById("filterMapel");
  if(mapelSel) mapelSel.value = mapelSingle;
  const siswaSel = document.getElementById("filterSiswa");
  if(siswaSel) siswaSel.value = String(nis);
  const statusSel = document.getElementById("filterStatus");
  if(statusSel) statusSel.value = status;
  const dariEl = document.getElementById("filterDariTgl");
  if(dariEl) dariEl.value = dari;
  const sampaiEl = document.getElementById("filterSampaiTgl");
  if(sampaiEl) sampaiEl.value = sampai;
}

/* [BARU] Simpan perubahan Nama/L-P/No. HP Ortu untuk semua baris Data Siswa sekaligus.
   Kalau Nama diubah, seluruh entri Tugas milik siswa itu juga ikut diantre ulang ke Google
   Sheet — supaya kolom "nama" yang tersimpan di tab Tugas (dicantumkan agar Sheet mudah
   dibaca manusia) ikut terbarui, tidak tertinggal dengan nama yang lama. */
async function saveSiswaChanges(){
  const nisList = [...document.querySelectorAll(".siswa-nama-input")].map(inp=>inp.dataset.nis);
  const renamedNis = [];
  for(const nis of nisList){
    const s = studentByNis(nis);
    if(!s) continue;
    const namaInp = document.querySelector(`.siswa-nama-input[data-nis="${CSS.escape(nis)}"]`);
    const lpInp = document.querySelector(`.siswa-lp-input[data-nis="${CSS.escape(nis)}"]`);
    const hpInp = document.querySelector(`.siswa-hp-input[data-nis="${CSS.escape(nis)}"]`);
    const namaBaru = namaInp ? (namaInp.value.trim() || s.nama) : s.nama;
    if(namaInp && namaBaru !== s.nama) renamedNis.push(nis);
    s.nama = namaBaru;
    if(lpInp) s.lp = lpInp.value;
    if(hpInp) s.hpOrtu = hpInp.value.trim();
    await idbPut("siswa", s);
  }
  // [BARU] Kirim ulang entri Tugas milik siswa yang namanya berubah, agar kolom "nama" di tab
  // Tugas pada Google Sheet ikut terbarui (bukan cuma tab Siswa).
  for(const nis of renamedNis){
    const tugasSiswa = STATE.tugas.filter(t=>String(t.nis)===String(nis));
    for(const t of tugasSiswa) queueSync("tugas", "upsert", t);
  }
  await loadAll();
  populateStudentSelect();
  populateFilterSelects();
  renderSiswaView();
  toast("Perubahan data siswa berhasil disimpan.");
}

/* [BARU] Tambah siswa baru */
function toggleAddSiswaForm(show){
  const panel = document.getElementById("addSiswaForm");
  if(!panel) return;
  const willShow = show===undefined ? panel.hidden : show;
  panel.hidden = !willShow;
  if(willShow){
    document.getElementById("as_nis").value = "";
    document.getElementById("as_nama").value = "";
    document.getElementById("as_lp").value = "L";
    document.getElementById("as_hp").value = "";
    document.getElementById("as_nis").focus();
  }
}
async function submitAddSiswa(e){
  e.preventDefault();
  const nis = document.getElementById("as_nis").value.trim();
  const nama = document.getElementById("as_nama").value.trim();
  const lp = document.getElementById("as_lp").value;
  const hpOrtu = document.getElementById("as_hp").value.trim();
  if(!nis || !nama){ toast("NIS dan Nama wajib diisi."); return; }
  if(studentByNis(nis)){ toast("NIS tersebut sudah terdaftar."); return; }
  await idbPut("siswa", { nis, nama, lp, hpOrtu });
  await loadAll();
  populateStudentSelect();
  populateFilterSelects();
  renderSiswaView();
  toggleAddSiswaForm(false);
  toast("Siswa baru berhasil ditambahkan.");
}
/* [UBAH] Hapus siswa — sekarang ikut menghapus semua data tugas milik siswa tsb (cascade),
   supaya tidak menyisakan tugas "yatim" (tanpa nama, muncul sebagai "(siswa tidak
   ditemukan)"). Penghapusan tugas ikut diantrekan ke Google Sheet seperti biasa. */
async function deleteSiswa(nis){
  const s = studentByNis(nis);
  const relatedTugas = (STATE.tugas||[]).filter(t=>String(t.nis)===String(nis));
  const warnTugas = relatedTugas.length ? ` Beserta ${relatedTugas.length} data tugas milik siswa ini.` : "";
  const ok = await confirmDialog(`Hapus data siswa "${s?s.nama:nis}"?${warnTugas} Tindakan ini tidak bisa dibatalkan.`);
  if(!ok) return;
  await idbDelete("siswa", nis);
  for(const t of relatedTugas){
    await idbDelete("tugas", t.id);
  }
  await loadAll();
  populateStudentSelect();
  populateFilterSelects();
  renderSiswaView();
  toast(relatedTugas.length ? `Data siswa dan ${relatedTugas.length} data tugas terkait dihapus.` : "Data siswa dihapus.");
}
/* [BARU] Ekspor Data Siswa ke Excel */
/* [UBAH] Ekspor Data Siswa ke Excel — kini menyertakan judul sekolah & Tahun Pelajaran/
   Semester di baris atas (siap cetak/print), plus pengaturan halaman (orientasi & fit-to-
   width) supaya rapi saat langsung di-print dari Excel/Google Sheets. */
function exportSiswaXlsx(){
  if(!window.XLSX){ toast("Modul Excel belum siap."); return; }
  const set = getSchoolSettings();
  const aoa = [];
  aoa.push([SCHOOL.nama.toUpperCase()]);
  aoa.push(["MASTER DATA PESERTA DIDIK"]);
  aoa.push([`Tahun Pelajaran ${set.tahun} — Semester ${set.semester}`]);
  aoa.push([]);
  aoa.push(["No","NIS","Nama Peserta Didik","L/P","No. HP Ortu"]);
  STATE.siswa.forEach((s,i)=> aoa.push([i+1, s.nis, s.nama, s.lp, s.hpOrtu||""]));

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = [{wch:5},{wch:16},{wch:30},{wch:6},{wch:18}];
  ws["!margins"] = { left:0.4, right:0.4, top:0.5, bottom:0.5, header:0.2, footer:0.2 };
  ws["!pageSetup"] = { orientation:"portrait", fitToWidth:1, fitToHeight:0, paperSize:9 };
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Data Siswa");
  XLSX.writeFile(wb, `Data-Siswa-SDIT-Muhammadiyah-${todayISO()}.xlsx`);
  toast("Data siswa berhasil diekspor ke Excel.");
}
/* [BARU] Unduh template Excel untuk impor Data Siswa. SENGAJA dibuat tanpa judul/blok
   dekoratif — file ini langsung dibaca ulang oleh importSiswaXlsx() yang mengasumsikan
   baris 1 adalah header kolom, jadi harus tetap bersih supaya proses impor tidak salah baca. */
function downloadSiswaTemplate(){
  if(!window.XLSX){ toast("Modul Excel belum siap."); return; }
  const data = [
    { NIS:"3160169851", Nama:"CONTOH NAMA SISWA", "L/P":"L", "No. HP Ortu":"081234567890" }
  ];
  const ws = XLSX.utils.json_to_sheet(data);
  ws["!cols"] = [{wch:16},{wch:30},{wch:6},{wch:18}];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Template Data Siswa");
  XLSX.writeFile(wb, `Template-Data-Siswa-SDIT-Muhammadiyah.xlsx`);
  toast("Template Excel berhasil diunduh.");
}
/* [BARU] Impor/perbarui Data Siswa massal dari Excel (mengikuti kolom template) */
async function importSiswaXlsx(file){
  if(!window.XLSX){ toast("Modul Excel belum siap."); return; }
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type:"array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { defval:"" });
  let count = 0;
  for(const row of rows){
    const nis = String(row.NIS||row.nis||"").trim();
    if(!nis) continue;
    const nama = String(row.Nama||row.nama||"Tanpa Nama").trim();
    const lp = String(row["L/P"]||row.lp||"L").toUpperCase().startsWith("P")?"P":"L";
    const existing = studentByNis(nis);
    const hpOrtuRaw = row["No. HP Ortu"]??row["No HP Ortu"]??row.hpOrtu??row.HP??"";
    const hpOrtu = String(hpOrtuRaw).trim() || (existing?existing.hpOrtu||"":"");
    await idbPut("siswa", { nis, nama, lp, hpOrtu });
    count++;
  }
  await loadAll();
  populateStudentSelect();
  populateFilterSelects();
  renderSiswaView();
  toast(`${count} data siswa berhasil diimpor.`);
  if(STATE.view==="data") renderDataView();
  if(STATE.view==="dashboard") renderDashboard();
}

/* ---------- Pengaturan / Guru ---------- */
/* [BARU] ---------- Tanda Tangan Digital (Pengaturan) ----------
   Gambar tanda tangan (PNG/JPG) disimpan sbg base64 dataURL di localStorage lalu
   otomatis ditempelkan lewat doc.addImage() di blok tanda tangan pada SEMUA menu
   Ekspor PDF (lihat drawSignatureImage()) — guru tidak perlu lagi tanda tangan
   basah di kertas kalau sudah mengunggah tanda tangannya di sini. */
const TTD_KEY = "sditmuha_ttd_digital";
const TTD_RATIO_KEY = "sditmuha_ttd_ratio";
function getSignatureData(){
  const dataUrl = localStorage.getItem(TTD_KEY) || "";
  if(!dataUrl) return null;
  const ratio = Number(localStorage.getItem(TTD_RATIO_KEY)) || 2.4;
  return { dataUrl, ratio };
}
/* Membaca berkas gambar yang diunggah, memperkecilnya (maks lebar 500px) lewat
   canvas supaya hemat penyimpanan localStorage, lalu menyimpannya sbg PNG base64. */
function saveSignatureFile(file){
  if(!file) return;
  if(!/^image\/(png|jpe?g)$/i.test(file.type)){ toast("Format tanda tangan harus PNG atau JPG."); return; }
  const reader = new FileReader();
  reader.onload = ()=>{
    const img = new Image();
    img.onload = ()=>{
      const maxW = 500;
      const scale = Math.min(1, maxW/img.naturalWidth);
      const w = Math.max(1, Math.round(img.naturalWidth*scale));
      const h = Math.max(1, Math.round(img.naturalHeight*scale));
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, w, h);
      const dataUrl = canvas.toDataURL("image/png");
      try{
        localStorage.setItem(TTD_KEY, dataUrl);
        localStorage.setItem(TTD_RATIO_KEY, String(w/h));
        renderSignaturePreview();
        toast("Tanda tangan digital berhasil disimpan.");
      }catch(e){
        toast("Gagal menyimpan tanda tangan (kemungkinan ukuran gambar terlalu besar). Coba gambar lain yang lebih kecil.");
      }
    };
    img.onerror = ()=> toast("Gagal membaca gambar tanda tangan. Pastikan berkas berupa gambar PNG/JPG yang valid.");
    img.src = reader.result;
  };
  reader.onerror = ()=> toast("Gagal membaca berkas tanda tangan.");
  reader.readAsDataURL(file);
}
async function clearSignature(){
  const ok = await confirmDialog("Hapus tanda tangan digital tersimpan? Ekspor PDF berikutnya tidak akan menampilkan tanda tangan sampai diunggah ulang.");
  if(!ok) return;
  localStorage.removeItem(TTD_KEY);
  localStorage.removeItem(TTD_RATIO_KEY);
  renderSignaturePreview();
  toast("Tanda tangan digital dihapus.");
}
function renderSignaturePreview(){
  const wrap = document.getElementById("ttdPreviewWrap");
  if(!wrap) return;
  const img = document.getElementById("ttdPreviewImg");
  const empty = document.getElementById("ttdPreviewEmpty");
  const clearBtn = document.getElementById("ttdClearBtn");
  const sig = getSignatureData();
  if(sig){
    if(img){ img.src = sig.dataUrl; img.hidden = false; }
    if(empty) empty.hidden = true;
    if(clearBtn) clearBtn.hidden = false;
  } else {
    if(img){ img.hidden = true; img.removeAttribute("src"); }
    if(empty) empty.hidden = false;
    if(clearBtn) clearBtn.hidden = true;
  }
}
/* [BARU] Dipakai di semua fungsi Ekspor PDF: menempelkan gambar tanda tangan digital
   (kalau sudah diunggah di Pengaturan) tepat di atas nama guru pada blok tanda tangan
   kanan-bawah. Aman dipanggil walau tanda tangan belum diisi (tidak melakukan apa-apa,
   sehingga PDF tetap menampilkan kolom kosong seperti sebelumnya untuk tanda tangan basah). */
function drawSignatureImage(doc, pageW, topY, maxHeight){
  const sig = getSignatureData();
  if(!sig) return;
  const h = Math.min(maxHeight || 46, 46);
  const w = Math.min(150, h*sig.ratio);
  try{ doc.addImage(sig.dataUrl, "PNG", pageW-40-w, topY, w, h); }catch(e){ console.warn("Gagal menempelkan tanda tangan digital ke PDF:", e); }
}

function renderPengaturan(){
  /* [BARU] Data Guru / Kontak kini dibatasi hanya 1 guru (No + Nama Guru saja, nomor HP
     dihapus dari tabel ini). Jika ada sisa data guru lama (mis. dari backup lawas dengan
     banyak kontak), hanya guru pertama yang ditampilkan & dipakai untuk cetak. */
  const guruSatu = STATE.guru.slice(0,1);
  const tbody = document.querySelector("#guruTable tbody");
  /* [BARU] Contoh nama guru ditampilkan sebagai placeholder (abu-abu/samar) memakai
     atribut HTML placeholder, bukan nilai asli — supaya kolom tetap kosong sampai
     guru mengisi namanya sendiri. */
  /* [BARU] Input nama guru dibungkus ".autocomplete-field" supaya daftar riwayat
     ketikan (".autocomplete-list") bisa ditampilkan tepat di bawah kolom. */
  tbody.innerHTML = guruSatu.map((g,i)=>`
    <tr>
      <td>${i+1}</td>
      <td>
        <div class="autocomplete-field">
          <input type="text" data-gid="${g.id}" class="guru-name-input" value="${escapeHtml(g.nama)}" placeholder="cth. Agung Surya Permadi, S.Pd.I" autocomplete="off" style="width:100%;padding:6px 8px;border:1px solid var(--border);border-radius:6px;background:var(--cream-1);color:var(--text);">
          <div class="autocomplete-list" hidden></div>
        </div>
      </td>
    </tr>`).join("");
  wireGuruNameAutocomplete();

  /* [BARU] "Nama Guru untuk Cetak" otomatis memakai satu-satunya guru yang ada. */
  const sel = document.getElementById("printGuruSelect");
  const savedGuru = localStorage.getItem("sditmuha_print_guru") || "";
  sel.innerHTML = `<option value="">(Tidak ditampilkan)</option>` + guruSatu.map(g=>`<option value="${g.id}">${escapeHtml(g.nama)}</option>`).join("");
  sel.value = savedGuru || (guruSatu[0] ? String(guruSatu[0].id) : "");
  if(!savedGuru && guruSatu[0]) localStorage.setItem("sditmuha_print_guru", String(guruSatu[0].id));
  sel.onchange = ()=> localStorage.setItem("sditmuha_print_guru", sel.value);

  /* [BARU] Muat Pengaturan Kelas & Sekolah (Kelas, Tahun Pelajaran, Semester) */
  const set = getSchoolSettings();
  const kelasEl = document.getElementById("set_kelas");
  const tahunEl = document.getElementById("set_tahun");
  const semesterEl = document.getElementById("set_semester");
  if(kelasEl) kelasEl.value = set.kelas;
  if(tahunEl) tahunEl.value = set.tahun;
  if(semesterEl) semesterEl.value = set.semester;

  renderSignaturePreview(); // [BARU] pratinjau Tanda Tangan Digital
}
async function saveGuruNames(){
  const inputs = document.querySelectorAll(".guru-name-input");
  for(const inp of inputs){
    /* [PERBAIKAN] SEBELUMNYA dipaksa jadi angka lewat "+inp.dataset.gid" — cocok selama id
       guru memang angka (seed lama), tapi begitu id-nya dirapikan jadi teks ("guru-1", lihat
       migrateGuruIdTypes()) hasil "+" jadi NaN dan baris guru TIDAK PERNAH ketemu, sehingga
       perubahan nama guru diam-diam gagal tersimpan/tersinkron. Sekarang dibandingkan sebagai
       teks apa adanya, cocok untuk id angka lama maupun teks yang baru. */
    const id = inp.dataset.gid;
    const g = STATE.guru.find(x=>String(x.id)===String(id));
    if(g){
      const namaBaru = inp.value.trim() || g.nama;
      g.nama = namaBaru;
      await idbPut("guru", g);
      addGuruNameToHistory(namaBaru); // [BARU] simpan ke riwayat untuk autocomplete berikutnya
    }
  }
  await loadAll();
  renderPengaturan();
  toast("Nama guru disimpan.");
}

/* ---------- PDF Export ---------- */
/* [BARU] Mini grafik doughnut (Sudah vs Belum) untuk disematkan di Laporan PDF per siswa.
   Dibuat di canvas lepas (tidak ditempel ke DOM) dengan animation:false supaya
   toDataURL() bisa langsung dipakai tanpa menunggu proses gambar Chart.js selesai. */
function renderMiniDoughnutDataUrl(sudah, belum, sizePx){
  if(!window.Chart) return null;
  sizePx = sizePx || 240;
  const canvas = document.createElement("canvas");
  canvas.width = sizePx; canvas.height = sizePx;
  const total = sudah + belum;
  const data = total ? [sudah, belum] : [1, 0];
  const colors = total ? ["#155A94", "#B3441E"] : ["#DDD8C4", "#DDD8C4"];
  let chart;
  try{
    chart = new Chart(canvas, {
      type:"doughnut",
      data:{ labels:["Sudah","Belum"], datasets:[{ data, backgroundColor:colors, borderWidth:0 }] },
      options:{ responsive:false, animation:false, cutout:"64%", plugins:{ legend:{display:false}, tooltip:{enabled:false} } }
    });
    const url = canvas.toDataURL("image/png", 1.0);
    chart.destroy();
    return url;
  }catch(e){
    if(chart) chart.destroy();
    return null;
  }
}

async function loadLogoBase64(){
  if(loadLogoBase64._cache) return loadLogoBase64._cache;
  return new Promise((resolve)=>{
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = ()=>{
      const c = document.createElement("canvas");
      c.width = img.width; c.height = img.height;
      c.getContext("2d").drawImage(img,0,0);
      try{
        const data = c.toDataURL("image/png");
        loadLogoBase64._cache = data;
        resolve(data);
      }catch(e){ resolve(null); }
    };
    img.onerror = ()=>resolve(null);
    img.src = "icons/logo.png";
  });
}

/* [BARU] Tambahkan "Halaman X dari Y" di kanan-bawah tiap halaman PDF — dipakai oleh
   semua fungsi ekspor PDF supaya laporan yang lebih dari 1 halaman tetap rapi & jelas
   urutannya saat dicetak. */
function addPageNumbers_(doc){
  const total = doc.internal.getNumberOfPages();
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  for(let i=1;i<=total;i++){
    doc.setPage(i);
    doc.setFont("helvetica","normal");
    doc.setFontSize(8);
    doc.setTextColor(140,140,140);
    doc.text(`Halaman ${i} dari ${total}`, pageW-40, pageH-16, { align:"right" });
  }
}

async function exportPdf(){
  const rows = getFilteredSorted();
  if(!window.jspdf){ toast("Modul PDF belum siap, coba lagi."); return; }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation:"landscape", unit:"pt", format:"a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const logo = await loadLogoBase64();
  const set = getSchoolSettings(); /* [BARU] Tahun Pelajaran / Semester */

  let y = 40;
  if(logo){
    try{ doc.addImage(logo, "PNG", 40, 24, 50, 50); }catch(e){}
  }
  doc.setFont("helvetica","bold");
  doc.setFontSize(13);
  doc.setTextColor(12,78,48);
  doc.text(SCHOOL.nama.toUpperCase(), pageWidth/2, 38, { align:"center" });
  doc.setFontSize(15);
  doc.setTextColor(20,20,20);
  doc.text("CATATAN PENGUMPULAN TUGAS SISWA", pageWidth/2, 58, { align:"center" });
  doc.setFont("helvetica","normal");
  doc.setFontSize(10.5);
  doc.setTextColor(90,90,90);
  doc.text(`Tahun Pelajaran ${set.tahun} — Semester ${set.semester}`, pageWidth/2, 74, { align:"center" });
  doc.setDrawColor(201,162,39);
  doc.setLineWidth(1.4);
  doc.line(40, 86, pageWidth-40, 86);

  const body = rows.map((r,i)=>[
    i+1, r.nis, r.nama, r.lp, r.mapel, r.tugas, r.tujuan||"-", r.pekan, fmtDate(r.tanggal), r.status, r.catatan||"-"
  ]);

  doc.autoTable({
    startY: 96,
    head: [["No","NIS","Nama","L/P","Mapel","Materi","Tujuan Materi","Bab","Tanggal","Status","Catatan"]],
    body,
    styles:{ fontSize:8.5, cellPadding:5, textColor:[30,30,30] },
    headStyles:{ fillColor:[12,78,48], textColor:255, fontStyle:"bold" },
    alternateRowStyles:{ fillColor:[244,240,228] },
    columnStyles:{ 0:{cellWidth:26}, 3:{cellWidth:28}, 7:{cellWidth:50}, 8:{cellWidth:60}, 9:{cellWidth:80} },
    margin:{left:40,right:40},
    didDrawPage: ()=>{}
  });

  const finalY = doc.lastAutoTable.finalY + 22;
  const sudah = rows.filter(r=>r.status==="Sudah Mengumpulkan").length;
  const belum = rows.length - sudah;
  const gid = document.getElementById("printGuruSelect")?.value;
  const guru = STATE.guru.find(g=>String(g.id)===String(gid));

  doc.setFontSize(9.5);
  doc.setTextColor(40,40,40);
  let fy = finalY;
  if(fy > doc.internal.pageSize.getHeight()-130){ doc.addPage(); fy = 50; }
  doc.text(`Jumlah Data: ${rows.length}`, 40, fy);
  doc.text(`Sudah Mengumpulkan: ${sudah}`, 200, fy);
  doc.text(`Belum Mengumpulkan: ${belum}`, 380, fy);

  const printDate = new Date().toLocaleDateString("id-ID",{day:"2-digit",month:"long",year:"numeric"});
  const pageW = doc.internal.pageSize.getWidth();

  /* [BARU] Blok tanda tangan: hanya Guru Kelas (tanda tangan Kepala Sekolah dihapus
     dari seluruh ekspor sesuai permintaan). */
  const sigY = fy + 30;
  doc.text(`Cirebon, ${printDate}`, pageW-40, sigY, { align:"right" });
  doc.text("Guru Kelas", pageW-40, sigY+14, { align:"right" });
  drawSignatureImage(doc, pageW, sigY+18, 46);
  doc.text(guru ? guru.nama : "(______________________)", pageW-40, sigY+70, { align:"right" });

  addPageNumbers_(doc); // [BARU] "Halaman X dari Y" di kanan-bawah tiap halaman, biar rapi kalau tercetak >1 halaman

  doc.save(`Catatan-Tugas-SDIT-Muhammadiyah-${todayISO()}.pdf`);
  toast("PDF berhasil diunduh.");
}

/* [BARU] Cetak kini otomatis menyertakan Tahun Pelajaran, Semester, dan
   tanda tangan Guru Kelas sesuai Pengaturan (tanda tangan Kepala Sekolah dihapus). */
/* [BARU] Laporan PDF khusus 1 siswa — untuk dibagikan ke wali murid.
   Mengikuti filter Bulan & Mata Pelajaran yang dipilih di Data Siswa (kosong = semua).
   Setelah PDF terunduh, WA orang tua langsung terbuka dengan pesan siap kirim
   (tinggal lampirkan file PDF-nya secara manual — WhatsApp tidak mengizinkan
   lampiran file terpasang otomatis lewat tautan, demi keamanan/privasi pengguna). */
/* [BARU] ---------- Preview Laporan PDF per Siswa (sebelum PDF dibuat & WA dibuka) ----------
   exportSiswaPdf() sekarang HANYA menyiapkan data & menampilkan modal preview daftar tugas
   anak sesuai filter Bulan/Mapel/Bab yang aktif di Data Siswa. Guru bisa cek dulu isinya.
   Proses PDF + buka WA yang sesungguhnya baru jalan setelah guru menekan tombol konfirmasi
   di modal, lewat confirmSiswaPdfPreview() -> generateSiswaPdfAndKirimWa(). */
let SISWA_PDF_PREVIEW_NIS = null;

function exportSiswaPdf(nis){
  const s = studentByNis(nis);
  if(!s){ toast("Data siswa tidak ditemukan."); return; }
  if(!window.jspdf){ toast("Modul PDF belum siap, coba lagi."); return; }
  if(typeof window.jspdf.jsPDF.API.autoTable !== "function"){
    toast("Modul tabel PDF (autoTable) belum termuat. Periksa koneksi internet lalu muat ulang halaman.");
    return;
  }
  SISWA_PDF_PREVIEW_NIS = nis;
  renderSiswaPdfPreview();
  document.getElementById("siswaPdfPreviewModal").hidden = false;
}

function closeSiswaPdfPreviewModal(){
  document.getElementById("siswaPdfPreviewModal").hidden = true;
  SISWA_PDF_PREVIEW_NIS = null;
}

/* [BARU] Ambil baris tugas siswa sesuai filter Bulan/Mapel/Bab aktif — dipakai bareng oleh
   preview modal & proses pembuatan PDF supaya isinya selalu sama persis. */
function getSiswaPdfRows(nis){
  const bulan = getSiswaBulanFilter();
  const mapelFilter = getSiswaMapelFilter();
  const babFilter = getSiswaBabFilter();
  let rows = STATE.tugas.filter(t=>String(t.nis)===String(nis));
  if(bulan) rows = rows.filter(t=>(t.tanggal||"").startsWith(bulan));
  if(mapelFilter.length) rows = rows.filter(t=>mapelFilter.includes(t.mapel));
  if(babFilter) rows = rows.filter(t=>t.pekan===babFilter);
  rows = rows.sort((a,b)=> (a.tanggal||"").localeCompare(b.tanggal||"") || a.id-b.id);
  return { rows, bulan, mapelFilter, babFilter };
}

function renderSiswaPdfPreview(){
  const nis = SISWA_PDF_PREVIEW_NIS;
  const s = studentByNis(nis);
  const list = document.getElementById("siswaPdfPreviewList");
  const sub = document.getElementById("siswaPdfPreviewSub");
  const countEl = document.getElementById("siswaPdfPreviewCount");
  const confirmBtn = document.getElementById("siswaPdfPreviewConfirmBtn");
  if(!s){ list.innerHTML = ""; sub.textContent = ""; countEl.textContent = ""; return; }

  const { rows, bulan, mapelFilter, babFilter } = getSiswaPdfRows(nis);
  const periodeParts = [];
  periodeParts.push(bulan ? `Bulan ${monthLabel(bulan)}` : "Seluruh Bulan");
  if(mapelFilter.length) periodeParts.push(`Mapel ${mapelFilter.join(", ")}`);
  if(babFilter) periodeParts.push(babFilter);
  sub.textContent = `${s.nama} (${s.nis}) — ${periodeParts.join(" — ")}`;

  const sudah = rows.filter(t=>t.status==="Sudah Mengumpulkan").length;
  const belum = rows.length - sudah;
  countEl.textContent = `${rows.length} tugas · ${sudah} sudah · ${belum} belum`;

  if(!rows.length){
    list.innerHTML = `<div class="wa-modal-empty">Belum ada data tugas tercatat untuk siswa ini pada filter saat ini.</div>`;
  }else{
    list.innerHTML = rows.map((t,i)=>{
      return `<div class="wa-item">
        <div class="wa-item-info">
          <span class="wa-item-name">${i+1}. ${escapeHtml(t.mapel)} — ${escapeHtml(t.tugas)}</span>
          <span class="wa-item-meta">${escapeHtml(t.pekan||"-")} · ${fmtDate(t.tanggal)}</span>
        </div>
        ${statusBadge(t.status)}
      </div>`;
    }).join("");
  }

  if(s.hpOrtu){
    confirmBtn.textContent = "Buat PDF & Kirim WA";
    confirmBtn.disabled = false;
  }else{
    confirmBtn.textContent = "Buat PDF (No. WA belum diisi)";
    confirmBtn.disabled = false;
  }
}

function confirmSiswaPdfPreview(){
  const nis = SISWA_PDF_PREVIEW_NIS;
  if(!nis) return;
  closeSiswaPdfPreviewModal();
  generateSiswaPdfAndKirimWa(nis);
}

/* [BARU] Laporan PDF khusus 1 siswa — untuk dibagikan ke wali murid.
   Dipanggil setelah guru menekan tombol konfirmasi di modal preview
   (lihat confirmSiswaPdfPreview() & exportSiswaPdf() di atas). */
async function generateSiswaPdfAndKirimWa(nis){
  const s = studentByNis(nis);
  if(!s){ toast("Data siswa tidak ditemukan."); return; }
  if(!window.jspdf){ toast("Modul PDF belum siap, coba lagi."); return; }
  if(typeof window.jspdf.jsPDF.API.autoTable !== "function"){
    toast("Modul tabel PDF (autoTable) belum termuat. Periksa koneksi internet lalu muat ulang halaman.");
    return;
  }
  const { rows, bulan, mapelFilter, babFilter } = getSiswaPdfRows(nis);

  /* [BARU] Buka tab WA kosong SEGERA (sebelum proses PDF yang perlu waktu),
     supaya browser tidak menganggapnya popup dan memblokirnya. Diarahkan ke
     chat WA yang sebenarnya setelah PDF selesai dibuat & diunduh.
     [PERBAIKAN] Seluruh proses di bawah dibungkus try/catch/finally supaya
     kalau ada error di tengah jalan (mis. CDN autoTable gagal dimuat), tab
     kosong ini TIDAK tertinggal blank selamanya — akan ditutup otomatis dan
     guru diberi tahu lewat toast, bukan dibiarkan diam tanpa keterangan. */
  let waWin = null;
  if(s.hpOrtu){ waWin = window.open("", "_blank"); }

  try{

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation:"portrait", unit:"pt", format:"a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const logo = await loadLogoBase64();
  const set = getSchoolSettings();

  if(logo){ try{ doc.addImage(logo, "PNG", 40, 24, 46, 46); }catch(e){} }
  doc.setFont("helvetica","bold");
  doc.setFontSize(12.5);
  doc.setTextColor(12,78,48);
  doc.text(SCHOOL.nama.toUpperCase(), pageWidth/2, 36, { align:"center" });
  doc.setFontSize(14);
  doc.setTextColor(20,20,20);
  doc.text("LAPORAN PROGRES TUGAS SISWA", pageWidth/2, 54, { align:"center" });
  doc.setFont("helvetica","normal");
  doc.setFontSize(10);
  doc.setTextColor(90,90,90);
  const periodeParts = [`Tahun Pelajaran ${set.tahun}`, `Semester ${set.semester}`];
  periodeParts.push(bulan ? `Bulan ${monthLabel(bulan)}` : "Seluruh Bulan");
  if(mapelFilter.length) periodeParts.push(`Mapel ${mapelFilter.join(", ")}`);
  if(babFilter) periodeParts.push(babFilter);
  doc.text(periodeParts.join(" — "), pageWidth/2, 70, { align:"center" });
  doc.setDrawColor(201,162,39);
  doc.setLineWidth(1.2);
  doc.line(40, 80, pageWidth-40, 80);

  doc.setFontSize(10.5);
  doc.setTextColor(30,30,30);
  doc.setFont("helvetica","bold");
  doc.text("Nama Peserta Didik", 40, 100);
  doc.text("NIS", 40, 116);
  doc.text("L/P", 40, 132);
  doc.setFont("helvetica","normal");
  doc.text(`: ${s.nama}`, 150, 100);
  doc.text(`: ${s.nis}`, 150, 116);
  doc.text(`: ${s.lp}`, 150, 132);

  /* [BARU] Mini grafik doughnut Sudah/Belum, ditempel di sisi kanan blok identitas siswa. */
  const sudahAwal = rows.filter(t=>t.status==="Sudah Mengumpulkan").length;
  const belumAwal = rows.length - sudahAwal;
  const miniChartUrl = renderMiniDoughnutDataUrl(sudahAwal, belumAwal);
  const chartSize = 70;
  const chartX = pageWidth - 40 - chartSize;
  const chartY = 88;
  if(miniChartUrl){
    try{
      doc.addImage(miniChartUrl, "PNG", chartX, chartY, chartSize, chartSize);
      doc.setFont("helvetica","bold");
      doc.setFontSize(9);
      doc.setTextColor(12,78,48);
      const pctLabel = rows.length ? `${Math.round((sudahAwal/rows.length)*100)}%` : "0%";
      doc.text(pctLabel, chartX + chartSize/2, chartY + chartSize/2 + 3, { align:"center" });
      doc.setFont("helvetica","normal");
      doc.setFontSize(8);
      doc.setTextColor(90,90,90);
      doc.text("Sudah Kumpul", chartX + chartSize/2, chartY + chartSize + 12, { align:"center" });
    }catch(e){}
  }

  const body = rows.map((t,i)=>[ i+1, t.mapel, t.tugas, t.tujuan||"-", t.pekan, fmtDate(t.tanggal), t.status, t.catatan||"-" ]);

  doc.autoTable({
    startY: miniChartUrl ? chartY + chartSize + 26 : 150,
    head: [["No","Mapel","Materi","Tujuan Materi","Bab","Tanggal","Status","Catatan"]],
    body,
    styles:{ fontSize:8.5, cellPadding:5, textColor:[30,30,30] },
    headStyles:{ fillColor:[12,78,48], textColor:255, fontStyle:"bold" },
    alternateRowStyles:{ fillColor:[244,240,228] },
    margin:{left:40,right:40},
    didParseCell: (data)=>{ if(data.section==="body" && rows.length===0){} }
  });

  const finalY = rows.length ? doc.lastAutoTable.finalY + 20 : 170;
  if(rows.length===0){
    doc.setFontSize(10);
    doc.setTextColor(120,120,120);
    const kosongParts = [];
    if(bulan) kosongParts.push(monthLabel(bulan));
    if(mapelFilter.length) kosongParts.push(`mapel ${mapelFilter.join(", ")}`);
    if(babFilter) kosongParts.push(babFilter);
    doc.text(kosongParts.length ? `Belum ada data tugas tercatat untuk ${kosongParts.join(", ")}.` : "Belum ada data tugas tercatat untuk siswa ini.", 40, 160);
  }
  const sudah = rows.filter(t=>t.status==="Sudah Mengumpulkan").length;
  const belum = rows.length - sudah;
  const gid = document.getElementById("printGuruSelect")?.value;
  const guru = STATE.guru.find(g=>String(g.id)===String(gid));

  doc.setFontSize(9.5);
  doc.setTextColor(40,40,40);
  let fy = finalY;
  if(fy > doc.internal.pageSize.getHeight()-140){ doc.addPage(); fy = 50; }
  doc.text(`Total Tugas: ${rows.length}`, 40, fy);
  doc.text(`Sudah Mengumpulkan: ${sudah}`, 200, fy);
  doc.text(`Belum Mengumpulkan: ${belum}`, 380, fy);

  const printDate = new Date().toLocaleDateString("id-ID",{day:"2-digit",month:"long",year:"numeric"});
  const pageW = doc.internal.pageSize.getWidth();
  const sigY = fy + 30;
  doc.text(`Cirebon, ${printDate}`, pageW-40, sigY, { align:"right" });
  doc.text("Guru Kelas", pageW-40, sigY+14, { align:"right" });
  drawSignatureImage(doc, pageW, sigY+18, 46);
  doc.text(guru ? guru.nama : "(______________________)", pageW-40, sigY+70, { align:"right" });

  addPageNumbers_(doc); // [BARU] "Halaman X dari Y" di kanan-bawah tiap halaman

  const safeName = s.nama.replace(/[^a-zA-Z0-9]+/g,"-").replace(/^-+|-+$/g,"");
  const safeMapel = mapelFilter.length ? `-${mapelFilter.join("-").replace(/[^a-zA-Z0-9]+/g,"-").replace(/^-+|-+$/g,"")}` : "";
  const safeBab = babFilter ? `-${babFilter.replace(/[^a-zA-Z0-9]+/g,"-").replace(/^-+|-+$/g,"")}` : "";
  const bulanTag = bulan ? `-${bulan}` : "";
  doc.save(`Laporan-Tugas-${safeName}${bulanTag}${safeMapel}${safeBab}-${todayISO()}.pdf`);

  /* [BARU] Arahkan tab WA yang sudah dibuka tadi ke chat orang tua siswa ini,
     dengan pesan siap kirim. File PDF tetap perlu dilampirkan manual (satu kali
     ketuk "Lampirkan" di WhatsApp) karena wa.me hanya mendukung teks, bukan file. */
  const filterLabelParts = [];
  if(bulan) filterLabelParts.push(monthLabel(bulan));
  if(mapelFilter.length) filterLabelParts.push(mapelFilter.join(", "));
  if(babFilter) filterLabelParts.push(babFilter);
  const filterLabel = filterLabelParts.length ? ` (${filterLabelParts.join(" — ")})` : "";
  if(s.hpOrtu){
    const phone = formatPhoneWa(s.hpOrtu);
    const cakupanParts = [];
    if(bulan) cakupanParts.push(`bulan ${monthLabel(bulan)}`);
    if(mapelFilter.length) cakupanParts.push(`mapel ${mapelFilter.join(", ")}`);
    if(babFilter) cakupanParts.push(babFilter);
    const cakupanTxt = cakupanParts.length ? ` ${cakupanParts.join(", ")}` : "";
    const waMsg = encodeURIComponent(
      `Assalamu'alaikum, Bapak/Ibu Wali dari ananda *${s.nama}*.\n\nBerikut laporan progres tugas${cakupanTxt} dari ${getKelasNama()}.\n\nJazakumullahu khairan.\n\n${waSignature()}`
    );
    const waUrl = `https://wa.me/${phone}?text=${waMsg}`;
    if(waWin){ waWin.location.href = waUrl; } else { window.open(waUrl, "_blank"); }
    toast(`Laporan PDF untuk ${s.nama}${filterLabel} diunduh & WA orang tua dibuka — tinggal lampirkan file PDF-nya.`);
  }else{
    if(waWin) waWin.close();
    toast(`Laporan PDF untuk ${s.nama}${filterLabel} berhasil diunduh. Nomor WA orang tua belum diisi — lengkapi di Data Siswa supaya WA terbuka otomatis.`);
  }

  }catch(err){
    /* [PERBAIKAN] Kalau ada error di mana pun di atas (PDF gagal dibuat,
       autoTable error, dsb.), tab kosong yang sudah terlanjur dibuka JANGAN
       dibiarkan blank putih selamanya — tutup, dan beri tahu guru dengan
       jelas apa yang terjadi supaya tidak bingung. */
    console.error("generateSiswaPdfAndKirimWa gagal:", err);
    if(waWin){ try{ waWin.close(); }catch(e){} }
    toast(`Gagal membuat Laporan PDF untuk ${s.nama}: ${err && err.message ? err.message : "kesalahan tidak diketahui"}. Coba ulangi; jika terus gagal, laporkan pesan ini ke pengembang.`);
  }
}

function printTable(){
  const set = getSchoolSettings();
  const gid = document.getElementById("printGuruSelect")?.value;
  const guru = STATE.guru.find(g=>String(g.id)===String(gid));
  const printDate = new Date().toLocaleDateString("id-ID",{day:"2-digit",month:"long",year:"numeric"});

  const header = document.getElementById("printHeader");
  if(header){
    header.innerHTML = `
      <h2>${escapeHtml(SCHOOL.nama.toUpperCase())}</h2>
      <h3>CATATAN PENGUMPULAN TUGAS SISWA</h3>
      <p>Tahun Pelajaran ${escapeHtml(set.tahun)} — Semester ${escapeHtml(set.semester)}</p>
    `;
  }
  const footer = document.getElementById("printFooter");
  if(footer){
    footer.innerHTML = `
      <div class="sig">
        <div>Cirebon, ${printDate}</div>
        <div>Guru Kelas</div>
        <div class="line">${guru ? escapeHtml(guru.nama) : "&nbsp;"}</div>
      </div>
    `;
  }
  window.print();
}

/* ---------- Excel export/import ---------- */
/* [BARU] Ekspor Excel kini menyertakan judul sekolah, Tahun Pelajaran/Semester,
   serta blok tanda tangan Guru Kelas (tanda tangan Kepala Sekolah dihapus dari
   seluruh ekspor sesuai permintaan). */
function exportXlsx(){
  if(!window.XLSX){ toast("Modul Excel belum siap."); return; }
  const rows = getFilteredSorted();
  const set = getSchoolSettings();
  const gid = document.getElementById("printGuruSelect")?.value;
  const guru = STATE.guru.find(g=>String(g.id)===String(gid));
  const sudah = rows.filter(r=>r.status==="Sudah Mengumpulkan").length;
  const belum = rows.length - sudah;
  const printDate = new Date().toLocaleDateString("id-ID",{day:"2-digit",month:"long",year:"numeric"});

  const aoa = [];
  aoa.push([SCHOOL.nama.toUpperCase()]);
  aoa.push(["CATATAN PENGUMPULAN TUGAS SISWA"]);
  aoa.push([`Tahun Pelajaran ${set.tahun} — Semester ${set.semester}`]);
  aoa.push([]);
  aoa.push(["No","NIS","Nama","L/P","Mapel","Materi","Tujuan Materi","Bab","Tanggal","Status","Catatan"]);
  rows.forEach((r,i)=> aoa.push([i+1, r.nis, r.nama, r.lp, r.mapel, r.tugas, r.tujuan||"", r.pekan, fmtDate(r.tanggal), r.status, r.catatan||""]));
  aoa.push([]);
  aoa.push([`Jumlah Data: ${rows.length}`, "", "", `Sudah: ${sudah}`, "", "", `Belum: ${belum}`]);
  aoa.push([]);
  aoa.push(["", "", "", "", "", "", `Cirebon, ${printDate}`]);
  aoa.push(["", "", "", "", "", "", "Guru Kelas"]);
  aoa.push([]); aoa.push([]); aoa.push([]);
  aoa.push(["", "", "", "", "", "", guru ? guru.nama : ""]);

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = [{wch:5},{wch:14},{wch:26},{wch:6},{wch:16},{wch:26},{wch:28},{wch:10},{wch:14},{wch:20},{wch:24}];
  ws["!margins"] = { left:0.35, right:0.35, top:0.5, bottom:0.5, header:0.2, footer:0.2 };
  ws["!pageSetup"] = { orientation:"landscape", fitToWidth:1, fitToHeight:0, paperSize:9 };
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Catatan Tugas");
  XLSX.writeFile(wb, `Catatan-Tugas-SDIT-Muhammadiyah-${todayISO()}.xlsx`);
  toast("Excel berhasil diunduh.");
}

async function importXlsx(file){
  if(!window.XLSX){ toast("Modul Excel belum siap."); return; }
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type:"array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { defval:"" });
  let count = 0;
  for(const row of rows){
    const nis = String(row.NIS||row.nis||"").trim();
    if(!nis) continue;
    let s = studentByNis(nis);
    if(!s){
      s = { nis, nama: String(row.Nama||row.nama||"Tanpa Nama"), lp: String(row["L/P"]||row.lp||"L").toUpperCase().startsWith("P")?"P":"L" };
      await idbPut("siswa", s);
    }
    const rec = {
      nis,
      mapel: String(row.Mapel||row.mapel||"").trim(),
      tugas: String(row.Materi||row.materi||row["Nama Tugas"]||row.tugas||"").trim(),
      tujuan: String(row["Tujuan Materi"]||row.tujuan||"").trim(),
      pekan: String(row.Bab||row.bab||row.Pekan||row.pekan||"Bab 1").trim(),
      tanggal: normalizeDate(row.Tanggal||row.tanggal),
      status: String(row.Status||row.status||"Belum Mengumpulkan").trim(),
      catatan: String(row.Catatan||row.catatan||"").trim()
    };
    if(!rec.mapel || !rec.tugas) continue;
    await idbPut("tugas", rec);
    count++;
  }
  await loadAll();
  populateStudentSelect();
  populateMapelDatalist();
  toast(`${count} data berhasil diimpor dari Excel.`);
  if(STATE.view==="data") renderDataView();
  if(STATE.view==="dashboard") renderDashboard();
}
function normalizeDate(v){
  if(!v) return todayISO();
  if(v instanceof Date) return v.toISOString().slice(0,10);
  const s = String(v).trim();
  if(/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if(/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)){
    const [d,m,y] = s.split("/");
    return `${y}-${m.padStart(2,"0")}-${d.padStart(2,"0")}`;
  }
  const d = new Date(s);
  if(!isNaN(d)) return d.toISOString().slice(0,10);
  return todayISO();
}

/* ---------- [DIHAPUS] Backup/Restore JSON & CSV — menu Backup & Restore dihapus
   atas permintaan pengguna. ---------- */

/* ---------- Theme ---------- */
function initTheme(){
  const saved = localStorage.getItem("sditmuha_theme");
  const theme = saved || "light";
  document.documentElement.setAttribute("data-theme", theme);
  document.body.setAttribute("data-theme", theme);
}
function toggleTheme(){
  const cur = document.body.getAttribute("data-theme")==="dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", cur);
  document.body.setAttribute("data-theme", cur);
  localStorage.setItem("sditmuha_theme", cur);
  if(STATE.view==="dashboard"){ renderChartPekan(); renderChartMapel(); renderChartTrend(); }
}

/* ---------- Online/offline pill ---------- */
function updateOnlinePill(){
  const pill = document.getElementById("onlinePill");
  const online = navigator.onLine;
  pill.textContent = online? "Online" : "Mode Offline";
  pill.classList.toggle("offline", !online);
}

/* ---------- PWA install ---------- */
/* [BARU] Selain tombol "Instal Aplikasi" di sidebar/navigasi, kini juga muncul
   popup ajakan instal (bottom sheet) begitu browser mengizinkan (beforeinstallprompt),
   supaya ajakannya lebih terlihat & tidak hanya mengandalkan pengguna menemukan
   tombolnya sendiri di sidebar. Popup ini bisa ditutup ("Nanti") dan tidak akan
   muncul lagi selama beberapa hari kalau sudah ditutup, supaya tidak mengganggu. */
let deferredPrompt = null;
const INSTALL_BANNER_DISMISS_KEY = "sditmuha_install_banner_dismiss_until";
function installBannerDismissed(){
  const until = +(localStorage.getItem(INSTALL_BANNER_DISMISS_KEY) || 0);
  return Date.now() < until;
}
function dismissInstallBanner(days){
  const banner = document.getElementById("installBanner");
  if(banner){ banner.classList.remove("show"); setTimeout(()=>{ banner.hidden = true; }, 320); }
  if(days) localStorage.setItem(INSTALL_BANNER_DISMISS_KEY, String(Date.now() + days*24*60*60*1000));
}
function showInstallBanner(){
  if(installBannerDismissed()) return;
  const banner = document.getElementById("installBanner");
  if(!banner) return;
  banner.hidden = false;
  requestAnimationFrame(()=> banner.classList.add("show"));
}
window.addEventListener("beforeinstallprompt", (e)=>{
  e.preventDefault();
  deferredPrompt = e;
  document.getElementById("installBtn").hidden = false;
  showInstallBanner();
});
window.addEventListener("appinstalled", ()=>{
  document.getElementById("installBtn").hidden = true;
  dismissInstallBanner(0);
  toast("Aplikasi berhasil dipasang.", "add");
});

/* ---------- Reset all ---------- */
async function resetAllTugas(){
  const ok = await confirmDialog("Hapus SELURUH data tugas? Data siswa dan guru tidak akan terhapus.");
  if(!ok) return;
  await idbClear("tugas");
  await loadAll();
  toast("Seluruh data tugas telah dihapus.");
  renderDashboard();
}

/* ---------- [BARU] Jurnal Literasi Siswa ---------- */
/* Nama tampilan: kalau terhubung ke NIS siswa terdaftar pakai nama dari Data Siswa,
   kalau tidak (dihapus/pindah) atau memang diisi manual, pakai namaManual yang tersimpan. */
function literasiDisplayName(entry){
  if(entry.nis){
    const s = studentByNis(entry.nis);
    if(s) return s.nama;
  }
  return entry.namaManual || "(tanpa nama)";
}
function populateLiterasiSiswaSelects(){
  const formSel = document.getElementById("lt_siswa");
  const filterSel = document.getElementById("litFilterSiswa");
  const waSel = document.getElementById("litWaSiswaSelect");
  const students = [...STATE.siswa].sort((a,b)=>a.nama.localeCompare(b.nama,"id"));
  if(formSel){
    const cur = formSel.value;
    formSel.innerHTML = `<option value="">Pilih dari Data Siswa&hellip;</option>` +
      students.map(s=>`<option value="${s.nis}">${escapeHtml(s.nama)}</option>`).join("") +
      `<option value="__manual__">+ Nama Lain (isi manual)&hellip;</option>`;
    formSel.value = cur;
  }
  if(filterSel){
    const cur = filterSel.value;
    filterSel.innerHTML = `<option value="">Semua Peserta</option>` +
      students.map(s=>`<option value="${s.nis}">${escapeHtml(s.nama)}</option>`).join("");
    filterSel.value = cur;
  }
  /* [BARU] Dropdown "PDF & Kirim WA Ortu" pada toolbar dekat "Impor dari Excel" — hanya
     berisi siswa terdaftar di Data Siswa (nama manual/lepas tidak punya nomor WA tersimpan). */
  if(waSel){
    const cur = waSel.value;
    waSel.innerHTML = `<option value="">Pilih Siswa untuk Kirim WA&hellip;</option>` +
      students.map(s=>`<option value="${s.nis}">${escapeHtml(s.nama)}${s.hpOrtu?"":" (No. WA belum diisi)"}</option>`).join("");
    waSel.value = cur;
  }
}
function toggleLiterasiManualField(){
  const sel = document.getElementById("lt_siswa");
  const wrap = document.getElementById("lt_manual_wrap");
  if(!sel || !wrap) return;
  wrap.hidden = sel.value !== "__manual__";
  if(!wrap.hidden) document.getElementById("lt_nama_manual").focus();
}
function resetLiterasiForm(){
  const f = $id("literasiForm");
  if(f) f.reset();
  setVal("lt_id", "");
  setVal("lt_tanggal", todayISO());
  setVal("lt_bukuKe", "");
  setHidden("lt_manual_wrap", true);
  STATE.literasiEditId = null;
  setText("literasiFormTitle", "Isi Jurnal Literasi");
  setText("lt_submit", "Simpan Jurnal");
}
async function handleLiterasiSubmit(e){
  e.preventDefault();
  const selVal = document.getElementById("lt_siswa").value;
  const manualNama = document.getElementById("lt_nama_manual").value.trim();
  if(selVal === "__manual__" && !manualNama){
    toast("Isi nama peserta didik terlebih dahulu.");
    return;
  }
  if(!selVal){
    toast("Pilih peserta didik atau isi nama manual terlebih dahulu.");
    return;
  }
  const judul = document.getElementById("lt_judul").value.trim();
  if(!judul){ toast("Judul buku/bacaan wajib diisi."); return; }

  const id = document.getElementById("lt_id").value || uuid();
  const entry = {
    id,
    nis: selVal === "__manual__" ? "" : selVal,
    namaManual: selVal === "__manual__" ? manualNama : "",
    tanggal: document.getElementById("lt_tanggal").value || todayISO(),
    judulBuku: judul,
    bukuKe: document.getElementById("lt_bukuKe").value.trim(),
    halaman: document.getElementById("lt_halaman").value.trim(),
    kesan: document.getElementById("lt_kesan").value.trim(),
    parafOrtu: document.getElementById("lt_paraf").checked,
    updatedAt: new Date().toISOString()
  };
  await idbPut("literasi", entry);
  STATE.literasi = (await idbAll("literasi")).sort((a,b)=> (b.tanggal||"").localeCompare(a.tanggal||""));
  resetLiterasiForm();
  renderLiterasiView();
  toast("Jurnal literasi tersimpan.");
}
function editLiterasi(id){
  const entry = STATE.literasi.find(x=>x.id===id);
  if(!entry) return;
  STATE.literasiEditId = id;
  document.getElementById("lt_id").value = entry.id;
  document.getElementById("lt_siswa").value = entry.nis ? entry.nis : "__manual__";
  toggleLiterasiManualField();
  document.getElementById("lt_nama_manual").value = entry.namaManual || "";
  document.getElementById("lt_tanggal").value = entry.tanggal || todayISO();
  document.getElementById("lt_bukuKe").value = entry.bukuKe || "";
  document.getElementById("lt_halaman").value = entry.halaman || "";
  document.getElementById("lt_judul").value = entry.judulBuku || "";
  document.getElementById("lt_kesan").value = entry.kesan || "";
  document.getElementById("lt_paraf").checked = !!entry.parafOrtu;
  document.getElementById("literasiFormTitle").textContent = "Ubah Jurnal Literasi";
  document.getElementById("lt_submit").textContent = "Simpan Perubahan";
  document.getElementById("view-literasi").scrollIntoView({ behavior:"smooth", block:"start" });
}
async function deleteLiterasi(id){
  const ok = await confirmDialog("Hapus catatan jurnal literasi ini?");
  if(!ok) return;
  await idbDelete("literasi", id);
  STATE.literasi = await idbAll("literasi");
  if(STATE.literasiEditId===id) resetLiterasiForm();
  renderLiterasiView();
  toast("Catatan jurnal literasi dihapus.");
}
function getLiterasiFilteredSorted(){
  const f = STATE.literasiFilters;
  let rows = STATE.literasi.map(e=>({ ...e, nama: literasiDisplayName(e) }));
  if(f.q){
    const q = f.q.toLowerCase();
    rows = rows.filter(r=> r.nama.toLowerCase().includes(q) || (r.judulBuku||"").toLowerCase().includes(q));
  }
  if(f.siswa) rows = rows.filter(r=>String(r.nis)===String(f.siswa));
  if(f.paraf==="ya") rows = rows.filter(r=>r.parafOrtu);
  if(f.paraf==="belum") rows = rows.filter(r=>!r.parafOrtu);
  if(f.dari) rows = rows.filter(r=>r.tanggal >= f.dari);
  if(f.sampai) rows = rows.filter(r=>r.tanggal <= f.sampai);
  rows.sort((a,b)=> (b.tanggal||"").localeCompare(a.tanggal||""));
  return rows;
}
function parafBadge(val){
  return `<span class="badge ${val?"badge-good":"badge-bad"}">${val?"Sudah Diparaf":"Belum Diparaf"}</span>`;
}
/* [BARU] Potong teks Kesan/Pesan Singkat di tabel supaya kolomnya tidak melebar dan
   tabel tetap rapi — teks lengkapnya bisa dibuka lewat tautan "Lihat selengkapnya". */
function ringkasKesan(teks, maks){
  const t = String(teks || "").trim();
  if(!t) return { pendek: "-", terpotong: false };
  const batas = maks || 42;
  if(t.length <= batas) return { pendek: t, terpotong: false };
  return { pendek: t.slice(0, batas).trim() + "…", terpotong: true };
}
function openLitKesanModal(id){
  const entry = (STATE.literasi||[]).find(x=>x.id===id);
  if(!entry) return;
  setText("litKesanModalSub", `${entry.nama || "-"} — ${entry.judulBuku||""} — ${fmtDate(entry.tanggal)}`);
  setText("litKesanModalBody", entry.kesan || "(tidak ada kesan/pesan yang dicatat)");
  setHidden("litKesanModal", false);
}
function closeLitKesanModal(){ setHidden("litKesanModal", true); }

function renderLiterasiView(){
  const rows = getLiterasiFilteredSorted();
  document.getElementById("litResultCount").textContent = `${rows.length} data`;
  const tbody = document.querySelector("#literasiTable tbody");
  tbody.innerHTML = rows.length ? rows.map((r,i)=>{
    const kesanRingkas = ringkasKesan(r.kesan, 42);
    const kesanHtml = kesanRingkas.terpotong
      ? `${escapeHtml(kesanRingkas.pendek)} <a href="javascript:void(0)" class="lihat-selengkapnya" onclick="openLitKesanModal('${r.id}')">Lihat selengkapnya</a>`
      : escapeHtml(kesanRingkas.pendek);
    return `
    <tr>
      <td>${i+1}</td>
      <td class="mono">${fmtDate(r.tanggal)}</td>
      <td>${escapeHtml(r.nama)}</td>
      <td>${escapeHtml(r.judulBuku)}</td>
      <td>${escapeHtml(r.bukuKe||"-")}</td>
      <td>${escapeHtml(r.halaman||"-")}</td>
      <td class="kesan-cell">${kesanHtml}</td>
      <td>${parafBadge(r.parafOrtu)}</td>
      <td><div class="row-actions">
        <button onclick="editLiterasi('${r.id}')">Edit</button>
        <button class="danger" onclick="deleteLiterasi('${r.id}')">Hapus</button>
      </div></td>
    </tr>`;
  }).join("") : `<tr><td colspan="9" class="muted" style="text-align:center;padding:24px;">Belum ada catatan jurnal literasi yang cocok dengan filter.</td></tr>`;
}
async function exportLiterasiPdf(){
  const rows = getLiterasiFilteredSorted();
  if(!window.jspdf){ toast("Modul PDF belum siap, coba lagi."); return; }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation:"landscape", unit:"pt", format:"a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const logo = await loadLogoBase64();
  const set = getSchoolSettings();

  if(logo){ try{ doc.addImage(logo, "PNG", 40, 24, 50, 50); }catch(e){} }
  doc.setFont("helvetica","bold");
  doc.setFontSize(13);
  doc.setTextColor(12,78,48);
  doc.text(SCHOOL.nama.toUpperCase(), pageWidth/2, 38, { align:"center" });
  doc.setFontSize(15);
  doc.setTextColor(20,20,20);
  doc.text("JURNAL LITERASI SISWA", pageWidth/2, 58, { align:"center" });
  doc.setFont("helvetica","normal");
  doc.setFontSize(10.5);
  doc.setTextColor(90,90,90);
  const f = STATE.literasiFilters;
  const namaSaring = f.siswa ? (studentByNis(f.siswa)?.nama || "") : "";
  const subtitle = namaSaring
    ? `${set.kelas} — ${namaSaring} — Tahun Pelajaran ${set.tahun}`
    : `${set.kelas} — Tahun Pelajaran ${set.tahun}`;
  doc.text(subtitle, pageWidth/2, 74, { align:"center" });
  doc.setDrawColor(201,162,39);
  doc.setLineWidth(1.4);
  doc.line(40, 86, pageWidth-40, 86);

  const body = rows.map((r,i)=>[i+1, fmtDate(r.tanggal), r.nama, r.judulBuku, r.bukuKe||"-", r.halaman||"-", r.kesan||"-", r.parafOrtu?"Sudah":"Belum"]);

  doc.autoTable({
    startY: 96,
    head: [["No","Tanggal","Nama Peserta Didik","Judul Buku/Bacaan","Buku Ke","Halaman Dibaca","Kesan/Pesan Singkat","Paraf Ortu"]],
    body,
    styles:{ fontSize:8.5, cellPadding:5, textColor:[30,30,30] },
    headStyles:{ fillColor:[12,78,48], textColor:255, fontStyle:"bold" },
    alternateRowStyles:{ fillColor:[244,240,228] },
    columnStyles:{ 0:{cellWidth:26}, 1:{cellWidth:60}, 4:{cellWidth:55}, 5:{cellWidth:70}, 7:{cellWidth:55} },
    margin:{left:40,right:40}
  });

  const finalY = doc.lastAutoTable.finalY + 22;
  const printDate = new Date().toLocaleDateString("id-ID",{day:"2-digit",month:"long",year:"numeric"});
  doc.setFontSize(9.5);
  doc.setTextColor(40,40,40);
  let fy = finalY;
  if(fy > doc.internal.pageSize.getHeight()-110){ doc.addPage(); fy = 50; }
  doc.text(`Jumlah Data: ${rows.length}`, 40, fy);
  const gid = document.getElementById("printGuruSelect")?.value;
  const guru = STATE.guru.find(g=>String(g.id)===String(gid)) || STATE.guru[0];
  const pageW = doc.internal.pageSize.getWidth();
  const sigY = fy + 30;
  doc.text(`Cirebon, ${printDate}`, pageW-40, sigY, { align:"right" });
  doc.text("Guru Kelas", pageW-40, sigY+14, { align:"right" });
  drawSignatureImage(doc, pageW, sigY+18, 46);
  doc.text(guru ? guru.nama : "(______________________)", pageW-40, sigY+70, { align:"right" });

  addPageNumbers_(doc);
  doc.save(`Jurnal-Literasi-Siswa-${todayISO()}.pdf`);
  toast("PDF Jurnal Literasi berhasil diunduh.");
}
function exportLiterasiXlsx(){
  if(!window.XLSX){ toast("Modul Excel belum siap, coba lagi."); return; }
  const rows = getLiterasiFilteredSorted();
  const aoa = [["No","Tanggal","Nama Peserta Didik","Judul Buku/Bacaan","Buku Ke","Halaman Dibaca","Kesan/Pesan Singkat","Paraf Orang Tua"]];
  rows.forEach((r,i)=> aoa.push([i+1, fmtDate(r.tanggal), r.nama, r.judulBuku, r.bukuKe||"", r.halaman||"", r.kesan||"", r.parafOrtu?"Sudah":"Belum"]));
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = [{wch:4},{wch:14},{wch:26},{wch:28},{wch:16},{wch:16},{wch:36},{wch:14}];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Jurnal Literasi");
  XLSX.writeFile(wb, `Jurnal-Literasi-Siswa-${todayISO()}.xlsx`);
  toast("Excel Jurnal Literasi berhasil diunduh.");
}
/* [BARU] Unduh template Excel untuk impor massal Jurnal Literasi Siswa. Kolom "NIS" opsional —
   kalau diisi & cocok dengan Data Siswa, nama otomatis terhubung; kalau kosong/tidak cocok,
   kolom "Nama Peserta Didik" dipakai sebagai nama manual. */
function downloadLiterasiTemplate(){
  if(!window.XLSX){ toast("Modul Excel belum siap."); return; }
  const data = [
    { NIS:"3160169851", "Nama Peserta Didik":"CONTOH NAMA SISWA", "Tanggal (YYYY-MM-DD)":todayISO(),
      "Judul Buku/Bacaan":"Cerita Rakyat Nusantara", "Buku Ke":"2 (lanjutan)", "Halaman Dibaca":"hlm 5-17",
      "Kesan/Pesan Singkat":"", "Paraf Orang Tua (Ya/Tidak)":"Belum" }
  ];
  const ws = XLSX.utils.json_to_sheet(data);
  ws["!cols"] = [{wch:16},{wch:26},{wch:18},{wch:28},{wch:16},{wch:16},{wch:36},{wch:20}];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Template Jurnal Literasi");
  XLSX.writeFile(wb, `Template-Jurnal-Literasi-Siswa.xlsx`);
  toast("Template Excel berhasil diunduh.");
}
/* [BARU] Impor massal catatan Jurnal Literasi Siswa dari Excel (mengikuti kolom template).
   Setiap baris valid (punya Judul Buku/Bacaan) ditambahkan sebagai catatan baru. */
async function importLiterasiXlsx(file){
  if(!window.XLSX){ toast("Modul Excel belum siap."); return; }
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type:"array", cellDates:true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { defval:"" });
  let count = 0;
  for(const row of rows){
    const judul = String(row["Judul Buku/Bacaan"] ?? row["Judul"] ?? "").trim();
    if(!judul) continue;
    const nisRaw = String(row.NIS ?? row.nis ?? "").trim();
    const student = nisRaw ? studentByNis(nisRaw) : null;
    const namaManual = String(row["Nama Peserta Didik"] ?? row.Nama ?? "").trim();
    if(!student && !namaManual) continue;
    const parafRaw = String(row["Paraf Orang Tua (Ya/Tidak)"] ?? row["Paraf Orang Tua"] ?? row.Paraf ?? "").trim().toLowerCase();
    const entry = {
      id: uuid(),
      nis: student ? student.nis : "",
      namaManual: student ? "" : namaManual,
      tanggal: excelDateToISO(row["Tanggal (YYYY-MM-DD)"] ?? row.Tanggal ?? "") || todayISO(),
      judulBuku: judul,
      bukuKe: String(row["Buku Ke"] ?? row["Buku ke"] ?? row.bukuKe ?? "").trim(),
      halaman: String(row["Halaman Dibaca"] ?? row.Halaman ?? "").trim(),
      kesan: String(row["Kesan/Pesan Singkat"] ?? row.Kesan ?? "").trim(),
      parafOrtu: (parafRaw==="ya" || parafRaw==="sudah" || parafRaw==="yes" || parafRaw==="true" || parafRaw==="1"),
      updatedAt: new Date().toISOString()
    };
    await idbPut("literasi", entry);
    count++;
  }
  STATE.literasi = (await idbAll("literasi")).sort((a,b)=> (b.tanggal||"").localeCompare(a.tanggal||""));
  renderLiterasiView();
  toast(count ? `${count} catatan jurnal literasi berhasil diimpor.` : "Tidak ada baris valid yang ditemukan pada file Excel.");
}

/* [BARU] ---------- Ekspor PDF Jurnal Literasi KHUSUS 1 Siswa + Kirim WA Ortu ----------
   Dipicu dari dropdown "Pilih Siswa untuk Kirim WA…" + tombol "PDF & Kirim WA Ortu" pada
   toolbar (letaknya persis di sebelah "Impor dari Excel"). Berbeda dari exportLiterasiPdf()
   yang mengekspor SEMUA baris sesuai filter tabel aktif, fungsi ini SELALU mengambil SELURUH
   riwayat literasi siswa terpilih (tanpa terpengaruh filter tabel), rapi & siap cetak (logo +
   judul sesuai isi/konten "Jurnal Literasi Siswa"), lalu — seperti fitur "Kirim WA" lain di
   aplikasi ini — membuka chat WhatsApp orang tua siswa dengan pesan siap kirim. WhatsApp tidak
   mengizinkan lampiran file terpasang otomatis lewat tautan (demi keamanan/privasi), jadi PDF
   diunduh lebih dulu dan guru tinggal melampirkannya manual sekali ketuk di WhatsApp. */
function exportLiterasiPdfSiswaPrompt(){
  const sel = document.getElementById("litWaSiswaSelect");
  const nis = sel ? sel.value : "";
  if(!nis){ toast("Pilih peserta didik terlebih dahulu di dropdown sebelah kiri tombol ini."); return; }
  generateLiterasiPdfSiswaAndKirimWa(nis);
}

async function generateLiterasiPdfSiswaAndKirimWa(nis){
  const s = studentByNis(nis);
  if(!s){ toast("Data siswa tidak ditemukan."); return; }
  if(!window.jspdf){ toast("Modul PDF belum siap, coba lagi."); return; }
  if(typeof window.jspdf.jsPDF.API.autoTable !== "function"){
    toast("Modul tabel PDF (autoTable) belum termuat. Periksa koneksi internet lalu muat ulang halaman.");
    return;
  }
  const rows = (STATE.literasi||[])
    .filter(e=>String(e.nis)===String(nis))
    .sort((a,b)=> (a.tanggal||"").localeCompare(b.tanggal||""));

  /* Buka tab WA kosong SEGERA (sebelum proses PDF yang perlu waktu) supaya browser tidak
     menganggapnya popup dan memblokirnya — sama seperti pola "Laporan Tugas per Siswa". */
  let waWin = null;
  if(s.hpOrtu){ waWin = window.open("", "_blank"); }

  try{
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation:"portrait", unit:"pt", format:"a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const logo = await loadLogoBase64();
    const set = getSchoolSettings();

    if(logo){ try{ doc.addImage(logo, "PNG", 40, 24, 46, 46); }catch(e){} }
    doc.setFont("helvetica","bold");
    doc.setFontSize(12.5);
    doc.setTextColor(12,78,48);
    doc.text(SCHOOL.nama.toUpperCase(), pageWidth/2, 36, { align:"center" });
    doc.setFontSize(14);
    doc.setTextColor(20,20,20);
    doc.text("JURNAL LITERASI SISWA", pageWidth/2, 54, { align:"center" });
    doc.setFont("helvetica","normal");
    doc.setFontSize(10);
    doc.setTextColor(90,90,90);
    doc.text(`${set.kelas} — Tahun Pelajaran ${set.tahun}`, pageWidth/2, 70, { align:"center" });
    doc.setDrawColor(201,162,39);
    doc.setLineWidth(1.2);
    doc.line(40, 80, pageWidth-40, 80);

    doc.setFontSize(10.5);
    doc.setTextColor(30,30,30);
    doc.setFont("helvetica","bold");
    doc.text("Nama Peserta Didik", 40, 100);
    doc.text("NIS", 40, 116);
    doc.setFont("helvetica","normal");
    doc.text(`: ${s.nama}`, 150, 100);
    doc.text(`: ${s.nis}`, 150, 116);

    const sudahParaf = rows.filter(r=>r.parafOrtu).length;
    doc.setFont("helvetica","bold");
    doc.text("Jumlah Bacaan", pageWidth-220, 100);
    doc.text("Sudah Diparaf", pageWidth-220, 116);
    doc.setFont("helvetica","normal");
    doc.text(`: ${rows.length}`, pageWidth-100, 100);
    doc.text(`: ${sudahParaf} dari ${rows.length}`, pageWidth-100, 116);

    const body = rows.map((r,i)=>[i+1, fmtDate(r.tanggal), r.judulBuku, r.bukuKe||"-", r.halaman||"-", r.kesan||"-", r.parafOrtu?"Sudah":"Belum"]);

    doc.autoTable({
      startY: 132,
      head: [["No","Tanggal","Judul Buku/Bacaan","Buku Ke","Halaman","Kesan/Pesan Singkat","Paraf Ortu"]],
      body,
      styles:{ fontSize:8.5, cellPadding:5, textColor:[30,30,30] },
      headStyles:{ fillColor:[12,78,48], textColor:255, fontStyle:"bold" },
      alternateRowStyles:{ fillColor:[244,240,228] },
      columnStyles:{ 0:{cellWidth:24}, 1:{cellWidth:58}, 3:{cellWidth:60}, 4:{cellWidth:55}, 6:{cellWidth:50} },
      margin:{left:40,right:40}
    });

    let finalY = rows.length ? doc.lastAutoTable.finalY + 20 : 150;
    if(!rows.length){
      doc.setFontSize(10);
      doc.setTextColor(120,120,120);
      doc.text("Belum ada catatan jurnal literasi untuk siswa ini.", 40, 150);
    }
    const printDate = new Date().toLocaleDateString("id-ID",{day:"2-digit",month:"long",year:"numeric"});
    const pageW = doc.internal.pageSize.getWidth();
    doc.setFontSize(9.5);
    doc.setTextColor(40,40,40);
    let fy = finalY;
    if(fy > doc.internal.pageSize.getHeight()-140){ doc.addPage(); fy = 50; }
    const sigY = fy + 30;
    doc.text(`Cirebon, ${printDate}`, pageW-40, sigY, { align:"right" });
    doc.text("Guru Kelas", pageW-40, sigY+14, { align:"right" });
    drawSignatureImage(doc, pageW, sigY+18, 46);
    const gid = document.getElementById("printGuruSelect")?.value;
    const guru = STATE.guru.find(g=>String(g.id)===String(gid));
    doc.text(guru ? guru.nama : "(______________________)", pageW-40, sigY+70, { align:"right" });

    addPageNumbers_(doc);

    const safeName = s.nama.replace(/[^a-zA-Z0-9]+/g,"-").replace(/^-+|-+$/g,"");
    doc.save(`Jurnal-Literasi-${safeName}-${todayISO()}.pdf`);

    if(s.hpOrtu){
      const phone = formatPhoneWa(s.hpOrtu);
      const waMsg = encodeURIComponent(
        `Assalamu'alaikum, Bapak/Ibu Wali dari ananda *${s.nama}*.\n\nBerikut Jurnal Literasi (catatan bacaan) ananda dari ${getKelasNama()}.\n\nJazakumullahu khairan.\n\n${waSignature()}`
      );
      const waUrl = `https://wa.me/${phone}?text=${waMsg}`;
      if(waWin){ waWin.location.href = waUrl; } else { window.open(waUrl, "_blank"); }
      toast(`Jurnal Literasi ${s.nama} diunduh & WA orang tua dibuka — lampirkan file PDF-nya secara manual.`);
    }else{
      if(waWin) waWin.close();
      toast(`Jurnal Literasi ${s.nama} berhasil diunduh. Nomor WA orang tua belum diisi — lengkapi di Data Siswa supaya WA terbuka otomatis.`);
    }
  }catch(err){
    if(waWin){ try{ waWin.close(); }catch(e){} }
    toast("Gagal membuat PDF Jurnal Literasi. Coba lagi.");
  }
}

/* ================= [BARU] NUMERASI — Program "30 Menit Numerasi" ================= */
/* Data ringkas program numerasi (Juli-Desember 2026), dipakai untuk menampilkan
   fokus materi tiap pekan pada halaman Numerasi. Sinkron dengan dokumen program
   "Program Numerasi Kelas 4 Ubay bin Ka'ab" yang disusun terpisah. */
const NUMERASI_PROGRAM = [
  { bulan:"Juli 2026", sesi:[
    { tema:"Detektif Bilangan", materi:"Membaca & menulis bilangan, nilai tempat, nilai angka", tujuan:"Diagnostik awal & penguatan struktur bilangan cacah sampai 10.000.", level:"Level 1" },
    { tema:"Numerasi Cerdas", materi:"Membandingkan & mengurutkan bilangan", tujuan:"Menguatkan kemampuan membandingkan bilangan dalam konteks data jumlah siswa.", level:"Level 1-2" },
  ]},
  { bulan:"Agustus 2026", sesi:[
    { tema:"Misi AKM", materi:"Komposisi & dekomposisi bilangan", tujuan:"Menguatkan struktur bilangan (komposisi/dekomposisi standar & non-standar).", level:"Level 1-2" },
    { tema:"Matematika di Sekolah", materi:"Penjumlahan & pengurangan (teknik simpan/pinjam)", tujuan:"Menguatkan operasi hitung bersusun dalam konteks nyata.", level:"Level 2" },
    { tema:"Detektif Bilangan", materi:"Perkalian (array, komutatif, tabel perkalian)", tujuan:"Menguatkan konsep perkalian sebagai array & sifat komutatif.", level:"Level 2" },
    { tema:"Berburu Pola", materi:"Pembagian & pengantar faktor", tujuan:"Menguatkan konsep pembagian & mengenal faktor bilangan.", level:"Level 2" },
  ]},
  { bulan:"September 2026", sesi:[
    { tema:"Tantangan Logika", materi:"Faktor & kelipatan (penguatan)", tujuan:"Menguatkan KPK & FPB sederhana melalui konteks jadwal.", level:"Level 2" },
    { tema:"Numerasi di Kantin", materi:"Operasi campuran dalam masalah sehari-hari", tujuan:"Menguatkan operasi campuran & alasan logis.", level:"Level 2-3" },
    { tema:"Tantangan Data", materi:"Membaca tabel/data + pembagian rata", tujuan:"Membaca data & pembagian rata sebagai jembatan ke pecahan.", level:"Level 2-3" },
    { tema:"Misi Pecahan", materi:"Pengantar penguatan pecahan", tujuan:"Mengenalkan kembali konsep pecahan sebagai bagian dari keseluruhan.", level:"Level 2" },
  ]},
  { bulan:"Oktober 2026", sesi:[
    { tema:"Misi Pecahan", materi:"Membandingkan pecahan berpenyebut sama", tujuan:"Menguatkan perbandingan & urutan pecahan.", level:"Level 2" },
    { tema:"Matematika di Rumah", materi:"Penjumlahan & pengurangan pecahan", tujuan:"Menguatkan operasi hitung pecahan dalam konteks resep.", level:"Level 2-3" },
    { tema:"Detektif Bilangan", materi:"Pecahan senilai (perkalian & pembagian)", tujuan:"Menguatkan penentuan pecahan senilai & penyederhanaan.", level:"Level 2-3" },
    { tema:"Tantangan Data", materi:"Pecahan desimal (persepuluhan & perseratusan)", tujuan:"Mengenalkan kembali bentuk desimal dari pecahan.", level:"Level 2-3" },
  ]},
  { bulan:"November 2026", sesi:[
    { tema:"Numerasi Cerdas", materi:"Hubungan persepuluhan & perseratusan", tujuan:"Menguatkan hubungan bentuk persepuluhan-perseratusan.", level:"Level 2" },
    { tema:"Numerasi di Kantin", materi:"Persen dan penerapannya", tujuan:"Menguatkan penerapan persen dalam kegiatan jual beli.", level:"Level 2-3" },
    { tema:"Tantangan Data", materi:"Hubungan pecahan-desimal-persen", tujuan:"Menguatkan konversi antar bentuk bilangan.", level:"Level 2-3" },
    { tema:"Misi AKM", materi:"Penerapan gabungan (tabungan & data kelas)", tujuan:"Melatih penalaran & pengambilan kesimpulan dari data persen.", level:"Level 3" },
  ]},
  { bulan:"Desember 2026", sesi:[
    { tema:"Berburu Pola", materi:"Pola gambar", tujuan:"Menguatkan kemampuan mengenali & melanjutkan pola gambar.", level:"Level 2-3" },
    { tema:"Berburu Pola", materi:"Pola bilangan", tujuan:"Menguatkan aturan & generalisasi pola bilangan.", level:"Level 2-3" },
    { tema:"Misi AKM", materi:"Latihan terpadu AKM", tujuan:"Melatih sintesis seluruh materi semester sebelum asesmen.", level:"Level 3" },
    { tema:"Asesmen", materi:"Asesmen Numerasi Akhir Semester", tujuan:"Mengukur ketercapaian penguatan numerasi selama 1 semester.", level:"Level 1-3" },
  ]},
];

function populateNumerasiSelects(){
  const bulanSel = document.getElementById("num_bulan");
  if(!bulanSel) return;
  if(!bulanSel.options.length){
    NUMERASI_PROGRAM.forEach((b,i)=>{
      const opt = document.createElement("option");
      opt.value = i; opt.textContent = b.bulan;
      bulanSel.appendChild(opt);
    });
  }
  populateNumerasiMingguSelect();
}
function populateNumerasiMingguSelect(){
  const bulanSel = document.getElementById("num_bulan");
  const mingguSel = document.getElementById("num_minggu");
  if(!bulanSel || !mingguSel) return;
  const bIdx = Number(bulanSel.value || 0);
  const bln = NUMERASI_PROGRAM[bIdx];
  mingguSel.innerHTML = "";
  (bln ? bln.sesi : []).forEach((s,i)=>{
    const opt = document.createElement("option");
    opt.value = i; opt.textContent = `Pekan ${i+1} — ${s.tema}`;
    mingguSel.appendChild(opt);
  });
}
function renderNumerasiInfoCard(){
  const bulanSel = document.getElementById("num_bulan");
  const mingguSel = document.getElementById("num_minggu");
  const card = document.getElementById("numerasiInfoCard");
  if(!bulanSel || !mingguSel || !card) return;
  const bln = NUMERASI_PROGRAM[Number(bulanSel.value || 0)];
  const s = bln ? bln.sesi[Number(mingguSel.value || 0)] : null;
  if(!s){ card.innerHTML = ""; return; }
  card.innerHTML = `
    <h4>🎯 ${escapeHtml(s.tema)} — ${escapeHtml(bln.bulan)}</h4>
    <div class="ni-row"><b>Materi:</b> ${escapeHtml(s.materi)}</div>
    <div class="ni-row"><b>Tujuan:</b> ${escapeHtml(s.tujuan)}</div>
    <div class="ni-row"><b>Level Kognitif:</b> ${escapeHtml(s.level)}</div>
    <div class="ni-row"><b>Alokasi:</b> 30 menit (5' pemantik - 20' mengerjakan - 5' pembahasan/refleksi)</div>`;
  const materiEl = document.getElementById("nl_materi");
  if(materiEl && !materiEl.value.trim()) materiEl.value = s.materi;
}

/* ---- Log Monitoring Pertemuan Numerasi (per siswa, bisa pilih lebih dari 1 sekaligus) ---- */
async function getNumerasiLogs(){
  const rows = await idbAll("numerasiLog");
  return rows.sort((a,b)=> (b.tanggal||"").localeCompare(a.tanggal||""));
}
function resetNumerasiLogForm(){
  const f = $id("numerasiLogForm");
  if(f) f.reset();
  setVal("nl_id", "");
  setVal("nl_tanggal", todayISO());
  STATE.numEditId = null;
  STATE.numSelectedNis = new Set();
  STATE.numStudentFilter = { q:"", lp:"" };
  const search = $id("numStudentSearch");
  if(search) search.value = "";
  document.querySelectorAll("#numLpFilter .chip").forEach(c=>c.classList.toggle("active", c.dataset.lp===""));
  setText("numerasiLogFormTitle", "Catatan Hasil Pertemuan (Monitoring)");
  setText("nl_submit", "Simpan Catatan");
  setHidden("numEditModeNote", true);
  renderNumStudentPicker();
}
async function handleNumerasiLogSubmit(e){
  e.preventDefault();
  if(STATE.numSelectedNis.size===0){ toast("Pilih minimal satu peserta didik."); return; }
  const common = {
    tanggal: document.getElementById("nl_tanggal").value || todayISO(),
    materi: document.getElementById("nl_materi").value.trim(),
    catatan: document.getElementById("nl_catatan").value.trim(),
    kategori: document.getElementById("nl_kategori").value,
    updatedAt: new Date().toISOString(),
  };
  const nisList = [...STATE.numSelectedNis];

  if(STATE.numEditId){
    const s = studentByNis(nisList[0]);
    const rec = { ...common, id: STATE.numEditId, nis: nisList[0], nama: s ? s.nama : "" };
    await idbPut("numerasiLog", rec);
    toast("Catatan pertemuan numerasi diperbarui.");
  }else{
    for(const nis of nisList){
      const s = studentByNis(nis);
      await idbPut("numerasiLog", { ...common, id: uuid(), nis, nama: s ? s.nama : "" });
    }
    toast(`Catatan pertemuan numerasi tersimpan untuk ${nisList.length} siswa.`);
  }
  STATE.numerasiLog = await getNumerasiLogs();
  resetNumerasiLogForm();
  renderNumerasiLogTable();
}
function numerasiKategoriBadge(kat){
  if(kat==="hijau") return `<span class="badge badge-good">Hijau</span>`;
  if(kat==="kuning") return `<span class="badge badge-warn">Kuning</span>`;
  if(kat==="merah") return `<span class="badge badge-bad">Merah</span>`;
  return "-";
}
async function renderNumerasiLogTable(){
  const tbody = document.querySelector("#numerasiLogTable tbody");
  if(!tbody) return;
  const rows = await getNumerasiLogs();
  if(!rows.length){
    tbody.innerHTML = `<tr><td colspan="6" class="muted" style="text-align:center;padding:20px;">Belum ada catatan pertemuan.</td></tr>`;
    return;
  }
  tbody.innerHTML = rows.map(r=>`
    <tr>
      <td class="mono">${fmtDate(r.tanggal)}</td>
      <td>${escapeHtml(r.nama||"-")}</td>
      <td>${escapeHtml(r.materi||"-")}</td>
      <td>${escapeHtml(r.catatan||"-")}</td>
      <td>${numerasiKategoriBadge(r.kategori)}</td>
      <td>
        <button class="btn-icon-sm" title="Edit" onclick="editNumerasiLog('${r.id}')">Edit</button>
        <button class="btn-icon-sm" title="Hapus" onclick="deleteNumerasiLog('${r.id}')">Hapus</button>
      </td>
    </tr>`).join("");
}
async function editNumerasiLog(id){
  const rows = await idbAll("numerasiLog");
  const r = rows.find(x=>x.id===id);
  if(!r) return;
  STATE.numEditId = id;
  STATE.numSelectedNis = new Set([r.nis]);
  STATE.numStudentFilter = { q:"", lp:"" };
  setVal("nl_id", r.id);
  setVal("nl_tanggal", r.tanggal || "");
  setVal("nl_materi", r.materi || "");
  setVal("nl_catatan", r.catatan || "");
  setVal("nl_kategori", r.kategori || "hijau");
  setText("numerasiLogFormTitle", "Edit Catatan Pertemuan Numerasi");
  setText("nl_submit", "Perbarui Catatan");
  setHidden("numEditModeNote", false);
  renderNumStudentPicker();
  document.getElementById("view-numerasi").scrollIntoView({ behavior:"smooth", block:"start" });
}
async function deleteNumerasiLog(id){
  const ok = await confirmDialog("Hapus catatan pertemuan numerasi ini?");
  if(!ok) return;
  await idbDelete("numerasiLog", id);
  toast("Catatan dihapus.");
  STATE.numerasiLog = await getNumerasiLogs();
  renderNumerasiLogTable();
}
/* [BARU] Ekspor Riwayat Pertemuan Numerasi ke Excel */
async function exportNumerasiLogXlsx(){
  if(!window.XLSX){ toast("Modul Excel belum siap."); return; }
  const rows = await getNumerasiLogs();
  const aoa = [["Tanggal","NIS","Nama Peserta Didik","Materi","Perlu Dikuatkan","Kategori"]];
  const kategoriLabel = { hijau:"Hijau", kuning:"Kuning", merah:"Merah" };
  rows.forEach(r=> aoa.push([fmtDate(r.tanggal), r.nis||"", r.nama||"", r.materi||"", r.catatan||"", kategoriLabel[r.kategori]||""]));
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = [{wch:14},{wch:16},{wch:26},{wch:34},{wch:34},{wch:10}];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Riwayat Numerasi");
  XLSX.writeFile(wb, `Riwayat-Pertemuan-Numerasi-${todayISO()}.xlsx`);
  toast("Excel Riwayat Numerasi berhasil diunduh.");
}
/* [BARU] Unduh template Excel untuk impor massal Catatan Hasil Pertemuan Numerasi. */
function downloadNumerasiTemplate(){
  if(!window.XLSX){ toast("Modul Excel belum siap."); return; }
  const data = [
    { "Tanggal (YYYY-MM-DD)":todayISO(), "NIS":"3160169851", "Nama Peserta Didik":"CONTOH NAMA SISWA",
      "Materi":"Membandingkan & mengurutkan bilangan", "Perlu Dikuatkan":"Pengurangan dengan teknik meminjam",
      "Kategori (Hijau/Kuning/Merah)":"Kuning" }
  ];
  const ws = XLSX.utils.json_to_sheet(data);
  ws["!cols"] = [{wch:18},{wch:16},{wch:26},{wch:34},{wch:34},{wch:20}];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Template Numerasi");
  XLSX.writeFile(wb, `Template-Catatan-Pertemuan-Numerasi.xlsx`);
  toast("Template Excel berhasil diunduh.");
}
/* [BARU] Impor massal Catatan Hasil Pertemuan Numerasi dari Excel (mengikuti kolom template).
   Setiap baris dicocokkan ke peserta didik lewat kolom NIS (diutamakan) atau Nama Peserta
   Didik (dicocokkan persis ke Data Siswa) — baris yang siswanya tidak ditemukan dilewati. */
async function importNumerasiXlsx(file){
  if(!window.XLSX){ toast("Modul Excel belum siap."); return; }
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type:"array", cellDates:true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { defval:"" });
  let count = 0, dilewati = 0;
  for(const row of rows){
    const tanggal = excelDateToISO(row["Tanggal (YYYY-MM-DD)"] ?? row.Tanggal ?? "");
    if(!tanggal) continue;
    const nisRaw = String(row.NIS ?? row.nis ?? "").trim();
    const namaRaw = String(row["Nama Peserta Didik"] ?? row.Nama ?? "").trim();
    let s = nisRaw ? studentByNis(nisRaw) : null;
    if(!s && namaRaw){
      s = STATE.siswa.find(x=>x.nama.trim().toLowerCase()===namaRaw.toLowerCase());
    }
    if(!s){ dilewati++; continue; }
    const kategoriRaw = String(row["Kategori (Hijau/Kuning/Merah)"] ?? row.Kategori ?? "").trim().toLowerCase();
    const kategori = ["hijau","kuning","merah"].includes(kategoriRaw) ? kategoriRaw : "hijau";
    const record = {
      id: uuid(),
      nis: s.nis,
      nama: s.nama,
      tanggal,
      materi: String(row.Materi ?? "").trim(),
      catatan: String(row["Perlu Dikuatkan"] ?? row.Catatan ?? "").trim(),
      kategori,
      updatedAt: new Date().toISOString()
    };
    await idbPut("numerasiLog", record);
    count++;
  }
  STATE.numerasiLog = await getNumerasiLogs();
  await renderNumerasiLogTable();
  toast(count
    ? `${count} catatan pertemuan numerasi berhasil diimpor${dilewati ? `, ${dilewati} baris dilewati karena siswa tidak ditemukan` : ""}.`
    : "Tidak ada baris valid yang ditemukan pada file Excel (pastikan NIS atau Nama Peserta Didik cocok dengan Data Siswa).");
}

/* ---- Menu khusus: Perkalian & Pembagian (tetap di halaman Numerasi) ---- */
let numKbSearchQuery = "";
async function getNumerasiKaliBagiMap(){
  const rows = await idbAll("numerasiKaliBagi");
  const map = {};
  rows.forEach(r=> map[r.nis] = r);
  return map;
}
async function saveNumerasiKaliBagiField(nis, nama, field, value){
  const rows = await idbAll("numerasiKaliBagi");
  let row = rows.find(r=>r.nis===nis);
  if(!row){ row = { nis, nama, perkalian1_5:"kuning", perkalian6_10:"kuning", pembagian1_5:"kuning", pembagian6_10:"kuning", catatan:"" }; }
  row.nama = nama;
  row[field] = value;
  row.updatedAt = new Date().toISOString();
  await idbPut("numerasiKaliBagi", row);
}
function nkbSelectHtml(nis, field, current){
  const val = current || "kuning";
  return `<select class="nkb-select st-${val}" data-nis="${nis}" data-field="${field}" onchange="onNkbChange(this)">
    <option value="hijau" ${val==="hijau"?"selected":""}>Hijau</option>
    <option value="kuning" ${val==="kuning"?"selected":""}>Kuning</option>
    <option value="merah" ${val==="merah"?"selected":""}>Merah</option>
  </select>`;
}
async function onNkbChange(sel){
  const nis = sel.dataset.nis, field = sel.dataset.field, val = sel.value;
  const nama = sel.closest("tr")?.dataset.nama || "";
  sel.className = `nkb-select st-${val}`;
  await saveNumerasiKaliBagiField(nis, nama, field, val);
  toast("Status tersimpan.");
  renderNumerasiKaliBagiStats();
}
async function onNkbNoteChange(inp){
  const nis = inp.dataset.nis;
  const nama = inp.closest("tr")?.dataset.nama || "";
  await saveNumerasiKaliBagiField(nis, nama, "catatan", inp.value.trim());
}
async function renderNumerasiKaliBagiStats(){
  const wrap = document.getElementById("numerasiKaliBagiStats");
  if(!wrap) return;
  const map = await getNumerasiKaliBagiMap();
  const students = STATE.siswa || [];
  const fields = ["perkalian1_5","perkalian6_10","pembagian1_5","pembagian6_10"];
  let hijau=0, kuning=0, merah=0, total=0;
  students.forEach(s=>{
    const row = map[s.nis];
    fields.forEach(f=>{
      total++;
      const v = row ? (row[f]||"kuning") : "kuning";
      if(v==="hijau") hijau++; else if(v==="merah") merah++; else kuning++;
    });
  });
  wrap.innerHTML = `
    <div class="nkb-stat"><b style="color:var(--green-700)">${hijau}</b><span>Sudah Menguasai</span></div>
    <div class="nkb-stat"><b style="color:var(--gold-700)">${kuning}</b><span>Perlu Penguatan</span></div>
    <div class="nkb-stat"><b style="color:var(--brick-700)">${merah}</b><span>Perlu Pendampingan</span></div>
    <div class="nkb-stat"><b>${total}</b><span>Total Catatan (siswa × aspek)</span></div>`;
}
async function renderNumerasiKaliBagiTable(){
  const tbody = document.querySelector("#numerasiKaliBagiTable tbody");
  if(!tbody) return;
  const map = await getNumerasiKaliBagiMap();
  let students = (STATE.siswa || []).slice().sort((a,b)=> String(a.nama||"").localeCompare(String(b.nama||"")));
  if(numKbSearchQuery){
    const q = numKbSearchQuery.toLowerCase();
    students = students.filter(s=> String(s.nama||"").toLowerCase().includes(q));
  }
  if(!students.length){
    tbody.innerHTML = `<tr><td colspan="7" class="muted" style="text-align:center;padding:20px;">Belum ada data siswa. Tambahkan di menu Data Siswa terlebih dahulu.</td></tr>`;
    return;
  }
  tbody.innerHTML = students.map((s,i)=>{
    const row = map[s.nis] || {};
    return `<tr data-nama="${escapeHtml(s.nama||"")}">
      <td>${i+1}</td>
      <td>${escapeHtml(s.nama||"-")}</td>
      <td>${nkbSelectHtml(s.nis,"perkalian1_5",row.perkalian1_5)}</td>
      <td>${nkbSelectHtml(s.nis,"perkalian6_10",row.perkalian6_10)}</td>
      <td>${nkbSelectHtml(s.nis,"pembagian1_5",row.pembagian1_5)}</td>
      <td>${nkbSelectHtml(s.nis,"pembagian6_10",row.pembagian6_10)}</td>
      <td><input type="text" class="nkb-note-input" value="${escapeHtml(row.catatan||"")}" data-nis="${s.nis}" placeholder="Catatan singkat (opsional)" onchange="onNkbNoteChange(this)"></td>
    </tr>`;
  }).join("");
}

async function renderNumerasiView(){
  populateNumerasiSelects();
  renderNumerasiInfoCard();
  if(!document.getElementById("nl_tanggal").value) document.getElementById("nl_tanggal").value = todayISO();
  await renderNumerasiLogTable();
  await renderNumerasiKaliBagiTable();
  await renderNumerasiKaliBagiStats();
}

/* ============================================================================
   [BARU] ---------- UJIAN (Formatif F1–F10, Sumatif Tengah/Akhir Semester) ----------
   Input nilai PER MAPEL & PER SEMESTER: pilih Mapel + Semester + Jenis Ujian, lalu
   seluruh peserta didik dimuat sekaligus dalam satu tabel isian (grid), sehingga
   guru cukup mengetik nilai tiap anak lalu menyimpan semuanya dalam satu kali klik.
   Rekap nilai bisa dilaporkan per siswa (semua mapel dalam 1 semester) ke WA orang tua.
   ============================================================================ */
const UJIAN_JENIS_LIST = [
  { key:"F1",  label:"Formatif 1" },  { key:"F2",  label:"Formatif 2" },
  { key:"F3",  label:"Formatif 3" },  { key:"F4",  label:"Formatif 4" },
  { key:"F5",  label:"Formatif 5" },  { key:"F6",  label:"Formatif 6" },
  { key:"F7",  label:"Formatif 7" },  { key:"F8",  label:"Formatif 8" },
  { key:"F9",  label:"Formatif 9" },  { key:"F10", label:"Formatif 10" },
  { key:"STS", label:"Sumatif Tengah Semester" },
  { key:"SAS", label:"Sumatif Akhir Semester" }
];
function ujianJenisLabel(key){
  const j = UJIAN_JENIS_LIST.find(x=>x.key===key);
  if(!j) return key||"-";
  return (key==="STS"||key==="SAS") ? j.label : `${j.label} (${j.key})`;
}
function ujianJenisOptionsHtml(){
  return UJIAN_JENIS_LIST.map(j=>{
    const label = (j.key==="STS"||j.key==="SAS") ? j.label : `${j.label} (${j.key})`;
    return `<option value="${j.key}">${label}</option>`;
  }).join("");
}
function ujianMapelOptionsHtml(){
  return JURNAL_MAPEL_LIST.map(m=>`<option value="${m.key}">${escapeHtml(m.nama)}</option>`).join("");
}
function ujianMapelNama(key){
  const m = JURNAL_MAPEL_LIST.find(x=>x.key===key);
  return m ? m.nama : (key||"-");
}
STATE.ujianRekapFilter = { q:"", mapel:"", semester:"", jenis:"" };

function populateUjianSelects(){
  const mapelSel = document.getElementById("uj_mapel");
  if(mapelSel && !mapelSel.dataset.filled){ mapelSel.insertAdjacentHTML("beforeend", ujianMapelOptionsHtml()); mapelSel.dataset.filled = "1"; }
  const jenisSel = document.getElementById("uj_jenis");
  if(jenisSel && !jenisSel.dataset.filled){ jenisSel.insertAdjacentHTML("beforeend", ujianJenisOptionsHtml()); jenisSel.dataset.filled = "1"; }
  const rekapMapelSel = document.getElementById("ujRekapMapelFilter");
  if(rekapMapelSel && !rekapMapelSel.dataset.filled){ rekapMapelSel.insertAdjacentHTML("beforeend", ujianMapelOptionsHtml()); rekapMapelSel.dataset.filled = "1"; }
  const rekapJenisSel = document.getElementById("ujRekapJenisFilter");
  if(rekapJenisSel && !rekapJenisSel.dataset.filled){ rekapJenisSel.insertAdjacentHTML("beforeend", ujianJenisOptionsHtml()); rekapJenisSel.dataset.filled = "1"; }
  const waSel = document.getElementById("ujWaSiswaSelect");
  if(waSel){
    const cur = waSel.value;
    const students = [...STATE.siswa].sort((a,b)=>a.nama.localeCompare(b.nama,"id"));
    waSel.innerHTML = `<option value="">Pilih Siswa untuk Kirim WA&hellip;</option>` +
      students.map(s=>`<option value="${s.nis}">${escapeHtml(s.nama)}${s.hpOrtu?"":" (No. WA belum diisi)"}</option>`).join("");
    waSel.value = cur;
  }
  const semSel = document.getElementById("uj_semester");
  if(semSel && !semSel.dataset.defaulted){ semSel.value = getSchoolSettings().semester; semSel.dataset.defaulted = "1"; }
}

async function renderUjianView(){
  populateUjianSelects();
  populateKokPertemuanSelect();
  renderUjianGrid();
  renderUjianRekapTable();
  renderKokRekapTable();
}

/* ---- Grid isian nilai (per Mapel + Semester + Jenis Ujian, seluruh siswa sekaligus) ---- */
function renderUjianGrid(){
  const gridWrap = document.getElementById("ujianGridWrap");
  if(!gridWrap) return;
  const mapel = document.getElementById("uj_mapel").value;
  const semester = document.getElementById("uj_semester").value;
  const jenis = document.getElementById("uj_jenis").value;

  /* [BARU] Mapel Kokurikuler pakai form & rubrik penilaian proyek yang sama sekali
     berbeda (4 kriteria, per pertemuan Jumat) — bukan Jenis Ujian F1-F10/STS/SAS
     biasa. Sembunyikan grid standar + Jenis Ujian, tampilkan panel khusus. */
  const isKok = mapel === "kokurikuler";
  setHidden("uj_jenis_wrap", isKok);
  setHidden("uj_kokPertemuan_wrap", !isKok);
  setHidden("kokJurnalHeadPanel", !isKok);
  if(isKok){
    gridWrap.innerHTML = "";
    populateKokPertemuanSelect();
    renderKokGrid();
    return;
  }

  if(!mapel || !jenis){
    gridWrap.innerHTML = `<p class="muted" style="text-align:center;padding:20px 0;">Pilih Mapel dan Jenis Ujian dahulu untuk memuat daftar peserta didik.</p>`;
    return;
  }
  const students = [...STATE.siswa].sort((a,b)=>a.nama.localeCompare(b.nama,"id"));
  if(!students.length){
    gridWrap.innerHTML = `<p class="muted" style="text-align:center;padding:20px 0;">Belum ada Data Siswa. Isi Data Siswa terlebih dahulu.</p>`;
    return;
  }
  const existing = (STATE.ujian||[]).filter(u=>u.mapel===mapel && u.semester===semester && u.jenisUjian===jenis);
  const byNis = {}; existing.forEach(u=> byNis[u.nis] = u);

  gridWrap.innerHTML = `
    <div class="table-wrap">
      <table class="data-table" id="ujianGridTable">
        <thead><tr><th style="width:36px;">No</th><th>Nama Peserta Didik</th><th style="width:110px;">Nilai (0&ndash;100)</th><th>Catatan</th></tr></thead>
        <tbody>
          ${students.map((s,i)=>{
            const rec = byNis[s.nis];
            return `<tr data-nis="${s.nis}">
              <td>${i+1}</td>
              <td>${escapeHtml(s.nama)}</td>
              <td><input type="number" class="uj-nilai-input" min="0" max="100" step="1" value="${rec && rec.nilai!==undefined && rec.nilai!==null ? rec.nilai : ""}"></td>
              <td><input type="text" class="uj-catatan-input" value="${escapeHtml(rec ? (rec.catatan||"") : "")}" placeholder="cth. Perlu remedial"></td>
            </tr>`;
          }).join("")}
        </tbody>
      </table>
    </div>
    <div class="form-actions" style="margin-top:10px;">
      <button type="button" class="btn btn-primary" id="ujSimpanSemuaBtn">Simpan Semua Nilai</button>
    </div>
    <p class="muted" style="font-size:.8rem;margin-top:8px;">Baris yang kotak Nilainya dikosongkan lalu disimpan akan menghapus nilai yang sebelumnya tersimpan untuk siswa tersebut.</p>
  `;
  const btn = document.getElementById("ujSimpanSemuaBtn");
  if(btn) btn.addEventListener("click", handleUjianSimpanSemua);
}

async function handleUjianSimpanSemua(){
  const mapel = document.getElementById("uj_mapel").value;
  const semester = document.getElementById("uj_semester").value;
  const jenis = document.getElementById("uj_jenis").value;
  if(!mapel || !jenis){ toast("Pilih Mapel dan Jenis Ujian terlebih dahulu."); return; }

  const rows = document.querySelectorAll("#ujianGridTable tbody tr");
  const existing = (STATE.ujian||[]).filter(u=>u.mapel===mapel && u.semester===semester && u.jenisUjian===jenis);
  const byNis = {}; existing.forEach(u=> byNis[u.nis] = u);

  let disimpan = 0, dihapus = 0;
  for(const row of rows){
    const nis = row.dataset.nis;
    const s = studentByNis(nis);
    const nilaiRaw = row.querySelector(".uj-nilai-input").value;
    const catatan = row.querySelector(".uj-catatan-input").value.trim();
    const existingRec = byNis[nis];

    if(nilaiRaw === ""){
      if(existingRec){ await idbDelete("ujian", existingRec.id); dihapus++; }
      continue;
    }
    let nilai = Number(nilaiRaw);
    if(isNaN(nilai)) continue;
    nilai = Math.max(0, Math.min(100, nilai));
    const rec = {
      id: existingRec ? existingRec.id : uuid(),
      nis, nama: s ? s.nama : (existingRec ? existingRec.nama : ""),
      mapel, semester, jenisUjian: jenis,
      nilai, catatan,
      updatedAt: new Date().toISOString()
    };
    await idbPut("ujian", rec);
    disimpan++;
  }
  STATE.ujian = await idbAll("ujian");
  toast(`${disimpan} nilai tersimpan${dihapus ? `, ${dihapus} dihapus` : ""}.`);
  renderUjianGrid();
  renderUjianRekapTable();
}

/* ---- Rekap Nilai (tabel & filter, ekspor, impor) ---- */
function getUjianRekapFiltered(){
  const { q, mapel, semester, jenis } = STATE.ujianRekapFilter;
  let rows = [...(STATE.ujian||[])];
  if(mapel) rows = rows.filter(r=>r.mapel===mapel);
  if(semester) rows = rows.filter(r=>r.semester===semester);
  if(jenis) rows = rows.filter(r=>r.jenisUjian===jenis);
  if(q){
    const qq = q.toLowerCase();
    rows = rows.filter(r=>String(r.nama||"").toLowerCase().includes(qq));
  }
  return rows.sort((a,b)=> String(a.nama||"").localeCompare(String(b.nama||""),"id") || String(a.jenisUjian||"").localeCompare(String(b.jenisUjian||"")));
}
function ujianNilaiBadge(n){
  if(n===undefined || n===null || n==="") return "-";
  const cls = n>=75 ? "badge-good" : (n>=60 ? "badge-warn" : "badge-bad");
  return `<span class="badge ${cls}">${n}</span>`;
}
function renderUjianRekapTable(){
  const tbody = document.querySelector("#ujianRekapTable tbody");
  if(!tbody) return;
  const rows = getUjianRekapFiltered();
  const countEl = document.getElementById("ujRekapCount");
  if(countEl) countEl.textContent = `${rows.length} data`;
  tbody.innerHTML = rows.length ? rows.map(r=>`
    <tr>
      <td>${escapeHtml(r.nama||"-")}</td>
      <td>${escapeHtml(ujianMapelNama(r.mapel))}</td>
      <td>${escapeHtml(r.semester||"-")}</td>
      <td>${escapeHtml(ujianJenisLabel(r.jenisUjian))}</td>
      <td>${ujianNilaiBadge(r.nilai)}</td>
      <td>${escapeHtml(r.catatan||"-")}</td>
      <td><button class="danger" onclick="deleteUjianNilai('${r.id}')">Hapus</button></td>
    </tr>`).join("") : `<tr><td colspan="7" class="muted" style="text-align:center;padding:20px;">Belum ada data nilai yang cocok dengan filter.</td></tr>`;
}
async function deleteUjianNilai(id){
  const ok = await confirmDialog("Hapus data nilai ujian ini?");
  if(!ok) return;
  await idbDelete("ujian", id);
  STATE.ujian = await idbAll("ujian");
  toast("Data nilai dihapus.");
  renderUjianGrid();
  renderUjianRekapTable();
}

/* ---- Ekspor PDF Rekap Nilai (sesuai filter yang sedang aktif) ---- */
async function exportUjianPdf(){
  if(!window.jspdf){ toast("Modul PDF belum siap."); return; }
  const rows = getUjianRekapFiltered();
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation:"landscape", unit:"pt", format:"a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const logo = await loadLogoBase64();
  const set = getSchoolSettings();
  if(logo){ try{ doc.addImage(logo, "PNG", 40, 20, 40, 40); }catch(e){} }
  doc.setFont("helvetica","bold"); doc.setFontSize(13); doc.setTextColor(12,78,48);
  doc.text(SCHOOL.nama.toUpperCase(), pageWidth/2, 32, { align:"center" });
  doc.setFontSize(14); doc.setTextColor(20,20,20);
  doc.text("REKAP NILAI UJIAN", pageWidth/2, 50, { align:"center" });
  doc.setFont("helvetica","normal"); doc.setFontSize(10); doc.setTextColor(90,90,90);
  doc.text(`${set.kelas} — Tahun Pelajaran ${set.tahun}`, pageWidth/2, 66, { align:"center" });

  const body = rows.map(r=>[r.nama||"-", ujianMapelNama(r.mapel), r.semester||"-", ujianJenisLabel(r.jenisUjian), r.nilai ?? "-", r.catatan||"-"]);
  doc.autoTable({
    startY: 82,
    head: [["Nama Peserta Didik","Mapel","Semester","Jenis Ujian","Nilai","Catatan"]],
    body,
    styles:{ fontSize:8.5, cellPadding:5, textColor:[30,30,30] },
    headStyles:{ fillColor:[12,78,48], textColor:255, fontStyle:"bold" },
    alternateRowStyles:{ fillColor:[244,240,228] },
    margin:{left:40,right:40}
  });

  /* [BARU] Blok tanda tangan Guru Kelas (nama dari Data Guru/Kontak, tanda tangan
     digital dari Pengaturan bila sudah diunggah) — sebelumnya PDF ini tidak
     menyertakan blok tanda tangan sama sekali. */
  let fy = doc.lastAutoTable.finalY + 30;
  if(fy > doc.internal.pageSize.getHeight()-110){ doc.addPage(); fy = 50; }
  const printDate = new Date().toLocaleDateString("id-ID",{day:"2-digit",month:"long",year:"numeric"});
  const pageW = pageWidth;
  const sigY = fy;
  doc.setFont("helvetica","normal"); doc.setFontSize(9.5); doc.setTextColor(40,40,40);
  doc.text(`Cirebon, ${printDate}`, pageW-40, sigY, { align:"right" });
  doc.text("Guru Kelas", pageW-40, sigY+14, { align:"right" });
  drawSignatureImage(doc, pageW, sigY+18, 46);
  doc.text(getGuruName() || "(______________________)", pageW-40, sigY+70, { align:"right" });

  addPageNumbers_(doc);
  doc.save(`Rekap-Nilai-Ujian-${todayISO()}.pdf`);
  toast("PDF Rekap Nilai Ujian berhasil diunduh.");
}

/* ---- Ekspor Excel Rekap Nilai (sesuai filter yang sedang aktif) ---- */
function exportUjianXlsx(){
  if(!window.XLSX){ toast("Modul Excel belum siap."); return; }
  const rows = getUjianRekapFiltered();
  const aoa = [["Nama Peserta Didik","Mapel","Semester","Jenis Ujian","Nilai","Catatan"]];
  rows.forEach(r=> aoa.push([r.nama||"", ujianMapelNama(r.mapel), r.semester||"", ujianJenisLabel(r.jenisUjian), r.nilai ?? "", r.catatan||""]));
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = [{wch:26},{wch:20},{wch:10},{wch:26},{wch:8},{wch:34}];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Rekap Nilai Ujian");
  XLSX.writeFile(wb, `Rekap-Nilai-Ujian-${todayISO()}.xlsx`);
  toast("Excel Rekap Nilai Ujian berhasil diunduh.");
}
/* ---- Template & Impor Excel massal (per Mapel+Semester+Jenis Ujian, dicocokkan lewat NIS/Nama) ----
   [BARU] Ada 2 versi template karena strukturnya tidak sama:
   1) downloadUjianTemplate()  -> untuk Mapel Akademik biasa (IPAS, Bahasa Indonesia,
      Pendidikan Pancasila, Matematika, Seni Rupa) yang pakai Jenis Ujian F1-F10/STS/SAS + Nilai.
   2) downloadKokTemplate()    -> khusus Mapel Kokurikuler yang pakai rubrik 4 kriteria
      (K1-K4) per pertemuan Bulan/Pekan, BUKAN Jenis Ujian F1-F10/STS/SAS. Mapel Kokurikuler
      sengaja dikeluarkan dari template & impor no.1 supaya tidak lagi salah pakai template. */
function downloadUjianTemplate(){
  if(!window.XLSX){ toast("Modul Excel belum siap."); return; }
  const data = [
    { "NIS":"3160169851", "Nama Peserta Didik":"CONTOH NAMA SISWA", "Mapel":"Matematika",
      "Semester (Ganjil/Genap)":"Ganjil", "Jenis Ujian (F1-F10/STS/SAS)":"F1", "Nilai":85, "Catatan":"" }
  ];
  const ws = XLSX.utils.json_to_sheet(data);
  ws["!cols"] = [{wch:16},{wch:26},{wch:20},{wch:20},{wch:24},{wch:8},{wch:30}];
  /* Catatan pemakaian, ditulis di sheet ke-2, supaya jelas template ini bukan untuk Kokurikuler. */
  const mapelAkademik = JURNAL_MAPEL_LIST.filter(m=>m.key!=="kokurikuler").map(m=>m.nama);
  const wsCatatan = XLSX.utils.aoa_to_sheet([
    ["Template ini KHUSUS untuk Mapel Akademik biasa (bukan Kokurikuler):"],
    ...mapelAkademik.map(n=>[`- ${n}`]),
    [""],
    ["Untuk Mapel Kokurikuler, gunakan tombol \"Unduh Template Excel\" pada panel",
     "\"Rekap Penilaian Proyek Kokurikuler\" (struktur kolomnya berbeda: Bulan, Pekan, K1-K4)."]
  ]);
  wsCatatan["!cols"] = [{wch:70}];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Template Nilai Ujian");
  XLSX.utils.book_append_sheet(wb, wsCatatan, "Baca Dulu");
  XLSX.writeFile(wb, `Template-Nilai-Ujian.xlsx`);
  toast("Template Excel berhasil diunduh.");
}
/* [BARU] Template Excel khusus Mapel Kokurikuler — kolomnya mengikuti rubrik 4 kriteria
   (K1-K4, skor 1-4) per pertemuan Bulan/Pekan, sesuai form "Penilaian Proyek Kokurikuler".
   Disertakan sheet ke-2 berisi daftar Bulan/Pekan yang valid (diambil dari Jurnal Mengajar
   Kokurikuler) supaya kolom Bulan & Pekan diisi konsisten saat diimpor kembali. */
function downloadKokTemplate(){
  if(!window.XLSX){ toast("Modul Excel belum siap."); return; }
  const list = getKokurikulerPertemuanList();
  const contoh = list[0] || { bulan:"Juli", pertemuanNo:1 };
  const data = [
    { "NIS":"3160169851", "Nama Peserta Didik":"CONTOH NAMA SISWA",
      "Bulan":contoh.bulan, "Pekan (No. Pertemuan)":contoh.pertemuanNo,
      "K1 - Keaktifan & Fokus (1-4)":4, "K2 - Keterlibatan Proyek (1-4)":4,
      "K3 - Kemandirian (1-4)":3, "K4 - Akhlak & Kerjasama (1-4)":4,
      "Catatan Anekdot":"" }
  ];
  const ws = XLSX.utils.json_to_sheet(data);
  ws["!cols"] = [{wch:16},{wch:26},{wch:12},{wch:20},{wch:24},{wch:24},{wch:20},{wch:24},{wch:32}];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Template Kokurikuler");

  const refAoa = [["Bulan","Pekan","Kode TP","Judul / Topik"]];
  list.forEach(p=> refAoa.push([p.bulan, p.pertemuanNo, p.kodeTP, p.judul]));
  const wsRef = XLSX.utils.aoa_to_sheet(refAoa);
  wsRef["!cols"] = [{wch:14},{wch:8},{wch:14},{wch:70}];
  XLSX.utils.book_append_sheet(wb, wsRef, "Daftar Bulan-Pekan");

  XLSX.writeFile(wb, `Template-Penilaian-Proyek-Kokurikuler.xlsx`);
  toast("Template Excel Kokurikuler berhasil diunduh.");
}
async function importUjianXlsx(file){
  if(!window.XLSX){ toast("Modul Excel belum siap."); return; }
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type:"array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { defval:"" });
  let count = 0, dilewati = 0;
  for(const row of rows){
    const nisRaw = String(row.NIS ?? row.nis ?? "").trim();
    const namaRaw = String(row["Nama Peserta Didik"] ?? row.Nama ?? "").trim();
    let s = nisRaw ? studentByNis(nisRaw) : null;
    if(!s && namaRaw) s = STATE.siswa.find(x=>x.nama.trim().toLowerCase()===namaRaw.toLowerCase());
    if(!s){ dilewati++; continue; }

    const mapelRaw = String(row.Mapel ?? "").trim().toLowerCase();
    /* Mapel Kokurikuler sengaja tidak dicocokkan di sini — pakai importKokXlsx() & template
       khusus Kokurikuler, karena strukturnya (Bulan/Pekan/K1-K4) berbeda dari ujian biasa. */
    const mapelObj = JURNAL_MAPEL_LIST.find(m=>m.key!=="kokurikuler" && (m.nama.toLowerCase()===mapelRaw || m.key===mapelRaw));
    if(!mapelObj){ dilewati++; continue; }

    const semesterRaw = String(row["Semester (Ganjil/Genap)"] ?? row.Semester ?? "").trim();
    const semester = /genap/i.test(semesterRaw) ? "Genap" : "Ganjil";

    const jenisRaw = String(row["Jenis Ujian (F1-F10/STS/SAS)"] ?? row["Jenis Ujian"] ?? "").trim().toUpperCase();
    const jenisObj = UJIAN_JENIS_LIST.find(j=>j.key===jenisRaw);
    if(!jenisObj){ dilewati++; continue; }

    const nilaiNum = Number(row.Nilai);
    if(isNaN(nilaiNum)){ dilewati++; continue; }

    const existing = (STATE.ujian||[]).find(u=>u.nis===s.nis && u.mapel===mapelObj.key && u.semester===semester && u.jenisUjian===jenisObj.key);
    const rec = {
      id: existing ? existing.id : uuid(),
      nis: s.nis, nama: s.nama, mapel: mapelObj.key, semester, jenisUjian: jenisObj.key,
      nilai: Math.max(0, Math.min(100, nilaiNum)),
      catatan: String(row.Catatan ?? "").trim(),
      updatedAt: new Date().toISOString()
    };
    await idbPut("ujian", rec);
    count++;
  }
  STATE.ujian = await idbAll("ujian");
  renderUjianGrid();
  renderUjianRekapTable();
  toast(count
    ? `${count} nilai ujian berhasil diimpor${dilewati ? `, ${dilewati} baris dilewati` : ""}.`
    : "Tidak ada baris valid yang ditemukan (pastikan NIS/Nama, Mapel, dan Jenis Ujian sesuai template).");
}

/* ---- [BARU] Ekspor PDF Rekap Nilai KHUSUS 1 Siswa (semua mapel, 1 semester) + Kirim WA Ortu ---- */
function exportUjianPdfSiswaPrompt(){
  const sel = document.getElementById("ujWaSiswaSelect");
  const nis = sel ? sel.value : "";
  if(!nis){ toast("Pilih peserta didik terlebih dahulu."); return; }
  const semesterSel = document.getElementById("ujWaSemesterSelect");
  const semester = semesterSel ? semesterSel.value : "Ganjil";
  generateUjianPdfSiswaAndKirimWa(nis, semester);
}
async function generateUjianPdfSiswaAndKirimWa(nis, semester){
  const s = studentByNis(nis);
  if(!s){ toast("Data siswa tidak ditemukan."); return; }
  if(!window.jspdf){ toast("Modul PDF belum siap, coba lagi."); return; }
  if(typeof window.jspdf.jsPDF.API.autoTable !== "function"){
    toast("Modul tabel PDF (autoTable) belum termuat. Periksa koneksi internet lalu muat ulang halaman.");
    return;
  }
  const rows = (STATE.ujian||[])
    .filter(u=>u.nis===nis && u.semester===semester)
    .sort((a,b)=> ujianMapelNama(a.mapel).localeCompare(ujianMapelNama(b.mapel),"id") || String(a.jenisUjian).localeCompare(String(b.jenisUjian)));

  let waWin = null;
  if(s.hpOrtu){ waWin = window.open("", "_blank"); }

  try{
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation:"portrait", unit:"pt", format:"a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const logo = await loadLogoBase64();
    const set = getSchoolSettings();

    if(logo){ try{ doc.addImage(logo, "PNG", 40, 24, 46, 46); }catch(e){} }
    doc.setFont("helvetica","bold"); doc.setFontSize(12.5); doc.setTextColor(12,78,48);
    doc.text(SCHOOL.nama.toUpperCase(), pageWidth/2, 36, { align:"center" });
    doc.setFontSize(14); doc.setTextColor(20,20,20);
    doc.text("REKAP NILAI UJIAN SISWA", pageWidth/2, 54, { align:"center" });
    doc.setFont("helvetica","normal"); doc.setFontSize(10); doc.setTextColor(90,90,90);
    doc.text(`${set.kelas} — Semester ${semester} — Tahun Pelajaran ${set.tahun}`, pageWidth/2, 70, { align:"center" });
    doc.setDrawColor(201,162,39); doc.setLineWidth(1.2);
    doc.line(40, 80, pageWidth-40, 80);

    doc.setFontSize(10.5); doc.setTextColor(30,30,30); doc.setFont("helvetica","bold");
    doc.text("Nama Peserta Didik", 40, 100);
    doc.text("NIS", 40, 116);
    doc.setFont("helvetica","normal");
    doc.text(`: ${s.nama}`, 150, 100);
    doc.text(`: ${s.nis}`, 150, 116);

    const body = rows.map(r=>[ujianMapelNama(r.mapel), ujianJenisLabel(r.jenisUjian), r.nilai ?? "-", r.catatan||"-"]);
    doc.autoTable({
      startY: 132,
      head: [["Mapel","Jenis Ujian","Nilai","Catatan"]],
      body,
      styles:{ fontSize:8.5, cellPadding:5, textColor:[30,30,30] },
      headStyles:{ fillColor:[12,78,48], textColor:255, fontStyle:"bold" },
      alternateRowStyles:{ fillColor:[244,240,228] },
      columnStyles:{ 2:{cellWidth:45} },
      margin:{left:40,right:40}
    });

    let finalY = rows.length ? doc.lastAutoTable.finalY + 20 : 150;
    if(!rows.length){
      doc.setFontSize(10); doc.setTextColor(120,120,120);
      doc.text(`Belum ada nilai ujian untuk siswa ini pada Semester ${semester}.`, 40, 150);
    }
    const printDate = new Date().toLocaleDateString("id-ID",{day:"2-digit",month:"long",year:"numeric"});
    const pageW = doc.internal.pageSize.getWidth();
    doc.setFontSize(9.5); doc.setTextColor(40,40,40);
    let fy = finalY;
    if(fy > doc.internal.pageSize.getHeight()-140){ doc.addPage(); fy = 50; }
    const sigY = fy + 30;
    doc.text(`Cirebon, ${printDate}`, pageW-40, sigY, { align:"right" });
    doc.text("Guru Kelas", pageW-40, sigY+14, { align:"right" });
    drawSignatureImage(doc, pageW, sigY+18, 46);
    const gid = document.getElementById("printGuruSelect")?.value;
    const guru = STATE.guru.find(g=>String(g.id)===String(gid));
    doc.text(guru ? guru.nama : "(______________________)", pageW-40, sigY+70, { align:"right" });

    addPageNumbers_(doc);
    const safeName = s.nama.replace(/[^a-zA-Z0-9]+/g,"-").replace(/^-+|-+$/g,"");
    doc.save(`Rekap-Nilai-Ujian-${safeName}-Semester-${semester}-${todayISO()}.pdf`);

    if(s.hpOrtu){
      const phone = formatPhoneWa(s.hpOrtu);
      const waMsg = encodeURIComponent(
        `Assalamu'alaikum, Bapak/Ibu Wali dari ananda *${s.nama}*.\n\nBerikut Rekap Nilai Ujian ananda untuk Semester ${semester} di ${getKelasNama()}.\n\nJazakumullahu khairan.\n\n${waSignature()}`
      );
      const waUrl = `https://wa.me/${phone}?text=${waMsg}`;
      if(waWin){ waWin.location.href = waUrl; } else { window.open(waUrl, "_blank"); }
      toast(`Rekap Nilai Ujian ${s.nama} diunduh & WA orang tua dibuka — lampirkan file PDF-nya secara manual.`);
    }else{
      if(waWin) waWin.close();
      toast(`Rekap Nilai Ujian ${s.nama} berhasil diunduh. Nomor WA orang tua belum diisi — lengkapi di Data Siswa.`);
    }
  }catch(err){
    if(waWin){ try{ waWin.close(); }catch(e){} }
    toast("Gagal membuat PDF Rekap Nilai Ujian. Coba lagi.");
  }
}

/* ============================================================================
   [BARU] ---------- PENILAIAN PROYEK KOKURIKULER (Pertemuan Hari Jumat) ----------
   Rubrik 4 kriteria (skor 1-4 tiap kriteria, total 4-16, Nilai = Total/16*100,
   Predikat A/B/C/D otomatis) — mengikuti format "JURNAL & FORMAT PENILAIAN
   PROYEK PERTEMUAN HARI JUMAT" sekolah. Topik/Tahap & Hari/Tanggal disinkronkan
   dari susunan Jurnal Mengajar Kokurikuler (JURNAL_SUBJECTS.kokurikuler.babList)
   supaya penilaian selalu mengacu pada pertemuan yang sama dengan jurnal mengajar.
   ============================================================================ */
STATE.kokRekapFilter = { q:"", pertemuan:"" };

/* Kunci unik 1 pertemuan kokurikuler, dipakai sebagai value <option> & filter. */
function kokPertemuanKey(babNo, pertemuanNo){ return `${babNo}-${pertemuanNo}`; }
/* Ratakan seluruh bab (bulan) + pertemuan (pekan) Kokurikuler jadi satu daftar
   pilihan datar "Bulan - Pekan: Judul", diambil PERSIS dari data Jurnal Mengajar
   supaya topik pertemuan tidak pernah berbeda antara Jurnal Mengajar & Ujian. */
function getKokurikulerPertemuanList(){
  const babList = (JURNAL_SUBJECTS.kokurikuler && JURNAL_SUBJECTS.kokurikuler.babList) || [];
  const list = [];
  babList.forEach(bab=>{
    (bab.pertemuan||[]).forEach(p=>{
      list.push({ babNo:bab.no, bulan:bab.judul, pertemuanNo:p.no, kodeTP:p.kodeTP, judul:p.judul });
    });
  });
  return list;
}
function populateKokPertemuanSelect(){
  const sel = document.getElementById("uj_kokPertemuan");
  const filterSel = document.getElementById("kokRekapBulanFilter");
  const waSel = document.getElementById("kokWaSiswaSelect");
  const list = getKokurikulerPertemuanList();
  if(sel && !sel.dataset.filled){
    sel.insertAdjacentHTML("beforeend", list.map(p=>
      `<option value="${kokPertemuanKey(p.babNo,p.pertemuanNo)}">${escapeHtml(p.bulan)} — ${escapeHtml(p.kodeTP)}: ${escapeHtml(p.judul)}</option>`
    ).join(""));
    sel.dataset.filled = "1";
  }
  if(filterSel && !filterSel.dataset.filled){
    filterSel.insertAdjacentHTML("beforeend", list.map(p=>
      `<option value="${kokPertemuanKey(p.babNo,p.pertemuanNo)}">${escapeHtml(p.bulan)} — ${escapeHtml(p.kodeTP)}</option>`
    ).join(""));
    filterSel.dataset.filled = "1";
  }
  if(waSel){
    const cur = waSel.value;
    const students = [...STATE.siswa].sort((a,b)=>a.nama.localeCompare(b.nama,"id"));
    waSel.innerHTML = `<option value="">Pilih Siswa untuk Kirim WA&hellip;</option>` +
      students.map(s=>`<option value="${s.nis}">${escapeHtml(s.nama)}${s.hpOrtu?"":" (No. WA belum diisi)"}</option>`).join("");
    waSel.value = cur;
  }
}
/* Saat pertemuan dipilih: isi otomatis Topik (dari jurnal) & Tanggal (dari isian
   Jurnal Mengajar untuk pertemuan itu, kalau sudah pernah diisi di sana). */
function handleKokPertemuanChange(){
  const val = document.getElementById("uj_kokPertemuan").value;
  if(!val){ renderKokGrid(); return; }
  const [babNo, pertemuanNo] = val.split("-").map(Number);
  const list = getKokurikulerPertemuanList();
  const p = list.find(x=>x.babNo===babNo && x.pertemuanNo===pertemuanNo);
  if(p) setVal("kok_topik", p.judul);
  const jurnalEntry = getJurnalEntry("kokurikuler", babNo, pertemuanNo);
  if(jurnalEntry && jurnalEntry.hariTanggal) setVal("kok_tanggal", jurnalEntry.hariTanggal);
  renderKokGrid();
}
function kokurikulerPredikat(total){
  if(total>=14) return "A";
  if(total>=11) return "B";
  if(total>=8) return "C";
  return "D";
}
function kokPredikatBadge(pred){
  const cls = pred==="A" ? "badge-good" : pred==="B" ? "badge-good" : pred==="C" ? "badge-warn" : "badge-bad";
  return `<span class="badge ${cls}">${pred}</span>`;
}
function kokHitungBaris(row){
  const k1 = Number(row.querySelector(".kok-k1").value) || 0;
  const k2 = Number(row.querySelector(".kok-k2").value) || 0;
  const k3 = Number(row.querySelector(".kok-k3").value) || 0;
  const k4 = Number(row.querySelector(".kok-k4").value) || 0;
  const total = k1+k2+k3+k4;
  const nilai = total>0 ? Math.round((total/16)*100) : 0;
  const predikat = total>0 ? kokurikulerPredikat(total) : "-";
  row.querySelector(".kok-total").textContent = total>0 ? total : "-";
  row.querySelector(".kok-nilai").textContent = total>0 ? nilai : "-";
  row.querySelector(".kok-predikat").innerHTML = total>0 ? kokPredikatBadge(predikat) : "-";
}
function renderKokGrid(){
  const wrap = document.getElementById("kokGridWrap");
  if(!wrap) return;
  const val = document.getElementById("uj_kokPertemuan").value;
  if(!val){
    wrap.innerHTML = `<p class="muted" style="text-align:center;padding:20px 0;">Pilih Pertemuan (Bulan/Pekan) dahulu untuk memuat daftar peserta didik.</p>`;
    return;
  }
  const [babNo, pertemuanNo] = val.split("-").map(Number);
  const students = [...STATE.siswa].sort((a,b)=>a.nama.localeCompare(b.nama,"id"));
  if(!students.length){
    wrap.innerHTML = `<p class="muted" style="text-align:center;padding:20px 0;">Belum ada Data Siswa. Isi Data Siswa terlebih dahulu.</p>`;
    return;
  }
  const existing = (STATE.kokurikulerNilai||[]).filter(k=>k.babNo===babNo && k.pertemuanNo===pertemuanNo);
  const byNis = {}; existing.forEach(k=> byNis[k.nis] = k);

  wrap.innerHTML = `
    <div class="table-wrap">
      <table class="data-table" id="kokGridTable">
        <thead>
          <tr>
            <th style="width:32px;">No</th><th>Nama Peserta Didik</th>
            <th style="width:56px;">K1<br><span class="muted" style="font-weight:400;">Keaktifan &amp; Fokus</span></th>
            <th style="width:56px;">K2<br><span class="muted" style="font-weight:400;">Ket. Proyek</span></th>
            <th style="width:56px;">K3<br><span class="muted" style="font-weight:400;">Kemandirian</span></th>
            <th style="width:56px;">K4<br><span class="muted" style="font-weight:400;">Akhlak &amp; Kerjasama</span></th>
            <th style="width:52px;">Total</th><th style="width:52px;">Nilai</th><th style="width:56px;">Predikat</th>
            <th>Catatan Anekdot / Perilaku Siswa</th>
          </tr>
        </thead>
        <tbody>
          ${students.map((s,i)=>{
            const rec = byNis[s.nis];
            const v = (n)=> rec && rec[n] ? rec[n] : "";
            return `<tr data-nis="${s.nis}">
              <td>${i+1}</td>
              <td>${escapeHtml(s.nama)}</td>
              <td><select class="kok-k1 kok-skor-input"><option value="" ${!v("k1")?"selected":""}>-</option>${[1,2,3,4].map(n=>`<option value="${n}" ${String(v("k1"))===String(n)?"selected":""}>${n}</option>`).join("")}</select></td>
              <td><select class="kok-k2 kok-skor-input"><option value="" ${!v("k2")?"selected":""}>-</option>${[1,2,3,4].map(n=>`<option value="${n}" ${String(v("k2"))===String(n)?"selected":""}>${n}</option>`).join("")}</select></td>
              <td><select class="kok-k3 kok-skor-input"><option value="" ${!v("k3")?"selected":""}>-</option>${[1,2,3,4].map(n=>`<option value="${n}" ${String(v("k3"))===String(n)?"selected":""}>${n}</option>`).join("")}</select></td>
              <td><select class="kok-k4 kok-skor-input"><option value="" ${!v("k4")?"selected":""}>-</option>${[1,2,3,4].map(n=>`<option value="${n}" ${String(v("k4"))===String(n)?"selected":""}>${n}</option>`).join("")}</select></td>
              <td class="kok-total">${rec ? rec.totalSkor : "-"}</td>
              <td class="kok-nilai">${rec ? rec.nilaiAkhir : "-"}</td>
              <td class="kok-predikat">${rec ? kokPredikatBadge(rec.predikat) : "-"}</td>
              <td><input type="text" class="kok-catatan-input" value="${escapeHtml(rec ? (rec.catatan||"") : "")}" placeholder="cth. Aktif memimpin kelompok"></td>
            </tr>`;
          }).join("")}
        </tbody>
      </table>
    </div>
    <div class="form-actions" style="margin-top:10px;">
      <button type="button" class="btn btn-primary" id="kokSimpanSemuaBtn">Simpan Semua Penilaian</button>
    </div>
    <p class="muted" style="font-size:.8rem;margin-top:8px;">Total, Nilai Akhir (Total&divide;16&times;100), dan Predikat dihitung otomatis begitu keempat kriteria diisi. Baris yang salah satu kriterianya masih kosong akan dilewati saat disimpan.</p>
  `;
  wrap.querySelectorAll(".kok-skor-input").forEach(sel=>{
    sel.addEventListener("change", (e)=> kokHitungBaris(e.target.closest("tr")));
  });
  const btn = document.getElementById("kokSimpanSemuaBtn");
  if(btn) btn.addEventListener("click", handleKokSimpanSemua);
}
async function handleKokSimpanSemua(){
  const val = document.getElementById("uj_kokPertemuan").value;
  if(!val){ toast("Pilih Pertemuan (Bulan/Pekan) terlebih dahulu."); return; }
  const [babNo, pertemuanNo] = val.split("-").map(Number);
  const list = getKokurikulerPertemuanList();
  const p = list.find(x=>x.babNo===babNo && x.pertemuanNo===pertemuanNo);
  const bulan = p ? p.bulan : "";
  const tanggal = document.getElementById("kok_tanggal").value || "";
  const topik = document.getElementById("kok_topik").value.trim() || (p ? p.judul : "");

  const rows = document.querySelectorAll("#kokGridTable tbody tr");
  const existing = (STATE.kokurikulerNilai||[]).filter(k=>k.babNo===babNo && k.pertemuanNo===pertemuanNo);
  const byNis = {}; existing.forEach(k=> byNis[k.nis] = k);

  let disimpan = 0, dilewati = 0;
  for(const row of rows){
    const nis = row.dataset.nis;
    const s = studentByNis(nis);
    const k1 = row.querySelector(".kok-k1").value, k2 = row.querySelector(".kok-k2").value;
    const k3 = row.querySelector(".kok-k3").value, k4 = row.querySelector(".kok-k4").value;
    const catatan = row.querySelector(".kok-catatan-input").value.trim();
    const existingRec = byNis[nis];

    if(!k1 || !k2 || !k3 || !k4){
      if(!k1 && !k2 && !k3 && !k4 && !catatan) continue; // baris memang belum disentuh sama sekali
      dilewati++;
      continue;
    }
    const totalSkor = Number(k1)+Number(k2)+Number(k3)+Number(k4);
    const nilaiAkhir = Math.round((totalSkor/16)*100);
    const predikat = kokurikulerPredikat(totalSkor);
    const rec = {
      id: existingRec ? existingRec.id : uuid(),
      nis, nama: s ? s.nama : (existingRec ? existingRec.nama : ""),
      babNo, bulan, pertemuanNo, topik, tanggal,
      k1:Number(k1), k2:Number(k2), k3:Number(k3), k4:Number(k4),
      totalSkor, nilaiAkhir, predikat, catatan,
      updatedAt: new Date().toISOString()
    };
    await idbPut("kokurikulerNilai", rec);
    disimpan++;
  }
  STATE.kokurikulerNilai = await idbAll("kokurikulerNilai");
  toast(`${disimpan} penilaian proyek tersimpan${dilewati ? `, ${dilewati} dilewati karena ada kriteria yang belum lengkap` : ""}.`);
  renderKokGrid();
  renderKokRekapTable();
}

/* [BARU] Impor Excel massal khusus Kokurikuler — dipasangkan dengan downloadKokTemplate().
   Baris dicocokkan lewat NIS/Nama + Bulan/Pekan (bukan Jenis Ujian), lalu Total/Nilai/Predikat
   dihitung ulang otomatis dari skor K1-K4, sama seperti pengisian manual di kokGridWrap. */
async function importKokXlsx(file){
  if(!window.XLSX){ toast("Modul Excel belum siap."); return; }
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type:"array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { defval:"" });
  const list = getKokurikulerPertemuanList();
  let count = 0, dilewati = 0;
  for(const row of rows){
    const nisRaw = String(row.NIS ?? row.nis ?? "").trim();
    const namaRaw = String(row["Nama Peserta Didik"] ?? row.Nama ?? "").trim();
    let s = nisRaw ? studentByNis(nisRaw) : null;
    if(!s && namaRaw) s = STATE.siswa.find(x=>x.nama.trim().toLowerCase()===namaRaw.toLowerCase());
    if(!s){ dilewati++; continue; }

    const bulanRaw = String(row.Bulan ?? "").trim().toLowerCase();
    const pekanRaw = Number(row["Pekan (No. Pertemuan)"] ?? row.Pekan ?? row.Pertemuan);
    const p = list.find(x=> String(x.bulan).trim().toLowerCase()===bulanRaw && x.pertemuanNo===pekanRaw);
    if(!p){ dilewati++; continue; }

    const k1 = Number(row["K1 - Keaktifan & Fokus (1-4)"] ?? row.K1);
    const k2 = Number(row["K2 - Keterlibatan Proyek (1-4)"] ?? row.K2);
    const k3 = Number(row["K3 - Kemandirian (1-4)"] ?? row.K3);
    const k4 = Number(row["K4 - Akhlak & Kerjasama (1-4)"] ?? row.K4);
    if([k1,k2,k3,k4].some(n=> !Number.isFinite(n) || n<1 || n>4)){ dilewati++; continue; }

    const totalSkor = k1+k2+k3+k4;
    const nilaiAkhir = Math.round((totalSkor/16)*100);
    const predikat = kokurikulerPredikat(totalSkor);
    const catatan = String(row["Catatan Anekdot"] ?? row.Catatan ?? "").trim();

    const existing = (STATE.kokurikulerNilai||[]).find(k=>k.nis===s.nis && k.babNo===p.babNo && k.pertemuanNo===p.pertemuanNo);
    const rec = {
      id: existing ? existing.id : uuid(),
      nis: s.nis, nama: s.nama,
      babNo: p.babNo, bulan: p.bulan, pertemuanNo: p.pertemuanNo, topik: p.judul,
      tanggal: existing ? (existing.tanggal||"") : "",
      k1, k2, k3, k4, totalSkor, nilaiAkhir, predikat, catatan,
      updatedAt: new Date().toISOString()
    };
    await idbPut("kokurikulerNilai", rec);
    count++;
  }
  STATE.kokurikulerNilai = await idbAll("kokurikulerNilai");
  renderKokGrid();
  renderKokRekapTable();
  toast(count
    ? `${count} penilaian proyek Kokurikuler berhasil diimpor${dilewati ? `, ${dilewati} baris dilewati` : ""}.`
    : `Tidak ada baris valid yang ditemukan (pastikan NIS/Nama, Bulan, dan Pekan sesuai sheet "Daftar Bulan-Pekan").`);
}

/* ---- Rekap Penilaian Proyek Kokurikuler ---- */
function getKokRekapFiltered(){
  const { q, pertemuan } = STATE.kokRekapFilter;
  let rows = [...(STATE.kokurikulerNilai||[])];
  if(pertemuan){
    const [babNo, pertemuanNo] = pertemuan.split("-").map(Number);
    rows = rows.filter(r=>r.babNo===babNo && r.pertemuanNo===pertemuanNo);
  }
  if(q){
    const qq = q.toLowerCase();
    rows = rows.filter(r=>String(r.nama||"").toLowerCase().includes(qq));
  }
  return rows.sort((a,b)=> (b.babNo-a.babNo) || (b.pertemuanNo-a.pertemuanNo) || String(a.nama||"").localeCompare(String(b.nama||""),"id"));
}
function renderKokRekapTable(){
  const tbody = document.querySelector("#kokRekapTable tbody");
  if(!tbody) return;
  const rows = getKokRekapFiltered();
  const countEl = document.getElementById("kokRekapCount");
  if(countEl) countEl.textContent = `${rows.length} data`;
  tbody.innerHTML = rows.length ? rows.map(r=>`
    <tr>
      <td>${escapeHtml(r.nama||"-")}</td>
      <td>${escapeHtml(r.bulan||"-")} &ndash; Pekan ${r.pertemuanNo}</td>
      <td>${escapeHtml(r.topik||"-")}</td>
      <td>${r.k1}</td><td>${r.k2}</td><td>${r.k3}</td><td>${r.k4}</td>
      <td>${r.totalSkor}</td><td>${r.nilaiAkhir}</td>
      <td>${kokPredikatBadge(r.predikat)}</td>
      <td>${escapeHtml(r.catatan||"-")}</td>
      <td><button class="danger" onclick="deleteKokNilai('${r.id}')">Hapus</button></td>
    </tr>`).join("") : `<tr><td colspan="12" class="muted" style="text-align:center;padding:20px;">Belum ada data penilaian proyek yang cocok dengan filter.</td></tr>`;
}
async function deleteKokNilai(id){
  const ok = await confirmDialog("Hapus data penilaian proyek ini?");
  if(!ok) return;
  await idbDelete("kokurikulerNilai", id);
  STATE.kokurikulerNilai = await idbAll("kokurikulerNilai");
  toast("Data penilaian dihapus.");
  renderKokGrid();
  renderKokRekapTable();
}
/* ---- Ekspor PDF Rekap (mengikuti format "Jurnal & Format Penilaian Proyek") ---- */
async function exportKokPdf(){
  if(!(await ensurePdfLib())) return;
  const rows = getKokRekapFiltered();
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation:"landscape", unit:"pt", format:"a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const logo = await loadLogoBase64();
  const set = getSchoolSettings();
  if(logo){ try{ doc.addImage(logo, "PNG", 40, 18, 38, 38); }catch(e){} }
  doc.setFont("helvetica","bold"); doc.setFontSize(12.5); doc.setTextColor(12,78,48);
  doc.text(SCHOOL.nama.toUpperCase(), pageWidth/2, 30, { align:"center" });
  doc.setFontSize(13); doc.setTextColor(20,20,20);
  doc.text("JURNAL & FORMAT PENILAIAN PROYEK — PERTEMUAN HARI JUMAT", pageWidth/2, 46, { align:"center" });
  doc.setFont("helvetica","normal"); doc.setFontSize(9.5); doc.setTextColor(90,90,90);
  doc.text(`${set.kelas} — Semester Ganjil — Tahun Pelajaran ${set.tahun}`, pageWidth/2, 60, { align:"center" });

  const body = rows.map(r=>[r.nama||"-", `${r.bulan||"-"} - Pekan ${r.pertemuanNo}`, r.topik||"-", r.k1, r.k2, r.k3, r.k4, r.totalSkor, r.nilaiAkhir, r.predikat, r.catatan||"-"]);
  doc.autoTable({
    startY: 74,
    head: [["Nama Peserta Didik","Pertemuan","Topik/Tahap","K1","K2","K3","K4","Total","Nilai","Predikat","Catatan Anekdot"]],
    body,
    styles:{ fontSize:7.8, cellPadding:4, textColor:[30,30,30] },
    headStyles:{ fillColor:[12,78,48], textColor:255, fontStyle:"bold" },
    alternateRowStyles:{ fillColor:[244,240,228] },
    columnStyles:{ 3:{cellWidth:22,halign:"center"}, 4:{cellWidth:22,halign:"center"}, 5:{cellWidth:22,halign:"center"}, 6:{cellWidth:22,halign:"center"}, 7:{cellWidth:32,halign:"center"}, 8:{cellWidth:32,halign:"center"}, 9:{cellWidth:36,halign:"center"} },
    margin:{left:40,right:40}
  });

  /* [BARU] Blok tanda tangan khusus di rekap ini HANYA memakai tanda tangan digital
     dari Pengaturan (Guru Kelas) — sengaja TIDAK memakai nama "Guru Kokurikuler"
     (KOKURIKULER_GURU) seperti pada PDF per-siswa, sesuai permintaan. Kalau tanda
     tangan digital belum diunggah di Pengaturan, kolomnya tetap kosong (tidak
     menampilkan apa pun) — bukan kotak kosong untuk tanda tangan basah. */
  const sig = getSignatureData();
  if(sig){
    let fy = doc.lastAutoTable.finalY + 24;
    if(fy > doc.internal.pageSize.getHeight()-90){ doc.addPage(); fy = 50; }
    const pageW = pageWidth;
    const sigY = fy;
    doc.setFont("helvetica","normal"); doc.setFontSize(9.5); doc.setTextColor(40,40,40);
    doc.text("Guru Kelas", pageW-40, sigY, { align:"right" });
    drawSignatureImage(doc, pageW, sigY+4, 46);
    doc.text(getGuruName() || "", pageW-40, sigY+58, { align:"right" });
  }

  addPageNumbers_(doc);
  doc.save(`Penilaian-Proyek-Kokurikuler-${todayISO()}.pdf`);
  toast("PDF Rekap Penilaian Proyek Kokurikuler berhasil diunduh.");
}
function exportKokXlsx(){
  if(!window.XLSX){ toast("Modul Excel belum siap."); return; }
  const rows = getKokRekapFiltered();
  const aoa = [["Nama Peserta Didik","Bulan","Pekan","Topik/Tahap","K1","K2","K3","K4","Total Skor","Nilai Akhir","Predikat","Catatan Anekdot"]];
  rows.forEach(r=> aoa.push([r.nama||"", r.bulan||"", r.pertemuanNo, r.topik||"", r.k1, r.k2, r.k3, r.k4, r.totalSkor, r.nilaiAkhir, r.predikat, r.catatan||""]));
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = [{wch:26},{wch:12},{wch:8},{wch:34},{wch:6},{wch:6},{wch:6},{wch:6},{wch:10},{wch:10},{wch:10},{wch:34}];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Penilaian Proyek Kokurikuler");
  XLSX.writeFile(wb, `Penilaian-Proyek-Kokurikuler-${todayISO()}.xlsx`);
  toast("Excel Rekap Penilaian Proyek Kokurikuler berhasil diunduh.");
}
/* ---- PDF & Kirim WA Ortu per siswa (seluruh pertemuan proyek 1 semester) ---- */
function exportKokPdfSiswaPrompt(){
  const sel = document.getElementById("kokWaSiswaSelect");
  const nis = sel ? sel.value : "";
  if(!nis){ toast("Pilih peserta didik terlebih dahulu."); return; }
  generateKokPdfSiswaAndKirimWa(nis);
}
async function generateKokPdfSiswaAndKirimWa(nis){
  const s = studentByNis(nis);
  if(!s){ toast("Data siswa tidak ditemukan."); return; }
  if(!(await ensurePdfLib())) return;

  const rows = (STATE.kokurikulerNilai||[])
    .filter(k=>k.nis===nis)
    .sort((a,b)=> a.babNo-b.babNo || a.pertemuanNo-b.pertemuanNo);

  let waWin = null;
  if(s.hpOrtu){ waWin = window.open("", "_blank"); }

  try{
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation:"landscape", unit:"pt", format:"a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const logo = await loadLogoBase64();
    const set = getSchoolSettings();

    if(logo){ try{ doc.addImage(logo, "PNG", 40, 18, 38, 38); }catch(e){} }
    doc.setFont("helvetica","bold"); doc.setFontSize(12.5); doc.setTextColor(12,78,48);
    doc.text(SCHOOL.nama.toUpperCase(), pageWidth/2, 30, { align:"center" });
    doc.setFontSize(13); doc.setTextColor(20,20,20);
    doc.text("REKAP PENILAIAN PROYEK KOKURIKULER SISWA", pageWidth/2, 46, { align:"center" });
    doc.setFont("helvetica","normal"); doc.setFontSize(9.5); doc.setTextColor(90,90,90);
    doc.text(`${set.kelas} — Semester Ganjil — Tahun Pelajaran ${set.tahun}`, pageWidth/2, 60, { align:"center" });
    doc.setDrawColor(201,162,39); doc.setLineWidth(1.1);
    doc.line(40, 68, pageWidth-40, 68);

    doc.setFontSize(10); doc.setTextColor(30,30,30); doc.setFont("helvetica","bold");
    doc.text("Nama Peserta Didik", 40, 84); doc.text("NIS", 40, 98);
    doc.setFont("helvetica","normal");
    doc.text(`: ${s.nama}`, 150, 84); doc.text(`: ${s.nis}`, 150, 98);

    const body = rows.map(r=>[`${r.bulan||"-"} - Pekan ${r.pertemuanNo}`, r.topik||"-", r.k1, r.k2, r.k3, r.k4, r.totalSkor, r.nilaiAkhir, r.predikat, r.catatan||"-"]);
    doc.autoTable({
      startY: 112,
      head: [["Pertemuan","Topik/Tahap","K1","K2","K3","K4","Total","Nilai","Predikat","Catatan Anekdot"]],
      body,
      styles:{ fontSize:8, cellPadding:4.5, textColor:[30,30,30] },
      headStyles:{ fillColor:[12,78,48], textColor:255, fontStyle:"bold" },
      alternateRowStyles:{ fillColor:[244,240,228] },
      columnStyles:{ 2:{cellWidth:24,halign:"center"}, 3:{cellWidth:24,halign:"center"}, 4:{cellWidth:24,halign:"center"}, 5:{cellWidth:24,halign:"center"}, 6:{cellWidth:36,halign:"center"}, 7:{cellWidth:36,halign:"center"}, 8:{cellWidth:44,halign:"center"} },
      margin:{left:40,right:40}
    });

    let finalY = rows.length ? doc.lastAutoTable.finalY + 18 : 130;
    if(!rows.length){
      doc.setFontSize(10); doc.setTextColor(120,120,120);
      doc.text("Belum ada penilaian proyek kokurikuler untuk siswa ini.", 40, 130);
    }
    const printDate = new Date().toLocaleDateString("id-ID",{day:"2-digit",month:"long",year:"numeric"});
    const pageW = doc.internal.pageSize.getWidth();
    doc.setFontSize(9.5); doc.setTextColor(40,40,40);
    let fy = finalY;
    if(fy > doc.internal.pageSize.getHeight()-120){ doc.addPage(); fy = 50; }
    const sigY = fy + 26;
    doc.text(`Cirebon, ${printDate}`, pageW-40, sigY, { align:"right" });
    doc.text("Guru Kokurikuler", pageW-40, sigY+14, { align:"right" });
    drawSignatureImage(doc, pageW, sigY+18, 30);
    doc.text(KOKURIKULER_GURU || "(______________________)", pageW-40, sigY+58, { align:"right" });

    addPageNumbers_(doc);
    const safeName = s.nama.replace(/[^a-zA-Z0-9]+/g,"-").replace(/^-+|-+$/g,"");
    doc.save(`Penilaian-Proyek-Kokurikuler-${safeName}-${todayISO()}.pdf`);

    if(s.hpOrtu){
      const phone = formatPhoneWa(s.hpOrtu);
      const waMsg = encodeURIComponent(
        `Assalamu'alaikum, Bapak/Ibu Wali dari ananda *${s.nama}*.\n\nBerikut Rekap Penilaian Proyek Kokurikuler (Pertemuan Hari Jumat) ananda di ${getKelasNama()}.\n\nJazakumullahu khairan.\n\n${waSignature()}`
      );
      const waUrl = `https://wa.me/${phone}?text=${waMsg}`;
      if(waWin){ waWin.location.href = waUrl; } else { window.open(waUrl, "_blank"); }
      toast(`Rekap Proyek Kokurikuler ${s.nama} diunduh & WA orang tua dibuka — lampirkan file PDF-nya secara manual.`);
    }else{
      if(waWin) waWin.close();
      toast(`Rekap Proyek Kokurikuler ${s.nama} berhasil diunduh. Nomor WA orang tua belum diisi — lengkapi di Data Siswa.`);
    }
  }catch(err){
    if(waWin){ try{ waWin.close(); }catch(e){} }
    toast("Gagal membuat PDF Rekap Proyek Kokurikuler. Coba lagi.");
  }
}

/* ---------- Wire up events ---------- */
function wireEvents(){
  document.querySelectorAll(".nav-item").forEach(btn=>{
    btn.addEventListener("click", ()=>switchView(btn.dataset.view));
  });
  document.getElementById("trendModeMinggu").addEventListener("click", ()=>setTrendMode("minggu"));
  document.getElementById("trendModeBulan").addEventListener("click", ()=>setTrendMode("bulan"));
  document.getElementById("trendModeBab").addEventListener("click", ()=>setTrendMode("bab"));
  document.getElementById("hamburger").addEventListener("click", ()=>{
    document.getElementById("sidebar").classList.toggle("open");
    document.getElementById("scrim").classList.toggle("show");
  });
  document.getElementById("scrim").addEventListener("click", closeSidebarMobile);
  document.getElementById("themeToggle").addEventListener("click", toggleTheme);

  document.getElementById("tugasForm").addEventListener("submit", handleFormSubmit);
  const fPekanSel = document.getElementById("f_pekan");
  if(fPekanSel) fPekanSel.addEventListener("change", togglePekanManual);
  const fMapelInput = document.getElementById("f_mapel");
  if(fMapelInput) fMapelInput.addEventListener("input", ()=>applyMapelSpecialFields(true));

  const dokumenCopyBtn = document.getElementById("dokumenCopyBtn");
  if(dokumenCopyBtn) dokumenCopyBtn.addEventListener("click", async ()=>{
    const link = document.getElementById("dokumenDriveLink").value;
    try{
      if(navigator.clipboard && navigator.clipboard.writeText){
        await navigator.clipboard.writeText(link);
      }else{
        const el = document.getElementById("dokumenDriveLink");
        el.select(); el.setSelectionRange(0, 99999);
        document.execCommand("copy");
      }
      toast("Link folder Google Drive disalin.");
    }catch(e){
      toast("Gagal menyalin link. Salin manual dari kotak teks di atas.");
    }
  });
  const autoCatatanBtn = document.getElementById("autoCatatanBtn");
  if(autoCatatanBtn) autoCatatanBtn.addEventListener("click", isiCatatanOtomatis);
  const fStatusEl = document.getElementById("f_status");
  if(fStatusEl) fStatusEl.addEventListener("change", ()=>{
    const catatanEl = document.getElementById("f_catatan");
    if(catatanEl && !catatanEl.value.trim()) isiCatatanOtomatis(); // isi otomatis hanya bila kosong
  });
  document.getElementById("f_reset").addEventListener("click", resetForm);

  /* [BARU] Form tambah/edit Jadwal Pelajaran */
  document.getElementById("jadwalForm").addEventListener("submit", submitJadwalForm);
  document.getElementById("jadwalFormCancelBtn").addEventListener("click", cancelEditJadwal);

  /* [BARU] Jurnal Literasi Siswa */
  document.getElementById("literasiForm").addEventListener("submit", handleLiterasiSubmit);
  document.getElementById("lt_siswa").addEventListener("change", toggleLiterasiManualField);
  document.getElementById("lt_reset").addEventListener("click", resetLiterasiForm);
  document.getElementById("litExportPdfBtn").addEventListener("click", exportLiterasiPdf);
  document.getElementById("litExportXlsxBtn").addEventListener("click", exportLiterasiXlsx);
  const litTemplateBtn = document.getElementById("litTemplateBtn");
  if(litTemplateBtn) litTemplateBtn.addEventListener("click", downloadLiterasiTemplate);
  const litImportInput = document.getElementById("litImportInput");
  if(litImportInput) litImportInput.addEventListener("change", (e)=>{ if(e.target.files[0]) importLiterasiXlsx(e.target.files[0]); e.target.value=""; });
  const litExportWaBtn = document.getElementById("litExportWaBtn");
  if(litExportWaBtn) litExportWaBtn.addEventListener("click", exportLiterasiPdfSiswaPrompt);
  const litSearchEl = document.getElementById("litSearchBox");
  if(litSearchEl) litSearchEl.addEventListener("input", debounce(()=>{
    STATE.literasiFilters.q = litSearchEl.value.trim();
    renderLiterasiView();
  }, 200));
  const litFilterSiswaEl = document.getElementById("litFilterSiswa");
  if(litFilterSiswaEl) litFilterSiswaEl.addEventListener("change", ()=>{
    STATE.literasiFilters.siswa = litFilterSiswaEl.value;
    renderLiterasiView();
  });
  const litFilterParafEl = document.getElementById("litFilterParaf");
  if(litFilterParafEl) litFilterParafEl.addEventListener("change", ()=>{
    STATE.literasiFilters.paraf = litFilterParafEl.value;
    renderLiterasiView();
  });
  const litDariEl = document.getElementById("litFilterDariTgl");
  if(litDariEl) litDariEl.addEventListener("change", ()=>{
    STATE.literasiFilters.dari = litDariEl.value;
    renderLiterasiView();
  });
  const litSampaiEl = document.getElementById("litFilterSampaiTgl");
  if(litSampaiEl) litSampaiEl.addEventListener("change", ()=>{
    STATE.literasiFilters.sampai = litSampaiEl.value;
    renderLiterasiView();
  });
  const litClearBtn = document.getElementById("litClearFilters");
  if(litClearBtn) litClearBtn.addEventListener("click", ()=>{
    STATE.literasiFilters = { q:"", siswa:"", paraf:"", dari:"", sampai:"" };
    if(litSearchEl) litSearchEl.value = "";
    if(litFilterSiswaEl) litFilterSiswaEl.value = "";
    if(litFilterParafEl) litFilterParafEl.value = "";
    if(litDariEl) litDariEl.value = "";
    if(litSampaiEl) litSampaiEl.value = "";
    renderLiterasiView();
  });

  /* [BARU] Numerasi — "30 Menit Numerasi" */
  const numBulanEl = document.getElementById("num_bulan");
  if(numBulanEl) numBulanEl.addEventListener("change", ()=>{ populateNumerasiMingguSelect(); renderNumerasiInfoCard(); });
  const numMingguEl = document.getElementById("num_minggu");
  if(numMingguEl) numMingguEl.addEventListener("change", renderNumerasiInfoCard);
  const numerasiLogFormEl = document.getElementById("numerasiLogForm");
  if(numerasiLogFormEl) numerasiLogFormEl.addEventListener("submit", handleNumerasiLogSubmit);
  const nlResetEl = document.getElementById("nl_reset");
  if(nlResetEl) nlResetEl.addEventListener("click", resetNumerasiLogForm);
  const numExportXlsxBtn = document.getElementById("numExportXlsxBtn");
  if(numExportXlsxBtn) numExportXlsxBtn.addEventListener("click", exportNumerasiLogXlsx);
  const numTemplateBtn = document.getElementById("numTemplateBtn");
  if(numTemplateBtn) numTemplateBtn.addEventListener("click", downloadNumerasiTemplate);
  const numImportInput = document.getElementById("numImportInput");
  if(numImportInput) numImportInput.addEventListener("change", (e)=>{ if(e.target.files[0]) importNumerasiXlsx(e.target.files[0]); e.target.value=""; });

  /* [BARU] Wiring picker siswa (multi-select) untuk form Catatan Numerasi — mengikuti pola
     yang sama seperti picker siswa Input Tugas. */
  const numStudentSearchEl = document.getElementById("numStudentSearch");
  if(numStudentSearchEl){
    const debouncedNumStudentSearch = debounce((v)=>{ STATE.numStudentFilter.q = v; renderNumStudentPicker(); }, 150);
    numStudentSearchEl.addEventListener("input", (e)=>debouncedNumStudentSearch(e.target.value));
  }
  document.querySelectorAll("#numLpFilter .chip").forEach(chip=>{
    chip.addEventListener("click", ()=>{
      document.querySelectorAll("#numLpFilter .chip").forEach(c=>c.classList.remove("active"));
      chip.classList.add("active");
      STATE.numStudentFilter.lp = chip.dataset.lp;
      renderNumStudentPicker();
    });
  });
  onClick("numSelectAllBtn", ()=>{
    if(STATE.numEditId){ toast("Mode edit hanya untuk satu siswa."); return; }
    const { q, lp } = STATE.numStudentFilter;
    let students = STATE.siswa;
    if(lp) students = students.filter(s=>s.lp===lp);
    if(q){ const qq=q.toLowerCase(); students = students.filter(s=>s.nama.toLowerCase().includes(qq)||s.nis.includes(qq)); }
    students.forEach(s=>STATE.numSelectedNis.add(s.nis));
    renderNumStudentPicker();
  });
  onClick("numClearSelectBtn", ()=>{
    STATE.numSelectedNis = new Set();
    renderNumStudentPicker();
  });

  /* [BARU] Wiring menu Ujian (Formatif F1-F10, Sumatif Tengah/Akhir Semester) */
  const ujMapelSel = document.getElementById("uj_mapel");
  if(ujMapelSel) ujMapelSel.addEventListener("change", renderUjianGrid);
  const ujSemesterSel = document.getElementById("uj_semester");
  if(ujSemesterSel) ujSemesterSel.addEventListener("change", renderUjianGrid);
  const ujJenisSel = document.getElementById("uj_jenis");
  if(ujJenisSel) ujJenisSel.addEventListener("change", renderUjianGrid);
  const ujKokPertemuanSel = document.getElementById("uj_kokPertemuan");
  if(ujKokPertemuanSel) ujKokPertemuanSel.addEventListener("change", handleKokPertemuanChange);

  const ujRekapSearchEl = document.getElementById("ujRekapSearch");
  if(ujRekapSearchEl){
    const debouncedUjRekapSearch = debounce((v)=>{ STATE.ujianRekapFilter.q = v; renderUjianRekapTable(); }, 150);
    ujRekapSearchEl.addEventListener("input", (e)=>debouncedUjRekapSearch(e.target.value));
  }
  const ujRekapMapelFilterEl = document.getElementById("ujRekapMapelFilter");
  if(ujRekapMapelFilterEl) ujRekapMapelFilterEl.addEventListener("change", (e)=>{ STATE.ujianRekapFilter.mapel = e.target.value; renderUjianRekapTable(); });
  const ujRekapSemesterFilterEl = document.getElementById("ujRekapSemesterFilter");
  if(ujRekapSemesterFilterEl) ujRekapSemesterFilterEl.addEventListener("change", (e)=>{ STATE.ujianRekapFilter.semester = e.target.value; renderUjianRekapTable(); });
  const ujRekapJenisFilterEl = document.getElementById("ujRekapJenisFilter");
  if(ujRekapJenisFilterEl) ujRekapJenisFilterEl.addEventListener("change", (e)=>{ STATE.ujianRekapFilter.jenis = e.target.value; renderUjianRekapTable(); });

  onClick("ujExportPdfBtn", exportUjianPdf);
  onClick("ujExportXlsxBtn", exportUjianXlsx);
  onClick("ujTemplateBtn", downloadUjianTemplate);
  const ujImportInput = document.getElementById("ujImportInput");
  if(ujImportInput) ujImportInput.addEventListener("change", (e)=>{ if(e.target.files[0]) importUjianXlsx(e.target.files[0]); e.target.value=""; });
  /* [BARU] Template & Impor Excel khusus Kokurikuler, di panel Rekap Penilaian Proyek Kokurikuler */
  onClick("kokTemplateBtn", downloadKokTemplate);
  const kokImportInput = document.getElementById("kokImportInput");
  if(kokImportInput) kokImportInput.addEventListener("change", (e)=>{ if(e.target.files[0]) importKokXlsx(e.target.files[0]); e.target.value=""; });
  onClick("ujExportWaBtn", exportUjianPdfSiswaPrompt);

  /* [BARU] Wiring Rekap & Ekspor Penilaian Proyek Kokurikuler */
  const kokRekapSearchEl = document.getElementById("kokRekapSearch");
  if(kokRekapSearchEl){
    const debouncedKokRekapSearch = debounce((v)=>{ STATE.kokRekapFilter.q = v; renderKokRekapTable(); }, 150);
    kokRekapSearchEl.addEventListener("input", (e)=>debouncedKokRekapSearch(e.target.value));
  }
  const kokRekapBulanFilterEl = document.getElementById("kokRekapBulanFilter");
  if(kokRekapBulanFilterEl) kokRekapBulanFilterEl.addEventListener("change", (e)=>{ STATE.kokRekapFilter.pertemuan = e.target.value; renderKokRekapTable(); });
  onClick("kokExportPdfBtn", exportKokPdf);
  onClick("kokExportXlsxBtn", exportKokXlsx);
  onClick("kokExportWaBtn", exportKokPdfSiswaPrompt);
  const numKbSearchEl = document.getElementById("numKbSearch");
  if(numKbSearchEl) numKbSearchEl.addEventListener("input", debounce(()=>{
    numKbSearchQuery = numKbSearchEl.value.trim();
    renderNumerasiKaliBagiTable();
  }, 200));

  const studentSearchEl = document.getElementById("studentSearch");
  if(studentSearchEl){
    const debouncedStudentSearch = debounce((v)=>{ STATE.studentFilter.q = v; renderStudentPicker(); }, 150);
    studentSearchEl.addEventListener("input", (e)=>debouncedStudentSearch(e.target.value));
  }
  document.querySelectorAll("#lpFilter .chip").forEach(chip=>{
    chip.addEventListener("click", ()=>{
      document.querySelectorAll("#lpFilter .chip").forEach(c=>c.classList.remove("active"));
      chip.classList.add("active");
      STATE.studentFilter.lp = chip.dataset.lp;
      renderStudentPicker();
    });
  });
  document.getElementById("selectAllBtn").addEventListener("click", ()=>{
    if(STATE.editId){ toast("Mode edit hanya untuk satu siswa."); return; }
    const { q, lp } = STATE.studentFilter;
    let students = STATE.siswa;
    if(lp) students = students.filter(s=>s.lp===lp);
    if(q){ const qq=q.toLowerCase(); students = students.filter(s=>s.nama.toLowerCase().includes(qq)||s.nis.includes(qq)); }
    students.forEach(s=>STATE.selectedNis.add(s.nis));
    renderStudentPicker();
  });
  document.getElementById("clearSelectBtn").addEventListener("click", ()=>{
    STATE.selectedNis = new Set();
    renderStudentPicker();
  });

  const debouncedSearch = debounce((v)=>{ STATE.filters.q=v; STATE.page=1; renderDataView(); }, 220);
  document.getElementById("searchBox").addEventListener("input", (e)=>debouncedSearch(e.target.value));
  document.getElementById("filterPekan").addEventListener("change", (e)=>{ STATE.filters.pekan=e.target.value; STATE.page=1; renderDataView(); });
  document.getElementById("filterMapel").addEventListener("change", (e)=>{ STATE.filters.mapel=e.target.value; STATE.page=1; renderDataView(); });
  document.getElementById("filterSiswa").addEventListener("change", (e)=>{ STATE.filters.siswa=e.target.value; STATE.page=1; renderDataView(); });
  document.getElementById("filterStatus").addEventListener("change", (e)=>{ STATE.filters.status=e.target.value; STATE.page=1; renderDataView(); });

  // [BARU] Klik ringkasan "Belum Dikerjakan" -> langsung filter status ke "Belum Mengumpulkan".
  // Klik lagi saat sedang aktif -> kembali ke "Semua Status".
  document.getElementById("belumSummaryBtn").addEventListener("click", ()=>{
    const target = STATE.filters.status==="Belum Mengumpulkan" ? "" : "Belum Mengumpulkan";
    STATE.filters.status = target;
    document.getElementById("filterStatus").value = target;
    STATE.page = 1;
    renderDataView();
  });

  // [BARU] Klik kartu "Belum Mengumpulkan" di Dasbor -> pindah ke Data Tugas, langsung terfilter.
  // [FIX] Reset SEMUA filter lain juga (bukan cuma status). Sebelumnya kalau ada filter
  // Mapel/Bab/Peserta/Tanggal/Pencarian yang masih aktif dari sesi sebelumnya, angka
  // "Belum Dikerjakan" di Data Tugas jadi lebih kecil dari angka di kartu Dasbor
  // (mis. Dasbor menampilkan 3 tapi Data Tugas cuma menampilkan 1) — padahal datanya
  // sama, cuma "kesaring" filter lama yang lupa direset.
  const statBelumCard = document.getElementById("statBelumCard");
  if(statBelumCard) statBelumCard.addEventListener("click", ()=>{
    STATE.filters = { q:"", pekan:"", mapel:"", siswa:"", status:"Belum Mengumpulkan", dari:"", sampai:"" };
    STATE.page = 1;
    switchView("data");
    const searchBox = document.getElementById("searchBox");
    if(searchBox) searchBox.value = "";
    const pekanSel = document.getElementById("filterPekan");
    if(pekanSel) pekanSel.value = "";
    const mapelSel = document.getElementById("filterMapel");
    if(mapelSel) mapelSel.value = "";
    const siswaSel = document.getElementById("filterSiswa");
    if(siswaSel) siswaSel.value = "";
    const dariEl = document.getElementById("filterDariTgl");
    if(dariEl) dariEl.value = "";
    const sampaiEl = document.getElementById("filterSampaiTgl");
    if(sampaiEl) sampaiEl.value = "";
    const sel = document.getElementById("filterStatus");
    if(sel) sel.value = "Belum Mengumpulkan";
  });

  // [BARU] Tombol "Segarkan Data" di Dasbor -> tarik & kirim perubahan dari/ke Google Sheet.
  const dashRefreshBtn = document.getElementById("dashRefreshBtn");
  if(dashRefreshBtn) dashRefreshBtn.addEventListener("click", dashRefreshData);
  document.getElementById("filterDariTgl").addEventListener("change", (e)=>{ STATE.filters.dari=e.target.value; STATE.page=1; renderDataView(); });
  document.getElementById("filterSampaiTgl").addEventListener("change", (e)=>{ STATE.filters.sampai=e.target.value; STATE.page=1; renderDataView(); });
  document.getElementById("clearFilters").addEventListener("click", ()=>{
    STATE.filters = { q:"", pekan:"", mapel:"", siswa:"", status:"", dari:"", sampai:"" };
    document.getElementById("searchBox").value="";
    document.getElementById("filterPekan").value="";
    document.getElementById("filterMapel").value="";
    document.getElementById("filterSiswa").value="";
    document.getElementById("filterStatus").value="";
    document.getElementById("filterDariTgl").value="";
    document.getElementById("filterSampaiTgl").value="";
    STATE.page=1;
    renderDataView();
  });

  document.querySelectorAll("#mainTable thead th[data-sort]").forEach(th=>{
    th.addEventListener("click", ()=>{
      const key = th.dataset.sort;
      if(STATE.sort.key===key) STATE.sort.dir = STATE.sort.dir==="asc"?"desc":"asc";
      else STATE.sort = { key, dir:"asc" };
      renderDataView();
    });
  });

  document.getElementById("exportPdfBtn").addEventListener("click", exportPdf);
  document.getElementById("exportXlsxBtn").addEventListener("click", exportXlsx);
  document.getElementById("printBtn").addEventListener("click", printTable);
  document.getElementById("waReminderBtn").addEventListener("click", openWaReminderModal);
  document.getElementById("waReminderClose").addEventListener("click", closeWaReminderModal);
  document.getElementById("waReminderCloseBtn").addEventListener("click", closeWaReminderModal);
  document.getElementById("waReminderModal").addEventListener("click", (e)=>{
    if(e.target.id === "waReminderModal") closeWaReminderModal();
  });

  document.getElementById("kirimTugasBtn").addEventListener("click", openKirimTugasModal);
  document.getElementById("kirimTugasClose").addEventListener("click", closeKirimTugasModal);
  document.getElementById("kirimTugasCancelBtn").addEventListener("click", closeKirimTugasModal);
  document.getElementById("kirimTugasDoneBtn").addEventListener("click", closeKirimTugasModal);
  document.getElementById("kirimTugasBackBtn").addEventListener("click", ()=>{
    document.getElementById("kirimTugasFormStep").hidden = false;
    document.getElementById("kirimTugasListStep").hidden = true;
  });
  document.getElementById("kirimTugasStartBtn").addEventListener("click", startKirimTugas);
  document.getElementById("kt_file").addEventListener("change", handleKirimTugasFileChange);
  document.getElementById("kirimTugasModal").addEventListener("click", (e)=>{
    if(e.target.id === "kirimTugasModal") closeKirimTugasModal();
  });

  document.getElementById("siswaPdfPreviewClose").addEventListener("click", closeSiswaPdfPreviewModal);
  document.getElementById("siswaPdfPreviewCancelBtn").addEventListener("click", closeSiswaPdfPreviewModal);
  /* [BARU] Modal "Lihat selengkapnya" untuk kolom Kesan/Pesan Singkat di tabel Jurnal Literasi */
  onClick("litKesanModalClose", closeLitKesanModal);
  onClick("litKesanModalCloseBtn", closeLitKesanModal);
  onClick("tugasTextModalClose", closeTugasTextModal);
  onClick("tugasTextModalCloseBtn", closeTugasTextModal);
  document.getElementById("siswaPdfPreviewModal").addEventListener("click", (e)=>{
    if(e.target.id === "siswaPdfPreviewModal") closeSiswaPdfPreviewModal();
  });

  // [BARU] Impor Excel massal kini ada di menu Pengaturan & Guru (menu Backup & Restore dihapus)
  const importXlsxInput = document.getElementById("importXlsxInput");
  if(importXlsxInput) importXlsxInput.addEventListener("change", (e)=>{ if(e.target.files[0]) importXlsx(e.target.files[0]); e.target.value=""; });

  document.getElementById("saveGuruBtn").addEventListener("click", saveGuruNames);
  const saveSekolahBtn = document.getElementById("saveSekolahBtn");
  if(saveSekolahBtn) saveSekolahBtn.addEventListener("click", saveSchoolSettings);
  /* [BARU] Tanda Tangan Digital */
  const ttdFileInput = document.getElementById("ttdFileInput");
  if(ttdFileInput) ttdFileInput.addEventListener("change", (e)=>{ if(e.target.files[0]) saveSignatureFile(e.target.files[0]); e.target.value=""; });
  onClick("ttdClearBtn", clearSignature);
  const saveSyncBtn = document.getElementById("saveSyncBtn");
  if(saveSyncBtn) saveSyncBtn.addEventListener("click", saveSyncSettings);

  // [BARU] Link Google Spreadsheet — simpan & buka langsung di tab baru
  const saveSpreadsheetBtn = document.getElementById("saveSpreadsheetBtn");
  if(saveSpreadsheetBtn) saveSpreadsheetBtn.addEventListener("click", ()=>{
    const val = document.getElementById("spreadsheet_url").value.trim();
    if(!val){ toast("Isi link spreadsheet terlebih dahulu."); return; }
    setSpreadsheetUrl(val);
    toast("Link Google Spreadsheet berhasil disimpan.");
  });

  // [DIPERBAIKI] Upload Dokumen kini 2 langkah: pilih berkas dulu, baru tekan tombol
  // "Kirim ke Google Drive" — dan memakai URL Web App yang sama dengan Sinkronisasi
  // Google Sheet di atas (saveSyncBtn), jadi tidak ada lagi tombol/URL terpisah di sini.
  const dokumenUploadInput = document.getElementById("dokumenUploadInput");
  if(dokumenUploadInput) dokumenUploadInput.addEventListener("change", handleDokumenFileSelected);
  const dokumenKirimBtn = document.getElementById("dokumenKirimBtn");
  if(dokumenKirimBtn) dokumenKirimBtn.addEventListener("click", sendDokumenToServer);

  const openSpreadsheetBtn = document.getElementById("openSpreadsheetBtn");
  if(openSpreadsheetBtn) openSpreadsheetBtn.addEventListener("click", ()=>{
    const url = getSpreadsheetUrl();
    if(!url){ toast("Link spreadsheet belum diatur."); return; }
    window.open(url, "_blank");
  });

  /* [BARU] Data Siswa: tambah / simpan perubahan / hapus / ekspor / template / impor */
  const addSiswaBtn = document.getElementById("addSiswaBtn");
  if(addSiswaBtn) addSiswaBtn.addEventListener("click", ()=>toggleAddSiswaForm());
  const cancelAddSiswaBtn = document.getElementById("cancelAddSiswaBtn");
  if(cancelAddSiswaBtn) cancelAddSiswaBtn.addEventListener("click", ()=>toggleAddSiswaForm(false));
  const addSiswaForm = document.getElementById("addSiswaForm");
  if(addSiswaForm) addSiswaForm.addEventListener("submit", submitAddSiswa);
  const saveSiswaBtn = document.getElementById("saveSiswaBtn");
  if(saveSiswaBtn) saveSiswaBtn.addEventListener("click", saveSiswaChanges);
  const exportSiswaBtn = document.getElementById("exportSiswaBtn");
  if(exportSiswaBtn) exportSiswaBtn.addEventListener("click", exportSiswaXlsx);
  const templateSiswaBtn = document.getElementById("templateSiswaBtn");
  if(templateSiswaBtn) templateSiswaBtn.addEventListener("click", downloadSiswaTemplate);
  const importSiswaInput = document.getElementById("importSiswaInput");
  if(importSiswaInput) importSiswaInput.addEventListener("change", (e)=>{ if(e.target.files[0]) importSiswaXlsx(e.target.files[0]); e.target.value=""; });
  const filterSiswaBulanEl = document.getElementById("filterSiswaBulan");
  if(filterSiswaBulanEl) filterSiswaBulanEl.addEventListener("change", ()=>renderSiswaView());
  // [BARU] Dropdown checklist Filter Mapel (Data Siswa) — bisa pilih lebih dari 1 mapel.
  const siswaMapelBtn = document.getElementById("filterSiswaMapelBtn");
  const siswaMapelPanel = document.getElementById("filterSiswaMapelPanel");
  const siswaMapelList = document.getElementById("filterSiswaMapelList");
  if(siswaMapelBtn && siswaMapelPanel){
    siswaMapelBtn.addEventListener("click", (e)=>{
      e.stopPropagation();
      siswaMapelPanel.hidden = !siswaMapelPanel.hidden;
    });
    document.addEventListener("click", (e)=>{
      if(!siswaMapelPanel.hidden && !siswaMapelPanel.contains(e.target) && e.target!==siswaMapelBtn){
        siswaMapelPanel.hidden = true;
      }
    });
  }
  if(siswaMapelList){
    siswaMapelList.addEventListener("change", (e)=>{
      const cb = e.target.closest('input[type="checkbox"][data-mapel]');
      if(!cb) return;
      const m = cb.dataset.mapel;
      if(cb.checked) STATE.siswaMapelFilter.add(m);
      else STATE.siswaMapelFilter.delete(m);
      updateSiswaMapelFilterBtn();
      renderSiswaView();
    });
  }
  const siswaMapelAllBtn = document.getElementById("filterSiswaMapelAll");
  if(siswaMapelAllBtn) siswaMapelAllBtn.addEventListener("click", ()=>{
    const mapels = uniq(STATE.tugas.map(t=>t.mapel));
    STATE.siswaMapelFilter = new Set(mapels);
    renderSiswaView();
  });
  const siswaMapelNoneBtn = document.getElementById("filterSiswaMapelNone");
  if(siswaMapelNoneBtn) siswaMapelNoneBtn.addEventListener("click", ()=>{
    STATE.siswaMapelFilter = new Set();
    renderSiswaView();
  });
  const filterSiswaBabEl = document.getElementById("filterSiswaBab");
  if(filterSiswaBabEl) filterSiswaBabEl.addEventListener("change", ()=>renderSiswaView());

  document.getElementById("resetAllBtn").addEventListener("click", resetAllTugas);

  const triggerInstallPrompt = async ()=>{
    if(!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    document.getElementById("installBtn").hidden = true;
    dismissInstallBanner(0);
  };
  document.getElementById("installBtn").addEventListener("click", triggerInstallPrompt);
  /* [BARU] Tombol pada popup ajakan instal (bottom sheet) */
  const installBannerInstallBtn = document.getElementById("installBannerInstall");
  if(installBannerInstallBtn) installBannerInstallBtn.addEventListener("click", triggerInstallPrompt);
  const installBannerLaterBtn = document.getElementById("installBannerLater");
  if(installBannerLaterBtn) installBannerLaterBtn.addEventListener("click", ()=> dismissInstallBanner(3));

  window.addEventListener("online", updateOnlinePill);
  window.addEventListener("offline", updateOnlinePill);
}
function debounce(fn, ms){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), ms); }; }

/* ---------- Boot ---------- */
async function boot(){
  /* [PERBAIKAN] Sebelumnya wireEvents() & baris-baris inisialisasi tampilan berada DI LUAR
     try/catch, sedangkan splash (logo loading) disembunyikan lewat ANIMASI CSS yang berjalan
     sendiri setelah 5 detik, TIDAK PEDULI apakah proses booting JavaScript berhasil atau
     error. Akibatnya: kalau ada SATU SAJA error JavaScript di tengah proses booting (mis. ada
     elemen HTML yang berubah nama/hilang), seluruh boot() berhenti sebelum sempat menjalankan
     `#app.hidden = false` — tapi splash tetap hilang otomatis lewat CSS, sehingga yang terlihat
     hanyalah LAYAR PUTIH KOSONG tanpa pesan apa pun. Sekarang seluruh proses booting dibungkus
     try/catch/finally: apa pun yang terjadi, `#app` PASTI dimunculkan dan splash PASTI
     disembunyikan — kalau memang ada error, pesan errornya ditampilkan jelas di layar (bukan
     didiamkan jadi blank putih) supaya mudah dilaporkan/diperbaiki. */
  let bootError = null;
  try{
    initTheme();
    wireEvents();
    updateOnlinePill();
    updateSidebarTahun();
    try{
      await seedIfEmpty();
      await loadAll();
      await migrateHpOrtu();
      await migratePekanToBab();
      await migrateNisTypes();
      await migrateGuruIdTypes(); // [PERBAIKAN] rapikan id Guru lama yang bertipe angka
      await dedupJadwal();
      await migrateDokumenWebappUrl(); // [BARU] gabungkan URL Upload Dokumen lama (jika ada) ke 1 URL sinkron
    }catch(e){
      console.error(e);
    }
    populateStudentSelect();
    populateMapelDatalist();
    resetForm();
    populateLiterasiSiswaSelects();
    resetLiterasiForm();
    switchView("dashboard");
    initClock(); // [BARU] mulai jam analog + tanggal digital di puncak Dasbor
    initMotivasiMarquee(); // [BARU] pilih 1 kata motivasi acak untuk sesi buka aplikasi ini
    initDashAudioPlayer(); // [BARU] pemutar lagu Dasbor (audio/lagu-dasbor.mp3)
  }catch(err){
    console.error("Gagal memuat aplikasi:", err);
    bootError = err;
  }finally{
    const appEl = document.getElementById("app");
    if(appEl) appEl.hidden = false;
    /* [BARU] Splash tampil 5 detik (logo berpantul-pantul) sebelum disembunyikan,
       selaras dengan animasi splashOut di style.css (delay 5s). Disembunyikan juga
       lewat JS di sini (bukan hanya mengandalkan animasi CSS) supaya konsisten. */
    setTimeout(()=>{ const s=document.getElementById("splash"); if(s) s.style.display="none"; }, 5550);
  }

  if(bootError) tampilkanErorBoot(bootError);

  refreshSyncStatusDisplay(); // hanya tampilkan status; TIDAK menghubungi Google Sheet secara otomatis

  if("serviceWorker" in navigator){
    navigator.serviceWorker.register("sw.js").catch(()=>{});
  }
}

/* [BARU] Kalau boot() gagal (error JS tak terduga), tampilkan pesan yang JELAS TERLIHAT di
   layar (bukan cuma di console) dengan tombol "Muat Ulang", supaya guru yang memakai aplikasi
   tahu ada masalah dan bisa mencoba memuat ulang / melaporkannya — bukan melihat layar putih
   kosong tanpa petunjuk. Dibuat dengan gaya inline (tidak bergantung pada style.css) supaya
   tetap tampil walau berkas CSS gagal termuat. */
function tampilkanErorBoot(err){
  try{
    const div = document.createElement("div");
    div.setAttribute("style",
      "position:fixed;inset:0;z-index:99999;background:#FBF9F2;display:flex;"+
      "align-items:center;justify-content:center;padding:24px;font-family:sans-serif;");
    div.innerHTML = `
      <div style="max-width:420px;background:#fff;border:1px solid #E1E4DE;border-radius:14px;
        box-shadow:0 8px 24px rgba(10,30,50,.12);padding:26px;text-align:center;">
        <div style="font-size:34px;margin-bottom:8px;">⚠️</div>
        <h2 style="margin:0 0 8px;font-size:16px;color:#9A3B1D;">Aplikasi Gagal Dimuat</h2>
        <p style="margin:0 0 14px;font-size:13.5px;color:#48586A;line-height:1.5;">
          Terjadi kesalahan teknis saat memuat aplikasi. Coba muat ulang halaman ini. Kalau
          masalah berlanjut, laporkan pesan di bawah ini kepada operator aplikasi.
        </p>
        <pre style="text-align:left;font-size:11px;background:#F4F0E4;border-radius:8px;
          padding:10px;overflow:auto;max-height:120px;color:#17232E;white-space:pre-wrap;">${escapeHtml(String(err && err.message ? err.message : err))}</pre>
        <button id="bootErrReloadBtn" style="margin-top:14px;background:#155A94;color:#fff;
          border:none;border-radius:8px;padding:10px 18px;font-size:13.5px;cursor:pointer;">
          Muat Ulang
        </button>
      </div>`;
    document.body.appendChild(div);
    const btn = div.querySelector("#bootErrReloadBtn");
    if(btn) btn.addEventListener("click", ()=> location.reload());
  }catch(e){ /* kalau ini juga gagal, tidak ada lagi yang bisa dilakukan lewat JS */ }
}
document.addEventListener("DOMContentLoaded", boot);
