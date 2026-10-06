/**
 * MXNS Digital Report - Matomo Data Extractor
 * Estrae automaticamente tutte le metriche del sito web per il mese specificato.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Carica configurazione da .env
function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) {
    throw new Error('File .env non trovato in ' + envPath);
  }
  const env = {};
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const [k, ...v] = line.split('=');
    if (k && v.length) env[k.trim()] = v.join('=').trim();
  });
  return env;
}

const env = loadEnv();
const baseUrl = new URL(env.MATOMO_URL);
const idSite = env.MATOMO_SITE_ID;
const token = env.MATOMO_TOKEN_AUTH;

function matomoRequest(method, params = {}) {
  return new Promise((resolve, reject) => {
    const postData = new URLSearchParams({
      module: 'API',
      method: method,
      idSite: idSite,
      format: 'JSON',
      token_auth: token,
      ...params
    }).toString();

    const options = {
      hostname: baseUrl.hostname,
      port: 443,
      path: '/index.php',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch (e) {
          reject(new Error('Failed to parse JSON: ' + data.substring(0, 200)));
        }
      });
    });

    req.on('error', err => reject(err));
    req.write(postData);
    req.end();
  });
}

async function extractMonthlyWebReport(yearMonth = '2026-09') {
  const dateStr = `${yearMonth}-01`;
  console.log(`🌐 [Matomo API] Inizio estrazione dati per il mese: ${yearMonth}...`);

  // 1. Riepilogo Visite Totali
  const summary = await matomoRequest('VisitsSummary.get', {
    period: 'month',
    date: dateStr
  });

  // 2. Canali di Traffico (Referrer Types)
  const referrers = await matomoRequest('Referrers.getReferrerType', {
    period: 'month',
    date: dateStr
  });

  // 3. Dispositivi (Desktop, Smartphone, Tablet)
  const devices = await matomoRequest('DevicesDetection.getType', {
    period: 'month',
    date: dateStr
  });

  // 4. Alberatura completa Pagine Web (Expanded)
  const pageTree = await matomoRequest('Actions.getPageUrls', {
    period: 'month',
    date: dateStr,
    expanded: 1,
    filter_limit: 1000
  });

  // Trova il nodo IT (sezione italiana)
  const itNode = (pageTree || []).find(node => node.label === 'it');
  const itSubtree = itNode ? itNode.subtable || [] : [];

  // 5. Ricerca Business Units e Expert Partners
  const epNode = itSubtree.find(n => n.label === 'expert-partners');
  const foodNode = itSubtree.find(n => n.label === 'food-safety-quality');
  const pharmaNode = itSubtree.find(n => n.label === 'pharma-and-cosmetics' || n.label === 'pharma-cosmetics');
  const envNode = itSubtree.find(n => n.label === 'environmental' || n.label === 'ambientale');

  const result = {
    month: yearMonth,
    extractedAt: new Date().toISOString(),
    summary: {
      visits: summary.nb_visits || 0,
      uniqueVisitors: summary.nb_uniq_visitors || 0,
      actions: summary.nb_actions || 0,
      bounceRate: summary.bounce_rate || '0%',
      avgTimeOnSiteSec: summary.avg_time_on_site || 0,
      actionsPerVisit: summary.nb_actions_per_visit || 0
    },
    trafficChannels: referrers.map(r => ({
      label: r.label,
      visits: r.nb_visits,
      actions: r.nb_actions,
      bounceRate: r.bounce_rate
    })),
    devices: devices.map(d => ({
      label: d.label,
      visits: d.nb_visits,
      pageviews: d.nb_hits
    })),
    italianSection: {
      totalVisits: itNode ? itNode.nb_visits : 0,
      totalPageviews: itNode ? itNode.nb_hits : 0,
      expertPartners: epNode ? {
        visits: epNode.nb_visits,
        pageviews: epNode.nb_hits,
        bounceRate: epNode.bounce_rate,
        avgTimeOnPageSec: epNode.avg_time_on_page,
        subpages: (epNode.subtable || []).map(s => ({ label: s.label, visits: s.nb_visits, hits: s.nb_hits }))
      } : null
    }
  };

  const outPath = path.join(__dirname, `matomo_extracted_${yearMonth}.json`);
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2), 'utf8');
  console.log(`✅ [Matomo API] Dati estratti con successo e salvati in: ${outPath}`);
  return result;
}

// Se invocato direttamente da riga di comando
if (require.main === module) {
  const targetMonth = process.argv[2] || '2026-09';
  extractMonthlyWebReport(targetMonth)
    .then(data => {
      console.log('\n📊 Sintesi estratta:');
      console.log(`- Visite Totali: ${data.summary.visits}`);
      console.log(`- Frequenza di Rimbalzo: ${data.summary.bounceRate}`);
      console.log(`- Azioni per Visita: ${data.summary.actionsPerVisit}`);
      console.log(`- Visite Sezione Italia (/it/): ${data.italianSection.totalVisits}`);
      if (data.italianSection.expertPartners) {
        console.log(`- Expert Partners (/it/expert-partners): ${data.italianSection.expertPartners.visits} visite, ${data.italianSection.expertPartners.pageviews} visualizzazioni`);
      }
    })
    .catch(err => console.error('❌ Errore:', err.message));
}

module.exports = { extractMonthlyWebReport };
