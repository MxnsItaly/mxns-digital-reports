# Mérieux NutriSciences Italia - Digital Marketing Intelligence System
## Manuale Operativo & Istruzioni per Antigravity (Project Handover)

Questo documento costituisce la **guida tecnica e metodologica definitiva** per qualsiasi agente Antigravity incaricato di manutenere, aggiornare o generare i report digitali mensili per **Mérieux NutriSciences Italia**.

---

### 1. Repository e Struttura del Workspace
Il progetto è sincronizzato con GitHub:
- **Repository Remoto**: `https://github.com/MxnsItaly/mxns-digital-reports.git`
- **Dashboard Web Live (GitHub Pages)**: `https://mxnsitaly.github.io/mxns-digital-reports/`

#### Albero delle Directory:
```text
LK/
├── index.html                                 # Dashboard Hub Multi-Mese (Homepage interattiva)
├── report_digitale_settembre2026_personalizzato_DEF.html # MASTER TEMPLATE UFFICIALE (14 slide)
├── mxns_DigitalReport_Settembre26.pdf         # PDF Vettoriale Ufficiale Settembre (14 pag. A4)
├── mxns_DigitalReport_Luglio26.pdf            # PDF Storico Ufficiale Luglio (14 pag. A4)
├── ANTIGRAVITY_INSTRUCTIONS.md                # Questo file di istruzioni master
├── README.md                                  # Documentazione esecutiva
├── .gitignore                                 # Esclusioni di sicurezza (.env, token, log)
│
├── assets/                                    # Loghi e asset grafici ufficiali
│   ├── Simple-logo-no-background-1536x722.png
│   └── Mxns_DigitalReport_Settembre26.svg
│
├── data/                                      # Dati grezzi estratti e storici
│   ├── linkedin/                              # XLS da LinkedIn (Chelab & Expert Partners)
│   ├── matomo/                                # CSV da Matomo Analytics (visite, canali, URL)
│   └── sendgrid/                              # CSV DEM / Campagne email
│
├── scripts/                                   # Script di utilità ed estrazione API
│   └── fetch_matomo.js
│
└── archive/                                   # Bozze intermedie e versioni superate
```

---

### 2. Canoni di Design & Layout Grafico (Standard MXNS)
Tutti i report sono rigidamente calibrati sul formato **A4 Orizzontale (Landscape: 297mm × 210mm)**. 
**Regola d'oro**: Ogni slide deve occupare esattamente una pagina senza mai generare overflow o pagine bianche fantasma.

#### Variabili CSS Obbligatorie:
```css
:root {
  --page-width: 297mm;
  --page-height: 210mm;
  --page-padding-v: 24px;
  --page-padding-h: 30px;
  --card-gap: 22px;
  --card-padding-v: 14px;
  --card-padding-h: 18px;
  --font-size-base: 12px;
}
```

#### Palette Colori Istituzionale:
- **Navy Corporate**: `#002D62` (Header, titoli primari, card di rilievo)
- **Blue Brand**: `#005A9C` / `#0072CE` (Pulsanti, metriche LinkedIn, accenti)
- **Cyan DEM**: `#00A3E0` (Email marketing e grafici a barre)
- **Green Performance**: `#78BE20` (Website, conversioni, trend positivi)
- **Neutral Background**: `#F8FAFC` / `#FFFFFF` (Card e tabelle alternate)

---

### 3. Struttura Rigorosa delle 14 Slide

