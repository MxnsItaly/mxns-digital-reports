const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const lkDir = 'C:/Users/alber/Desktop/LK';
const defPath = path.join(lkDir, 'report_digitale_settembre2026_personalizzato_DEF.html');
const outHtmlPath = path.join(lkDir, 'report_digitale_2026_10_ottobre.html');
const outPdfPath = path.join(lkDir, 'mxns_DigitalReport_Ottobre26.pdf');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const defHtml = fs.readFileSync(defPath, 'utf8');

// 1. Extract <head>...</head> and update title
const headMatch = defHtml.match(/^[\s\S]*?<\/head>/);
if (!headMatch) throw new Error('Could not find </head> in DEF HTML');
const headHtml = headMatch[0]
  .replace(
    '<title>Mérieux NutriSciences - Report Digitale Settembre 2026</title>',
    '<title>Mérieux NutriSciences - Report Digitale Ottobre 2026</title>'
  )
  .replace(
    '--color-primary: #0b3353;',
    '--color-primary: #0b3353;\n      --mxns-navy: #0b3353;\n      --mxns-blue: #009fe3;'
  );

// 2. Extract Base64 header logo
const logoMatch = defHtml.match(/<img src="(data:image\/png;base64,[^"]+)" class="header-logo"/);
if (!logoMatch) throw new Error('Could not extract header-logo data URI');
const logoDataUri = logoMatch[1];

// 3. Extract Cover SVG and transform "PERIODO: SETTEMBRE 2026" -> "PERIODO: OTTOBRE 2026" using native vector glyphs
const coverSvgMatch = defHtml.match(/<svg[\s\S]*?<\/svg>/);
if (!coverSvgMatch) throw new Error('Could not extract cover SVG');
const septCoverSvg = coverSvgMatch[0];

function buildOctoberCoverSvg(svg) {
  const glyphRegex = /<g fill="#545454" fill-opacity="1"><g transform="translate\(([0-9.]+),\s*778\.249388\)"><g><path d="([^"]+)"><\/path><\/g><\/g><\/g>/g;
  const matches = [...svg.matchAll(glyphRegex)];
  if (matches.length !== 21) {
    throw new Error(`Expected 21 glyphs at y=778.249388, found ${matches.length}`);
  }
  // Original non-space chars:
  // 0:P 1:E 2:R 3:I 4:O 5:D 6:O 7:: 8:S 9:E 10:T 11:T 12:E 13:M 14:B 15:R 16:E 17:2 18:0 19:2 20:6
  const pathOf = {
    P: matches[0][2],
    E: matches[1][2],
    R: matches[2][2],
    I: matches[3][2],
    O: matches[4][2],
    D: matches[5][2],
    ':': matches[7][2],
    T: matches[10][2],
    B: matches[14][2],
    '2': matches[17][2],
    '0': matches[18][2],
    '6': matches[20][2]
  };
  const advOf = {
    P: parseFloat(matches[1][1]) - parseFloat(matches[0][1]),       // 10.679945
    E: parseFloat(matches[2][1]) - parseFloat(matches[1][1]),       // 10.088396
    R: parseFloat(matches[3][1]) - parseFloat(matches[2][1]),       // 11.015703
    I: parseFloat(matches[4][1]) - parseFloat(matches[3][1]),       // 5.084163
    O: parseFloat(matches[5][1]) - parseFloat(matches[4][1]),       // 11.783116
    D: parseFloat(matches[6][1]) - parseFloat(matches[5][1]),       // 11.479351
    ': ': parseFloat(matches[8][1]) - parseFloat(matches[7][1]),    // 9.592788 (includes space)
    T: parseFloat(matches[11][1]) - parseFloat(matches[10][1]),     // 10.440132
    B: parseFloat(matches[15][1]) - parseFloat(matches[14][1]),     // 10.935762
    'E ': parseFloat(matches[17][1]) - parseFloat(matches[16][1]),  // 14.660950 (includes space)
    '2': parseFloat(matches[18][1]) - parseFloat(matches[17][1]),   // 9.528814
    '0': parseFloat(matches[19][1]) - parseFloat(matches[18][1]),   // 10.296251
    '6': 0
  };

  const seq = [
    { ch: 'P', adv: advOf.P },
    { ch: 'E', adv: advOf.E },
    { ch: 'R', adv: advOf.R },
    { ch: 'I', adv: advOf.I },
    { ch: 'O', adv: advOf.O },
    { ch: 'D', adv: advOf.D },
    { ch: 'O', adv: advOf.O },
    { ch: ':', adv: advOf[': '] },
    { ch: 'O', adv: advOf.O },
    { ch: 'T', adv: advOf.T },
    { ch: 'T', adv: advOf.T },
    { ch: 'O', adv: advOf.O },
    { ch: 'B', adv: advOf.B },
    { ch: 'R', adv: advOf.R },
    { ch: 'E', adv: advOf['E '] },
    { ch: '2', adv: advOf['2'] },
    { ch: '0', adv: advOf['0'] },
    { ch: '2', adv: advOf['2'] },
    { ch: '6', adv: 0 }
  ];

  let curX = parseFloat(matches[0][1]);
  const newGlyphsHtml = seq.map(item => {
    const g = `<g fill="#545454" fill-opacity="1"><g transform="translate(${curX.toFixed(6)}, 778.249388)"><g><path d="${pathOf[item.ch]}"></path></g></g></g>`;
    curX += item.adv;
    return g;
  }).join('');

  const startIdx = matches[0].index;
  const endIdx = matches[matches.length - 1].index + matches[matches.length - 1][0].length;
  const spanSlice = svg.slice(startIdx, endIdx);
  const leftover = spanSlice.replace(glyphRegex, '');
  console.log('Cover SVG glyph span leftover chars:', JSON.stringify(leftover));
  return svg.slice(0, startIdx) + newGlyphsHtml + svg.slice(endIdx);
}

const octCoverSvg = buildOctoberCoverSvg(septCoverSvg);

// 4. SVG Donut Chart helper (identical to build_fully_customizable_report.js)
function generatePieSvg(slices, size = 100, innerRatio = 0.54) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 6;
  const ir = r * innerRatio;
  let total = slices.reduce((s, x) => s + x.value, 0);
  if (total === 0) total = 1;
  let startAngle = -Math.PI / 2;
  let paths = '';

  slices.forEach(slice => {
    if (slice.value <= 0) return;
    const angle = (slice.value / total) * Math.PI * 2;
    const endAngle = startAngle + angle;
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const ix1 = cx + ir * Math.cos(startAngle);
    const iy1 = cy + ir * Math.sin(startAngle);
    const ix2 = cx + ir * Math.cos(endAngle);
    const iy2 = cy + ir * Math.sin(endAngle);
    const largeArc = angle > Math.PI ? 1 : 0;

    if (angle >= Math.PI * 2 - 0.001) {
      paths += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${slice.color}" /><circle cx="${cx}" cy="${cy}" r="${ir}" fill="#ffffff" />`;
    } else {
      const d = [
        `M ${x1} ${y1}`,
        `A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`,
        `L ${ix2} ${iy2}`,
        `A ${ir} ${ir} 0 ${largeArc} 0 ${ix1} ${iy1}`,
        'Z'
      ].join(' ');
      paths += `<path d="${d}" fill="${slice.color}" stroke="#ffffff" stroke-width="2"></path>`;
    }
    startAngle = endAngle;
  });

  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${paths}</svg>`;
}

// 5. SVG 5-Month Bar Chart for Slide 5 (Expert Partners Web)
function generateFiveMonthBarSvg(items) {
  const maxVal = Math.max(...items.map(i => i.val), 1);
  const maxH = 50;
  const baseY = 60;
  const xs = [20, 85, 150, 215, 280];
  const bars = items.map((it, idx) => {
    const h = (it.val / maxVal) * maxH;
    const y = baseY - h;
    const x = xs[idx];
    return `
          <rect x="${x}" y="${y}" width="40" height="${h}" rx="4" fill="${it.color}"></rect>
          <text x="${x + 20}" y="${y - 4}" text-anchor="middle" font-size="11.5" font-weight="800" fill="#0b3353">${it.val}</text>
          <text x="${x + 20}" y="76" text-anchor="middle" font-size="11" font-weight="700" fill="#556980">${it.label}</text>`;
  }).join('');
  return `<svg width="340" height="82" viewBox="0 0 340 82">${bars}\n    </svg>`;
}

// Prepare Charts
const donutSeniority = generatePieSvg([
  { value: 20697, color: '#0b3353' },
  { value: 12001, color: '#88bf3a' },
  { value: 3346, color: '#f5a623' }
], 100);

const donutSettori = generatePieSvg([
  { value: 5130, color: '#0b3353' },
  { value: 4145, color: '#88bf3a' },
  { value: 2452, color: '#f5a623' },
  { value: 2378, color: '#009fe3' },
  { value: 2372, color: '#7ab5db' }
], 100);

const donutFunzioni = generatePieSvg([
  { value: 8549, color: '#0b3353' },
  { value: 4147, color: '#88bf3a' },
  { value: 4035, color: '#f5a623' },
  { value: 3134, color: '#009fe3' },
  { value: 2102, color: '#7ab5db' }
], 100);

const donutCitta = generatePieSvg([
  { value: 4333, color: '#0b3353' },
  { value: 3350, color: '#88bf3a' },
  { value: 3265, color: '#f5a623' },
  { value: 2334, color: '#009fe3' },
  { value: 1798, color: '#7ab5db' }
], 100);

const epWebBarsSvg = generateFiveMonthBarSvg([
  { label: 'Giu', val: 562, color: '#b0c7dc' },
  { label: 'Lug', val: 994, color: '#0b3353' },
  { label: 'Ago', val: 588, color: '#7ab5db' },
  { label: 'Set', val: 819, color: '#7ab5db' },
  { label: 'Ott', val: 466, color: '#88bf3a' }
]);

const donutSources = generatePieSvg([
  { value: 10230, color: '#0b3353' },
  { value: 5356, color: '#88bf3a' },
  { value: 190, color: '#f5a623' },
  { value: 95, color: '#009fe3' },
  { value: 155, color: '#7ab5db' }
], 135);

const donutDevices = generatePieSvg([
  { value: 12369, color: '#0b3353' },
  { value: 3371, color: '#009fe3' },
  { value: 286, color: '#88bf3a' }
], 135);

// Helper for Header & Footer bands
function headerBand(title, subtitle, badge) {
  return `      <div class="header-band drag-block" draggable="false">
        <div class="header-left">
          <img src="${logoDataUri}" class="header-logo" alt="Logo">
          <div class="header-title-box">
            <h1 contenteditable="false" spellcheck="false">${title}</h1>
            <p contenteditable="false" spellcheck="false">${subtitle}</p>
          </div>
        </div>
        <div class="header-badge" contenteditable="false" spellcheck="false">${badge}</div>
      </div>`;
}

function footerBand(pageNum) {
  return `      <div class="footer-band drag-block" draggable="false">
        <span contenteditable="false" spellcheck="false">Mérieux NutriSciences Italia</span>
        <span contenteditable="false" spellcheck="false">Pagina ${pageNum} di 14</span>
      </div>`;
}

// Extract tail (Admin Lock Pill + Modal + Studio Script) from DEF HTML and update download filename
const tailStart = defHtml.indexOf('<!-- Admin Floating Lock Pill -->');
let tailHtml = '';
if (tailStart !== -1) {
  tailHtml = defHtml.slice(tailStart).replace(
    "a.download = 'report_digitale_settembre2026_personalizzato_DEF.html';",
    "a.download = 'report_digitale_2026_10_ottobre.html';"
  );
} else {
  // Check if admin lock pill is placed elsewhere or before script
  const scriptIdx = defHtml.lastIndexOf('<script>');
  const adminPillElements = `
  <!-- Admin Floating Lock Pill -->
  <div id="admin-lock-pill" onclick="handleLockPillClick()">
    <span id="admin-lock-icon">🔒</span>
    <span id="admin-lock-label">Sola Lettura (Admin Lock)</span>
  </div>

  <!-- Admin PIN Modal -->
  <div id="admin-modal-overlay" onclick="closeAdminModal(event)">
    <div class="admin-modal-card" onclick="event.stopPropagation()">
      <div class="admin-modal-title">
        <span>🔐 Sblocco Modifica Report</span>
      </div>
      <p class="admin-modal-sub">Inserisci il PIN amministratore per abilitare la modifica del testo e la personalizzazione dei blocchi.</p>
      <input type="password" id="adminPinInput" class="admin-modal-input" placeholder="PIN Amministratore" onkeydown="if(event.key==='Enter') verifyAdminPin()">
      <div id="adminPinError" style="color:#ef4444; font-size:0.75rem; margin-top:-10px; margin-bottom:12px; display:none; font-weight:600;">PIN non corretto. Riprova.</div>
      <div class="admin-modal-actions">
        <button class="admin-modal-btn btn-cancel" onclick="closeAdminModalDirect()">Annulla</button>
        <button class="admin-modal-btn btn-unlock" onclick="verifyAdminPin()">Sblocca</button>
      </div>
    </div>
  </div>
