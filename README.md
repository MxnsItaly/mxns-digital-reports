# Mérieux NutriSciences Italia &bull; Digital Marketing Intelligence System

Repository ufficiale per il monitoraggio, l'analisi multi-canale e la reportistica esecutiva digitale di **Mérieux NutriSciences Italia**.

---

## 🌐 Portale Online & Report Live
La dashboard interattiva è accessibile online tramite GitHub Pages:  
👉 **[https://mxnsitaly.github.io/mxns-digital-reports/](https://mxnsitaly.github.io/mxns-digital-reports/)**

---

## 📂 Struttura del Repository

```text
├── index.html                                 # Dashboard Hub Principale (Homepage interattiva)
├── report_digitale_settembre2026_personalizzato_DEF.html # Master Template Ufficiale (14 slide interattive)
├── mxns_DigitalReport_Settembre26.pdf         # PDF Vettoriale Ufficiale Settembre (14 pag. A4)
├── mxns_DigitalReport_Luglio26.pdf            # PDF Storico Ufficiale Luglio (14 pag. A4)
├── ANTIGRAVITY_HANDOVER.md                    # Linee guida architetturali e tecniche di progetto
├── README.md                                  # Documentazione del repository
│
├── assets/                                    # Loghi e grafica ufficiale ad alta risoluzione
│   ├── Simple-logo-no-background-1536x722.png
│   └── Mxns_DigitalReport_Settembre26.svg
│
├── data/                                      # Dati grezzi per canale e storici
│   ├── linkedin/                              # Export XLS LinkedIn (Chelab & Expert Partners)
│   ├── matomo/                                # Export CSV Matomo Analytics (visite, canali, URL)
│   └── sendgrid/                              # Export CSV DEM / Campagne email
│
├── scripts/                                   # Script di automazione ed estrazione dati
│   └── fetch_matomo.js
│
└── archive/                                   # Bozze intermedie e versioni precedenti
```

---

## 🔐 Sicurezza & Modalità Modifica (Admin Lock)
- **Modalità Lettore (Default)**: Chiunque apra il report accede in modalità sola lettura protetta (nessun cursore, nessun drag & drop accidentale).
- **Modalità Amministratore (Editing)**:
  - Cliccare sul badge in basso a destra `🔒 Sola Lettura (Admin Lock)` o premere `Ctrl + Shift + E`.
  - Inserire il **PIN Amministratore**: `mxns2026`.
  - Permette la modifica istantanea di testi, valori, tabelle e il riposizionamento dei blocchi con le maniglie `⠿`.

---

## 📊 Canali Tracciati
1. **LinkedIn Corporate**: Chelab Silliker Laboratories & Expert Partners Italia (Follower, Impression, Engagement, Analisi Top Post).
2. **Direct Email Marketing (SendGrid)**: Campagne inviate, Open Rate, Click Rate, Destinatari unici.
3. **Web Analytics (Matomo)**: Visite, Azioni/visita, Bounce Rate, Canali di traffico, Top pagine.
4. **Blog Performance**: Trend visualizzazioni trimestrali e Top 15 articoli.
5. **Lead & Conversione**: Moduli di contatto e download brochure per Business Unit (Food, Pharma, Enviro, Cosmetics).
6. **SEO & Search Console**: Visibilità organica Google e posizionamento parole chiave.

---

## 📝 Procedura per i Mesi Successivi
1. Inserire i nuovi export in `data/linkedin/`, `data/matomo/` e `data/sendgrid/`.
2. Duplicare il template `report_digitale_settembre2026_personalizzato_DEF.html` rinominandolo per il mese corrente (es. `report_digitale_2026_10_ottobre.html`).
3. Aggiornare i dati numerici e i commenti qualitativi.
4. Compilare il PDF con Google Chrome headless:
   ```bash
   chrome --headless=new --disable-gpu --allow-file-access-from-files --no-pdf-header-footer --print-to-pdf="mxns_DigitalReport_Ottobre26.pdf" "file:///c:/path/to/report_digitale_2026_10_ottobre.html"
   ```
5. Aggiungere il nuovo mese nel selettore di `index.html` ed eseguire il push su GitHub.
