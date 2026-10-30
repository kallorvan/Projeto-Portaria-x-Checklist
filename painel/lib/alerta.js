// Alerta da vistoria 17 pontos: arquivo em alertas/ lido pelo fluxo do Power Automate.
// Script clássico; carregável no Node para testes.
(function (root) {
  'use strict';

  const R = (typeof module !== 'undefined' && module.exports) ? require('./regras.js') : root.Regras;
  const dois = (n) => String(n).padStart(2, '0');

  function montarAlerta(permanencia, vistoria, portariaNome) {
    const c = permanencia.entrada.campos;
    const d = new Date(permanencia.entrada.em);
    const cavalo = R.normalizarPlaca(c.placaCavalo);
    const reboques = (c.reboques || []).filter(Boolean).map(R.normalizarPlaca);
    const motorista = c.motoristaNome || '';
    const nomeCurto = String(portariaNome).replace(/^Tóliman\s+/, '');
    let mensagem = `🚨 Vistoria 17 pontos — Portaria ${nomeCurto} — Cavalo ${cavalo}`;
    if (reboques.length) mensagem += ` / Reb. ${reboques.join(', ')}`;
    mensagem += ` — Motorista ${motorista || 'não informado'} — chegada ${dois(d.getDate())}/${dois(d.getMonth() + 1)} ${dois(d.getHours())}:${dois(d.getMinutes())}`;
    if (vistoria.origem === 'forcada') mensagem += ` (forçada: ${vistoria.justificativa})`;
    const carimbo = `${d.getFullYear()}${dois(d.getMonth() + 1)}${dois(d.getDate())}-${dois(d.getHours())}${dois(d.getMinutes())}`;
    return {
      nome: `${permanencia.portaria}_${cavalo}_${carimbo}_${permanencia.id}.json`,
      conteudo: {
        tipo: 'vistoria17', portaria: permanencia.portaria, portariaNome, placaCavalo: cavalo, reboques, motorista,
        chegada: permanencia.entrada.em, origem: vistoria.origem, justificativa: vistoria.justificativa || null, mensagem,
      },
    };
  }

  const api = { montarAlerta };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Alerta = api;
})(typeof window !== 'undefined' ? window : globalThis);
