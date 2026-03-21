// ============================================================================
// APP.JS - CLIENT-SIDE SMS BOT RENDERER
// Menerapkan logika dari render.js lama tanpa menggunakan Node.js
// ============================================================================

// --- UI Elements ---
const form = document.getElementById('renderForm');
const excelDropZone = document.getElementById('excelDropZone');
const excelInput = document.getElementById('excelFile');
const excelName = document.getElementById('excelName');

const timemarkDropZone = document.getElementById('timemarkDropZone');
const timemarkInput = document.getElementById('timemarkFile');
const timemarkName = document.getElementById('timemarkName');
const timemarkPreview = document.getElementById('timemarkPreview');

const renderBtn = document.getElementById('renderBtn');
const progressContainer = document.getElementById('progressContainer');
const progressFill = document.getElementById('progressFill');
const progressPct = document.getElementById('progressPct');
const progressText = document.getElementById('progressText');
const logList = document.getElementById('logList');

// --- Global Config ---
const TARGET_HEIGHT = 920;
const MAX_SIZE = 1_900_000;

// --- Helper Functions ---
function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function safeName(resi, index) {
    const r = String(resi || "").trim();
    const cleaned = r.replace(/[^a-zA-Z0-9_-]/g, "_");
    return cleaned || `row_${index}`;
}
function log(msg) {
    const li = document.createElement('li');
    li.textContent = msg;
    logList.appendChild(li);
    logList.parentElement.scrollTop = logList.parentElement.scrollHeight;
    console.log(msg);
}

// --- File Handling ---
excelInput.addEventListener('change', (e) => {
    if (e.target.files[0]) excelName.textContent = e.target.files[0].name;
});
timemarkInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        timemarkName.textContent = file.name;
        const reader = new FileReader();
        reader.onload = (ev) => { timemarkPreview.src = ev.target.result; };
        reader.readAsDataURL(file);
    }
});

// --- Timeline Generators (from render.js) ---
function buildBatteryTimeline(total) {
    let battery = rand(95, 100);
    // Jan 1 2025 15:01
    let time = new Date(2025, 0, 1, 15, 1);
    const out = [];
    for (let i = 0; i < total; i++) {
        out.push({
            time: `${String(time.getHours()).padStart(2, "0")}.${String(time.getMinutes()).padStart(2, "0")}`,
            battery,
        });
        time = new Date(time.getTime() + 30 * 1000);
        if (i % 10 === 0 && i !== 0) battery--;
        if (battery <= 3) {
            time = new Date(time.getTime() + 2 * 3600 * 1000);
            battery = rand(95, 100);
        }
    }
    return out;
}
function batteryColor(level) {
    if (level <= 20) return "#d93025";
    if (level <= 50) return "#fbbc05";
    return "#ffffff";
}
function buildSignalTimeline(total) {
    let level = rand(3, 4);
    const out = [];
    for (let i = 0; i < total; i++) {
        if (i % 20 === 0 && i !== 0) {
            level += Math.random() < 0.5 ? -1 : 1;
            if (level > 4) level = 4;
            if (level < 2) level = 2;
        }
        out.push(level);
    }
    return out;
}
function signalBars(level) {
    let html = "";
    for (let i = 1; i <= 4; i++) {
        const h = 4 + i * 3;
        const active = i <= level;
        html += `<span style="display:inline-block;width:2px;height:${h}px;margin-left:2px;border-radius:1px;background:${active ? "#3f3f3f" : "#b7b7b7"};"></span>`;
    }
    return html;
}
function buildNetworkTimeline(total) {
    const modes = ["VoLTE 4G", "LTE"];
    let now = modes[0];
    const out = [];
    for (let i = 0; i < total; i++) {
        if (i % 120 === 0 && i !== 0 && Math.random() < 0.6) {
            now = now === modes[0] ? modes[1] : modes[0];
        }
        out.push(now);
    }
    return out;
}
function notifIcons(i) {
    const list = [];
    if (i % 40 === 0) list.push("dnd");
    if (i % 60 === 0) list.push("alarm");
    if (Math.random() < 0.25) list.push("notif");
    return list;
}
function notifHTML(list) {
    return list.map((ic) =>
        ic === "dnd" ? `<span class="material-icons-outlined top-ico">do_not_disturb_on</span>` :
        ic === "alarm" ? `<span class="material-icons-outlined top-ico">alarm_on</span>` :
        `<span class="material-icons-outlined top-ico">notifications</span>`
    ).join("");
}
function randomBubbleTime() {
    const h = rand(7, 21);
    const m = rand(0, 59);
    return `${String(h).padStart(2, "0")}.${String(m).padStart(2, "0")}`;
}

