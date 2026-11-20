// Leonida Legend — GTA VI trophy checklist and guide (offline, no build step).
// Earned trophies and the spoiler setting live in localStorage; nothing leaves the browser.
const EARNED_STORE = 'leonida-legend/r2-earned';
const SPOILER_STORE = 'leonida-legend/r2-spoilers';

const $ = (id) => document.getElementById(id);
const els = {
  cards: $('cards'), barFill: $('barFill'), barText: $('barText'), tierCounts: $('tierCounts'),
  statusLine: $('statusLine'), empty: $('empty'), q: $('q'), gradeSel: $('gradeSel'),
  kindBar: $('kindBar'), spoilerBox: $('spoilerBox'), note: $('note'),
  warnBanner: $('warnBanner'), warnText: $('warnText'), stageList: $('stageList'),
};

const query = new URLSearchParams(location.search);
const state = {
  earned: readEarned(),
  hideSpoilers: readSpoiler(),
  kind: query.get('kind') ?? 'all',
  tier: query.get('grade') ?? 'all',
  text: query.get('q') ?? '',
  open: query.get('open') ? Number(query.get('open')) : null,
};

const doc = await (await fetch('data/trophies.json')).json();
const items = doc.trophies;
const byNum = new Map(items.map((t) => [t.num, t]));
const risky = items.find((t) => t.missable);

function readEarned() {
  try {
    const raw = JSON.parse(localStorage.getItem(EARNED_STORE) ?? '[]');
    return new Set(Array.isArray(raw) ? raw.filter((n) => Number.isInteger(n)) : []);
  } catch {
    return new Set();
  }
}

function readSpoiler() {
  if (query.get('spoiler') === 'on') return true;
  if (query.get('spoiler') === 'off') return false;
  return localStorage.getItem(SPOILER_STORE) === '1';
}

function storeEarned() {
  localStorage.setItem(EARNED_STORE, JSON.stringify([...state.earned].sort((a, b) => a - b)));
}

function storeSpoiler() {
  localStorage.setItem(SPOILER_STORE, state.hideSpoilers ? '1' : '0');
}

