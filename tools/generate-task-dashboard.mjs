#!/usr/bin/env node
/**
 * generate-task-dashboard.mjs
 *
 * Génère un tableau de bord HTML autonome (docs/architecture/tableau-de-bord-taches.html)
 * depuis l'unique source de vérité du dépôt : docs/architecture/taches-restantes.md.
 *
 * Ne duplique aucune donnée à la main — parse le fichier .md par regex sur sa
 * structure connue (`## N. Titre`, `### N.M Titre`, `- **ID** — état, effort,
 * crit, alias. Texte...`) et projette un JSON embarqué dans une page HTML/JS
 * statique, filtrable côté client (aucune dépendance réseau, ouvrable en
 * local par double-clic).
 *
 * Rejouable à tout moment : `node tools/generate-task-dashboard.mjs` régénère
 * le fichier depuis l'état courant de taches-restantes.md. Si le tableau de
 * bord diverge de la source, c'est qu'il n'a pas été régénéré après une
 * édition — même philosophie que check-docs-freshness.mjs, mais volontairement
 * non branché en gate CI (c'est un outil de lecture humaine, pas un contrat
 * machine-vérifiable au même titre que STATUS.md).
 *
 * Usage : node tools/generate-task-dashboard.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = join(ROOT, 'docs/architecture/taches-restantes.md');
const OUTPUT = join(ROOT, 'docs/architecture/tableau-de-bord-taches.html');

const STATE_MAP = [
    // Ordre important : les patterns les plus spécifiques d'abord, sinon
    // "**fait**" (générique) absorbe à tort "**fait localement**" /
    // "**implémentation terminée localement**" (même préfixe "**fait").
    {
        re: /^\*\*fait localement[^*]*\*\*/i,
        key: 'fait-localement',
        label: 'Fait localement',
    },
    {
        re: /^\*\*implémentation terminée localement[^*]*\*\*/i,
        key: 'fait-localement',
        label: 'Fait localement',
    },
    { re: /^\*\*fait[^*]*\*\*/i, key: 'fait', label: 'Fait' },
    { re: /^bloqué-humain/i, key: 'bloque-humain', label: 'Bloqué-humain' },
    { re: /^partiel/i, key: 'partiel', label: 'Partiel' },
    { re: /^en cours/i, key: 'en-cours', label: 'En cours' },
    { re: /^décision/i, key: 'decision', label: 'Décision' },
    { re: /^différé/i, key: 'differe', label: 'Différé' },
    { re: /^en pause/i, key: 'en-pause', label: 'En pause' },
    { re: /^ouvert/i, key: 'ouvert', label: 'Ouvert' },
];

function classifyState(raw) {
    for (const s of STATE_MAP) {
        if (s.re.test(raw.trim())) return s;
    }
    return { key: 'ouvert', label: 'Ouvert' };
}

