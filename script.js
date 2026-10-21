// ================= Salom Test — script.js =================
const $ = s => document.querySelector(s), $$ = s => document.querySelectorAll(s);
const DB = {
  get: (k, d = []) => { try { return JSON.parse(localStorage.getItem(k)) ?? d } catch { return d } },
  set: (k, v) => localStorage.setItem(k, JSON.stringify(v))
};
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const ADMIN_CODE = "SALOM2026"; // admin ro'yxatdan o'tishi uchun maxfiy kod — o'zgartiring
const me = () => DB.get("session", null);
const VIEWS = ["home", "about", "courses", "teachers", "rating", "contact", "auth", "student", "admin"];
const LINKS = [["home", "Bosh sahifa"], ["about", "Maktab haqida"], ["courses", "Kurslar"], ["teachers", "Ustozlar"], ["rating", "Reyting"], ["contact", "Aloqa"]];
let role = "student", mode = "register", draft = [];

// ---------- Dark / Light ----------
document.documentElement.dataset.theme = localStorage.getItem("theme") || "light";
function toggleTheme() {
  const t = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = t; localStorage.setItem("theme", t);
}

// ---------- Sahifalar (oynalar) ----------
function go(v) {
  const s = me();
  if (!s) v = "auth"; // kirmagan odam faqat ro'yxatdan o'tish sahifasini ko'radi
  else if ((v === "student" || v === "admin") && s.role !== v) v = s.role;
  VIEWS.forEach(x => $("#v-" + x).hidden = x !== v);
  if (v === "rating") drawRating();
  if (v === "student") drawStudent();
  if (v === "admin") { if (!draft.length) addQ(); drawAdmin(); }
  if (v === "auth") setAuth();
  drawNav(v); scrollTo({ top: 0, behavior: "smooth" });
}
function drawNav(cur) {
  const s = me();
  if (!s) { $("#nav").innerHTML = `<span class="logo">Salom Test<img src="logo.png" alt="Al-Xorazmiy"></span><span><a onclick="toggleTheme()">🌓</a></span>`; return; }
  const acc = s ? `<a onclick="go('${s.role}')" class="${cur === s.role ? "on" : ""}">👤 ${esc(s.name)}</a><a onclick="logout()">Chiqish</a>`
                : `<a onclick="go('auth')" class="${cur === "auth" ? "on" : ""}">Kirish</a>`;
  $("#nav").innerHTML = `<span class="logo" onclick="go('home')">Salom Test<img src="logo.png" alt="Al-Xorazmiy"></span><span>` +
    LINKS.map(l => `<a onclick="go('${l[0]}')" class="${cur === l[0] ? "on" : ""}">${l[1]}</a>`).join("") +
    acc + `<a onclick="toggleTheme()">🌓</a></span>`;
}
function logout() { localStorage.removeItem("session"); go("auth"); }

// ---------- Modal ----------
function openModal(title, html) {
  closeModal();
  document.body.insertAdjacentHTML("beforeend", `<div id="modal" onclick="if(event.target===this)closeModal()"><div class="card"><div class="row"><h2>${title}</h2><button class="ghost" onclick="closeModal()">✕</button></div>${html}</div></div>`);
}
function closeModal() { const m = $("#modal"); if (m) m.remove(); }
document.addEventListener("keydown", e => { if (e.key === "Escape") closeModal(); });