`;
  tailHtml = adminPillElements + defHtml.slice(scriptIdx).replace(
    "a.download = 'report_digitale_settembre2026_personalizzato_DEF.html';",
    "a.download = 'report_digitale_2026_10_ottobre.html';"
  );
}

// Studio Topbar & Sidebar so unlocking Admin Mode gives the full interactive controls too!
const studioControlsHtml = `
  <div id="studio-topbar">
    <div class="st-brand">✨ MXNS REPORT STUDIO • OTTOBRE 2026</div>
    <div class="st-actions">
      <button class="st-btn" id="sidebar-toggle-btn" onclick="toggleSidebar()">⚙️ Spaziature &amp; Layout</button>
      <button class="st-btn" onclick="window.print()">🖨️ Stampa / Salva PDF</button>
      <button class="st-btn st-btn-green" onclick="saveCompleteHtml()">💾 Salva HTML</button>
    </div>
  </div>

  <div id="studio-sidebar" class="collapsed">
    <div class="sb-header">
      <span>CONTROLLO SPAZIATURE &amp; TESTI</span>
      <button class="bt-btn" onclick="toggleSidebar()">✕</button>
    </div>
    <div class="sb-content">
      <div class="sb-field">
        <div class="sb-field-row"><span>Distanza tra Blocchi</span><span id="val-gap">36px</span></div>
        <input type="range" class="sb-range" min="10" max="48" value="36" oninput="updateGap(this.value)">
      </div>
      <div class="sb-field">
        <div class="sb-field-row"><span>Margine Verticale Pagina</span><span id="val-padding-v">40px</span></div>
        <input type="range" class="sb-range" min="14" max="50" value="40" oninput="updatePagePaddingV(this.value)">
      </div>
      <div class="sb-field">
        <div class="sb-field-row"><span>Padding Interno Card</span><span id="val-card-padding">26px</span></div>
        <input type="range" class="sb-range" min="8" max="34" value="26" oninput="updateCardPadding(this.value)">
      </div>
      <div class="sb-field">
        <div class="sb-field-row"><span>Dimensione Base Testo</span><span id="val-font-size">15px</span></div>
        <input type="range" class="sb-range" min="11" max="17" value="15" oninput="updateFontSize(this.value)">
      </div>
    </div>
  </div>
`;

const bodyHtml = `<body>
${studioControlsHtml}
  <div class="report-container" id="report-root">

    <!-- ==================== SLIDE 1: OFFICIAL COVER ==================== -->
    <div class="page page-cover drag-block" id="slide-1" draggable="false">
      ${octCoverSvg}
    </div>

    <!-- ==================== SLIDE 2: SUMMARY (PANORAMICA CANALI) ==================== -->
    <div class="page" id="slide-2">
${headerBand('SUMMARY', 'Panoramica Canali Digital - Ottobre 2026', 'REPORT MENSILE')}

      <div class="page-content" id="page-content-2">
        <div class="drag-block comm-box" style="background: #eef6fc; border-left: 4.5px solid var(--color-cyan); padding: 12px 18px; font-size: 12px; color: #1c3d5a;" draggable="false">
          Il mese di <strong>ottobre 2026</strong> segna un'ulteriore accelerazione su tutti i presidi digitali aziendali rispetto a settembre: forte balzo delle impression su LinkedIn (<strong>+63.09%</strong>), oltre il doppio dei volumi email recapitati e letti (<strong>96.942 consegnate</strong>, +118.84% aperture uniche) e netta espansione del traffico web (<strong>16.026 visite</strong>, +38.01% con bounce rate in discesa al 28.0%).
        </div>

        <!-- 3 KPI Highlights Row -->
        <div class="grid-3 drag-block" draggable="false">
          <div class="card card-hero" style="text-align:center; padding:12px;">
            <div style="font-size:10px; font-weight:800; color:#556980; text-transform:uppercase;">LINKEDIN IMPRESSION</div>
            <div style="font-size:26px; font-weight:900; color:var(--color-primary); margin:2px 0;">87.856</div>
            <span class="trend-pill trend-up">+63.09% vs Set</span>
          </div>
          <div class="card card-green" style="text-align:center; padding:12px;">
            <div style="font-size:10px; font-weight:800; color:#556980; text-transform:uppercase;">EMAIL APERTURE UNICHE</div>
            <div style="font-size:26px; font-weight:900; color:var(--color-primary); margin:2px 0;">15.844</div>
            <span class="trend-pill trend-up">+118.84% vs Set</span>
          </div>
          <div class="card card-orange" style="text-align:center; padding:12px;">
            <div style="font-size:10px; font-weight:800; color:#556980; text-transform:uppercase;">SITO WEB VISITE</div>
            <div style="font-size:26px; font-weight:900; color:var(--color-primary); margin:2px 0;">16.026</div>
            <span class="trend-pill trend-up">+38.01% vs Set</span>
          </div>
        </div>

        <!-- 1. LinkedIn Card -->
        <div class="pill-card drag-block" draggable="false">
          <div class="pill-badge">Linkedin</div>
          <table class="data-table">
            <thead>
              <tr>
                <th>Metrica</th>
                <th class="num">Settembre</th>
                <th class="num">Ottobre</th>
                <th class="num">Variazione</th>
                <th style="text-align:center; width:45px;">Stato</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Nuovi follower</td>
                <td class="num">466</td>
                <td class="num"><b>463</b></td>
                <td class="num"><span class="trend-pill trend-neutral">-0.64%</span></td>
                <td style="text-align:center; color:#2e7d32; font-weight:800;">✓</td>
              </tr>
              <tr>
                <td>Post totali</td>
                <td class="num">24</td>
                <td class="num"><b>26</b></td>
                <td class="num"><span class="trend-pill trend-up">+8.33%</span></td>
                <td style="text-align:center; color:#2e7d32; font-weight:800;">✓</td>
              </tr>
              <tr class="highlight-row">
                <td>Impression totali</td>
                <td class="num">53.869</td>
                <td class="num"><b>87.856</b></td>
                <td class="num"><span class="trend-pill trend-up">+63.09%</span></td>
                <td style="text-align:center; color:#2e7d32; font-weight:800;">✓</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 2. Mail Card -->
        <div class="pill-card drag-block" draggable="false">
          <div class="pill-badge cyan">Mail</div>
          <table class="data-table">
            <thead>
              <tr>
                <th>Metrica</th>
                <th class="num">Settembre</th>
                <th class="num">Ottobre</th>
                <th class="num">Variazione</th>
                <th style="text-align:center; width:45px;">Stato</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Campagne inviate</td>
                <td class="num">10</td>
                <td class="num"><b>12</b></td>
                <td class="num"><span class="trend-pill trend-up">+20.00%</span></td>
                <td style="text-align:center; color:#2e7d32; font-weight:800;">✓</td>
              </tr>
              <tr>
                <td>Email consegnate</td>
                <td class="num">38.718</td>
                <td class="num"><b>96.942</b></td>
                <td class="num"><span class="trend-pill trend-up">+150.38%</span></td>
                <td style="text-align:center; color:#2e7d32; font-weight:800;">✓</td>
              </tr>
              <tr class="highlight-row">
                <td>Aperture uniche (Open Rate 16.3%)</td>
                <td class="num">7.240</td>
                <td class="num"><b>15.844</b></td>
                <td class="num"><span class="trend-pill trend-up">+118.84%</span></td>
                <td style="text-align:center; color:#2e7d32; font-weight:800;">✓</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 3. Website Card -->
        <div class="pill-card drag-block" draggable="false">
          <div class="pill-badge green">Website</div>
          <table class="data-table">
            <thead>
              <tr>
                <th>Metrica</th>
                <th class="num">Settembre</th>
                <th class="num">Ottobre</th>
                <th class="num">Variazione</th>
                <th style="text-align:center; width:45px;">Stato</th>
              </tr>
            </thead>
            <tbody>
              <tr class="highlight-row">
                <td>Visite</td>
                <td class="num">11.612</td>
                <td class="num"><b>16.026</b></td>
                <td class="num"><span class="trend-pill trend-up">+38.01%</span></td>
                <td style="text-align:center; color:#2e7d32; font-weight:800;">✓</td>
              </tr>
              <tr>
                <td>Azioni per visita</td>
                <td class="num">3.7</td>
                <td class="num"><b>4.3</b></td>
                <td class="num"><span class="trend-pill trend-up">+16.22%</span></td>
                <td style="text-align:center; color:#2e7d32; font-weight:800;">✓</td>
              </tr>
              <tr>
                <td>Bounce rate</td>
                <td class="num">35.0%</td>
                <td class="num"><b>28.0%</b></td>
                <td class="num"><span class="trend-pill trend-up">-20.00%</span></td>
                <td style="text-align:center; color:#2e7d32; font-weight:800;">✓</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

${footerBand(2)}
    </div>

    <!-- ==================== SLIDE 3: SUMMARY BUSINESS UNITS ==================== -->
    <div class="page" id="slide-3">
