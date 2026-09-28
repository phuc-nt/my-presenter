// What a built deck must not contain: anything that would make the browser
// reach out, and anything that names the author's machine.
const RULES = [
  [/(?:src|srcset|href|action|formaction|poster|data|ping|background|cite|manifest|codebase|longdesc)\s*=\s*["']?\s*(?:https?:)?\/\//i, 'a tag loads or links to a network address'],
  [/<meta[^>]+http-equiv\s*=\s*["']?refresh/i, 'a meta refresh'],
  [/<base\b/i, 'a <base> tag'],
  [/url\(\s*["']?\s*(?:https?:)?\/\//i, 'CSS loads a network address'],
  [/@import\b/i, 'CSS @import'],
  [/\bfetch\s*\(|\bnew\s+(?:XMLHttpRequest|WebSocket|EventSource|Worker|SharedWorker)\b|\bsendBeacon\b|\bimportScripts\b|\bimport\s*\(|\bRTCPeerConnection\b/, 'script API that talks to the network'],
  [/\bwindow\.open\s*\(|\blocation\s*(?:\.href\s*)?=(?!=)|\blocation\.(?:assign|replace)\s*\(/, 'script that navigates away from the deck'],
  [/<(?:iframe|object|embed|link)\b/i, 'tag that loads another document'],
  [/\bfile:\/\//i, 'file:// address'],
  [/\/(?:Users|home)\/[A-Za-z0-9._-]+\//, 'a home folder path'],
  [/[A-Za-z]:\\Users\\/, 'a home folder path'],
  [/\b(?:AIza[0-9A-Za-z_-]{30,}|sk-[A-Za-z0-9_-]{20,}|gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{20,}|AKIA[0-9A-Z]{16}|xox[abprs]-[A-Za-z0-9-]{10,})\b|-----BEGIN [A-Z ]*PRIVATE KEY-----/, 'something shaped like an API key or private key'],
];
export const CSP = "default-src 'none'; img-src data:; font-src data:; media-src data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; base-uri 'none'; form-action 'none'";

export function checkHtml(html, { forbid = [] } = {}) {
  // data: URIs are base64 and can match anything by chance; look at the rest
  const text = html.replace(/data:[a-z0-9.+-]+\/[a-z0-9.+-]+;base64,[A-Za-z0-9+/=]+/gi, 'data:…');
  const findings = [];
  for (const [re, what] of RULES) {
    const m = re.exec(text);
    if (m) findings.push(`${what}: …${text.slice(Math.max(0, m.index - 30), m.index + 50).replace(/\s+/g, ' ')}…`);
  }
  for (const word of forbid) if (word && text.toLowerCase().includes(String(word).toLowerCase())) findings.push(`forbidden text "${word}"`);
  if (!text.includes('Content-Security-Policy')) findings.push('no Content-Security-Policy tag');
  return findings;
}
