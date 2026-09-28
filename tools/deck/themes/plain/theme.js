/* Neutral look: a slide fades up when it opens; no boot screen. */
document.getElementById('decktitle').textContent = DECK.title;
window.DeckTheme = {
  open(s, done){
    const a = s.animate([{opacity:0, transform:'translateY(24px)'},{opacity:1, transform:'none'}], {duration:280, easing:'cubic-bezier(.2,.8,.2,1)'});
    done();
    return () => a.finish();
  },
};
