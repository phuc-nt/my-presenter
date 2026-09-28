/* Deck engine. Globals set by the build before this script:
   DECK = {title, notes:[{title, say}], icons:{name: dataURI}, chrome:{…}, mark:"[bấm]"}
   DeckTheme = {ease(n), onSlide(el,i,n), open(el,done,api), boot(then,api)}   (all optional)
   DeckHooks = {name(el, instant, api) -> finaliser | undefined}                (deck-specific) */
(function(){
const stage = document.getElementById('stage');
const slides = [...document.querySelectorAll('#stage > .slide')];
const T = window.DeckTheme || {};
const NOTES = DECK.notes, ICONS = DECK.icons, MARK = DECK.mark || '[bấm]';
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const orig = slides.map(s => s.innerHTML);
const nSteps = slides.map(s => Math.max(0, ...[...s.querySelectorAll('[data-step]')].map(e => +e.dataset.step)));
let cur = -1, step = 0, timers = [], pending = [], booting = null;
const byId = id => document.getElementById(id);

function fit(){ const s = Math.min(innerWidth/1920, innerHeight/1080); stage.style.transform = `translate(-50%,-50%) scale(${s})`; stage._s = s; }
addEventListener('resize', fit); fit();

const later = (ms, fn) => { const t = setTimeout(fn, ms); timers.push(t); return t; };
function settle(){ timers.forEach(clearTimeout); timers = []; const p = pending; pending = []; p.forEach(f => { try { f(); } catch(e){} }); }

const ST = T.ease || (() => 'cubic-bezier(.2,.8,.2,1)');
const anim = (el, kf, dur, n) => { const a = el.animate(kf, {duration: dur, easing: ST(n), fill: 'backwards'}); return () => a.finish(); };
const fmt = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, DECK.thousands ?? '.');
function blocks(el){ if (!el._b){ if (!el.children.length) for (let i = 0; i < +(el.dataset.n || 10); i++) el.appendChild(document.createElement('i')); el._b = [...el.children]; } return el._b; }
const RUN = {
  pop: el => anim(el, [{transform:'scale(.5)',opacity:0},{transform:'scale(1.06)',opacity:1,offset:.75},{transform:'scale(1)',opacity:1}], 300, 5),
  drop: el => anim(el, [{transform:'translateY(-60px)',opacity:0},{transform:'translateY(0)',opacity:1}], 280, 4),
  rise: el => anim(el, [{transform:'translateY(100%)'},{transform:'translateY(0)'}], 360, 6),
  fade: el => anim(el, [{opacity:0},{opacity:1}], 400, 4),
  wipe: el => anim(el, [{clipPath:'inset(0 100% 0 0)'},{clipPath:'inset(0 0 0 0)'}], 500, 10),
  press: el => { const f = RUN.pop(el); later(420, () => el.classList.add('pressed')); later(620, () => el.classList.remove('pressed')); return () => { f(); el.classList.remove('pressed'); }; },
  type: el => { const full = el.dataset.full ??= el.textContent; const sp = +(el.dataset.speed || 60); el.textContent = '';
    [...full].forEach((c, i) => later(i*sp, () => el.textContent += c)); return () => el.textContent = full; },
  count: el => { const to = +el.dataset.to, suf = el.dataset.suffix || '', n = 14;
    for (let i = 0; i <= n; i++) later(i*70, () => el.textContent = fmt(Math.round(to*i/n)) + suf); return () => el.textContent = fmt(to) + suf; },
  words: el => { const w = [...el.children]; w.forEach((s, i) => later(i*220, () => s.classList.add('v'))); return () => w.forEach(s => s.classList.add('v')); },
  blocks: el => { const b = blocks(el); b.forEach((x, i) => later(i*60, () => x.classList.add('v'))); return () => b.forEach(x => x.classList.add('v')); },
  flash: el => { later(+el.dataset.dur || 1000, () => el.classList.remove('on')); return () => el.classList.remove('on'); },
};
const FINAL = {
  type: el => { el.textContent = el.dataset.full ??= el.textContent; },
  count: el => { el.textContent = fmt(+el.dataset.to) + (el.dataset.suffix || ''); },
  words: el => [...el.children].forEach(s => s.classList.add('v')),
  blocks: el => blocks(el).forEach(x => x.classList.add('v')),
  flash: el => el.classList.remove('on'),
};

/* hooks: small scripted moments; hook(el, instant, api) returns a finaliser */
const $ = sel => slides[cur].querySelector(sel);
const api = { later, $, ease: ST, reducedMotion: RM, stage, icons: ICONS, cursorClick };
const HOOK = {
  /* the pointer travels to data-target and presses it */
  click(el, instant){ const t = $(el.dataset.target); if (!t || instant || RM) return; return cursorClick(t); },
  /* presses each child in turn, ends on the first */
  chips(el, instant){ const b = [...el.children]; const set = i => b.forEach((x, j) => x.classList.toggle('pressed', i === j));
    if (instant || RM) return set(0); set(0); b.forEach((_, i) => later(700*(i+1), () => set((i+1) % b.length))); return () => set(0); },
  /* moves class "sel" down the children of data-list (default: the element) to index data-to */
  select(el, instant){ const it = [...(el.dataset.list ? el.querySelectorAll(el.dataset.list) : el.children)]; const to = +(el.dataset.to || it.length - 1);
    const set = i => it.forEach((x, j) => x.classList.toggle('sel', i === j));
    if (instant || RM) return set(to); for (let i = 1; i <= to; i++) later(450 + (i-1)*380, () => set(i)); return () => set(to); },
  /* adds data-class to data-target after data-wait ms */
  class(el, instant){ const t = $(el.dataset.target); if (!t) return; const end = () => t.classList.add(el.dataset.class);
    if (instant || RM) return end(); later(+(el.dataset.wait || 0), end); return end; },
  ...(window.DeckHooks || {}),
};

const cursor = byId('cursor');
function rel(t){ const r = t.getBoundingClientRect(), s = stage.getBoundingClientRect(), k = stage._s; return {x: (r.left - s.left)/k + r.width/k*0.55, y: (r.top - s.top)/k + r.height/k*0.55}; }
function cursorClick(t){
  const press = () => { later(560, () => t.classList.add('pressed')); later(760, () => t.classList.remove('pressed')); };
  if (!cursor){ press(); return () => t.classList.remove('pressed'); }
  const p = rel(t); cursor.style.display = 'block';
  const from = {x: Math.min(1860, p.x + 260), y: Math.min(1000, p.y + 200)};
  const a = cursor.animate([{transform:`translate(${from.x}px,${from.y}px)`},{transform:`translate(${p.x}px,${p.y}px)`}], {duration:520, easing:ST(8), fill:'forwards'});
  press(); later(1500, () => cursor.style.display = 'none');
  return () => { a.cancel(); cursor.style.display = 'none'; t.classList.remove('pressed'); };
}

function runHook(el, instant){ const h = HOOK[el.dataset.hook]; if (!h) return; const f = h(el, instant, api); if (typeof f === 'function') pending.push(f); }
function reveal(el, instant){
  const fx = el.dataset.fx || (el.dataset.hook ? '' : 'pop');
  const go = () => {
    el.classList.add('on');
    if (instant || RM){ FINAL[fx]?.(el); if (fx === 'flash') el.classList.remove('on'); }
    else if (RUN[fx]) pending.push(RUN[fx](el));
    if (el.dataset.hook) runHook(el, instant || RM);
  };
  const d = +(el.dataset.delay || 0);
  if (instant || RM || !d) go();
  else { later(d, go); pending.push(() => { if (!el.classList.contains('on') && fx !== 'flash') { el.classList.add('on'); FINAL[fx]?.(el); if (el.dataset.hook) HOOK[el.dataset.hook]?.(el, true, api); } }); }
}
const stepEls = k => [...slides[cur].querySelectorAll(`[data-step="${k}"]`)];

function setSlide(i){
  if (cur >= 0) slides[cur].classList.remove('cur', 'opening');
  cur = i; const s = slides[i];
  s.innerHTML = orig[i];
  s.classList.add('cur');
  const pg = byId('pg'); if (pg) pg.textContent = `${i+1} / ${slides.length}`;
  T.onSlide?.(s, i, slides.length, api);
}
function go(i, k, animate){
  settle(); if (cursor) cursor.style.display = 'none';
  i = Math.max(0, Math.min(slides.length - 1, i)); k = Math.max(0, Math.min(nSteps[i], k));
  const newSlide = i !== cur;
  if (newSlide || k < step || !animate){
    setSlide(i);
    const rest = () => {
      stepEls(0).forEach(e => reveal(e, !animate));
      for (let j = 1; j <= k; j++) stepEls(j).forEach(e => reveal(e, true));
    };
    if (newSlide && animate && !RM && T.open){
      let once = false; const s = slides[cur];
      s.classList.add('opening');
      const end = () => { if (once) return; once = true; s.classList.remove('opening'); rest(); };
      const stop = T.open(s, end, api);
      pending.push(() => { if (typeof stop === 'function') stop(); end(); });
    } else rest();
  } else {
    for (let j = step + 1; j <= k; j++) stepEls(j).forEach(e => reveal(e, j < k));
  }
  step = k;
  slides[cur].querySelectorAll('[data-until]').forEach(e => e.classList.toggle('gone', k >= +e.dataset.until));
  try { history.replaceState(null, '', `#${i+1}${k ? '.' + k : ''}`); } catch(e){}
  renderNotes(); markGrid();
  const bar = byId('progress'); if (bar) bar.style.width = `${(i + (nSteps[i] ? k/nSteps[i] : 1)) / slides.length * 100}%`;
}
const next = () => step < nSteps[cur] ? go(cur, step + 1, true) : cur < slides.length - 1 && go(cur + 1, 0, true);
const prev = () => step > 0 ? go(cur, step - 1, false) : cur > 0 && go(cur - 1, nSteps[cur - 1], false);

const esc = s => s.replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
const markRe = new RegExp(MARK.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
function renderNotes(){
  const n = NOTES[cur] || {title: '', say: ''}; let m = 0;
  byId('ntitle').textContent = `${cur+1}. ${n.title}`;
  byId('nstep').textContent = `${step} / ${nSteps[cur]}`;
  byId('nbody').innerHTML = esc(n.say).replace(markRe, () => { m++; return `<mark class="${m <= step ? 'done' : m === step + 1 ? 'next' : ''}">${esc(MARK)}</mark>`; }).replace(/\n/g, '<br>');
  byId('nnext').textContent = cur < slides.length - 1 ? `→ ${NOTES[cur+1]?.title ?? ''}` : '■';
  document.querySelector('#nbody mark.next')?.scrollIntoView({block: 'nearest'});
}
const gb = byId('gridbody');
slides.forEach((s, i) => { const b = document.createElement('button'); const ic = ICONS[s.dataset.icon];
  b.innerHTML = `${ic ? `<img class="px" src="${ic}" alt="">` : ''}<b>${i+1}</b>${esc(NOTES[i]?.title ?? s.dataset.task ?? '')}`;
  b.onclick = e => { e.stopPropagation(); toggle('grid', false); go(i, 0, true); }; gb.appendChild(b); });
function markGrid(){ [...gb.children].forEach((b, i) => b.classList.toggle('cur', i === cur)); }
function toggle(id, on){ const el = byId(id); el.classList.toggle('show', on ?? !el.classList.contains('show')); }
document.querySelectorAll('[data-close]').forEach(x => x.onclick = e => { e.stopPropagation(); x.closest('.ov').classList.remove('show'); });
document.querySelectorAll('.ov').forEach(o => o.addEventListener('click', e => e.stopPropagation()));
setTimeout(() => byId('hint')?.classList.add('gone'), 5000);

addEventListener('keydown', e => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (booting){ booting(); e.preventDefault(); return; }
  const k = e.key;
  if (['ArrowRight','ArrowDown',' ','PageDown','Enter'].includes(k)) { e.preventDefault(); next(); }
  else if (['ArrowLeft','ArrowUp','PageUp','Backspace'].includes(k)) { e.preventDefault(); prev(); }
  else if (k === 'Home') go(0, 0, true);
  else if (k === 'End') go(slides.length - 1, nSteps[slides.length - 1], false);
  else if (k === 'n' || k === 'N') toggle('notes');
  else if (k === 'g' || k === 'G' || k === 'o' || k === 'O') toggle('grid');
  else if (k === '?' || k === 'h' || k === 'H') toggle('help');
  else if (k === 'f' || k === 'F') { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.(); }
  else if (k === 'Escape') ['notes','grid','help'].forEach(id => toggle(id, false));
});
document.addEventListener('click', e => { if (booting) return booting(); if (e.target.closest('.ov')) return; next(); });
let tx = null;
addEventListener('touchstart', e => tx = e.touches[0].clientX, {passive: true});
addEventListener('touchend', e => { if (tx == null) return; const dx = e.changedTouches[0].clientX - tx; tx = null; if (Math.abs(dx) > 50) { dx < 0 ? next() : prev(); } }, {passive: true});

window.__deck = { go, next, prev, nSteps, state: () => ({slide: cur + 1, step}) };
const m = location.hash.match(/^#(\d+)(?:\.(\d+))?/);
const si = m ? +m[1] - 1 : 0, sk = m && m[2] ? +m[2] : 0;
if (si === 0 && sk === 0 && !RM && T.boot && !/noboot/.test(location.search)){
  let stop;
  const start = () => { if (!booting) return; booting = null; settle(); if (typeof stop === 'function') stop(); go(0, 0, true); };
  booting = start; stop = T.boot(start, api);
} else go(si, sk, false);
})();