const MONTH_OUT = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
function buildTanggalTeksTimeline(baseDate) {
    function toText(d) { return `${d.getDate()} ${MONTH_OUT[d.getMonth()]}`; }
    const d1 = new Date(baseDate.getTime()); d1.setDate(baseDate.getDate() - 2);
    const d2 = new Date(baseDate.getTime()); d2.setDate(baseDate.getDate() - 1);
    const d3 = new Date(baseDate.getTime());
    return { DATE1: toText(d1), DATE2: toText(d2), DATE3: toText(d3) };
}

// --- Data Normalization ---
function normalizeHP(input) {
    if (!input) throw new Error("HP kosong");
    let s = String(input).trim().replace(/[\u200B-\u200D\uFEFF]/g, "").replace(/[^0-9+]/g, "");
    if (!s) throw new Error("HP kosong setelah dibersihkan");
    
    s = s.replace(/\+/g, "");
    
    // Tangani kesalahan ketik umum
    if (s.startsWith("062")) s = s.slice(1);
    if (s.startsWith("6262")) s = s.slice(2);
    if (s.startsWith("6208")) s = "628" + s.slice(4);
    
    if (s.startsWith("08")) s = "628" + s.slice(2);
    else if (s.startsWith("8")) s = "62" + s;

    if (!s.startsWith("62")) throw new Error(`HP bukan format Indonesia: ${input}`);
    if (s.length < 10 || s.length > 15) throw new Error(`HP tidak valid (panjang): ${input}`);
    if (!/^628[0-9]{7,13}$/.test(s)) throw new Error(`HP bukan operator umum: ${input}`);
    
    // Format International: +628...
    return "+" + s;
}

const MONTH_MAP = {
    jan:0,januari:0, feb:1,februari:1, mar:2,maret:2, apr:3,april:3, mei:4,
    jun:5,juni:5, jul:6,juli:6, agu:7,agustus:7, sep:8,september:8, 
    okt:9,oktober:9, nov:10,november:10, des:11,desember:11, dec:11,december:11
};
function normalizeTanggal(input) {
    if (!input) throw new Error("Tanggal kosong");
    function toSafeDate(y, m, d) { return new Date(y, m, d, 12, 0, 0); }
    let s = String(input).replace(/[\u200B-\u200D\uFEFF\u00A0]/g, "").trim();
    if (!s) throw new Error("Tanggal kosong setelah dibersihkan");

    if (!isNaN(s) && isFinite(s)) {
        const epoch = new Date(1899, 11, 30, 12, 0, 0);
        return new Date(epoch.getTime() + Number(s) * 86400000);
    }
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
        const [y, m, d] = s.slice(0, 10).split("-").map(Number);
        return toSafeDate(y, m - 1, d);
    }
    let m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (m) return toSafeDate(parseInt(m[3], 10), parseInt(m[2], 10) - 1, parseInt(m[1], 10));
    m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})$/);
    if (m) return toSafeDate(2000 + parseInt(m[3], 10), parseInt(m[2], 10) - 1, parseInt(m[1], 10));
    m = s.toLowerCase().match(/^(\d{1,2})\s*([a-z]+)(?:\s*(\d{4}))?$/);
    if (m && MONTH_MAP[m[2]] !== undefined) {
        const y = m[3] ? parseInt(m[3], 10) : new Date().getFullYear();
        return toSafeDate(y, MONTH_MAP[m[2]], parseInt(m[1], 10));
    }
    throw new Error(`Format tanggal tidak dikenali: ${input}`);
}

function normColName(name) { return String(name).toLowerCase().replace(/\s+/g, "").replace(/_/g, ""); }
function pickField(row, candidates) {
    for (const key of Object.keys(row)) {
        if (candidates.includes(normColName(key))) {
            const v = row[key];
            return v == null ? "" : String(v).trim();
        }
    }
    return "";
}

