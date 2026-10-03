# Mérieux NutriSciences Italia - Digital Marketing Intelligence System
## Antigravity Project Handover & Master Reference Guide

Questo documento contiene l'architettura completa, le regole di design, la struttura dei dati e le procedure operative per la generazione e manutenzione dei report digitali mensili di **Mérieux NutriSciences Italia**.

---

### 1. File Principali e Struttura del Workspace
Il workspace contiene tutti gli asset, i template validati, gli script di compilazione e i dati grezzi:

- **`index.html`** / **`dashboard_report.html`**: Dashboard Hub Interattivo multi-mese con timeline, KPI ribbon, indice delle 14 slide con anteprima live integrata e link per download PDF / visualizzazione a schermo intero.
- **`report_digitale_settembre2026_personalizzato_DEF.html`**: **Master Template Ufficiale** validato a 14 pagine in formato A4 Landscape. Tutti i report futuri (es. Ottobre 2026) devono basarsi su questa esatta struttura grafica e spaziale.
- **`mxns_DigitalReport_Settembre26.pdf`**: Versione PDF vettoriale a 14 pagine ad alta risoluzione pronta per la stampa o l'invio executive.
- **`Simple-logo-no-background-1536x722.png`**: Logo aziendale ad alta risoluzione (incorporato come Base64 nei file HTML per massima portabilità).
- **`Mxns_DigitalReport_Settembre26.svg`**: Frontespizio vettoriale della copertina.
- **File dati grezzi**: Export CSV e XLS da LinkedIn (Chelab & Expert Partners), Matomo Analytics, SendGrid e Google Search Console.

---

### 2. Design System e Parametri di Layout
Il report è calibrato al millimetro sul formato **A4 Orizzontale (297mm × 210mm)**. Per evitare sfasamenti o pagine bianche fantasma, i parametri CSS globali validati sono:

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

#### Palette Colori Ufficiale (Mérieux NutriSciences):
- **Navy Corporate**: `#002D62` (Intestazioni primarie, KPI card principali)
- **Blue Brand**: `#005A9C` / `#0072CE` (Badge, pulsanti, accenti LinkedIn)
- **Cyan DEM**: `#00A3E0` (Email marketing e grafici a barre)
- **Green Performance**: `#78BE20` (Website, conversioni, trend positivi)
- **Neutral Gray**: `#F8FAFC` (Sfondi card e tabelle alternate)

---

### 3. Struttura delle 14 Slide Ufficiali

1. **Slide 1 - Copertina / Frontespizio**: Titolo, mese di riferimento e logo ufficiale Mérieux.
2. **Slide 2 - Executive Summary**: Tre tabelle uniformate a 5 colonne (*Metrica*, *Agosto*, *Settembre*, *Variazione*, *Stato*) per LinkedIn, Mail e Website.
3. **Slide 3 - Macro Business Units Overview**: Sintesi complessiva per BU (Food, Pharma, Environmental, Cosmetics).
4. **Slide 4 - LinkedIn Performance**: Panoramica follower, impression e demografica dell'audience.
5. **Slide 5 - LinkedIn Top Content**: Analisi qualitativa dei migliori post con commenti esplicativi (es. CPHI, eventi, innovazione).
6. **Slide 6 - Email Marketing Overview**: Metriche complessive SendGrid (campagne inviate, reach, open rate, click rate).
7. **Slide 7 - Email Performance Dettaglio**: Tabella dettagliata delle 10 campagne con oggetti reali delle mail, destinatari, tassi di apertura e click.
8. **Slide 8 - Website Matomo: Canali di Traffico**: Distribuzione visite per canale (Diretto, Ricerca Organica, Social, Email) con commenti a chiasmo.
9. **Slide 9 - Top Pagine & Sezioni**: URL più visitati, metriche di permanenza e tipologia contenuto.
10. **Slide 10 - Blog Performance Q3**: Analisi articoli blog più letti e trend temporale di visualizzazione.
11. **Slide 11 - Conversioni: Richieste da Sito & Brochure**: Dettaglio delle 12 richieste di contatto e 5 download brochure suddivisi per BU.
12. **Slide 12 - SEO & Google Search Console**: Impression organiche, clic e posizionamento parole chiave chiave senza badge categoria non richiesti.
13. **Slide 13 - Dispositivi & Demografica**: Ripartizione Desktop/Mobile, browser e provenienza geografica degli utenti.
14. **Slide 14 - Sintesi Strategica & Next Steps**: Key takeaways, aree di miglioramento e roadmap di ottimizzazione per il mese successivo.

---

### 4. Sistema di Sicurezza e Modifica (Admin Lock)
- **Vista Protetta (Default per tutti)**: Tutti i testi e blocchi sono in sola lettura (`contenteditable="false"`). Le maniglie di drag & drop e i comandi di editing sono nascosti.
- **Sblocco Amministratore**: Cliccando sul badge `🔒 Sola Lettura (Admin Lock)` in basso a destra (o con `Ctrl + Shift + E` / `Alt + E`) e inserendo il **PIN: `mxns2026`**, si attiva la modalità editor (`✏️ Modifica Attiva`), rendendo ogni testo cliccabile e modificabile al volo.
- Il Drag & Drop è abilitato esclusivamente afferrando l'icona grip `⠿` per non interferire con la normale selezione del testo.

---

### 5. Procedura per la Creazione di Nuovi Mesi (es. Ottobre 2026)
1. **Dati Grezzi**: Inserire i nuovi file CSV/XLS nella cartella del progetto.
2. **Aggiornamento Dati**: Mantenere intatta la struttura HTML/CSS di `report_digitale_settembre2026_personalizzato_DEF.html` e aggiornare esclusivamente le matrici dati, i numeri, le percentuali e i commenti qualitativi.
3. **Salvataggio File Dedicato**: Salvare come `report_digitale_2026_10_ottobre.html`.
4. **Compilazione PDF Vettoriale**: Eseguire la compilazione headless con Chrome:
   ```bash
   chrome --headless=new --disable-gpu --allow-file-access-from-files --no-pdf-header-footer --print-to-pdf="mxns_DigitalReport_Ottobre26.pdf" "file:///c:/path/to/report_digitale_2026_10_ottobre.html"
   ```
5. **Aggiornamento Hub**: Aggiungere il nuovo mese nella timeline di `index.html`.
