// Regras puras: placas, numeração de checklist, vistoria 17 pontos e CNH.
// Script clássico; carregável no Node para testes.
(function (root) {
  'use strict';

  const DIAS_AVISO_CNH = 30;
  const A_CADA = 5;
  const TRAVADOS = [12, 13, 14, 15, 16, 17];

  function normalizarPlaca(p) {
    return String(p || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  }

  function numeroChecklist(portaria, ficha, seq) {
    return `${portaria}-${ficha}-${String(seq).padStart(6, '0')}`;
  }

  function proximaSequencia(numeros, portaria, ficha) {
    const prefixo = `${portaria}-${ficha}-`;
    let max = 0;
    for (const n of numeros || []) {
      if (!String(n).startsWith(prefixo)) continue;
      const s = parseInt(String(n).slice(prefixo.length), 10);
      if (s > max) max = s;
    }
    return max + 1;
  }

  const indicesVistoria = (n) => n > 0 && n % A_CADA === 0;
  const faltamParaVistoria = (chegadas) => A_CADA - (chegadas % A_CADA);

  function itensTravados({ tipoCarga, lacres } = {}) {
    if (tipoCarga === 'container_com_carga') return [...TRAVADOS];
    if (tipoCarga === 'container_vazio' && String((lacres || {}).containerVazio || '').trim()) return [...TRAVADOS];
    return [];
  }

  function validarChecklist04(dados) {
    const erros = [];
    if (!dados.tipoCarga) erros.push('Informe o tipo de carga do veículo.');
    const travados = itensTravados(dados);
    const itens = dados.itens || {};
    for (let n = 1; n <= 17; n++) {
      const it = itens[n];
      if (!it || !it.resposta) { erros.push(`Item ${n}: escolha Conforme, Não conforme ou Não aplicável.`); continue; }
      if (travados.includes(n) && it.resposta !== 'NA') erros.push(`Item ${n}: deve ser Não aplicável para este tipo de carga.`);
      else if (it.resposta === 'NC' && !String(it.obs || '').trim()) erros.push(`Item ${n}: Não conforme exige observação.`);
    }
    return erros;
  }

  function validarChecklist03(dados, regioes) {
    const r = (dados && dados.regioes) || {};
    return regioes
      .filter(g => { const x = r[g.id] || {}; return !x.semAvarias && !(x.codigos && x.codigos.length); })
      .map(g => `Região ${g.nome}: marque 'Sem avarias' ou um código`);
  }

  const temNaoConforme = (dados) => Object.values((dados && dados.itens) || {}).some(i => i && i.resposta === 'NC');

  function avisoCnh(validade, hoje) {
    if (!validade) return null;
    const [a, m, d] = validade.split('-').map(Number);
    const fim = new Date(a, m - 1, d);
    const dia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
    const dias = Math.round((fim - dia) / 86400000);
    if (dias < 0) return 'vencida';
    if (dias <= DIAS_AVISO_CNH) return 'vence_em_breve';
    return null;
  }

  const api = { DIAS_AVISO_CNH, A_CADA, normalizarPlaca, numeroChecklist, proximaSequencia, indicesVistoria, faltamParaVistoria, itensTravados, validarChecklist04, validarChecklist03, temNaoConforme, avisoCnh };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Regras = api;
})(typeof window !== 'undefined' ? window : globalThis);
