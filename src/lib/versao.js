// Aviso de atualização só aponta para Releases do próprio repositório, com tag vX.Y.Z.
const RELEASES = 'https://github.com/breviistransportes/Sitra_automacao/releases/';
export function linkAtualizacaoValido(tag, url) {
  return /^v\d+\.\d+\.\d+$/.test(String(tag ?? '')) && String(url ?? '').startsWith(RELEASES);
}

// true se `nova` (ex.: "v0.3.0", tag do GitHub) for maior que `atual` (versão do manifest).
export function versaoMaior(nova, atual) {
  const partes = (v) => String(v ?? '').replace(/^v/i, '').split('.').map(Number);
  const a = partes(nova), b = partes(atual);
  if (a.some(Number.isNaN) || b.some(Number.isNaN)) return false;
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] ?? 0, y = b[i] ?? 0;
    if (x !== y) return x > y;
  }
  return false;
}