// ---------- Ro'yxatdan o'tish / Kirish ----------
function setAuth(r, m) {
  role = r || role; mode = m || mode;
  $$("[data-role]").forEach(b => b.classList.toggle("on", b.dataset.role === role));
  $$("[data-mode]").forEach(b => b.classList.toggle("on", b.dataset.mode === mode));
  $("#nameRow").hidden = mode !== "register";
  $("#codeRow").hidden = !(mode === "register" && role === "admin");
  $("#authTitle").textContent = (role === "admin" ? "Admin " : "O'quvchi ") + (mode === "register" ? "ro'yxatdan o'tish" : "kirish");
  $("#msg").textContent = "";
}
function submitAuth() {
  const users = DB.get("users"), n = $("#name").value.trim(), e = $("#email").value.trim().toLowerCase(), p = $("#pass").value;
  const err = t => $("#msg").textContent = t;
  if (!e || !p) return err("Email va parolni kiriting");
  if (mode === "register") {
    if (!n) return err("Ismni kiriting");
    if (p.length < 4) return err("Parol kamida 4 belgi bo'lsin");
    if (role === "admin" && $("#code").value !== ADMIN_CODE) return err("Admin kodi noto'g'ri");
    if (users.find(x => x.email === e && x.role === role)) return err("Bu email allaqachon ro'yxatdan o'tgan");
    users.push({ name: n, email: e, pass: p, role }); DB.set("users", users);
    DB.set("session", { name: n, email: e, role });
  } else {
    const f = users.find(x => x.email === e && x.pass === p && x.role === role);
    if (!f) return err("Email yoki parol xato");
    DB.set("session", { name: f.name, email: e, role });
  }
  ["name", "email", "pass", "code"].forEach(i => $("#" + i).value = "");
  go(role);
}

// ---------- Admin panel ----------
function addQ() { draft.push({ q: "", o: ["", "", "", ""], c: 0 }); drawDraft(); }
function drawDraft() {
  $("#qs").innerHTML = draft.map((d, i) => `<div class="q"><b>${i + 1}-savol</b>
    <input placeholder="Savol matni" value="${esc(d.q)}" oninput="draft[${i}].q=this.value">
    ${d.o.map((o, j) => `<label><input type="radio" name="c${i}" ${d.c === j ? "checked" : ""} onchange="draft[${i}].c=${j}">
      <input type="text" placeholder="Variant ${j + 1}" value="${esc(o)}" oninput="draft[${i}].o[${j}]=this.value"></label>`).join("")}
    <p>To'g'ri javobni radio tugma bilan belgilang</p></div>`).join("");
}
function saveTest() {
  const t = $("#tTitle").value.trim(), qs = draft.filter(d => d.q.trim() && d.o.every(x => x.trim()));
  if (!t || !qs.length) return openModal("Diqqat", "<p>Test nomi va kamida 1 ta to'liq savol (4 ta variant bilan) kerak.</p>");
  const T = DB.get("tests"); T.push({ id: Date.now(), title: t, by: me().name, qs }); DB.set("tests", T);
  draft = []; $("#tTitle").value = ""; addQ(); drawAdmin();
  openModal("Tayyor! ✅", "<p>Test saqlandi va o'quvchilarga ko'rinadi.</p>");
}
function delTest(id) { DB.set("tests", DB.get("tests").filter(t => t.id !== id)); drawAdmin(); }
function drawAdmin() {
  const T = DB.get("tests"), R = DB.get("results"), M = DB.get("messages");
  $("#tests").innerHTML = T.length ? T.map(t => `<div class="row q"><span>${esc(t.title)} (${t.qs.length} savol)</span><button class="danger" onclick="delTest(${t.id})">O'chirish</button></div>`).join("") : "<p>Hali test yo'q</p>";
  $("#resCard").hidden = !R.length;
  $("#res").innerHTML = R.length ? R.map(r => `<tr><td>${esc(r.student)}</td><td>${esc(r.title)}</td><td>${r.score}/${r.total}</td><td>${r.date}</td></tr>`).join("") : "<tr><td colspan=4>Natijalar yo'q</td></tr>";
  $("#msgs").innerHTML = M.length ? M.map(m => `<div class="q"><b>${esc(m.n)}</b> · <small>${m.date}</small><p>${esc(m.m)}</p></div>`).join("") : "<p>Xabarlar yo'q</p>";
}

