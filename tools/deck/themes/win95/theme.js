/* Windows 95 look: desktop icons, taskbar, a zoom rectangle that opens each
   window, a BIOS-style boot. Reads DECK.chrome:
   {desktop:[{icon,label}], start:{icon,label}, tray:{icon}, boot:[lines]} */
(function(){
const C = DECK.chrome || {}, I = DECK.icons, byId = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
byId('desk').innerHTML = (C.desktop || []).map(d => `<div><img class="px" src="${I[d.icon] || ''}" alt="">${esc(d.label)}</div>`).join('');
const setIcon = (id, name) => { const el = byId(id); if (I[name]) el.src = I[name]; else el.style.display = 'none'; };
setIcon('starticon', C.start?.icon); byId('startname').textContent = C.start?.label || 'Start';
setIcon('trayicon', C.tray?.icon);
window.DeckTheme = {
  ease: n => `steps(${n}, end)`,
  onSlide(s){
    byId('taskname').textContent = s.dataset.task || '';
    const t = byId('taskicon'); if (I[s.dataset.icon]) { t.src = I[s.dataset.icon]; t.style.display = ''; } else t.style.display = 'none';
    byId('startbtn').classList.toggle('pressed', !!s.dataset.startpressed);
    byId('desk').style.visibility = s.dataset.nodesk ? 'hidden' : '';
  },
  open(s, done, api){
    const w = s.querySelector('.win'), z = byId('zoom'); if (!w) return done();
    const to = {l: w.offsetLeft, t: w.offsetTop, w: w.offsetWidth, h: w.offsetHeight};
    z.style.display = 'block';
    const a = z.animate([{left:'4px',top:'1026px',width:'120px',height:'44px'},{left:to.l+'px',top:to.t+'px',width:to.w+'px',height:to.h+'px'}], {duration:300, easing:api.ease(6), fill:'forwards'});
    const fin = () => { a.cancel(); z.style.display = 'none'; };
    api.later(320, () => { fin(); done(); });
    return fin;
  },
  boot: !(C.boot || []).length ? undefined : function(then, api){
    const b = byId('boot');
    b.innerHTML = C.boot.map(l => `<div class="l">${esc(l)}</div>`).join('') + `<div class="bar">${'<i></i>'.repeat(20)}</div><div class="skip">${esc(C.bootSkip || '')}</div>`;
    b.style.display = 'block';
    const ls = [...b.querySelectorAll('.l')], bars = [...b.querySelectorAll('.bar i')];
    ls.forEach((l, i) => api.later(200 + i*330, () => l.classList.add('v')));
    const t0 = 200 + ls.length*330 - 350;
    bars.forEach((x, i) => api.later(t0 + i*60, () => x.classList.add('v')));
    api.later(t0 + 1400, then);
    return () => { b.style.display = 'none'; };
  },
};
})();