// --- Core Rendering ---
function renderTemplateToDOM(ctx) {
    // Populate SMS DOM
    document.getElementById('sms-time').textContent = ctx.TIME;
    document.getElementById('sms-notifications').innerHTML = ctx.NOTIFICATIONS;
    document.getElementById('sms-network').textContent = ctx.NETWORK;
    document.getElementById('sms-signal').innerHTML = ctx.SIGNAL_HTML;
    document.getElementById('sms-batt-level').style.width = ctx.BATT + '%';
    document.getElementById('sms-batt-level').style.backgroundColor = ctx.BATT_COLOR;
    document.getElementById('sms-batt-text').textContent = ctx.BATT + '%';
    
    document.getElementById('sms-phone').textContent = ctx.PHONE;
    document.getElementById('sms-date1').textContent = ctx.DATE1;
    document.getElementById('sms-date2').textContent = ctx.DATE2;
    document.getElementById('sms-date3').textContent = ctx.DATE3;
    document.getElementById('sms-msg1').textContent = ctx.MSG1;
    document.getElementById('sms-msg2').textContent = ctx.MSG2;
    document.getElementById('sms-msg3').textContent = ctx.MSG3;

    // Populate Contact DOM
    document.getElementById('contact-time').textContent = ctx.TIME;
    document.getElementById('contact-notifications').innerHTML = ctx.NOTIFICATIONS;
    document.getElementById('contact-network').textContent = ctx.NETWORK;
    document.getElementById('contact-signal').innerHTML = ctx.SIGNAL_HTML;
    document.getElementById('contact-batt-level').style.width = ctx.BATT + '%';
    document.getElementById('contact-batt-level').style.backgroundColor = ctx.BATT_COLOR;
    document.getElementById('contact-batt-text').textContent = ctx.BATT + '%';
    document.getElementById('contact-phone').textContent = ctx.PHONE;
}

// Ensure the timemark handles cross-origin (if applicable, here it's read by FileReader)
async function processRow(row, ziplayer, batTL, sigTL, netTL) {
    const pos = row._pos;
    const tglText = buildTanggalTeksTimeline(row.__tgl_parsed);
    const msg = `Assalamualaikum kami dari J&T Express ${row.kota} mau konfirmasi paket :\nNo Resi : ${row.resi}\nMOHON SHARELOCK ALAMAT JELAS\nJIKA MAU DI ANTAR, PAKET HANYA DI TAHAN SELAMA 3 HARI`;

    const ctx = {
        TIME: batTL[pos].time, BATT: batTL[pos].battery, BATT_COLOR: batteryColor(batTL[pos].battery),
        SIGNAL_HTML: signalBars(sigTL[pos]), NETWORK: netTL[pos], NOTIFICATIONS: notifHTML(notifIcons(pos)),
        PHONE: row.hp,
        DATE1: `${tglText.DATE1} ${randomBubbleTime()}`, DATE2: `${tglText.DATE2} ${randomBubbleTime()}`, DATE3: `${tglText.DATE3} ${randomBubbleTime()}`,
        MSG1: msg, MSG2: msg, MSG3: msg,
    };

    renderTemplateToDOM(ctx);
    await sleep(20); // allow DOM refresh

    // Capture using html2canvas
    const smsEl = document.getElementById('sms-template');
    const contactEl = document.getElementById('contact-template');
    
    // Make sure we pass the correct options to get full layout
    const cOptions = { scale: 1, useCORS: true, logging: false };
    const canvasSms = await html2canvas(smsEl, cOptions);
    const canvasContact = await html2canvas(contactEl, cOptions);

    // Merge logic: target height 920. We will scale input images to target height.
    const tImg = timemarkPreview;
    const sRatio = TARGET_HEIGHT / canvasSms.height;
    const cRatio = TARGET_HEIGHT / canvasContact.height;
    const tRatio = TARGET_HEIGHT / tImg.naturalHeight;

    const sWidth = canvasSms.width * sRatio;
    const cWidth = canvasContact.width * cRatio;
    const tWidth = tImg.naturalWidth * tRatio;

    const totalWidth = sWidth + cWidth + tWidth;
    
    // Draw onto master canvas
    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = totalWidth;
    finalCanvas.height = TARGET_HEIGHT;
    const ctxCanvas = finalCanvas.getContext('2d');
    
    // Fill white bg
    ctxCanvas.fillStyle = '#ffffff';
    ctxCanvas.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
    
    ctxCanvas.drawImage(canvasSms, 0, 0, sWidth, TARGET_HEIGHT);
    ctxCanvas.drawImage(canvasContact, sWidth, 0, cWidth, TARGET_HEIGHT);
    ctxCanvas.drawImage(tImg, sWidth + cWidth, 0, tWidth, TARGET_HEIGHT);

    // Compress to meet MAX_SIZE
    let quality = 0.95;
    let blob = null;
    
    // Simple compression loop
    while (quality >= 0.40) {
        blob = await new Promise(resolve => finalCanvas.toBlob(resolve, 'image/jpeg', quality));
        if (blob.size <= MAX_SIZE || quality === 0.40) break;
        quality -= 0.05;
    }

    const baseName = safeName(row.resi, pos);
    ziplayer.file(`${baseName}.jpg`, blob);
}