// ---------- O'quvchi paneli ----------
function drawStudent() {
  $("#take").innerHTML = ""; const T = DB.get("tests");
  $("#list").innerHTML = T.length ? T.map(t => `<div class="card"><h2>${esc(t.title)}</h2><p>${t.qs.length} ta savol · muallif: ${esc(t.by)}</p><br><button onclick="startTest(${t.id})">Boshlash</button></div>`).join("") : "<div class='card'><p>Hozircha testlar yo'q. Admin test yaratganda shu yerda paydo bo'ladi.</p></div>";
  const R = DB.get("results").filter(r => r.email === me().email);
  $("#myCard").hidden = !R.length; // natija bo'lmasa, bo'lim ko'rinmaydi
  $("#my").innerHTML = R.length ? R.map(r => `<tr><td>${esc(r.title)}</td><td>${r.score}/${r.total}</td><td>${r.date}</td></tr>`).join("") : "<tr><td colspan=3>Natijalar yo'q</td></tr>";
}
function startTest(id) {
  const t = DB.get("tests").find(x => x.id === id); $("#list").innerHTML = "";
  $("#take").innerHTML = `<div class="card"><h2>${esc(t.title)}</h2>${t.qs.map((q, i) => `<div class="q"><b>${i + 1}. ${esc(q.q)}</b>${q.o.map((o, j) => `<label><input type="radio" name="a${i}" value="${j}">${esc(o)}</label>`).join("")}</div>`).join("")}<button onclick="finish(${id})">Yakunlash</button> <button class="ghost" onclick="drawStudent()">Bekor qilish</button></div>`;
  scrollTo({ top: 0, behavior: "smooth" });
}
function finish(id) {
  const t = DB.get("tests").find(x => x.id === id); let s = 0;
  t.qs.forEach((q, i) => { const a = $(`input[name=a${i}]:checked`); if (a && +a.value === q.c) s++; });
  const R = DB.get("results");
  R.push({ email: me().email, student: me().name, title: t.title, score: s, total: t.qs.length, date: new Date().toLocaleString() });
  DB.set("results", R); drawStudent();
  openModal("Natijangiz 🎉", `<p style="font-size:1.6rem;font-weight:700;color:var(--blue)">${s} / ${t.qs.length}</p>`);
}

// ---------- Video darsliklar (YouTube) ----------
// Videoni almashtirish uchun faqat id ni o'zgartiring: youtube.com/watch?v=SHU_YERDAGI_ID
const VIDEOS = [
  { fan: "Logistika", icon: "🚚", title: "Logistika nima? (1-dars)", id: "agmxMJ4D8uE" },
  { fan: "Matematika", icon: "➗", title: "5-sinf matematika, 1-dars: Natural sonlar va nol", id: "Jby89e1W0CQ" },
  { fan: "Ingliz tili", icon: "🇬🇧", title: "Ingliz tilida so'zlashuv: 1-dars, salomlashuvlar", id: "lsPSG4BI0kE" },
  { fan: "Ona tili", icon: "📖", title: "5-sinf ona tili, 3-dars", id: "theo3IrAq5s" }
];
$("#videos").innerHTML = VIDEOS.map((v, i) => `<div class="card vid"><b>${v.icon} ${v.fan}</b>
  <div class="vbox" id="vb${i}" onclick="playVideo(${i})" style="background-image:url(https://img.youtube.com/vi/${v.id}/hqdefault.jpg)"><span class="play">▶</span></div>
  <p>${v.title}</p><a href="https://www.youtube.com/watch?v=${v.id}" target="_blank" rel="noopener">YouTube'da ochish ↗</a></div>`).join("");
function playVideo(i) {
  $("#vb" + i).innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${VIDEOS[i].id}?autoplay=1&rel=0" allow="autoplay; encrypted-media; fullscreen" allowfullscreen></iframe>`;
}