function parseTasksMd(text) {
    const lines = text.split('\n');
    let currentH2 = '';
    let currentH3 = '';
    const tasks = [];

    // Ligne d'item : "- **ID** — état[détails], Effort, Crit[, alias `...`]. Texte"
    const itemRe = /^-\s+\*\*([A-Z0-9][A-Za-z0-9-]*)\*\*\s+—\s+(.+)$/;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const h2 = line.match(/^##\s+(\d+)\.\s+(.+)$/);
        if (h2) {
            currentH2 = `${h2[1]}. ${h2[2]}`.trim();
            currentH3 = '';
            continue;
        }
        const h3 = line.match(/^###\s+(.+)$/);
        if (h3) {
            currentH3 = h3[1].trim();
            continue;
        }
        const m = line.match(itemRe);
        if (!m) continue;

        const id = m[1];
        let rest = m[2];
        // Continuation lines: following lines indented (not starting a new
        // "- **" item, not a heading) belong to the same task description.
        let j = i + 1;
        while (
            j < lines.length &&
            /^\s{2,}\S/.test(lines[j]) &&
            !/^\s*-\s+\*\*/.test(lines[j])
        ) {
            rest += ' ' + lines[j].trim();
            j += 1;
        }

        const state = classifyState(rest);
        // Effort/Crit: "état[, ()], Effort, Crit[Ops], alias `...`. Texte"
        const metaMatch = rest.match(
            /,\s*(XS|S|M|L|XL)\s*,\s*(P0|P1|P2)(?:\s*Ops)?\b/
        );
        const effort = metaMatch ? metaMatch[1] : '';
        const crit = metaMatch ? metaMatch[2] : '';
        const isOps = /P[012]\s*Ops/.test(rest);

        const aliasMatch = rest.match(/alias\s+`([^`]+)`/);
        const alias = aliasMatch ? aliasMatch[1] : '';

        // Texte descriptif : après le premier ". " qui suit les métadonnées.
        const afterMeta = rest.replace(/^[^.]*\.\s*/, '');
        const cleaned = afterMeta.replace(/\*\*/g, '').replace(/`/g, '').trim();
        const summary =
            cleaned.length > 220
                ? cleaned.slice(0, cleaned.lastIndexOf(' ', 220)) + '…'
                : cleaned;

        tasks.push({
            id: escapeHtml(id),
            section: escapeHtml(currentH2),
            subsection: escapeHtml(currentH3),
            stateKey: state.key,
            stateLabel: state.label,
            effort,
            crit: isOps ? `${crit} Ops` : crit,
            alias: escapeHtml(alias),
            summary: escapeHtml(summary),
        });
    }
    return tasks;
}