// --- Main App Flow ---
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!excelInput.files[0] || !timemarkInput.files[0]) return;

    renderBtn.disabled = true;
    logList.innerHTML = '';
    progressContainer.classList.remove('hidden');
    progressPct.textContent = '0%';
    progressFill.style.width = '0%';
    
    try {
        log("Membaca file Excel...");
        const data = await excelInput.files[0].arrayBuffer();
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const raw = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: "" });
        
        const rows = [];
        const errors = [];
        
        raw.forEach((r, i) => {
            const kota = pickField(r, ["kota", "city", "kecamatan", "kelurahan"]);
            const resi = pickField(r, ["resi","noresi","nomorresi","waybill","awb","no_awb","no_waybill"]);
            const hpRaw = pickField(r, ["hp","nohp","no_hp","nomorhp","telepon","notelp","phone"]);
            const tglRaw = pickField(r, ["tgl","tanggal","date","tglkirim","deliverydate"]);

            if (!resi) { errors.push(`Baris ${i + 2}: RESI kosong`); return; }
            let hp = "", parsedDate = null;
            try { hp = normalizeHP(hpRaw); } catch (e) { errors.push(`Baris ${i + 2}: ${e.message}`); return; }
            try { parsedDate = normalizeTanggal(tglRaw); } catch (e) { errors.push(`Baris ${i + 2}: ${e.message}`); return; }
            
            rows.push({
                kota, resi: String(resi).trim(), hp, tgl_raw: tglRaw, 
                __tgl_parsed: parsedDate, _pos: rows.length
            });
        });

        if (errors.length > 0) {
            errors.forEach(e => log("❌ " + e));
            log("Terdapat data error. Silakan perbaiki excel sebelum merender.");
            renderBtn.disabled = false;
            return;
        }

        const total = rows.length;
        if (total === 0) { log("Data kosong."); renderBtn.disabled = false; return; }
        
        log(`Validasi OK. Memproses ${total} data...`);
        const batTL = buildBatteryTimeline(total);
        const sigTL = buildSignalTimeline(total);
        const netTL = buildNetworkTimeline(total);

        const zip = new JSZip();
        
        for (let i = 0; i < total; i++) {
            progressText.textContent = `Merender Resi: ${rows[i].resi}`;
            log(`Rendering: ${rows[i].resi} (${i+1}/${total})`);
            
            await processRow(rows[i], zip, batTL, sigTL, netTL);
            
            const pct = Math.round(((i + 1) / total) * 100);
            progressPct.textContent = `${pct}%`;
            progressFill.style.width = `${pct}%`;
        }
        
        progressText.textContent = "Membungkus file ZIP...";
        log("Mempersiapkan ZIP file...");
        
        const content = await zip.generateAsync({ type: "blob" });
        saveAs(content, "SMS_Bot_Output.zip");
        
        log("✅ Sukses! ZIP sedang diunduh.");
        progressText.textContent = "Selesai!";
        
    } catch(err) {
        log("❌ Kesalahan Sistem: " + err.message);
        console.error(err);
    }
    
    renderBtn.disabled = false;
});