${headerBand('SUMMARY BUSINESS UNITS', 'Pagine Più Visitate per Settore (Dati Matomo Analytics - Ottobre 2026)', 'BU WEBSITE METRICS')}

      <div class="page-content" id="page-content-3">
        <!-- BU Visual Share Progress Bars -->
        <div class="card card-navy drag-block" style="padding: 12px 16px;" draggable="false">
          <div style="font-size:11.5px; font-weight:800; color:var(--color-primary); margin-bottom:6px; display:flex; justify-content:space-between; align-items:center;">
            <span>Distribuzione Visualizzazioni Totali per Business Unit</span>
            <span style="color:var(--color-cyan); font-weight:700; font-size:11px;">Totale Pagine BU: 3.243 (+36.7%)</span>
          </div>
          <div style="display:flex; flex-direction:column; gap:5.5px;">
            <div style="display:flex; align-items:center; gap:8px;">
              <div style="width:175px; font-size:11px; font-weight:700; color:var(--color-primary);">Food Safety &amp; Quality</div>
              <div style="flex:1; background:#eef3f8; height:10px; border-radius:5px; overflow:hidden;">
                <div style="width:55.7%; background:#0b3353; height:100%; border-radius:5px;"></div>
              </div>
              <div style="width:95px; text-align:right; font-size:11px; font-weight:800; color:var(--color-primary);">1.806 <span style="font-weight:600; font-size:10px; color:#556980;">(55.7%)</span></div>
            </div>

            <div style="display:flex; align-items:center; gap:8px;">
              <div style="width:175px; font-size:11px; font-weight:700; color:var(--color-primary);">Environmental Services</div>
              <div style="flex:1; background:#eef3f8; height:10px; border-radius:5px; overflow:hidden;">
                <div style="width:17.4%; background:#88bf3a; height:100%; border-radius:5px;"></div>
              </div>
              <div style="width:95px; text-align:right; font-size:11px; font-weight:800; color:var(--color-primary);">563 <span style="font-weight:600; font-size:10px; color:#556980;">(17.4%)</span></div>
            </div>

            <div style="display:flex; align-items:center; gap:8px;">
              <div style="width:175px; font-size:11px; font-weight:700; color:var(--color-primary);">Pharma &amp; Cosmetics</div>
              <div style="flex:1; background:#eef3f8; height:10px; border-radius:5px; overflow:hidden;">
                <div style="width:13.9%; background:#009fe3; height:100%; border-radius:5px;"></div>
              </div>
              <div style="width:95px; text-align:right; font-size:11px; font-weight:800; color:var(--color-primary);">450 <span style="font-weight:600; font-size:10px; color:#556980;">(13.9%)</span></div>
            </div>

            <div style="display:flex; align-items:center; gap:8px;">
              <div style="width:175px; font-size:11px; font-weight:700; color:var(--color-primary);">Packaging Hub</div>
              <div style="flex:1; background:#eef3f8; height:10px; border-radius:5px; overflow:hidden;">
                <div style="width:8.1%; background:#f5a623; height:100%; border-radius:5px;"></div>
              </div>
              <div style="width:95px; text-align:right; font-size:11px; font-weight:800; color:var(--color-primary);">264 <span style="font-weight:600; font-size:10px; color:#556980;">(8.1%)</span></div>
            </div>

            <div style="display:flex; align-items:center; gap:8px;">
              <div style="width:175px; font-size:11px; font-weight:700; color:var(--color-primary);">Food Supplements</div>
              <div style="flex:1; background:#eef3f8; height:10px; border-radius:5px; overflow:hidden;">
                <div style="width:4.9%; background:#546e7a; height:100%; border-radius:5px;"></div>
              </div>
              <div style="width:95px; text-align:right; font-size:11px; font-weight:800; color:var(--color-primary);">160 <span style="font-weight:600; font-size:10px; color:#556980;">(4.9%)</span></div>
            </div>
          </div>
        </div>

        <!-- Top 2 BU: Food & Pharma -->
        <div class="grid-2 drag-block" draggable="false">
          <!-- FOOD -->
          <div class="pill-card" style="padding: 11px 14px;">
            <div class="pill-badge" style="font-size:10.5px; padding:2px 9px; left:12px;">FOOD</div>
            <div class="tree-header" style="margin-top:2px;">
              <span>Pagine Più Visitate</span>
              <span>Visualizzazioni</span>
            </div>
            <div class="tree-row"><span>Focolaio Salmonella pomodorini</span><strong class="tree-val">1.042</strong></div>
            <div class="tree-row"><span>Food Safety &amp; Quality (Hub)</span><strong class="tree-val">375</strong></div>
            <div class="tree-row"><span>Servizi per aziende alimentari</span><strong class="tree-val">149</strong></div>
            <div class="tree-row"><span>Settori industria alimentare</span><strong class="tree-val">133</strong></div>
            <div class="tree-row"><span>MOSH &amp; MOAH negli alimenti</span><strong class="tree-val">107</strong></div>
          </div>

          <!-- PHARMA & COSMETICS -->
          <div class="pill-card" style="padding: 11px 14px;">
            <div class="pill-badge cyan" style="font-size:10.5px; padding:2px 9px; left:12px;">PHARMA &amp; COSMETICS</div>
            <div class="tree-header" style="margin-top:2px;">
              <span>Pagine Più Visitate</span>
              <span>Visualizzazioni</span>
            </div>
            <div class="tree-row"><span>Pharma &amp; Healthcare (Hub)</span><strong class="tree-val">256</strong></div>
            <div class="tree-row"><span>Servizi Farmaceutici &amp; GMP</span><strong class="tree-val">99</strong></div>
            <div class="tree-row"><span>Cosmetici &amp; Personal Care</span><strong class="tree-val">34</strong></div>
            <div class="tree-row"><span>Dispositivi Medici</span><strong class="tree-val">32</strong></div>
            <div class="tree-row"><span>Skin Care Viso &amp; Corpo</span><strong class="tree-val">29</strong></div>
          </div>
        </div>

        <!-- Bottom 3 BU: Environmental, Packaging, Food Supplements -->
        <div class="grid-3 drag-block" draggable="false">
          <!-- ENVIRONMENTAL -->
          <div class="pill-card" style="padding: 10px 12px;">
            <div class="pill-badge green" style="font-size:9.5px; padding:2px 8px; left:10px;">ENVIRONMENTAL</div>
            <div class="tree-header" style="font-size:10.5px; margin-top:2px;">
              <span>Pagine Web</span>
              <span>Vis.</span>
            </div>
            <div class="tree-row"><span>Acqua e Ambiente</span><strong class="tree-val">332</strong></div>
            <div class="tree-row"><span>Analisi dell'Acqua</span><strong class="tree-val">112</strong></div>
            <div class="tree-row"><span>Analisi PFAS</span><strong class="tree-val">43</strong></div>
            <div class="tree-row"><span>Microplastiche</span><strong class="tree-val">41</strong></div>
            <div class="tree-row"><span>Analisi Terreno</span><strong class="tree-val">35</strong></div>
          </div>

          <!-- PACKAGING -->
          <div class="pill-card" style="padding: 10px 12px;">
            <div class="pill-badge orange" style="font-size:9.5px; padding:2px 8px; left:10px;">PACKAGING</div>
            <div class="tree-header" style="font-size:10.5px; margin-top:2px;">
              <span>Pagine Web</span>
              <span>Vis.</span>
            </div>
            <div class="tree-row"><span>Packaging Hub</span><strong class="tree-val">102</strong></div>
            <div class="tree-row"><span>Webinar PPWR Cosmetico</span><strong class="tree-val">61</strong></div>
            <div class="tree-row"><span>Servizi PPWR</span><strong class="tree-val">44</strong></div>
            <div class="tree-row"><span>Food Contact (MOCA)</span><strong class="tree-val">39</strong></div>
            <div class="tree-row"><span>Servizi Packaging</span><strong class="tree-val">18</strong></div>
          </div>

          <!-- FOOD SUPPLEMENTS -->
          <div class="pill-card" style="padding: 10px 12px;">
            <div class="pill-badge" style="background:#546e7a; font-size:9.5px; padding:2px 8px; left:10px;">FOOD SUPPL.</div>
            <div class="tree-header" style="font-size:10.5px; margin-top:2px;">
              <span>Pagine Web</span>
              <span>Vis.</span>
            </div>
            <div class="tree-row"><span>Food Supplements Hub</span><strong class="tree-val">100</strong></div>
            <div class="tree-row"><span>Studi Shelf Life (FSC)</span><strong class="tree-val">23</strong></div>
            <div class="tree-row"><span>Corso Integratori</span><strong class="tree-val">23</strong></div>
            <div class="tree-row"><span>Nutrienti &amp; Botanicals</span><strong class="tree-val">8</strong></div>
            <div class="tree-row"><span>Stabilità &amp; Shelf Life</span><strong class="tree-val">6</strong></div>
          </div>
        </div>

        <!-- Summary BU Callout -->
        <div class="comm-box drag-block" draggable="false">
          <strong>Sintesi Esecutiva Traffico BU:</strong> Le consultazioni verticali crescono del <strong>+36.7%</strong> (3.243 pagine viste), spinte dal focus <strong>Food Safety</strong> (1.806 visualizzazioni, trainato dall'allerta <em>Salmonella Strathcona nei pomodorini</em> con 1.042 letture). Solidi e costanti <strong>Environmental</strong> (563, acque, PFAS e microplastiche) e <strong>Pharma &amp; Cosmetics</strong> (450, spinto da CPHI Milan e Making Cosmetics).
        </div>
      </div>

${footerBand(3)}
    </div>

    <!-- ==================== SLIDE 4: LINKEDIN CORPORATE & DEMOGRAPHICS ==================== -->
    <div class="page" id="slide-4">
${headerBand('LINKEDIN', 'Attività Editoriale, Eventi (Nuovo Lab Resana, CPHI) &amp; Demografia Follower', 'LINKEDIN METRICS')}

      <div class="page-content" id="page-content-4">
        <!-- 3 Big KPI Stat Cards -->
        <div class="grid-3 drag-block" draggable="false">
          <div class="card card-hero" style="text-align:center; padding:10px 12px;">
            <div style="font-size:9.5px; font-weight:800; color:#556980; text-transform:uppercase;">Nuovi Follower</div>
            <div style="font-size:24px; font-weight:900; color:var(--color-primary); margin:1px 0;">463</div>
            <span class="trend-pill trend-neutral">-0.64% vs Set (Stabile)</span>
          </div>
          <div class="card card-green" style="text-align:center; padding:10px 12px;">
            <div style="font-size:9.5px; font-weight:800; color:#556980; text-transform:uppercase;">Post Pubblicati</div>
            <div style="font-size:24px; font-weight:900; color:var(--color-primary); margin:1px 0;">26</div>
            <span class="trend-pill trend-up">+8.33% vs Set</span>
          </div>
          <div class="card card-orange" style="text-align:center; padding:10px 12px;">
            <div style="font-size:9.5px; font-weight:800; color:#556980; text-transform:uppercase;">Impression Totali</div>
            <div style="font-size:24px; font-weight:900; color:var(--color-primary); margin:1px 0;">87.856</div>
            <span class="trend-pill trend-up">+63.09% vs Set</span>
          </div>
        </div>

        <!-- RIGA 1: SEZIONE EDITORIALE -->
        <div class="card card-hero drag-block" style="padding: 11px 15px;" draggable="false">
          <div style="font-size:11.5px; font-weight:800; color:var(--color-primary); margin-bottom:6px; display:flex; justify-content:space-between; align-items:center;">
            <span>TOP POST EDITORIALI, INAUGURAZIONI &amp; FIERE INTERNAZIONALI</span>
            <span style="font-size:10px; color:var(--color-cyan); font-weight:700;">Dati LinkedIn Ufficiali (22.210 Clic • 1.201 Reazioni)</span>
          </div>
          
          <div class="grid-2" style="gap:12px; align-items:stretch;">
            <table class="data-table" style="font-size:10px;">
              <thead>
                <tr>
                  <th style="width:20px;"></th>
                  <th>Data</th>
                  <th>Tipo</th>
                  <th>Topic &amp; Evento</th>
                  <th class="num">Views</th>
                </tr>
              </thead>
              <tbody>
                <tr class="highlight-row">
                  <td style="color:var(--color-cyan); font-weight:900;">[in]</td>
                  <td>05/10</td>
                  <td><span class="trend-pill trend-up">Evento</span></td>
                  <td><b>Inaugurazione Lab Via Fratta 25, Resana (Eng: 59.1%)</b></td>
                  <td class="num"><b>16.864</b></td>
                </tr>
                <tr>
                  <td style="color:var(--color-cyan); font-weight:900;">[in]</td>
                  <td>07/10</td>
                  <td><span class="trend-pill trend-up">Fiera</span></td>
                  <td><b>CPHI Milan 2026: booth 12M55 &amp; Nitrosamines</b></td>
                  <td class="num"><b>8.629</b></td>
                </tr>
                <tr>
                  <td style="color:var(--color-cyan); font-weight:900;">[in]</td>
                  <td>17/10</td>
                  <td><span class="trend-pill trend-neutral">Studio</span></td>
                  <td><b>Studio Microplastiche &amp; Univ. Ca' Foscari</b></td>
                  <td class="num"><b>5.431</b></td>
                </tr>
                <tr>
                  <td style="color:var(--color-cyan); font-weight:900;">[in]</td>
                  <td>10/10</td>
                  <td><span class="trend-pill trend-neutral">CSR</span></td>
                  <td><b>Resana in Rosa – 4ª edizione (~200 colleghi)</b></td>
                  <td class="num"><b>5.134</b></td>
                </tr>
                <tr>
                  <td style="color:var(--color-cyan); font-weight:900;">[in]</td>
                  <td>06/10</td>
                  <td><span class="trend-pill trend-neutral">Visita</span></td>
                  <td><b>Visita Gruppo Giovani Italmopa HQ Resana</b></td>
                  <td class="num"><b>4.621</b></td>
                </tr>
              </tbody>
            </table>

            <div style="background:#f4f8fc; border-left:4px solid var(--color-cyan); padding:10px 12px; border-radius:6px; font-size:11px; line-height:1.4; display:flex; flex-direction:column; justify-content:center;">
              <strong>Focus Strategico &amp; Performance Post:</strong>
              <div style="margin-top:3px; color:#2c4058;">
                L'annuncio dell'<strong>inaugurazione del nuovo laboratorio di Resana</strong> ha generato un risultato record di <strong>16.864 impression</strong>, 9.681 clic e 271 reazioni (engagement 59.1%). Eccellente trazione anche per la presenza a <strong>CPHI Milan 2026</strong> (8.629 views) e per la ricerca scientifica sulle <strong>microplastiche</strong> con Ca' Foscari (5.431 views).
              </div>
            </div>
          </div>
        </div>

        <!-- RIGA 2: SEZIONE DEMOGRAFICA A CHIASMO -->
        <div class="card card-navy drag-block" style="padding: 11px 15px;" draggable="false">
          <div style="font-size:11.5px; font-weight:800; color:var(--color-primary); margin-bottom:6px; display:flex; justify-content:space-between; align-items:center;">
            <span>COMPOSIZIONE DEMOGRAFICA DELLA COMMUNITY (Seniority &amp; Settori)</span>
            <span style="font-size:10px; color:#556980; font-weight:700;">Profilo Utenti Connessi</span>
          </div>

          <div class="grid-2" style="gap:12px; align-items:center;">
            <div style="background:#f9fbfe; border-left:4px solid var(--color-primary); padding:10px 12px; border-radius:6px; font-size:11px; line-height:1.4;">
              <strong>Analisi Demografica della Community:</strong>
              <div style="margin-top:3px; color:#2c4058;">
                La community supera le 40.000 connessioni professionali mantenendo un'altissima qualificazione: oltre il <strong>42.6% ricopre ruoli Senior o Amministrativi</strong>. I settori leader rispecchiano i pilastri industriali del gruppo (<strong>Farmaceutico 5.1K, Biotecnologie 4.1K, Ricerca &amp; Food 4.8K</strong>), con baricentro nei poli di <strong>Milano, Torino, Padova e Treviso</strong>.
              </div>
            </div>

            <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 6px;">
              <!-- 1. Seniority -->
              <div style="background:#ffffff; border-radius:6px; padding:5px 7px; border:1px solid #d8e5f2; display:flex; align-items:center; gap:6px;">
                ${donutSeniority}
                <div style="font-size:9px; display:flex; flex-direction:column; gap:1.5px;">
                  <div style="font-weight:800; color:var(--color-primary); font-size:9px;">Seniority</div>
                  <div><b style="color:#0b3353;">57.4%</b> Base</div>
                  <div><b style="color:#88bf3a;">33.3%</b> Senior</div>
                  <div><b style="color:#f5a623;">9.3%</b> Admin</div>
                </div>
              </div>

              <!-- 2. Settori -->
              <div style="background:#ffffff; border-radius:6px; padding:5px 7px; border:1px solid #d8e5f2; display:flex; align-items:center; gap:6px;">
                ${donutSettori}
                <div style="font-size:8.5px; display:flex; flex-direction:column; gap:1px;">
                  <div style="font-weight:800; color:var(--color-primary); font-size:9px;">Settori</div>
                  <div><b style="color:#0b3353;">5.1K</b> Pharma</div>
                  <div><b style="color:#88bf3a;">4.1K</b> Biotech</div>
                  <div><b style="color:#f5a623;">2.5K</b> Lab/Univ</div>
                  <div><b style="color:#009fe3;">2.4K</b> Food</div>
                </div>
              </div>

              <!-- 3. Funzioni -->
              <div style="background:#ffffff; border-radius:6px; padding:5px 7px; border:1px solid #d8e5f2; display:flex; align-items:center; gap:6px;">
                ${donutFunzioni}
                <div style="font-size:8.5px; display:flex; flex-direction:column; gap:1px;">
                  <div style="font-weight:800; color:var(--color-primary); font-size:9px;">Funzioni</div>
                  <div><b style="color:#0b3353;">8.5K</b> Ricerca</div>
                  <div><b style="color:#88bf3a;">4.1K</b> Ops</div>
                  <div><b style="color:#f5a623;">4.0K</b> QA/QC</div>
                  <div><b style="color:#009fe3;">3.1K</b> Sales</div>
                </div>
              </div>

              <!-- 4. Citta -->
              <div style="background:#ffffff; border-radius:6px; padding:5px 7px; border:1px solid #d8e5f2; display:flex; align-items:center; gap:6px;">
                ${donutCitta}
                <div style="font-size:8.5px; display:flex; flex-direction:column; gap:1px;">
                  <div style="font-weight:800; color:var(--color-primary); font-size:9px;">Top Città</div>
                  <div><b style="color:#0b3353;">4.3K</b> Milano</div>
                  <div><b style="color:#88bf3a;">3.4K</b> Torino</div>
                  <div><b style="color:#f5a623;">3.3K</b> Padova</div>
                  <div><b style="color:#009fe3;">2.3K</b> Treviso</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="comm-box drag-block" draggable="false">
          <strong>Key Highlights:</strong> Ottobre segna il nuovo massimo annuale di visibilità organica con <strong>87.856 impression (+63.09%)</strong> e oltre <strong>22.200 clic</strong>. Lo storytelling su investimenti infrastrutturali, persone (Resana in Rosa) e leadership tecnico-scientifica (CPHI, ISPE, Cosmetic 360) moltiplica il coinvolgimento della rete B2B.
        </div>
      </div>

${footerBand(4)}
    </div>

    <!-- ==================== SLIDE 5: EXPERT PARTNERS ==================== -->
    <div class="page" id="slide-5">
${headerBand('EXPERT PARTNERS', 'Canali Digital: Pagina LinkedIn &amp; Sezione Web (Ottobre 2026)', 'CONSULTING &amp; TRAINING')}

      <div class="page-content" id="page-content-5">
        <!-- EP Hero Header Banner -->
        <div class="drag-block" style="background: linear-gradient(135deg, #009fe3 0%, #0b3353 100%); border-radius: 8px; padding: 14px 18px; color: #ffffff; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 4px 15px rgba(0,159,227,0.18);" draggable="false">
          <div>
            <div style="font-size: 16.5px; font-weight: 800; color: #ffffff;">Expert Partners - Mérieux NutriSciences</div>
            <div style="font-size: 11.5px; color: #bde7ff; font-weight: 600; margin-top: 2px;">Consulenza, Formazione Specialistica, Auditing &amp; Regulatory</div>
          </div>
          <div style="display:flex; gap:10px;">
            <div style="background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.3); border-radius: 8px; padding: 6px 14px; text-align: center;">
              <div style="font-size: 9.5px; font-weight: 700; color: #ffffff; text-transform: uppercase;">LinkedIn Imp.</div>
              <div style="font-size: 18px; font-weight: 900; color: #ffffff;">10.998</div>
            </div>
            <div style="background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.3); border-radius: 8px; padding: 6px 14px; text-align: center;">
              <div style="font-size: 9.5px; font-weight: 700; color: #88bf3a; text-transform: uppercase;">Pagine Web</div>
              <div style="font-size: 18px; font-weight: 900; color: #ffffff;">466</div>
            </div>
          </div>
        </div>

        <!-- SEZIONE 1 - LINKEDIN EXPERT PARTNERS -->
        <div class="card card-hero drag-block" style="padding: 12px 16px;" draggable="false">
          <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:8px;">
            <div style="white-space:nowrap;">
              <span style="font-size:11.5px; font-weight:800; color:var(--color-primary);">CANALE LINKEDIN: EXPERT PARTNERS ITALIA</span>
              <span style="font-size:10px; color:var(--color-cyan); font-weight:700; margin-left:6px;">Trend Trimestrale</span>
            </div>
            <div style="display:flex; gap:5px; flex-shrink:0;">
              <span class="trend-pill trend-up" style="white-space:nowrap;">+40 Follower (3.452)</span>
              <span class="trend-pill trend-up" style="white-space:nowrap;">15 Post (+7.1%)</span>
              <span class="trend-pill trend-neutral" style="white-space:nowrap;">10.998 Views</span>
            </div>
          </div>

          <div class="grid-2" style="gap:12px; align-items:center;">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Metrica</th>
                  <th class="num">Agosto</th>
                  <th class="num">Settembre</th>
                  <th class="num">Ottobre</th>
                  <th class="num">Trend MoM</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><b>Nuovi follower</b></td>
                  <td class="num">38</td>
                  <td class="num">44</td>
                  <td class="num"><b>40</b></td>
                  <td class="num"><span class="trend-pill trend-neutral">-9.1%</span></td>
                </tr>
                <tr>
                  <td><b>Post totali</b></td>
                  <td class="num">8</td>
                  <td class="num">14</td>
                  <td class="num"><b>15</b></td>
                  <td class="num"><span class="trend-pill trend-up">+7.1%</span></td>
                </tr>
                <tr class="highlight-row">
                  <td><b>Impressioni</b></td>
                  <td class="num">14.094</td>
                  <td class="num">19.820</td>
                  <td class="num"><b>10.998</b></td>
                  <td class="num"><span class="trend-pill trend-down">-44.5%</span></td>
                </tr>
              </tbody>
            </table>

            <div style="background:#f4f8fc; border-left:4px solid var(--color-cyan); padding:10px 12px; border-radius:6px; font-size:11px; line-height:1.4;">
              <strong>Insight Prestazionale LinkedIn EP:</strong> La pagina showcase cresce a <strong>3.452 follower (+40)</strong> con 15 uscite editoriali (+7.1%). Tra gli articoli più letti spiccano <em>GDO: ecosistema qualità e sicurezza</em> (<strong>1.353 impression</strong>, 70 clic), <em>Richiami alimentari &amp; Gestione Rischio</em> (<strong>1.239</strong>) e <em>Autenticità alimentare</em> (<strong>1.211</strong>).
            </div>
          </div>
        </div>

        <!-- SEZIONE 2 - SEZIONE WEB EXPERT PARTNERS -->
        <div class="card card-green drag-block" style="padding: 12px 16px;" draggable="false">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <div>
              <span style="font-size:12px; font-weight:800; color:var(--color-primary);">SITO WEB: TRAFFICO &amp; CONSULTAZIONI SPECIALISTICHE</span>
              <span style="font-size:10.5px; color:#2e7d32; font-weight:700; margin-left:8px;">Trend 5 Mesi (Matomo)</span>
            </div>
            <span class="trend-pill trend-neutral">466 Pagine Viste ad Ottobre</span>
          </div>

          <div class="grid-2" style="gap:12px; align-items:center;">
            <div>
              ${epWebBarsSvg}
            </div>

            <div style="background:#f4fbf6; border-left:4px solid var(--color-green); padding:10px 12px; border-radius:6px; font-size:11px; line-height:1.4;">
              <strong>Insight Pagine Web EP:</strong> Ad ottobre la sezione totalizza <strong>466 visualizzazioni</strong> qualificate. Oltre all'hub <em>Expert Partners</em> (151), guidano l'interesse il tool digitale <strong>Safety HUD</strong> (50), i <strong>Servizi Regolatori &amp; Etichettatura</strong> (37), l'area <strong>Sensory</strong> (31) e il <strong>Food Science Center / Shelf Life</strong> (45).
            </div>
          </div>
        </div>

        <div class="comm-box drag-block" style="font-size:11.5px; padding:10px 14px;" draggable="false">
          <strong>Sintesi Multi-Canale Expert Partners:</strong> Il presidio integrato tra articoli verticali della Newsletter LinkedIn (GDO, richiami, report FAO) e le schede servizio sul portale web alimenta una domanda altamente profilata su regulatory, formazione FSSC 22000 v7 e studi di shelf life.
        </div>
      </div>

${footerBand(5)}
    </div>

    <!-- ==================== SLIDE 6: EMAIL MARKETING ==================== -->
    <div class="page" id="slide-6">
${headerBand('EMAIL MARKETING &amp; mass mailing', 'Performance Campagne SendGrid &amp; Oggetti Ufficiali (Ottobre 2026)', 'SENDGRID ANALYTICS')}

      <div class="page-content" id="page-content-6">
        <!-- 4 Key Metrics Cards -->
        <div class="grid-4 drag-block" draggable="false">
          <div class="card card-navy" style="text-align:center; padding:9px;">
            <div style="font-size:9.5px; font-weight:800; color:#556980; text-transform:uppercase;">Campagne Inviate</div>
            <div style="font-size:23px; font-weight:900; color:var(--color-primary); margin-top:2px;">12</div>
            <span class="trend-pill trend-up">+20.0% vs Set</span>
          </div>
          <div class="card card-hero" style="text-align:center; padding:9px;">
            <div style="font-size:9.5px; font-weight:800; color:#556980; text-transform:uppercase;">Email Consegnate</div>
            <div style="font-size:23px; font-weight:900; color:var(--color-cyan); margin-top:2px;">96.942</div>
            <span class="trend-pill trend-up">+150.4% vs Set</span>
          </div>
          <div class="card card-green" style="text-align:center; padding:9px;">
            <div style="font-size:9.5px; font-weight:800; color:#556980; text-transform:uppercase;">Aperture Uniche</div>
            <div style="font-size:23px; font-weight:900; color:var(--color-primary); margin-top:2px;">15.844</div>
            <span class="trend-pill trend-up">Open Rate 16.3% (Avg 21.4%)</span>
          </div>
          <div class="card card-orange" style="text-align:center; padding:9px;">
            <div style="font-size:9.5px; font-weight:800; color:#556980; text-transform:uppercase;">Clic Unici</div>
            <div style="font-size:23px; font-weight:900; color:var(--color-primary); margin-top:2px;">806</div>
            <span class="trend-pill trend-up">CTOR fino al 61.4%</span>
          </div>
        </div>

        <!-- Real Top Campaigns Table (All 12 October Campaigns) -->
        <div class="card card-hero drag-block" style="padding:10px 14px;" draggable="false">
          <div style="font-size:11.5px; font-weight:800; color:var(--color-primary); margin-bottom:5px; display:flex; justify-content:space-between; align-items:center;">
            <span>ELENCO UFFICIALE CAMPAGNE SENDGRID INVIATE AD OTTOBRE 2026</span>
            <span style="font-size:9.5px; color:var(--color-cyan); font-weight:700;">Dati Ufficiali SendGrid (12 Invii)</span>
          </div>
          <table class="data-table" style="font-size:9.8px;">
            <thead>
              <tr>
                <th style="padding:5px 8px;">Nome / Oggetto Campagna</th>
                <th class="num" style="padding:5px 8px;">Data</th>
                <th class="num" style="padding:5px 8px;">Consegnate</th>
                <th class="num" style="padding:5px 8px;">Aperture Uniche</th>
                <th class="num" style="padding:5px 8px;">Open Rate</th>
                <th class="num" style="padding:5px 8px;">Clic Unici</th>
              </tr>
            </thead>
            <tbody>
              <tr class="highlight-row">
                <td style="padding:4.5px 8px;"><b>Agenda - Novembre 2026</b></td>
                <td class="num" style="padding:4.5px 8px;">27/10</td>
                <td class="num" style="padding:4.5px 8px;">29.476</td>
                <td class="num" style="padding:4.5px 8px;"><b>5.076</b></td>
                <td class="num" style="padding:4.5px 8px;"><b>17.22%</b></td>
                <td class="num" style="padding:4.5px 8px;">—</td>
              </tr>
              <tr class="highlight-row">
                <td style="padding:4.5px 8px;"><b>Agenda - Ottobre 2026</b></td>
                <td class="num" style="padding:4.5px 8px;">05/10</td>
                <td class="num" style="padding:4.5px 8px;">27.894</td>
                <td class="num" style="padding:4.5px 8px;"><b>5.259</b></td>
                <td class="num" style="padding:4.5px 8px;"><b>18.85%</b></td>
                <td class="num" style="padding:4.5px 8px;">—</td>
              </tr>
              <tr>
                <td style="padding:4.5px 8px;">Food - Pharma - 🎓SCOPRI I CORSI DI NOVEMBRE DI MxNS TRAINING!</td>
                <td class="num" style="padding:4.5px 8px;">02/10</td>
                <td class="num" style="padding:4.5px 8px;">13.412</td>
                <td class="num" style="padding:4.5px 8px;">1.094</td>
                <td class="num" style="padding:4.5px 8px;">8.16%</td>
                <td class="num" style="padding:4.5px 8px;"><b>276</b></td>
              </tr>
              <tr>
                <td style="padding:4.5px 8px;">Mérieux NutriSciences @ Ecomondo</td>
                <td class="num" style="padding:4.5px 8px;">12/10</td>
                <td class="num" style="padding:4.5px 8px;">12.425</td>
                <td class="num" style="padding:4.5px 8px;"><b>2.371</b></td>
                <td class="num" style="padding:4.5px 8px;"><b>19.08%</b></td>
                <td class="num" style="padding:4.5px 8px;">—</td>
              </tr>
              <tr>
                <td style="padding:4.5px 8px;">Mérieux NutriSciences @ Extractables &amp; Leachables Europe 2026</td>
                <td class="num" style="padding:4.5px 8px;">26/10</td>
                <td class="num" style="padding:4.5px 8px;">3.946</td>
                <td class="num" style="padding:4.5px 8px;">491</td>
                <td class="num" style="padding:4.5px 8px;">12.44%</td>
                <td class="num" style="padding:4.5px 8px;">—</td>
              </tr>
              <tr>
                <td style="padding:4.5px 8px;">Mérieux NutriSciences @ ISPE Italy Annual Meeting 2026</td>
                <td class="num" style="padding:4.5px 8px;">05/10</td>
                <td class="num" style="padding:4.5px 8px;">2.362</td>
                <td class="num" style="padding:4.5px 8px;">315</td>
                <td class="num" style="padding:4.5px 8px;">13.34%</td>
                <td class="num" style="padding:4.5px 8px;"><b>136</b></td>
              </tr>
              <tr>
                <td style="padding:4.5px 8px;">Copy_Agenda - Ottobre 2026</td>
                <td class="num" style="padding:4.5px 8px;">06/10</td>
                <td class="num" style="padding:4.5px 8px;">2.353</td>
                <td class="num" style="padding:4.5px 8px;">311</td>
                <td class="num" style="padding:4.5px 8px;">13.22%</td>
                <td class="num" style="padding:4.5px 8px;">—</td>
              </tr>
              <tr>
                <td style="padding:4.5px 8px;">Free webinar | PPWR e Packaging Cosmetico</td>
                <td class="num" style="padding:4.5px 8px;">19/10</td>
                <td class="num" style="padding:4.5px 8px;">2.095</td>
                <td class="num" style="padding:4.5px 8px;">378</td>
                <td class="num" style="padding:4.5px 8px;"><b>18.04%</b></td>
                <td class="num" style="padding:4.5px 8px;"><b>232</b></td>
              </tr>
              <tr>
                <td style="padding:4.5px 8px;">Mérieux NutriSciences @ Making Cosmetics / in-Vitality</td>
                <td class="num" style="padding:4.5px 8px;">26/10</td>
                <td class="num" style="padding:4.5px 8px;">2.077</td>
                <td class="num" style="padding:4.5px 8px;">325</td>
                <td class="num" style="padding:4.5px 8px;">15.65%</td>
                <td class="num" style="padding:4.5px 8px;"><b>130</b></td>
              </tr>
              <tr>
                <td style="padding:4.5px 8px;">Monitoraggio dei PFAS nelle acque: il supporto di Mérieux NutriSciences</td>
                <td class="num" style="padding:4.5px 8px;">29/10</td>
                <td class="num" style="padding:4.5px 8px;">597</td>
                <td class="num" style="padding:4.5px 8px;">133</td>
                <td class="num" style="padding:4.5px 8px;"><b>22.28%</b></td>
                <td class="num" style="padding:4.5px 8px;">—</td>
              </tr>
              <tr>
                <td style="padding:4.5px 8px;">Free webinar | PPWR and Cosmetic Packaging (ENG)</td>
                <td class="num" style="padding:4.5px 8px;">19/10</td>
                <td class="num" style="padding:4.5px 8px;">254</td>
                <td class="num" style="padding:4.5px 8px;">51</td>
                <td class="num" style="padding:4.5px 8px;"><b>20.08%</b></td>
                <td class="num" style="padding:4.5px 8px;">14</td>
              </tr>
              <tr>
                <td style="padding:4.5px 8px;">Regulatory Update Newsletter | Packaging #38</td>
                <td class="num" style="padding:4.5px 8px;">13/10</td>
                <td class="num" style="padding:4.5px 8px;">51</td>
                <td class="num" style="padding:4.5px 8px;">40</td>
                <td class="num" style="padding:4.5px 8px;"><b>78.43%</b></td>
                <td class="num" style="padding:4.5px 8px;">18</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="grid-2 drag-block" draggable="false">
          <div class="comm-box" style="font-size:11px; padding:9px 13px;">
            <strong>Volumi Raddoppiati &amp; Newsletter Agenda:</strong> Con <strong>96.942 email recapitate</strong> (+150.4% su settembre) e <strong>15.844 lettori unici</strong>, le due edizioni di <em>Agenda (Ottobre e Novembre)</em> superano da sole le 10.300 aperture uniche, consolidando la reach istituzionale.
          </div>
          <div class="comm-box" style="border-left-color:var(--color-green); font-size:11px; padding:9px 13px;">
            <strong>Conversione Webinar &amp; Fiere:</strong> Altissima reattività sulle DEM verticali: il <em>Free Webinar PPWR &amp; Packaging Cosmetico</em> tocca un CTOR del <strong>61.4%</strong> (232 clic unici), affiancato dai corsi <em>MxNS Training</em> (276 clic), <em>ISPE Italy</em> (136) e <em>Making Cosmetics</em> (130).
          </div>
        </div>
      </div>

${footerBand(6)}
    </div>

    <!-- ==================== SLIDE 7: WEBSITE OVERVIEW & AVANZAMENTO ==================== -->
    <div class="page" id="slide-7">
${headerBand('WEBSITE: OVERVIEW &amp; AVANZAMENTO', 'Panoramica Traffico (rilevato da tool Matomo) &amp; Stato Avanzamento Sezioni Web', 'MATOMO &amp; DEVELOPMENT')}

      <div class="page-content" id="page-content-7">
        <!-- 4 Stat Boxes -->
        <div class="grid-4 drag-block" draggable="false">
          <div class="card" style="text-align:center; padding:10px;">
            <div style="font-size:9.5px; font-weight:800; color:#556980; text-transform:uppercase;">Visite Totali</div>
            <div style="font-size:22px; font-weight:900; color:var(--color-primary); margin-top:2px;">16.026</div>
            <span class="trend-pill trend-up">+38.01% vs Set</span>
          </div>
          <div class="card" style="text-align:center; padding:10px;">
            <div style="font-size:9.5px; font-weight:800; color:#556980; text-transform:uppercase;">Visualizzazioni</div>
            <div style="font-size:22px; font-weight:900; color:var(--color-primary); margin-top:2px;">40.007</div>
            <span class="trend-pill trend-up">+67.50% Pagine Viste</span>
          </div>
          <div class="card" style="text-align:center; padding:10px;">
            <div style="font-size:9.5px; font-weight:800; color:#556980; text-transform:uppercase;">Durata Media</div>
            <div style="font-size:22px; font-weight:900; color:var(--color-primary); margin-top:2px;">2m 23s</div>
            <span class="trend-pill trend-up">4.3 Azioni / Visita</span>
          </div>
          <div class="card" style="text-align:center; padding:10px;">
            <div style="font-size:9.5px; font-weight:800; color:#556980; text-transform:uppercase;">Bounce Rate</div>
            <div style="font-size:22px; font-weight:900; color:var(--color-primary); margin-top:2px;">28.0%</div>
            <span class="trend-pill trend-up">-20.00% Ottimale</span>
          </div>
        </div>

        <!-- SEZIONE 1: CONFRONTO MENSILE TRAFFICO SITO -->
        <div class="card card-green drag-block" style="padding:12px 16px;" draggable="false">
          <div style="font-size:12px; font-weight:800; color:var(--color-primary); margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
            <span>CONFRONTO PERFORMANCE MENSILE (Settembre vs Ottobre)</span>
            <span style="font-size:10.5px; color:#2e7d32; font-weight:700;">Dati Matomo Analytics (Segmento /it/)</span>
          </div>

          <div class="grid-2" style="gap:12px; align-items:center;">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Metrica</th>
                  <th class="num">Settembre</th>
                  <th class="num">Ottobre</th>
                  <th class="num">Variazione</th>
                </tr>
              </thead>
              <tbody>
                <tr class="highlight-row">
                  <td><b>Visite Totali</b></td>
                  <td class="num">11.612</td>
                  <td class="num"><b>16.026</b></td>
                  <td class="num"><span class="trend-pill trend-up">+38.01%</span></td>
                </tr>
                <tr>
                  <td><b>Azioni / Visita</b></td>
                  <td class="num">3.7</td>
                  <td class="num"><b>4.3</b></td>
                  <td class="num"><span class="trend-pill trend-up">+16.22%</span></td>
                </tr>
                <tr>
                  <td><b>Bounce rate</b></td>
                  <td class="num">35.0%</td>
                  <td class="num"><b>28.0%</b></td>
                  <td class="num"><span class="trend-pill trend-up">-20.00%</span></td>
                </tr>
                <tr>
                  <td><b>Pagine Viste Totali</b></td>
                  <td class="num">23.884</td>
                  <td class="num"><b>40.007</b></td>
                  <td class="num"><span class="trend-pill trend-up">+67.50%</span></td>
                </tr>
              </tbody>
            </table>

            <div style="background:#f4fbf6; border-left:4px solid var(--color-green); padding:10px 12px; border-radius:6px; font-size:11px; line-height:1.4;">
              <strong>Key Takeaway sul Traffico:</strong>
              <div style="margin-top:3px; color:#2c4058;">
                Ottobre consolida ed amplifica il rimbalzo autunnale: <strong>+38.01% di visite</strong> e oltre <strong>40.000 pagine consultate (+67.50%)</strong>. L'aumento della profondità di navigazione (<strong>4.3 azioni/visita</strong>) e l'abbattimento del <strong>bounce rate al 28.0%</strong> confermano una navigazione mirata ed efficace.
              </div>
            </div>
          </div>
        </div>

        <!-- SEZIONE 2: STATO DI AVANZAMENTO RILASCIO SEZIONI -->
        <div class="card card-hero drag-block" style="padding:12px 16px;" draggable="false">
          <div style="font-size:12px; font-weight:800; color:var(--color-primary); margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
            <span>STATO AVANZAMENTO RILASCIO PAGINE WEB (%)</span>
            <span style="font-size:10.5px; color:var(--color-cyan); font-weight:700;">Stato Sviluppo Portale</span>
          </div>

          <div class="grid-2" style="gap:12px; align-items:center;">
            <div style="display:flex; flex-direction:column; gap:5px;">
              ${[
                ['Blog &amp; Insight', 100, '#88bf3a'],
                ['Food &amp; Safety Hub', 100, '#88bf3a'],
                ['Food Supplement', 100, '#88bf3a'],
                ['Packaging Hub', 100, '#88bf3a'],
                ['Expert Partners', 100, '#88bf3a'],
                ['Academy / Corsi', 90, '#009fe3'],
                ['Portale Clienti', 85, '#009fe3'],
                ['Sostenibilità', 75, '#f5a623'],
                ['Pharma &amp; Healthcare', 50, '#e74c3c']
              ].map(([lbl, pct, col]) => `
                <div style="display:flex; align-items:center; gap:8px;">
                  <div style="width:135px; font-size:10.5px; font-weight:700; color:var(--color-primary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${lbl}</div>
                  <div style="flex:1; background:#eef3f8; height:8.5px; border-radius:5px; overflow:hidden;">
                    <div style="width:${pct}%; background:${col}; height:100%; border-radius:5px;"></div>
                  </div>
                  <div style="width:34px; text-align:right; font-size:10.5px; font-weight:800; color:var(--color-primary);">${pct}%</div>
                </div>`).join('')}
            </div>

            <div style="background:#f4f8fc; border-left:4px solid var(--color-cyan); padding:10px 12px; border-radius:6px; font-size:11px; line-height:1.4;">
              <strong>Roadmap Digitale &amp; Priorità Rilasci Q4:</strong>
              <div style="margin-top:3px; color:#2c4058;">
                Le sezioni core <em>Food Safety, Packaging, Food Supplement ed Expert Partners</em> operano a pieno regime (100%). Nel quarto trimestre proseguono le lavorazioni di completamento per <em>Sostenibilità</em> (75%) e l'espansione dei contenuti verticali <em>Pharma &amp; Healthcare</em>.
              </div>
            </div>
          </div>
        </div>

        <div class="comm-box drag-block" style="font-size:11.5px; padding:10px 14px;" draggable="false">
          <strong>Sintesi Esecutiva:</strong> L'ecosistema web mostra indicatori di salute eccellenti, assorbendo con fluidità i picchi di traffico generati dalle campagne DEM d'autunno, dagli eventi fieristici e dalle ricerche organiche su temi di attualità alimentare.
        </div>
      </div>

${footerBand(7)}
    </div>

    <!-- ==================== SLIDE 8: SORGENTI, DISPOSITIVI & TOP PAGINE ==================== -->
    <div class="page" id="slide-8">
${headerBand('WEBSITE: SORGENTI, DISPOSITIVI &amp; TOP PAGINE', 'Canali di Acquisizione, Dispositivi &amp; Pagine Più Visitate (Matomo Ottobre 2026)', 'ACQUISITION &amp; TOP PAGES')}

      <div class="page-content" id="page-content-8">
        <!-- TOP: 2 Donut Cards for Sources & Devices -->
        <div class="grid-2 drag-block" draggable="false">
          <!-- Sources Card -->
          <div class="pill-card" style="padding: 11px 14px;">
            <div class="pill-badge" style="font-size:10.5px; padding:2px 9px; left:12px;">SORGENTI DI TRAFFICO</div>
            <div class="chart-box" style="margin-top:2px; gap:12px;">
              ${donutSources}
              <div class="chart-legend" style="flex:1; font-size:10.5px;">
                <div class="legend-item" style="gap:8px; white-space:nowrap;"><div class="legend-left"><div class="legend-dot" style="background:#0b3353;"></div><span>Ingressi Diretti</span></div><span class="legend-val">10.230 (63.8%)</span></div>
                <div class="legend-item" style="gap:8px; white-space:nowrap;"><div class="legend-left"><div class="legend-dot" style="background:#88bf3a;"></div><span>Motori Ricerca</span></div><span class="legend-val">5.356 (33.4%)</span></div>
                <div class="legend-item" style="gap:8px; white-space:nowrap;"><div class="legend-left"><div class="legend-dot" style="background:#f5a623;"></div><span>Siti Referenti</span></div><span class="legend-val">190 (1.2%)</span></div>
                <div class="legend-item" style="gap:8px; white-space:nowrap;"><div class="legend-left"><div class="legend-dot" style="background:#009fe3;"></div><span>Campagne DEM</span></div><span class="legend-val">95 (0.6%)</span></div>
                <div class="legend-item" style="gap:8px; white-space:nowrap;"><div class="legend-left"><div class="legend-dot" style="background:#7ab5db;"></div><span>AI &amp; Social</span></div><span class="legend-val">155 (1.0%)</span></div>
              </div>
            </div>
          </div>

          <!-- Devices Card -->
          <div class="pill-card" style="padding: 11px 14px;">
            <div class="pill-badge cyan" style="font-size:10.5px; padding:2px 9px; left:12px;">DISPOSITIVI DI NAVIGAZIONE</div>
            <div class="chart-box" style="margin-top:2px; gap:12px;">
              ${donutDevices}
              <div class="chart-legend" style="flex:1; font-size:10.5px;">
                <div class="legend-item" style="gap:8px; white-space:nowrap;"><div class="legend-left"><div class="legend-dot" style="background:#0b3353;"></div><span>Desktop</span></div><span class="legend-val">12.369 (77.2%)</span></div>
                <div class="legend-item" style="gap:8px; white-space:nowrap;"><div class="legend-left"><div class="legend-dot" style="background:#009fe3;"></div><span>Smartphone</span></div><span class="legend-val">3.371 (21.0%)</span></div>
                <div class="legend-item" style="gap:8px; white-space:nowrap;"><div class="legend-left"><div class="legend-dot" style="background:#88bf3a;"></div><span>Tablet / Altro</span></div><span class="legend-val">286 (1.8%)</span></div>
              </div>
            </div>
          </div>
        </div>

        <!-- MIDDLE: TOP VISITED PAGES TABLE -->
        <div class="card card-hero drag-block" style="padding: 11px 15px;" draggable="false">
          <div style="font-size:11.5px; font-weight:800; color:var(--color-primary); margin-bottom:6px; display:flex; justify-content:space-between; align-items:center;">
            <span>TOP 10 PAGINE PIÙ VISITATE SUL SITO (Dati Ufficiali Matomo Ottobre 2026)</span>
            <span style="font-size:10px; color:var(--color-cyan); font-weight:700;">Su 40.007 Visualizzazioni Totali</span>
          </div>
          
          <table class="data-table" style="font-size:10.5px;">
            <thead>
              <tr>
                <th style="width:26px;">#</th>
                <th>Titolo Pagina / URL</th>
                <th class="num">Visualizzazioni</th>
                <th class="num">% sul Totale Pagine</th>
              </tr>
            </thead>
            <tbody>
              <tr class="highlight-row">
                <td><b>1</b></td>
                <td><b>Home Page (Mérieux NutriSciences Italia - /it/)</b></td>
                <td class="num"><b>12.177</b></td>
                <td class="num"><b>30.44%</b></td>
              </tr>
              <tr>
                <td>2</td>
                <td><b>Lavora con noi / Careers Italia (/it/lavora-con-noi/)</b></td>
                <td class="num"><b>1.258</b></td>
                <td class="num">3.14%</td>
              </tr>
              <tr class="highlight-row">
                <td><b>3</b></td>
                <td><b>Focolaio Salmonella nei Pomodorini (/it/salmonella-nei-pomodorini/)</b></td>
                <td class="num"><b>1.042</b></td>
                <td class="num"><b>2.60%</b></td>
              </tr>
              <tr>
                <td>4</td>
                <td><b>Contatti &amp; Sedi Laboratori Italia (/it/contact/)</b></td>
                <td class="num"><b>922</b></td>
                <td class="num">2.30%</td>
              </tr>
              <tr>
                <td>5</td>
                <td><b>Portale Clienti &amp; Servizi Online (/it/portale-clienti/)</b></td>
                <td class="num"><b>872</b></td>
                <td class="num">2.18%</td>
              </tr>
              <tr>
                <td>6</td>
                <td><b>Chi Siamo / Profilo Aziendale (/it/chi-siamo/)</b></td>
                <td class="num"><b>824</b></td>
                <td class="num">2.06%</td>
              </tr>
              <tr>
                <td>7</td>
                <td><b>Careers Global (/it/careers-at-merieux-nutrisciences/)</b></td>
                <td class="num"><b>713</b></td>
                <td class="num">1.78%</td>
              </tr>
              <tr>
                <td>8</td>
                <td><b>MXNS Training - Calendario Corsi di Formazione</b></td>
                <td class="num"><b>661</b></td>
                <td class="num">1.65%</td>
              </tr>
              <tr>
                <td>9</td>
                <td><b>Food Safety &amp; Quality (Hub Settori &amp; Servizi)</b></td>
                <td class="num"><b>375</b></td>
                <td class="num">0.94%</td>
              </tr>
              <tr>
                <td>10</td>
                <td><b>Acqua e Ambiente (Analisi Acque &amp; PFAS)</b></td>
                <td class="num"><b>332</b></td>
                <td class="num">0.83%</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- BOTTOM: COMMENTARY BOXES -->
        <div class="grid-2 drag-block" draggable="false">
          <div class="comm-box" style="font-size:11.5px; padding:10px 14px;">
            <strong>Analisi Canali &amp; Dispositivi:</strong>
            <div style="margin-top:2px; color:#2c4058;">
              Gli <strong>Ingressi Diretti (63.8%, +67% di volumi)</strong> e i <strong>Motori di Ricerca (33.4%, 5.356 visite)</strong> generano oltre il 97% degli accessi, spinti anche dai clic delle newsletter. La quota <strong>Desktop sale al 77.2%</strong>, confermando la consultazione professionale in orario lavorativo.
            </div>
          </div>
          
          <div class="comm-box" style="border-left-color:var(--color-green); font-size:11.5px; padding:10px 14px;">
            <strong>Exploit Editoriale in Top 3:</strong>
            <div style="margin-top:2px; color:#2c4058;">
              Spicca al <strong>3° posto assoluto del sito</strong> l'approfondimento sul focolaio <em>Salmonella nei pomodorini (1.042 pagine viste)</em>, affiancato dalla crescita di <em>Portale Clienti (872, +24.7%)</em> e <em>Calendario Corsi Training (661, +17.6%)</em>.
            </div>
          </div>
        </div>
      </div>

${footerBand(8)}
    </div>

    <!-- ==================== SLIDE 9: BLOG & ARTICOLI EDITORIALI ==================== -->
    <div class="page" id="slide-9">
${headerBand('WEBSITE: BLOG', 'Visualizzazioni Mensili (Ago–Ott 2026) &amp; Top 15 Articoli Più Letti (Matomo)', 'BLOG ANALYTICS')}

      <div class="page-content" id="page-content-9">
        <!-- Blog Trend Card -->
        <div class="card card-hero drag-block" style="padding: 11px 15px; background: linear-gradient(180deg, #ffffff 0%, #f9fcff 100%);" draggable="false">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <div>
              <div style="font-size:12px; font-weight:800; color:var(--color-primary);">TREND VISUALIZZAZIONI BLOG - TRIMESTRE AGO–OTT 2026</div>
              <div style="font-size:10px; color:#556980;">Totale visualizzazioni Top 20 articoli scientifici ed approfondimenti normativi</div>
            </div>
            <div style="background:var(--color-primary); color:#ffffff; padding:3px 10px; border-radius:12px; font-size:10.5px; font-weight:800;">
              TOTALE TRIMESTRE: 3.094 VISUALIZZAZIONI
            </div>
          </div>

          <div class="grid-3">
            <!-- Agosto -->
            <div style="background:#ffffff; border:1.5px solid #d4e3f0; border-radius:8px; padding:8px 12px; text-align:center; box-shadow:0 2px 5px rgba(0,0,0,0.02);">
              <div style="font-size:9.5px; font-weight:700; color:#556980; text-transform:uppercase;">AGOSTO 2026</div>
              <div style="font-size:22px; font-weight:900; color:#556980; margin:1px 0;">551</div>
              <div style="font-size:9.5px; color:#7a8b99; font-weight:600;">Base estiva</div>
            </div>

            <!-- Settembre -->
            <div style="background:#ffffff; border:1.5px solid #d4e3f0; border-radius:8px; padding:8px 12px; text-align:center; box-shadow:0 2px 5px rgba(0,0,0,0.02);">
              <div style="font-size:9.5px; font-weight:700; color:var(--color-primary); text-transform:uppercase;">SETTEMBRE 2026</div>
              <div style="font-size:22px; font-weight:900; color:var(--color-primary); margin:1px 0;">818</div>
              <div style="font-size:9.5px; color:#88bf3a; font-weight:700;">+48.5% vs Agosto</div>
            </div>

            <!-- Ottobre -->
            <div style="background:#ffffff; border:1.5px solid #009fe3; border-radius:8px; padding:8px 12px; text-align:center; box-shadow:0 2px 8px rgba(0,159,227,0.12);">
              <div style="font-size:9.5px; font-weight:800; color:var(--color-cyan); text-transform:uppercase;">OTTOBRE 2026</div>
              <div style="font-size:24px; font-weight:900; color:var(--color-cyan); margin:1px 0;">1.725</div>
              <span class="trend-pill trend-up">▲ +110.9% vs Settembre</span>
            </div>
          </div>
        </div>

        <!-- Full Top 15 Blog Articles Table -->
        <div class="card card-navy drag-block" style="padding: 10px 14px;" draggable="false">
          <div style="font-size:11.5px; font-weight:800; color:var(--color-primary); margin-bottom:5px; display:flex; justify-content:space-between; align-items:center;">
            <span>TOP 15 ARTICOLI BLOG PIÙ LETTI (Dati Matomo Agosto, Settembre, Ottobre 2026)</span>
            <span style="color:var(--color-cyan); font-weight:700; font-size:10px;">Ripartizione Mensile</span>
          </div>
          <table class="data-table" style="font-size:9.5px;">
            <thead>
              <tr>
                <th style="width:22px;">#</th>
                <th>Titolo Articolo</th>
                <th class="num">Agosto</th>
                <th class="num">Settembre</th>
                <th class="num">Ottobre</th>
                <th class="num">Totale 3M</th>
              </tr>
            </thead>
            <tbody>
              ${[
                [1, 'Nuovo focolaio di salmonella nei pomodorini in Italia: prevenzione, rischi e soluzioni analitiche', 0, 0, 1042, 1042, true],
                [2, 'Cosa sono MOSH e MOAH negli alimenti? Rischi, fonti e la nuova proposta di limiti UE', 72, 89, 107, 268, true],
                [3, 'Nuova sede per il laboratorio di Volpiano', 56, 68, 65, 189, true],
                [4, 'Frutta a guscio e frutta secca: sicurezza e controlli', 45, 57, 53, 155, false],
                [5, 'Regolamento (UE) 2026/1825: nuovi limiti per i contaminanti di processo', 0, 108, 40, 148, false],
                [6, 'Bisfenolo A: 2026 anno di scadenze importanti', 33, 71, 36, 140, false],
                [7, 'Food Contact Materials: conformità MOCA', 29, 62, 39, 130, false],
                [8, 'Alcaloidi chinolizidinici nei lupini: rischio emergente per la sicurezza alimentare', 42, 38, 28, 108, false],
                [9, 'Test Ecotossicologici e monitoraggio ambientale', 26, 61, 19, 106, false],
                [10, 'Cadmio e Piombo, UE aggiorna i livelli massimi nei prodotti alimentari', 26, 29, 41, 96, false],
                [11, 'Cosa succede quando un prodotto alimentare viene ritirato o richiamato dal mercato?', 31, 31, 30, 92, false],
                [12, 'Monitoraggio Legionella: guida definitiva 2026', 53, 20, 16, 89, false],
                [13, 'Amianto e fibre naturali: analisi e normativa', 16, 45, 24, 85, false],
                [14, 'Tossine Alternaria negli alimenti: evidenze dai sistemi di allerta e rischi', 30, 20, 21, 71, false],
                [15, 'Mérieux NutriSciences: una storia in costante evoluzione', 0, 0, 66, 66, false]
              ].map(([idx, title, aug, sep, oct, tot, hi]) => `
                <tr${hi ? ' class="highlight-row"' : ''}>
                  <td><b>${idx}</b></td>
                  <td style="max-width:340px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;"><b>${title}</b></td>
                  <td class="num">${aug}</td>
                  <td class="num">${sep}</td>
                  <td class="num"><b>${oct.toLocaleString('it-IT')}</b></td>
                  <td class="num"><b>${tot.toLocaleString('it-IT')}</b></td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>

        <div class="comm-box drag-block" style="font-size:11.5px;" draggable="false">
          <strong>Analisi Performance Blog:</strong> Ad ottobre il traffico editoriale più che raddoppia (<strong>1.725 letture</strong> sui Top 20 articoli, +110.9% su settembre) grazie all'istantanea pubblicazione sul focolaio di <strong>Salmonella nei pomodorini (1.042 visualizzazioni nel solo mese)</strong>, alla crescita continua di <strong>MOSH &amp; MOAH (107)</strong> e ai nuovi contenuti istituzionali ed FAO.
        </div>
      </div>

${footerBand(9)}
    </div>

    <!-- ==================== SLIDE 10: CONVERSIONI - LEAD GENERATION & MXNS SHOP ==================== -->
    <div class="page" id="slide-10">
${headerBand('website: CONVERSIONI &amp; E-COMMERCE', 'Richieste da Sito Web, Moduli Inviati, Brochure &amp; Ordini Mxns Shop (Ottobre 2026)', 'LEADS &amp; SHOP E-COMMERCE')}

      <div class="page-content" id="page-content-10">
        <!-- SECTION 1: INBOUND LEADS & BROCHURE -->
        <div class="card card-hero drag-block" style="padding: 11px 15px;" draggable="false">
          <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; margin-bottom:6px;">
            <div style="white-space:nowrap;">
              <span style="font-size:11.5px; font-weight:800; color:var(--color-primary);">RICHIESTE DA SITO &amp; BROCHURE (OTTOBRE 2026)</span>
              <span style="font-size:10px; color:#556980; margin-left:6px;"><b>125 Azioni</b> (118 Moduli + 7 Download)</span>
            </div>
            <a href="https://docs.google.com/spreadsheets/d/1A0Qa8UwK3Vgw4y5aFWijE2aO4L7eCUm96UQY53HfVVE/edit?gid=0#gid=0" target="_blank" class="action-btn" style="white-space:nowrap; flex-shrink:0;">
              APRI GOOGLE SHEET RICHIESTE ↗
            </a>
          </div>

          <!-- 4 Inbound Leads Stat Badges -->
          <div class="grid-4" style="margin-bottom:6px;">
            <div style="background:#f4f8fc; border:1px solid #d0e3f2; border-radius:6px; padding:6px 8px; text-align:center;">
              <div style="font-size:9px; color:#556980; font-weight:800;">MODULI OTTOBRE</div>
              <div style="font-size:17px; font-weight:900; color:var(--color-primary);">118 Invii (+10.3%)</div>
            </div>
            <div style="background:#f4f8fc; border:1px solid #d0e3f2; border-radius:6px; padding:6px 8px; text-align:center;">
              <div style="font-size:9px; color:#556980; font-weight:800;">BROCHURE OTTOBRE</div>
              <div style="font-size:17px; font-weight:900; color:#2e7d32;">7 Download</div>
            </div>
            <div style="background:#f4f8fc; border:1px solid #d0e3f2; border-radius:6px; padding:6px 8px; text-align:center;">
              <div style="font-size:9px; color:#556980; font-weight:800;">CUMULATO LUG-OTT</div>
              <div style="font-size:17px; font-weight:900; color:var(--color-primary);">499 Lead Totali</div>
            </div>
            <div style="background:#f4f8fc; border:1px solid #d0e3f2; border-radius:6px; padding:6px 8px; text-align:center;">
              <div style="font-size:9px; color:#556980; font-weight:800;">VISITE CONVERTITE</div>
              <div style="font-size:17px; font-weight:900; color:var(--color-cyan);">373 (+23.9%)</div>
            </div>
          </div>

          <table class="data-table" style="font-size:10px;">
            <thead>
              <tr>
                <th>Data</th>
                <th>Nome &amp; Cognome</th>
                <th>Azienda</th>
                <th>Email</th>
                <th>Tipologia Richiesta</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>30/10/2026</td>
                <td><b>Jessica Di Sarro</b></td>
                <td>Sorgente Valcimoliana Srl</td>
                <td>jessica.disarro@acquadolomia.it</td>
                <td><span class="trend-pill trend-up">Form Contatto Environment</span></td>
              </tr>
              <tr>
                <td>30/10/2026</td>
                <td><b>Stefano Cattaneo</b></td>
                <td>Plus Ultra Srl</td>
                <td>acquisti@plusultra-srl.com</td>
                <td><span class="trend-pill trend-up">Richiesta Studio Shelf Life</span></td>
              </tr>
              <tr>
                <td>29/10/2026</td>
                <td><b>Laura Lenzi</b></td>
                <td>Aetris Srl</td>
                <td>tecnico@aetris.it</td>
                <td><span class="trend-pill trend-up">Form Contatto Food Safety</span></td>
              </tr>
              <tr>
                <td>21/10/2026</td>
                <td><b>Loredana Reniero</b></td>
                <td>STEP Srl SB</td>
                <td>loredana.reniero@steptechpark.com</td>
                <td><span class="trend-pill trend-neutral">Download Brochure Food</span></td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- SECTION 2: MXNS SHOP E-COMMERCE -->
        <div class="card card-navy drag-block" style="padding: 11px 15px;" draggable="false">
          <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; margin-bottom:6px;">
            <div style="white-space:nowrap;">
              <span style="font-size:11.5px; font-weight:800; color:var(--color-primary);">MXNS SHOP E-COMMERCE (AGO–OTT 2026)</span>
              <span style="font-size:10px; color:#556980; margin-left:6px;"><b>26 Ordini 3M</b> | Fatturato: <b>€5.557,10</b></span>
            </div>
            <a href="https://docs.google.com/spreadsheets/d/1mPcaZltY4TFqkTpcmSqzR_n6DlKhqK2d5Dj6N6P00ig/edit?gid=0#gid=0" target="_blank" class="action-btn" style="white-space:nowrap; flex-shrink:0;">
              APRI GOOGLE SHEET SHOP ↗
            </a>
          </div>

          <!-- 4 Shop Stat Badges -->
          <div class="grid-4" style="margin-bottom:6px;">
            <div style="background:#f4f8fc; border:1px solid #d0e3f2; border-radius:6px; padding:6px 8px; text-align:center;">
              <div style="font-size:9px; color:#556980; font-weight:800;">ORDINI OTTOBRE</div>
              <div style="font-size:17px; font-weight:900; color:var(--color-primary);">9 (€2.230,16)</div>
            </div>
            <div style="background:#f4f8fc; border:1px solid #d0e3f2; border-radius:6px; padding:6px 8px; text-align:center;">
              <div style="font-size:9px; color:#556980; font-weight:800;">CRESCITA FATTURATO</div>
              <div style="font-size:17px; font-weight:900; color:#2e7d32;">+86.3% vs Set</div>
            </div>
            <div style="background:#f4f8fc; border:1px solid #d0e3f2; border-radius:6px; padding:6px 8px; text-align:center;">
              <div style="font-size:9px; color:#556980; font-weight:800;">SCONTRINO MEDIO OTT.</div>
              <div style="font-size:17px; font-weight:900; color:var(--color-primary);">€247,80</div>
            </div>
            <div style="background:#f4f8fc; border:1px solid #d0e3f2; border-radius:6px; padding:6px 8px; text-align:center;">
              <div style="font-size:9px; color:#556980; font-weight:800;">TOTALE YTD 2026</div>
              <div style="font-size:17px; font-weight:900; color:var(--color-cyan);">83 Ord. (€14.780)</div>
            </div>
          </div>

          <table class="data-table" style="font-size:10px;">
            <thead>
              <tr>
                <th>Mese</th>
                <th class="num">N. Ordini</th>
                <th class="num">Fatturato Netto</th>
                <th>Servizi &amp; Matrici Più Vendute</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><b>Agosto 2026</b></td>
                <td class="num">9</td>
                <td class="num">€2.130,12</td>
                <td>Pacchetti Acque Reflue + PFAS, Analisi Nutrizionali, Tamponi</td>
              </tr>
              <tr>
                <td><b>Settembre 2026</b></td>
                <td class="num">8</td>
                <td class="num">€1.196,82</td>
                <td>Analisi Chim. &amp; Microbiol. + PFAS, Amianto Massivo, Acqua SMART</td>
              </tr>
              <tr class="highlight-row">
                <td><b>Ottobre 2026</b></td>
                <td class="num"><b>9</b></td>
                <td class="num"><b>€2.230,16</b></td>
                <td><b>Analisi Chim. &amp; Microbiol. + PFAS (2x €427), Metalli Pesanti, Macronutrienti</b></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="comm-box drag-block" style="font-size:11.5px;" draggable="false">
          <strong>Sintesi Conversioni:</strong> Ad ottobre i moduli contatto diretto crescono a <strong>118 richieste (+10.3% su settembre)</strong> con forte presenza di aziende Food, Environment, Packaging e Università. Ottima performance per <strong>Mxns Shop</strong>, che segna <strong>€2.230,16 di ricavi (+86.3% MoM)</strong> con scontrino medio in crescita a <strong>€247,80</strong>.
        </div>
      </div>

${footerBand(10)}
    </div>

    <!-- ==================== SLIDE 11: COPERTURA GEOGRAFICA ==================== -->
    <div class="page" id="slide-11">
${headerBand('WEBSITE: COPERTURA GEOGRAFICA', 'Distribuzione Geografica Utenti &amp; Qualità di Navigazione (Matomo Ottobre 2026)', 'GEOGRAPHY')}

      <div class="page-content" id="page-content-11">
        <!-- Regional Highlights Grid -->
        <div class="grid-3 drag-block" draggable="false">
          <div class="card card-hero" style="text-align:center; padding:12px;">
            <div style="font-size:10px; font-weight:800; color:#556980; text-transform:uppercase;">NORD ITALIA</div>
            <div style="font-size:26px; font-weight:900; color:var(--color-primary); margin:2px 0;">68%</div>
            <span class="trend-pill trend-up">Veneto &amp; Lombardia Leader</span>
          </div>
          <div class="card card-green" style="text-align:center; padding:12px;">
            <div style="font-size:10px; font-weight:800; color:#556980; text-transform:uppercase;">CENTRO ITALIA</div>
            <div style="font-size:26px; font-weight:900; color:var(--color-primary); margin:2px 0;">19%</div>
            <span class="trend-pill trend-up">+3 pt vs Set (Lazio &amp; Toscana)</span>
          </div>
          <div class="card card-orange" style="text-align:center; padding:12px;">
            <div style="font-size:10px; font-weight:800; color:#556980; text-transform:uppercase;">SUD &amp; ISOLE</div>
            <div style="font-size:26px; font-weight:900; color:var(--color-primary); margin:2px 0;">13%</div>
            <span class="trend-pill trend-up">Campania, Sicilia &amp; Puglia</span>
          </div>
        </div>

        <!-- Geographic Table -->
        <div class="card card-navy drag-block" style="padding:12px 16px;" draggable="false">
          <div style="font-size:11.5px; font-weight:800; color:var(--color-primary); margin-bottom:6px;">TOP CITTÀ ITALIANE PER VOLUME DI VISITE E QUALITÀ DI NAVIGAZIONE</div>
          <table class="data-table">
            <thead>
              <tr>
                <th>Città / Regione</th>
                <th>Nazione</th>
                <th class="num">Visite</th>
                <th class="num">Azioni / Visita</th>
                <th class="num">Bounce Rate</th>
              </tr>
            </thead>
            <tbody>
              <tr class="highlight-row">
                <td><b>Milano, Lombardia</b></td>
                <td>Italia</td>
                <td class="num">908</td>
                <td class="num">3.9</td>
                <td class="num">26.1%</td>
              </tr>
              <tr>
                <td><b>Roma, Lazio</b></td>
                <td>Italia</td>
                <td class="num">641</td>
                <td class="num">3.4</td>
                <td class="num">31.4%</td>
              </tr>
              <tr>
                <td><b>Romano d'Ezzelino / Area Bassano, Veneto</b></td>
                <td>Italia</td>
                <td class="num">367</td>
                <td class="num"><b>5.8</b></td>
                <td class="num">24.3%</td>
              </tr>
              <tr>
                <td><b>Firenze, Toscana</b></td>
                <td>Italia</td>
                <td class="num">274</td>
                <td class="num">3.3</td>
                <td class="num">29.6%</td>
              </tr>
              <tr>
                <td><b>Padova, Veneto</b></td>
                <td>Italia</td>
                <td class="num">254</td>
                <td class="num">3.8</td>
                <td class="num"><b>23.2%</b></td>
              </tr>
              <tr>
                <td><b>Bologna, Emilia-Romagna</b></td>
                <td>Italia</td>
                <td class="num">244</td>
                <td class="num">3.1</td>
                <td class="num">30.3%</td>
              </tr>
              <tr>
                <td><b>Napoli, Campania</b></td>
                <td>Italia</td>
                <td class="num">216</td>
                <td class="num">3.1</td>
                <td class="num">37.0%</td>
              </tr>
              <tr>
                <td><b>Torino, Piemonte</b></td>
                <td>Italia</td>
                <td class="num">201</td>
                <td class="num">3.7</td>
                <td class="num">25.4%</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="comm-box drag-block" style="border-left-color:var(--color-green); font-size:11.5px;" draggable="false">
          <strong>Distribuzione Territoriale:</strong> A livello regionale il <strong>Veneto (1.853 visite)</strong> e la <strong>Lombardia (1.683 visite)</strong> guidano gli accessi nazionali, seguiti da <strong>Lazio (694)</strong>, <strong>Emilia-Romagna (682)</strong> e <strong>Toscana (540)</strong>. Eccellenti indicatori di profondità e bounce rate contenuto in tutti i poli del Nord-Est (Padova 23.2%, Venezia 23.8%, Verona 17.6%).
        </div>
      </div>

${footerBand(11)}
    </div>

    <!-- ==================== SLIDE 12: SEO KEYWORDS ==================== -->
    <div class="page" id="slide-12">
${headerBand('website: SEO &amp; SEARCH INTENT', 'Query Google Search Console &amp; Looker Studio (Top 20 Keywords - Ottobre 2026)', 'SEARCH CONSOLE')}

      <div class="page-content" id="page-content-12">
        <!-- 4 GSC KPI Cards -->
        <div class="grid-4 drag-block" draggable="false">
          <div class="card card-navy" style="text-align:center; padding:10px;">
            <div style="font-size:9.5px; font-weight:800; color:#556980; text-transform:uppercase;">Impression Google</div>
            <div style="font-size:22px; font-weight:900; color:var(--color-primary); margin-top:2px;">178.6K</div>
            <span class="trend-pill trend-up">+10.3% MoM (178.583)</span>
          </div>
          <div class="card card-hero" style="text-align:center; padding:10px;">
            <div style="font-size:9.5px; font-weight:800; color:#556980; text-transform:uppercase;">Clic Organici</div>
            <div style="font-size:22px; font-weight:900; color:var(--color-cyan); margin-top:2px;">6.2K</div>
            <span class="trend-pill trend-up">+11.0% MoM (6.151)</span>
          </div>
          <div class="card card-green" style="text-align:center; padding:10px;">
            <div style="font-size:9.5px; font-weight:800; color:#556980; text-transform:uppercase;">CTR Medio</div>
            <div style="font-size:22px; font-weight:900; color:var(--color-primary); margin-top:2px;">3.44%</div>
            <span class="trend-pill trend-up">+0.6% MoM</span>
          </div>
          <div class="card card-orange" style="text-align:center; padding:10px;">
            <div style="font-size:9.5px; font-weight:800; color:#556980; text-transform:uppercase;">Brand CTR Peak</div>
            <div style="font-size:22px; font-weight:900; color:var(--color-primary); margin-top:2px;">57.3%</div>
            <span class="trend-pill trend-up">Query "merieux"</span>
          </div>
        </div>

        <!-- 20 Keywords Table SENZA CATEGORIE -->
        <div class="card card-hero drag-block" style="padding: 11px 15px;" draggable="false">
          <div style="font-size:11.5px; font-weight:800; color:var(--color-primary); margin-bottom:6px; display:flex; justify-content:space-between; align-items:center;">
            <span>TOP 20 KEYWORDS PER VOLUME DI IMPRESSION (Google Search Console - Ottobre 2026)</span>
            <span style="font-size:10px; color:var(--color-cyan); font-weight:700;">Dati Organici Ufficiali</span>
          </div>

          <div class="grid-2" style="gap: 12px;">
            <table class="data-table" style="font-size:10.5px;">
              <thead>
                <tr>
                  <th style="width:22px;">#</th>
                  <th>Keyword / Query di Ricerca</th>
                  <th class="num">Impression</th>
                </tr>
              </thead>
              <tbody>
                <tr class="highlight-row"><td><b>1</b></td><td><b>thc</b></td><td class="num"><b>4.762</b></td></tr>
                <tr class="highlight-row"><td><b>2</b></td><td><b>salmonella pomodorini</b></td><td class="num"><b>3.453</b></td></tr>
                <tr class="highlight-row"><td><b>3</b></td><td><b>pomodorini salmonella</b></td><td class="num"><b>2.535</b></td></tr>
                <tr><td>4</td><td><b>cphi milan 2026</b></td><td class="num">2.089</td></tr>
                <tr><td>5</td><td><b>halal</b></td><td class="num">1.786</td></tr>
                <tr><td>6</td><td><b>microplastiche</b></td><td class="num">1.493</td></tr>
                <tr><td>7</td><td><b>thc cos'è</b></td><td class="num">1.471</td></tr>
                <tr><td>8</td><td><b>bisfenolo a</b></td><td class="num">1.326</td></tr>
                <tr><td>9</td><td><b>ergot</b></td><td class="num">1.066</td></tr>
                <tr><td>10</td><td><b>rasff</b></td><td class="num">939</td></tr>
              </tbody>
            </table>

            <table class="data-table" style="font-size:10.5px;">
              <thead>
                <tr>
                  <th style="width:22px;">#</th>
                  <th>Keyword / Query di Ricerca</th>
                  <th class="num">Impression</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>11</td><td><b>frutta a guscio</b></td><td class="num">910</td></tr>
                <tr><td>12</td><td><b>chelab</b></td><td class="num">881</td></tr>
                <tr><td>13</td><td><b>richiami alimentari</b></td><td class="num">869</td></tr>
                <tr><td>14</td><td><b>dispositivi medici</b></td><td class="num">859</td></tr>
                <tr><td>15</td><td><b>merieux nutrisciences</b></td><td class="num">828</td></tr>
                <tr><td>16</td><td><b>pomodori salmonella</b></td><td class="num">827</td></tr>
                <tr><td>17</td><td><b>chelab resana</b></td><td class="num">731</td></tr>
                <tr><td>18</td><td><b>merieux</b></td><td class="num">728</td></tr>
                <tr><td>19</td><td><b>salmonella nei pomodori</b></td><td class="num">722</td></tr>
                <tr><td>20</td><td><b>nitrosammine</b></td><td class="num">591</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="comm-box drag-block" style="font-size:11.5px;" draggable="false">
          <strong>Search Intent &amp; Posizionamento:</strong> L'instant marketing editoriale sul focolaio <strong>Salmonella nei pomodorini</strong> intercetta oltre <strong>7.500 impression e 291 clic organici</strong> su 4 query in Top 20. Forti incrementi anche per <em>CPHI Milan 2026 (+122.5%)</em>, <em>Microplastiche (+52.3%)</em> e <em>Nitrosammine (+97.0%)</em>, mentre le query di brand toccano CTR superiori al 54%.
        </div>
      </div>

${footerBand(12)}
    </div>

    <!-- ==================== SLIDE 13: RECAP & CONCLUSION ==================== -->
    <div class="page" id="slide-13">
${headerBand('RECAP', 'Conclusioni Esecutive &amp; Prossimi Passi Strategici (Ottobre 2026)', 'EXECUTIVE RECAP')}

      <div class="page-content" id="page-content-13">
        <div style="display:flex; flex-direction:column; gap:9px; margin-top:2px;" draggable="false">
          <div class="comm-box drag-block" style="border-left-color:var(--color-primary); font-size:11.5px;" draggable="false">
            • <strong>Forte espansione del traffico e della qualità di navigazione web:</strong> Ad ottobre il portale italiano raggiunge <strong>16.026 visite (+38.01%)</strong> e <strong>40.007 pagine viste (+67.50%)</strong>, portando le azioni per visita a 4.3 e riducendo il bounce rate al <strong>28.0%</strong> (-7 punti percentuali).
          </div>

          <div class="comm-box drag-block" style="border-left-color:var(--color-cyan); font-size:11.5px;" draggable="false">
            • <strong>Nuovo record di visibilità su LinkedIn Corporate (+63.09%):</strong> Con 26 post pubblicati e <strong>+463 nuovi follower</strong>, le impression balzano a <strong>87.856</strong> (22.210 clic). Straordinario successo per l'inaugurazione del laboratorio di Resana (16.864 views, eng. 59.1%) e per CPHI Milan 2026 (8.629 views).
          </div>

          <div class="comm-box drag-block" style="border-left-color:var(--color-green); font-size:11.5px;" draggable="false">
            • <strong>Raddoppio della portata Email Marketing su SendGrid:</strong> Le <strong>12 campagne inviate</strong> totalizzano <strong>96.942 email consegnate (+150.4%)</strong> e <strong>15.844 aperture uniche (+118.8%)</strong>, con picchi di conversione sulle DEM verticali per il webinar PPWR Cosmetico (232 clic, CTOR 61.4%) e MxNS Training (276 clic).
          </div>

          <div class="comm-box drag-block" style="border-left-color:var(--color-orange); font-size:11.5px;" draggable="false">
            • <strong>Sinergia SEO &amp; Blog su allerte alimentari e regolatorio:</strong> Le impression Google salgono a <strong>178.6K (+10.3%)</strong> con <strong>6.151 clic organici (+11.0%)</strong>; l'articolo sul focolaio <em>Salmonella nei pomodorini</em> conquista da solo 1.042 letture ed entra al 3° posto tra le pagine più viste dell'intero sito.
          </div>

          <div class="comm-box drag-block" style="border-left-color:var(--color-cyan); font-size:11.5px;" draggable="false">
            • <strong>Accelerazione E-Commerce &amp; Lead Generation:</strong> Il mese registra <strong>125 conversioni inbound</strong> (118 moduli contatto diretto, +10.3% su settembre, e 7 download brochure) e un balzo di <strong>Mxns Shop a €2.230,16 di fatturato (+86.3% MoM)</strong> su 9 ordini, portando il cumulato 2026 a 83 ordini (€14.780).
          </div>
        </div>

        <div class="drag-block" style="background:#eef6fc; border:1.5px solid #cce4f7; border-radius:8px; padding:12px; text-align:center;" draggable="false">
          <div style="font-size:12px; font-weight:700; color:var(--color-primary);">Per ulteriori informazioni ed approfondimenti:</div>
          <a href="mailto:marketing-italy@mxns.com" style="font-size:15px; font-weight:800; color:var(--color-cyan); text-decoration:none; margin-top:2px; display:inline-block;">
            marketing-italy@mxns.com
          </a>
        </div>
      </div>

${footerBand(13)}
    </div>

    <!-- ==================== SLIDE 14: RETROCOPERTINA ==================== -->
    <div class="page page-cover drag-block" id="slide-14" draggable="false">
      ${octCoverSvg}
    </div>

  </div>

${tailHtml}`;

const finalHtml = headHtml + '\n' + bodyHtml;
fs.writeFileSync(outHtmlPath, finalHtml, 'utf8');
console.log('Saved October HTML:', outHtmlPath, 'bytes:', Buffer.byteLength(finalHtml));

// Render PDF via headless Chrome
const fileUri = 'file:///' + outHtmlPath.replace(/\\/g, '/');
const cmd = `"${chromePath}" --headless=new --disable-gpu --allow-file-access-from-files --no-pdf-header-footer --print-to-pdf="${outPdfPath}" "${fileUri}"`;
console.log('Rendering PDF via Chrome...');
execSync(cmd);

const pdfBytes = fs.readFileSync(outPdfPath, 'latin1');
const pageMatches = pdfBytes.match(/\/Type\s*\/Page\b/g);
console.log('Generated October PDF:', outPdfPath, 'pages:', pageMatches ? pageMatches.length : 0);