function escapeHtml(s) {
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function buildHtml(tasks, generatedAt) {
    const dataJson = JSON.stringify(tasks);
    const total = tasks.length;
    const byState = {};
    for (const t of tasks) byState[t.stateKey] = (byState[t.stateKey] ?? 0) + 1;
    const doneCount =
        (byState['fait'] ?? 0) + (byState['fait-localement'] ?? 0);
    const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;

    return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<title>Tableau de bord — taches-restantes.md</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  :root {
    --bg: #0b0d12; --panel: #131722; --border: #232838; --text: #e6e9f0;
    --muted: #8b93a7; --accent: #5b8cff;
    --fait: #2fbf71; --fait-local: #7ed957; --partiel: #f5a623;
    --ouvert: #6b7280; --bloque: #e5484d; --encours: #4fc3f7;
    --decision: #b892ff; --differe: #9ca3af; --pause: #d4a373;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
    background: var(--bg); color: var(--text); padding: 24px 32px 60px;
  }
  h1 { font-size: 20px; margin: 0 0 4px; }
  .meta { color: var(--muted); font-size: 13px; margin-bottom: 20px; }
  .summary { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 20px; }
  .card {
    background: var(--panel); border: 1px solid var(--border); border-radius: 10px;
    padding: 12px 16px; min-width: 110px;
  }
  .card .n { font-size: 22px; font-weight: 700; }
  .card .l { font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: .04em; }
  .progress-wrap { background: var(--panel); border: 1px solid var(--border); border-radius: 10px; padding: 14px 16px; margin-bottom: 22px; }
  .progress-bar { height: 10px; border-radius: 6px; background: #1c2030; overflow: hidden; margin-top: 8px; }
  .progress-fill { height: 100%; background: linear-gradient(90deg, var(--fait), var(--fait-local)); }
  .controls { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; align-items: center; }
  select, input[type="text"] {
    background: var(--panel); border: 1px solid var(--border); color: var(--text);
    padding: 7px 10px; border-radius: 8px; font-size: 13px;
  }
  input[type="text"] { flex: 1; min-width: 200px; }
  .chip {
    display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px;
    border-radius: 999px; font-size: 12px; cursor: pointer; user-select: none;
    border: 1px solid var(--border); color: var(--muted); background: var(--panel);
  }
  .chip.active { color: var(--bg); font-weight: 600; }
  .chip[data-state="fait"].active { background: var(--fait); border-color: var(--fait); }
  .chip[data-state="fait-localement"].active { background: var(--fait-local); border-color: var(--fait-local); }
  .chip[data-state="partiel"].active { background: var(--partiel); border-color: var(--partiel); }
  .chip[data-state="ouvert"].active { background: var(--ouvert); border-color: var(--ouvert); }
  .chip[data-state="bloque-humain"].active { background: var(--bloque); border-color: var(--bloque); }
  .chip[data-state="en-cours"].active { background: var(--encours); border-color: var(--encours); }
  .chip[data-state="decision"].active { background: var(--decision); border-color: var(--decision); }
  .chip[data-state="differe"].active { background: var(--differe); border-color: var(--differe); }
  .chip[data-state="en-pause"].active { background: var(--pause); border-color: var(--pause); }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  thead th {
    text-align: left; color: var(--muted); font-weight: 600; font-size: 11px;
    text-transform: uppercase; letter-spacing: .03em; padding: 8px 10px;
    border-bottom: 1px solid var(--border); position: sticky; top: 0; background: var(--bg);
  }
  tbody td { padding: 9px 10px; border-bottom: 1px solid var(--border); vertical-align: top; }
  tbody tr:hover { background: #161a26; }
  .id { font-weight: 700; font-family: ui-monospace, monospace; white-space: nowrap; }
  .badge {
    display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 11px;
    font-weight: 600; color: var(--bg); white-space: nowrap;
  }
  .badge.fait { background: var(--fait); }
  .badge.fait-localement { background: var(--fait-local); }
  .badge.partiel { background: var(--partiel); }
  .badge.ouvert { background: var(--ouvert); color: var(--text); }
  .badge.bloque-humain { background: var(--bloque); }
  .badge.en-cours { background: var(--encours); }
  .badge.decision { background: var(--decision); }
  .badge.differe { background: var(--differe); color: var(--text); }
  .badge.en-pause { background: var(--pause); }
  .crit { font-weight: 700; }
  .crit-P0 { color: #ff6b6b; }
  .crit-P1 { color: #ffb84d; }
  .crit-P2 { color: var(--muted); }
  .sec { color: var(--muted); font-size: 12px; }
  .summary-cell { color: #c5cade; max-width: 480px; }
  .empty { text-align: center; color: var(--muted); padding: 40px; }
  .count-line { color: var(--muted); font-size: 12px; margin-bottom: 10px; }
</style>
</head>
<body>
  <h1>Tableau de bord — cmz-platform</h1>
  <div class="meta">Source : docs/architecture/taches-restantes.md · Régénéré le ${generatedAt} · <code>node tools/generate-task-dashboard.mjs</code> pour rafraîchir</div>

  <div class="summary" id="summary"></div>

  <div class="progress-wrap">
    <div style="display:flex; justify-content:space-between; font-size:13px;">
      <span>Avancement global (fait + fait localement)</span>
      <strong>${doneCount}/${total} (${pct}%)</strong>
    </div>
    <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
  </div>

  <div class="controls">
    <input type="text" id="search" placeholder="Filtrer par id, section ou texte…" />
    <select id="critFilter">
      <option value="">Toutes priorités</option>
      <option value="P0">P0</option>
      <option value="P1">P1</option>
      <option value="P2">P2</option>
    </select>
    <select id="sectionFilter"><option value="">Toutes sections</option></select>
  </div>
  <div class="controls" id="stateChips"></div>

  <div class="count-line" id="countLine"></div>
  <table>
    <thead>
      <tr>
        <th>Id</th><th>État</th><th>Crit.</th><th>Effort</th><th>Section</th><th>Résumé</th>
      </tr>
    </thead>
    <tbody id="rows"></tbody>
  </table>
  <div class="empty" id="emptyMsg" style="display:none">Aucune tâche ne correspond au filtre.</div>

<script>
const TASKS = ${dataJson};
const STATE_ORDER = ['bloque-humain','en-cours','ouvert','partiel','decision','en-pause','differe','fait-localement','fait'];
const STATE_LABELS = {
  'fait': 'Fait', 'fait-localement': 'Fait localement', 'partiel': 'Partiel',
  'ouvert': 'Ouvert', 'bloque-humain': 'Bloqué-humain', 'en-cours': 'En cours',
  'decision': 'Décision', 'differe': 'Différé', 'en-pause': 'En pause'
};

const activeStates = new Set();
let search = '';
let critFilter = '';
let sectionFilter = '';

function renderSummary() {
  const counts = {};
  for (const t of TASKS) counts[t.stateKey] = (counts[t.stateKey] || 0) + 1;
  const el = document.getElementById('summary');
  el.innerHTML = STATE_ORDER.filter(k => counts[k]).map(k =>
    \`<div class="card"><div class="n">\${counts[k]}</div><div class="l">\${STATE_LABELS[k]}</div></div>\`
  ).join('') + \`<div class="card"><div class="n">\${TASKS.length}</div><div class="l">Total</div></div>\`;
}

function renderChips() {
  const el = document.getElementById('stateChips');
  el.innerHTML = STATE_ORDER.filter(k => TASKS.some(t => t.stateKey === k)).map(k =>
    \`<span class="chip" data-state="\${k}">\${STATE_LABELS[k]}</span>\`
  ).join('');
  el.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const k = chip.dataset.state;
      if (activeStates.has(k)) { activeStates.delete(k); chip.classList.remove('active'); }
      else { activeStates.add(k); chip.classList.add('active'); }
      render();
    });
  });
}

function renderSectionOptions() {
  const sections = [...new Set(TASKS.map(t => t.section))].sort();
  const sel = document.getElementById('sectionFilter');
  for (const s of sections) {
    const o = document.createElement('option');
    o.value = s; o.textContent = s;
    sel.appendChild(o);
  }
}

function render() {
  const q = search.trim().toLowerCase();
  const filtered = TASKS.filter(t => {
    if (activeStates.size > 0 && !activeStates.has(t.stateKey)) return false;
    if (critFilter && !t.crit.startsWith(critFilter)) return false;
    if (sectionFilter && t.section !== sectionFilter) return false;
    if (q) {
      const hay = (t.id + ' ' + t.section + ' ' + t.subsection + ' ' + t.summary + ' ' + t.alias).toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  document.getElementById('countLine').textContent = filtered.length + ' tâche(s) affichée(s) sur ' + TASKS.length;
  const rows = document.getElementById('rows');
  const empty = document.getElementById('emptyMsg');
  if (filtered.length === 0) {
    rows.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';
  rows.innerHTML = filtered.map(t => \`
    <tr>
      <td class="id">\${t.id}</td>
      <td><span class="badge \${t.stateKey}">\${t.stateLabel}</span></td>
      <td class="crit crit-\${(t.crit||'').slice(0,2)}">\${t.crit || '—'}</td>
      <td>\${t.effort || '—'}</td>
      <td class="sec">\${t.section}\${t.subsection ? '<br><span style="opacity:.7">' + t.subsection + '</span>' : ''}</td>
      <td class="summary-cell">\${t.summary}\${t.alias ? '<br><span style="color:#6b7280;font-size:11px">alias: ' + t.alias + '</span>' : ''}</td>
    </tr>
  \`).join('');
}

document.getElementById('search').addEventListener('input', e => { search = e.target.value; render(); });
document.getElementById('critFilter').addEventListener('change', e => { critFilter = e.target.value; render(); });
document.getElementById('sectionFilter').addEventListener('change', e => { sectionFilter = e.target.value; render(); });

renderSummary();
renderChips();
renderSectionOptions();
render();
</script>
</body>
</html>
`;
}

function main() {
    const text = readFileSync(SOURCE, 'utf8');
    const tasks = parseTasksMd(text);
    if (tasks.length === 0) {
        console.error(
            'Erreur : 0 tâche extraite de taches-restantes.md — regex désynchronisée de la forme réelle du fichier ?'
        );
        process.exit(2);
    }
    const generatedAt = new Date().toISOString().slice(0, 10);
    const html = buildHtml(tasks, generatedAt);
    writeFileSync(OUTPUT, html, 'utf8');
    console.log(
        `[generate-task-dashboard] ${tasks.length} tâches extraites → ${OUTPUT.replace(ROOT + '/', '')}`
    );
}

main();