// ---------- Kurslar, reyting, aloqa ----------
const COURSES = {
  "Manga chizish asoslari": "Chiziq, nisbat va personaj yaratish. 12 hafta, haftada 2 dars.",
  "Rang va tush": "Tush, marker va raqamli bo'yoq bilan ishlash. 8 hafta.",
  "Hikoya va storyboard": "Syujet, kadrlar ketma-ketligi va dialog yozish. 10 hafta.",
  "Yapon tili asoslari": "Manga o'qish uchun hiragana, katakana va oddiy so'zlar. 16 hafta."
};
$("#courseList").innerHTML = Object.keys(COURSES).map(n => `<div class="card"><h2>${n}</h2><button onclick="showCourse('${n}')">Batafsil</button></div>`).join("");
function showCourse(n) { openModal(n, `<p>${COURSES[n]}</p><br><button onclick="closeModal();go('auth')">Yozilish</button>`); }
function drawRating() {
  const A = {};
  DB.get("results").forEach(r => { A[r.student] = A[r.student] || { s: 0, t: 0, n: 0 }; A[r.student].s += r.score; A[r.student].t += r.total; A[r.student].n++; });
  const rows = Object.entries(A).sort((a, b) => b[1].s - a[1].s);
  $("#ratCard").hidden = !rows.length; // natija bo'lmasa, reyting oynasi bo'm-bo'sh
  $("#rt").innerHTML = rows.length ? rows.map((r, i) => `<tr><td>${["🥇", "🥈", "🥉"][i] || i + 1}</td><td>${esc(r[0])}</td><td>${r[1].n}</td><td>${r[1].s}/${r[1].t}</td></tr>`).join("") : "<tr><td colspan=4>Hali natijalar yo'q</td></tr>";
}
function sendContact() {
  const n = $("#cn").value.trim(), m = $("#cm").value.trim();
  if (!n || !m) return openModal("Diqqat", "<p>Ism va xabarni yozing.</p>");
  const L = DB.get("messages"); L.push({ n, m, date: new Date().toLocaleString() }); DB.set("messages", L);
  $("#cn").value = $("#cm").value = "";
  openModal("Rahmat!", "<p>Xabaringiz yuborildi. Tez orada javob beramiz.</p>");
}

// ---------- AI yordamchi bot ----------
// Hozir oddiy qoidalar asosida ishlaydi. Haqiqiy AI uchun shu funksiyaga API so'rovi qo'shiladi.
function ask() {
  const i = $("#botIn"), q = i.value.trim(); if (!q) return;
  const L = $("#botLog"); L.innerHTML += `<div class="me">${esc(q)}</div>`; i.value = "";
  const l = q.toLowerCase(); let a = "Buni tushunmadim. Test, ro'yxatdan o'tish yoki natija haqida so'rang.";
  if (l.includes("salom")) a = "Salom! Qanday yordam beray?";
  else if (l.includes("test") && (l.includes("qanday") || l.includes("yech"))) a = "O'quvchi sifatida kiring, testni tanlang, javoblarni belgilab 'Yakunlash' ni bosing.";
  else if (l.includes("admin")) a = "Admin ro'yxatdan o'tishi uchun maxsus kod kerak. Test yaratish admin panelida.";
  else if (l.includes("ro'yxat") || l.includes("royxat") || l.includes("registr")) a = "'Kirish' tugmasi orqali o'quvchi yoki admin rolini tanlab ro'yxatdan o'ting.";
  else if (l.includes("natija") || l.includes("ball")) a = "Natijalaringiz o'quvchi panelining pastida, umumiy jadval esa 'Reyting' sahifasida.";
  else if (l.includes("dark") || l.includes("tun") || l.includes("rejim")) a = "Menyudagi 🌓 tugmasi dark va light rejimni almashtiradi.";
  setTimeout(() => { L.innerHTML += `<div>${a}</div>`; L.scrollTop = L.scrollHeight; }, 300);
}

// ---------- Tugma bosilganda suyuq to'lqin ----------
document.addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b || b.id === "botBtn") return;
  const r = b.getBoundingClientRect(), s = document.createElement("span");
  s.className = "ripple"; s.style.left = e.clientX - r.left + "px"; s.style.top = e.clientY - r.top + "px";
  b.appendChild(s); setTimeout(() => s.remove(), 600);
});

