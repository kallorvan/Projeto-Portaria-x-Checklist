// Partes comuns dos checklists REG LOG 03 e 04: rascunho, numeração, PDF e gravação.
(function () {
  'use strict';
  const P = window.Painel;
  const { h, st } = P;

  const chaveRascunho = (ficha, pid) => `rascunho.${ficha}.${pid}`;
  const lerRascunho = (ficha, pid) => { try { return JSON.parse(P.LS(chaveRascunho(ficha, pid)) || 'null'); } catch { return null; } };
  const guardarRascunho = (ficha, pid, dados) => P.LS(chaveRascunho(ficha, pid), JSON.stringify(dados));
  const apagarRascunho = (ficha, pid) => P.LS(chaveRascunho(ficha, pid), null);

  // Grava o checklist: número novo (versão 1) ou nova versão de um existente.
  // O PDF é gerado e gravado antes do evento; se falhar, nada é gravado.
  async function salvarChecklist({ ficha, permanencia, dados, corrigir, motivo }) {
    const anterior = corrigir ? st.estado.checklists.find(c => c.numero === corrigir) : null;
    const numero = anterior ? anterior.numero : Regras.numeroChecklist(permanencia.portaria, ficha, Regras.proximaSequencia(st.estado.checklists.map(c => c.numero), permanencia.portaria, ficha));
    const versao = anterior ? anterior.versao + 1 : 1;
    let pdf = null;
    if (P.gerarPdfChecklist) pdf = await P.gerarPdfChecklist({ numero, ficha, versao, permanencia, dados, pessoa: st.pessoa, em: new Date().toISOString() });
    await P.gravar('checklist_salvo', permanencia.portaria, { numero, ficha, permanenciaId: permanencia.id, versao, dados, pdf, ...(motivo ? { motivo } : {}) });
    apagarRascunho(ficha, permanencia.id);
    return numero;
  }

  // Cabeçalho comum (bloco escuro) com placas e motorista.
  function resumoVeiculo(p) {
    const c = p.entrada.campos;
    return h('div', { class: 'card pad' }, h('dl', { class: 'kv' },
      h('dt', null, 'Portaria'), h('dd', null, P.portariaInfo(p.portaria).nome),
      h('dt', null, 'Chegada'), h('dd', null, P.dataHora(p.entrada.em)),
      h('dt', null, 'Cavalo'), h('dd', { class: 'nm' }, c.placaCavalo),
      h('dt', null, 'Reboques'), h('dd', { class: 'nm' }, (c.reboques || []).join(' / ') || '—'),
      h('dt', null, 'Motorista'), h('dd', null, c.motoristaNome || '—'),
      (c.anexos || []).length ? [h('dt', null, 'Fotos do CTRC'), h('dd', null, P.miniaturas(c.anexos))] : null,
      p.link ? [h('dt', null, 'Registro'), h('dd', null, P.linkLists(p))] : null));
  }

  const secao = (titulo, ...filhos) => h('div', { class: 'card form-card' }, h('h3', null, titulo), ...filhos);

  Object.assign(P, { lerRascunho, guardarRascunho, apagarRascunho, salvarChecklist, resumoVeiculo, secao });
})();