function escapeHtml(s) {
  return s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

function masked(t) {
  return state.hideSpoilers && t.secret && !state.earned.has(t.num);
}

function cap(word) {
  return word[0].toUpperCase() + word.slice(1);
}

function kindWord(k) {
  return { story: 'Story', missable: 'Missable', collectibles: 'Collectibles', activities: 'Activities', online: 'Online' }[k] ?? k;
}

function paintMeter() {
  const total = items.length;
  const done = state.earned.size;
  els.barFill.style.width = `${(done / total) * 100}%`;
  els.barText.textContent = `${done} of ${total} earned — ${Math.round((done / total) * 100)}% to the platinum`;
  els.tierCounts.textContent = ['platinum', 'gold', 'silver', 'bronze']
    .map((g) => `${cap(g)} ${items.filter((t) => t.tier === g && state.earned.has(t.num)).length}/${items.filter((t) => t.tier === g).length}`)
    .join(' · ');
  if (risky) {
    if (state.earned.has(risky.num)) {
      els.warnBanner.classList.add('done');
      els.warnText.textContent = 'Positive Mental Attitude is earned — the Chapter 1 meditation is done. No other trophy can be missed.';
    } else {
      els.warnBanner.classList.remove('done');
    }
  }
}

function visible(t) {
  if (state.kind === 'missable' && !t.missable) return false;
  if (state.kind === 'online') return false; // all 55 trophies are offline single-player
  if (state.kind !== 'all' && state.kind !== 'missable' && !t.tags.includes(state.kind)) return false;
  if (state.tier !== 'all' && t.tier !== state.tier) return false;
  if (state.text) {
    const hay = `${t.title} ${t.blurb} ${t.howto}`.toLowerCase();
    if (!hay.includes(state.text.toLowerCase())) return false;
  }
  return true;
}

function cardHtml(t) {
  const got = state.earned.has(t.num);
  const hide = masked(t);
  const pills = [`<span class="pill ${t.tier}">${cap(t.tier)}</span>`];
  if (t.secret) pills.push('<span class="pill secret-pill">Secret on PS5</span>');
  if (t.missable) pills.push('<span class="pill risky">Possibly missable</span>');
  for (const k of t.tags) {
    if (k === 'missable') continue;
    pills.push(`<span class="pill">${kindWord(k)}</span>`);
  }
  if (got) pills.push('<span class="pill got-pill">Earned ✓</span>');

  let detail = '';
  if (state.open === t.num) {
    if (hide) {
      detail = `<div class="howto"><p class="masked">This trophy is secret on PlayStation until earned, so its how-to stays masked too. Switch the spoiler setting off — or earn it — to read the how-to.</p></div>`;
    } else {
      const warn = t.missable
        ? `<p>Missable warning: the Chapter 1 meditation at Jason\u2019s house disappears after Chapter 1, and it is still unconfirmed whether it counts toward this trophy. Do it during the story to be safe.</p>`
        : '';
      const refs = t.refs.map((r) => `<li><a href="${escapeHtml(r.href)}" target="_blank" rel="noopener">${escapeHtml(r.label)}</a></li>`).join('');
      detail = `<div class="howto"><h3>How to get it</h3><p>${escapeHtml(t.howto)}</p>${warn}<p>Route: Phase ${t.phase} of 4.</p><h3>Sources</h3><ul class="refs">${refs}</ul></div>`;
    }
  }

  return `<article class="card${got ? ' got' : ''}" id="trophy-${t.num}">
    <div class="card-top">
      <input type="checkbox" class="card-check" data-num="${t.num}" ${got ? 'checked' : ''} aria-label="Mark ${escapeHtml(t.title)} as earned">
      <div class="card-body">
        <p class="card-name">${hide ? 'Secret trophy' : escapeHtml(t.title)}</p>
        <p class="card-blurb">${hide ? 'Secret until earned — tick it off to reveal its name and description.' : escapeHtml(t.blurb)}</p>
        <div class="pills">${pills.join('')}</div>
        <button type="button" class="howto-btn" data-open="${t.num}">${state.open === t.num ? 'Hide how-to ▲' : 'Show how-to ▼'}</button>
        ${detail}
      </div>
    </div>
  </article>`;
}

function paintList() {
  const shown = items.filter(visible);
  els.cards.innerHTML = shown.map(cardHtml).join('');
  els.empty.hidden = shown.length > 0;
  if (state.kind === 'online') {
    els.statusLine.textContent = 'Online: 0 trophies. All 55 GTA VI trophies are offline single-player — there is nothing to track here.';
  } else {
    els.statusLine.textContent = `Showing ${shown.length} of ${items.length} trophies` +
      (state.kind !== 'all' ? ` · kind: ${kindWord(state.kind)}` : '') +
      (state.tier !== 'all' ? ` · tier: ${cap(state.tier)}` : '') +
      (state.text ? ` · search: “${state.text}”` : '') +
      (state.hideSpoilers ? ' · spoilers hidden' : '');
  }
}

function paintPhases() {
  els.stageList.innerHTML = doc.phases.map((p) => {
    const links = p.covers.map((num) => {
      const t = byNum.get(num);
      return t ? `<a href="#trophy-${num}" data-jump="${num}">${escapeHtml(t.title)} (${cap(t.tier)})</a>` : '';
    }).join('');
    return `<article class="phase"><span class="phase-kicker">Phase ${p.n}</span><h3>${escapeHtml(p.name)}</h3><p class="eta">${escapeHtml(p.eta)}</p><p>${escapeHtml(p.blurb)}</p><div class="phase-links">${links}</div></article>`;
  }).join('');
}

function paintAll() {
  paintMeter();
  paintList();
  paintPhases();
}

function goPane(pane) {
  $('tabList').classList.toggle('on', pane === 'list');
  $('tabPlan').classList.toggle('on', pane === 'plan');
  $('paneList').hidden = pane !== 'list';
  $('panePlan').hidden = pane !== 'plan';
}

function doExport() {
  const payload = {
    title: 'Leonida Legend',
    game: 'Grand Theft Auto VI',
    platform: 'PlayStation 5',
    exported: new Date().toISOString(),
    earned_names: [...state.earned].sort((a, b) => a - b).map((num) => byNum.get(num)?.title ?? num),
    earned_nums: [...state.earned].sort((a, b) => a - b),
  };
  const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'leonida-legend-progress.json';
  a.click();
  URL.revokeObjectURL(url);
  els.note.textContent = `Exported ${state.earned.size} earned trophies to leonida-legend-progress.json.`;
}

async function doImport(file) {
  els.note.textContent = '';
  try {
    const payload = JSON.parse(await file.text());
    const nums = payload.earned_nums ?? (payload.earned_names ?? []).map((name) => items.find((t) => t.title === name)?.num).filter(Boolean);
    const valid = [...new Set(nums)].filter((num) => byNum.has(num));
    if (!valid.length && (payload.earned_nums || payload.earned_names)) {
      els.note.textContent = 'That file holds no trophy names or numbers this guide recognises — nothing was imported.';
      return;
    }
    state.earned = new Set(valid);
    storeEarned();
    paintAll();
    els.note.textContent = `Imported ${valid.length} earned trophies from ${file.name}.`;
  } catch {
    els.note.textContent = 'Could not read that file as progress JSON — nothing was imported.';
  }
}

els.cards.addEventListener('change', (event) => {
  const box = event.target.closest('[data-num]');
  if (!box) return;
  const num = Number(box.dataset.num);
  if (box.checked) state.earned.add(num);
  else state.earned.delete(num);
  storeEarned();
  paintAll();
});
els.cards.addEventListener('click', (event) => {
  const btn = event.target.closest('[data-open]');
  if (!btn) return;
  const num = Number(btn.dataset.open);
  state.open = state.open === num ? null : num;
  paintAll();
});
els.stageList.addEventListener('click', (event) => {
  const link = event.target.closest('[data-jump]');
  if (!link) return;
  event.preventDefault();
  state.open = Number(link.dataset.jump);
  goPane('list');
  paintAll();
  $(`trophy-${state.open}`)?.scrollIntoView({ block: 'center' });
});
$('tabList').addEventListener('click', () => goPane('list'));
$('tabPlan').addEventListener('click', () => goPane('plan'));
$('exportBtn').addEventListener('click', doExport);
$('importInput').addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (file) doImport(file);
  event.target.value = '';
});
$('clearBtn').addEventListener('click', () => {
  state.earned = new Set();
  storeEarned();
  paintAll();
  els.note.textContent = 'Progress reset — 0 of 55 earned.';
});
els.q.addEventListener('input', () => {
  state.text = els.q.value;
  paintList();
});
els.gradeSel.addEventListener('change', () => {
  state.tier = els.gradeSel.value;
  paintList();
});
els.kindBar.addEventListener('click', (event) => {
  const button = event.target.closest('[data-kind]');
  if (!button) return;
  state.kind = button.dataset.kind;
  for (const b of els.kindBar.querySelectorAll('[data-kind]')) b.classList.toggle('on', b === button);
  paintList();
});
els.spoilerBox.addEventListener('change', () => {
  state.hideSpoilers = els.spoilerBox.checked;
  storeSpoiler();
  paintAll();
});

// Restore the controls from the URL and saved settings, then render.
els.q.value = state.text;
els.gradeSel.value = state.tier;
for (const b of els.kindBar.querySelectorAll('[data-kind]')) b.classList.toggle('on', b.dataset.kind === state.kind);
els.spoilerBox.checked = state.hideSpoilers;
if (query.get('view') === 'roadmap') goPane('plan');
paintAll();
if (state.open && byNum.has(state.open)) {
  $(`trophy-${state.open}`)?.scrollIntoView({ block: 'center' });
}