// ---------- Tayyor testlar (muallif: Dilshod) ----------
const DEFAULT_TESTS = [
  { id: 1001, title: "Matematika", by: "Dilshod", qs: [
    { q: "12 × 8 = ?", o: ["86", "96", "88", "108"], c: 1 },
    { q: "144 : 12 = ?", o: ["10", "11", "12", "14"], c: 2 },
    { q: "Uchburchakning ichki burchaklari yig'indisi necha gradus?", o: ["90°", "180°", "270°", "360°"], c: 1 },
    { q: "3/4 kasrning o'nli kasr ko'rinishi qaysi?", o: ["0,25", "0,5", "0,75", "0,34"], c: 2 },
    { q: "Tomoni 5 sm bo'lgan kvadratning perimetri necha sm?", o: ["10", "15", "20", "25"], c: 2 } ] },
  { id: 1002, title: "Ingliz tili", by: "Dilshod", qs: [
    { q: "\"Apple\" so'zining o'zbekcha tarjimasi qaysi?", o: ["Olma", "Nok", "Banan", "Uzum"], c: 0 },
    { q: "She ___ a student.", o: ["am", "are", "is", "be"], c: 2 },
    { q: "\"Child\" so'zining ko'plik shakli qaysi?", o: ["childs", "childes", "children", "childrens"], c: 2 },
    { q: "\"Big\" so'zining antonimi (teskari ma'nosi) qaysi?", o: ["Small", "Tall", "Long", "Fast"], c: 0 },
    { q: "\"Good morning\" qachon aytiladi?", o: ["Ertalab", "Kechqurun", "Tunda", "Peshindan keyin"], c: 0 } ] },
  { id: 1003, title: "Ona tili", by: "Dilshod", qs: [
    { q: "O'zbek lotin alifbosida nechta harf bor?", o: ["26", "29", "33", "35"], c: 1 },
    { q: "\"Kitob\" so'zi qaysi so'z turkumiga kiradi?", o: ["Ot", "Sifat", "Fe'l", "Son"], c: 0 },
    { q: "\"Katta\" so'zining antonimi qaysi?", o: ["Baland", "Kichik", "Uzun", "Keng"], c: 1 },
    { q: "Darak gapning oxiriga qaysi tinish belgisi qo'yiladi?", o: ["Nuqta", "So'roq belgisi", "Undov belgisi", "Vergul"], c: 0 },
    { q: "\"Bahor\" so'zida nechta bo'g'in bor?", o: ["1", "2", "3", "4"], c: 1 } ] },
  { id: 1004, title: "Logistika", by: "Dilshod", qs: [
    { q: "Logistika nima?", o: ["Tovar, axborot va moliya oqimlarini boshqarish", "Faqat mahsulot ishlab chiqarish", "Faqat reklama qilish", "Faqat hisob-kitob yuritish"], c: 0 },
    { q: "Ombor nima uchun kerak?", o: ["Mahsulotni saqlash va jamlash uchun", "Mahsulot ishlab chiqarish uchun", "Reklama qilish uchun", "Narx belgilash uchun"], c: 0 },
    { q: "Xalqaro yuklarning eng katta hajmi qaysi transport bilan tashiladi?", o: ["Dengiz transporti", "Havo transporti", "Velosiped", "Ot aravasi"], c: 0 },
    { q: "\"Supply chain\" iborasining o'zbekchasi qaysi?", o: ["Ta'minot zanjiri", "Ish haqi", "Soliq", "Reklama"], c: 0 },
    { q: "\"Cargo\" so'zi nimani anglatadi?", o: ["Yuk", "Yo'lovchi", "Haydovchi", "Ombor"], c: 0 } ] }
];
// Bir marta qo'shiladi; admin o'chirib tashlasa, qayta paydo bo'lmaydi.
if (!localStorage.getItem("seeded_v1")) {
  const T = DB.get("tests");
  DEFAULT_TESTS.forEach(t => { if (!T.find(x => x.id === t.id)) T.push(t); });
  DB.set("tests", T); localStorage.setItem("seeded_v1", "1");
}

// ---------- Boshlash: birinchi bo'lib ro'yxatdan o'tish ----------
go(me() ? me().role : "auth");
