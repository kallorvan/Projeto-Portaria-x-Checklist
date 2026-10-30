// Fotos enviadas pelo celular (app OneDrive) para fotos-entrada/<Portaria>/ e vinculadas no painel.
// Script clássico; as funções puras são testadas no Node.
(function (root) {
  'use strict';

  const MAX_LADO = 1600;
  const QUALIDADE = 0.85;
  const DIAS_ESQUECIDA = 7;

  const limpar = (s) => String(s).replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-|-$/g, '');
  const nomeDestino = ({ alvo, ponto, n }) => `${limpar(alvo)}_${limpar(ponto)}_${n}.jpg`;

  function pastaDestino(portariaPasta, em) {
    const d = new Date(em);
    return ['fotos', portariaPasta, `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`];
  }

  const esquecidas = (lista, agora, dias = DIAS_ESQUECIDA) => lista.filter(f => agora - new Date(f.modificado) > dias * 86400000);
  const ehImagem = (nome) => /\.(jpe?g|png|heic|heif|webp)$/i.test(nome);
  const ehHeic = (nome) => /\.(heic|heif)$/i.test(nome);

  // Reduz para no máximo 1600 px no maior lado e devolve JPEG (só navegador).
  async function reduzir(file, max = MAX_LADO, qualidade = QUALIDADE) {
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    bmp.close && bmp.close();
    return new Promise((ok, ko) => c.toBlob(b => (b ? ok(b) : ko(new Error('falha ao converter a foto'))), 'image/jpeg', qualidade));
  }

  const api = { MAX_LADO, DIAS_ESQUECIDA, nomeDestino, pastaDestino, esquecidas, ehImagem, ehHeic, reduzir };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Fotos = api;
})(typeof window !== 'undefined' ? window : globalThis);
