// Click builds and slide transitions for an exported PPTX. pptxgenjs has no
// animation API, so this rewrites the slide XML inside the finished zip:
// a node with "step": N (N >= 1) stays hidden until the Nth click and then
// enters with its "fx" ("fade" or "wipe"). Shapes are matched to nodes by draw
// order, which exportPptx keeps.
// It also cuts image alt text down to the file name: pptxgenjs writes each
// image's absolute local path there, which would leak the author's folders.
import JSZip from 'jszip';

const FX = {
  fade: { preset: 10, subtype: 0, filter: 'fade', dur: 500 },
  wipe: { preset: 22, subtype: 8, filter: 'wipe(left)', dur: 400 },
};
const TRANSITIONS = {
  dissolve: '<p:transition spd="fast"><p:dissolve/></p:transition>',
  fade: '<p:transition spd="med"><p:fade/></p:transition>',
  push: '<p:transition spd="fast"><p:push dir="l"/></p:transition>',
};

export function timingXml(clicks, buildIds) {
  let id = 2;
  const next = () => ++id;
  const seq = clicks.map(group => {
    const effects = group.map(({ spid, fx }, j) => {
      const f = FX[fx] ?? FX.fade;
      const delay = fx === 'wipe' ? j * 30 : 0;      // a row of blocks fills left to right
      const kind = j === 0 ? 'clickEffect' : 'withEffect';
      return `<p:par><p:cTn id="${next()}" presetID="${f.preset}" presetClass="entr" presetSubtype="${f.subtype}" fill="hold" grpId="0" nodeType="${kind}">`
        + `<p:stCondLst><p:cond delay="${delay}"/></p:stCondLst><p:childTnLst>`
        + `<p:set><p:cBhvr><p:cTn id="${next()}" dur="1" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst></p:cTn>`
        + `<p:tgtEl><p:spTgt spid="${spid}"/></p:tgtEl><p:attrNameLst><p:attrName>style.visibility</p:attrName></p:attrNameLst></p:cBhvr>`
        + `<p:to><p:strVal val="visible"/></p:to></p:set>`
        + `<p:animEffect transition="in" filter="${f.filter}"><p:cBhvr><p:cTn id="${next()}" dur="${f.dur}"/>`
        + `<p:tgtEl><p:spTgt spid="${spid}"/></p:tgtEl></p:cBhvr></p:animEffect>`
        + `</p:childTnLst></p:cTn></p:par>`;
    }).join('');
    const a = next(), b = next();
    return `<p:par><p:cTn id="${a}" fill="hold"><p:stCondLst><p:cond delay="indefinite"/></p:stCondLst><p:childTnLst>`
      + `<p:par><p:cTn id="${b}" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst><p:childTnLst>`
      + effects + `</p:childTnLst></p:cTn></p:par></p:childTnLst></p:cTn></p:par>`;
  }).join('');
  const bld = buildIds.map(s => `<p:bldP spid="${s}" grpId="0" animBg="1"/>`).join('');
  return '<p:timing><p:tnLst><p:par><p:cTn id="1" dur="indefinite" restart="never" nodeType="tmRoot"><p:childTnLst>'
    + '<p:seq concurrent="1" nextAc="seek"><p:cTn id="2" dur="indefinite" nodeType="mainSeq"><p:childTnLst>'
    + seq
    + '</p:childTnLst></p:cTn><p:prevCondLst><p:cond evt="onPrev" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:prevCondLst>'
    + '<p:nextCondLst><p:cond evt="onNext" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:nextCondLst></p:seq>'
    + '</p:childTnLst></p:cTn></p:par></p:tnLst>'
    + (bld ? `<p:bldLst>${bld}</p:bldLst>` : '') + '</p:timing>';
}

/** Clicks a page needs: the highest "step" among its visible nodes. */
export const pageClicks = page => Math.max(0, ...page.nodes.filter(n => n.visible !== false).map(n => n.step ?? 0));

/** @returns {Promise<{buffer: Buffer, report: {slide:number, clicks:number, animated:number}[]}>} */
export async function animatePptx(buffer, deck) {
  const zip = await JSZip.loadAsync(buffer);
  const transition = TRANSITIONS[deck.transition ?? 'none'] ?? '';
  const report = [];
  for (let i = 0; i < deck.pages.length; i++) {
    const name = `ppt/slides/slide${i + 1}.xml`;
    const file = zip.file(name);
    if (!file) throw new Error(`${name} missing from the exported deck`);
    let xml = await file.async('string');
    const nodes = deck.pages[i].nodes.filter(n => n.visible !== false);
    const clicks = pageClicks(deck.pages[i]);
    let add = transition;
    if (clicks) {
      const tree = xml.split('<p:spTree>')[1]?.split('</p:spTree>')[0] ?? '';
      const shapes = [...tree.matchAll(/<(p:sp|p:pic|p:cxnSp)>[\s\S]*?<p:cNvPr id="(\d+)"/g)].map(m => ({ tag: m[1], spid: m[2] }));
      if (shapes.length !== nodes.length) throw new Error(`slide ${i + 1}: ${shapes.length} shapes for ${nodes.length} nodes; cannot place the click builds`);
      const groups = [];
      const buildIds = [];
      nodes.forEach((n, k) => {
        if (!n.step) return;
        (groups[n.step - 1] ??= []).push({ spid: shapes[k].spid, fx: n.fx ?? 'fade' });
        if (shapes[k].tag === 'p:sp') buildIds.push(shapes[k].spid);
      });
      for (let k = 0; k < clicks; k++) if (!groups[k]) throw new Error(`slide ${i + 1}: no node has "step": ${k + 1}, but a later step exists`);
      add += timingXml(groups, buildIds);
    }
    if (add) {
      let done = false;
      xml = xml.replace(/<p:clrMapOvr>[\s\S]*?<\/p:clrMapOvr>|<p:clrMapOvr\/>/, m => { done = true; return m + add; });
      if (!done) xml = xml.replace('</p:cSld>', m => { done = true; return m + add; });
      if (!done) throw new Error(`slide ${i + 1}: no place to insert the timing`);
    }
    xml = xml.replace(/descr="[^"]*[\\/]([^"\\/]+)"/g, 'descr="$1"');
    zip.file(name, xml);
    report.push({ slide: i + 1, clicks, animated: nodes.filter(n => n.step).length });
  }
  return { buffer: await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }), report };
}