1. **Slide 1 - Copertina Ufficiale**: Titolo mese/anno, logo Mérieux ad alta risoluzione in vettoriale.
2. **Slide 2 - Executive Summary**: Tre tabelle perfettamente uniformate a 5 colonne (*Metrica*, *Mese Prec.*, *Mese Attuale*, *Variazione %*, *Stato*) per LinkedIn, Mail e Website. Senza colonna "Canale" ridondante.
3. **Slide 3 - Macro Business Units Overview**: Ripartizione delle performance aggregate per BU (Food, Pharma, Environmental, Cosmetics).
4. **Slide 4 - LinkedIn Performance**: Nuovi follower, impression complessive e spaccato demografico dell'audience.
5. **Slide 5 - LinkedIn Top Content**: Analisi qualitativa dei migliori post con testi di commento a chiasmo (eventi come CPHI, innovazione, sicurezza alimentare).
6. **Slide 6 - Email Marketing Overview**: Panoramica aggregata SendGrid (campagne inviate, reach, open rate, click rate).
7. **Slide 7 - Email Performance Dettaglio**: Tabella delle 10 campagne con gli oggetti reali delle mail estratti dai dati, open rate e click rate.
8. **Slide 8 - Website Matomo - Canali di Traffico**: Visite per canale (Diretto, Ricerca Organica, Social, Email) con commenti esplicativi.
9. **Slide 9 - Top Pagine & Sezioni**: Pagine web più visitate, tempi medi e sezioni del sito con URL verificati da Matomo.
10. **Slide 10 - Blog Performance**: Articoli del blog più letti e trend visivo di consultazione.
11. **Slide 11 - Conversioni - Form di Contatto & Brochure**: Dettaglio delle richieste di preventivo/contatto e download brochure suddivisi per BU.
12. **Slide 12 - SEO & Google Search Console**: Impression organiche Google, clic e posizionamento delle parole chiave strategiche (senza badge categoria non richiesti).
13. **Slide 13 - Dispositivi & Demografica**: Quota Desktop vs Mobile, sistemi operativi e provenienza geografica.
14. **Slide 14 - Sintesi Strategica & Next Steps**: Punti chiave emersi, aree di attenzione e azioni raccomandate per il mese successivo.

---

### 4. Sistema di Sicurezza: Admin Lock & Modalità Modifica
- **Visualizzazione Protetta (Default per tutti)**: Tutti i testi, numeri e tabelle hanno `contenteditable="false"`. Le maniglie di trascinamento `⠿` e i pannelli di modifica sono completamente invisibili. Chiunque riceva il link vede un report impeccabile e non modificabile.
- **Sblocco Amministratore (Riservato all'utente)**:
  - Cliccando sul badge `🔒 Sola Lettura (Admin Lock)` in basso a destra (o premendo `Ctrl + Shift + E` / `Alt + E`), si apre il prompt di sicurezza.
  - **PIN Amministratore**: `mxns2026`.
  - Una volta inserito, il report passa a `✏️ Modifica Attiva`: ogni singolo testo, numero, percentuale o tabella diventa direttamente modificabile cliccandoci sopra, e compaiono le maniglie di riposizionamento.
  - L'autorizzazione viene memorizzata nel browser locale tramite `localStorage`.

---

### 5. Flusso Operativo per la Generazione di Nuovi Mesi (es. Ottobre 2026)

Quando l'utente fornisce i nuovi file grezzi del mese (es. Ottobre):
1. **Posizionare i dati**:
   - File LinkedIn in `data/linkedin/`
   - File Matomo in `data/matomo/`
   - File SendGrid in `data/sendgrid/`
2. **Duplicare il Master Template**:
   - Clonare `report_digitale_settembre2026_personalizzato_DEF.html` come nuovo file mensile:  
     `report_digitale_2026_10_ottobre.html`.
3. **Aggiornare ESCLUSIVAMENTE Dati & Testi**:
   - Sostituire le matrici di dati numerici, le percentuali di variazione e i commenti qualitativi.
   - **NON alterare** le classi CSS, le spaziature, l'ordine delle 14 slide né l'architettura dei blocchi.
4. **Compilare il PDF Vettoriale A4**:
   - Usare Chrome headless per generare il PDF esatto a 14 pagine:
     ```powershell
     chrome --headless=new --disable-gpu --allow-file-access-from-files --no-pdf-header-footer --print-to-pdf="mxns_DigitalReport_Ottobre26.pdf" "file:///c:/path/to/report_digitale_2026_10_ottobre.html"
     ```
5. **Aggiornare la Dashboard Hub (`index.html`)**:
   - Aggiungere il nuovo mese nel selettore temporale in alto.
   - Aggiornare le metriche nel ribbon KPI di sintesi.
   - Collegare l'iframe e il pulsante download PDF al nuovo file di Ottobre.
6. **Eseguire Commit & Push su GitHub**:
   - `git add -A`
   - `git commit -m "feat: add October 2026 executive report"`
   - `git push origin main`
   *(GitHub Pages aggiornerà automaticamente il sito online in 60 secondi).*
