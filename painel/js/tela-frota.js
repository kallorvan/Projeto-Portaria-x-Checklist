// Aba Frota (Distrito, somente leitura): no pátio, fotos do CTRC, situação dos checklists e histórico.
(function () {
  'use strict';
  const P = window.Painel;
  const { h, botao, st } = P;
  const eh = (p) => p.categoria === 'frota';
  const c = (p) => P.camposDe(p);

  const checklist03De = (pid) => st.estado.checklists.find(x => x.ficha === '03' && x.permanenciaId === pid);
  const vistoriaDe = (pid) => st.estado.vistorias.find(v => v.permanenciaId === pid);

  // Forçar não grava em alertas/ (pasta do fluxo) e não posta no Teams: quem força já é o GR ou o coordenador.
  async function forcar(p) {
    const j = await P.pedirTexto(`Forçar vistoria 17 pontos · ${c(p).placaCavalo}`, 'Justificativa', { cod: 'Exceção à regra do 5º veículo' });
    if (j) await P.acao(() => P.gravar('vistoria17_forcada', p.portaria, { permanenciaId: p.id, justificativa: j }), 'Vistoria 17 pontos forçada.');
  }
  P.forcarVistoria = forcar;

  function situacaoChecklists(p) {
    const c3 = checklist03De(p.id), v = vistoriaDe(p.id), pode = P.podeVistoriar() && p.entrada;
    return [
      c3 ? h('span', { class: 'tag ok' }, c3.numero) : pode ? botao('Fazer checklist 03', 'linkbtn', () => P.abrirChecklist03(p.id)) : (p.entrada ? h('span', { class: 'tag pre' }, '03 pendente') : null), ' ',
      v ? h('span', { class: 'tag ' + (v.situacao === 'pendente' ? 'warn' : v.situacao === 'concluida' ? 'ok' : 'mv') }, v.situacao === 'pendente' ? '17 pontos pendente' : v.situacao === 'concluida' ? v.checklistNumero : '17 pontos dispensada')
        : pode ? botao('Forçar 17 pontos', 'linkbtn', () => forcar(p)) : null,
    ];
  }

  const colunas = [
    { t: 'Cavalo', v: p => h('span', { class: 'nm' }, c(p).placaCavalo) },
    { t: 'Reboques', v: p => h('span', { class: 'nm' }, (c(p).reboques || []).join(' / ')) },
    { t: 'Motorista', v: p => c(p).motoristaNome || '' },
    { t: 'KM', v: p => h('span', { class: 'num' }, c(p).km == null ? '' : String(c(p).km)) },
    { t: 'CTRC', v: p => ((c(p).anexos || []).length ? P.miniaturas(c(p).anexos) : '') },
    { t: 'Checklists', v: situacaoChecklists },
  ];

  P.telas.frota = {
    render(alvo) {
      const noLocal = st.estado.noLocal('DIS').filter(eh).sort((a, b) => (a.entrada.em < b.entrada.em ? -1 : 1));
      const csv = [
        { titulo: 'Placa Cavalo', valor: p => c(p).placaCavalo }, ...[0, 1, 2].map(i => ({ titulo: `Placa Reboque_${i + 1}`, valor: p => (c(p).reboques || [])[i] || '' })),
        { titulo: 'Motorista', valor: p => c(p).motoristaNome }, { titulo: 'KM entrada', valor: p => (p.entrada ? c(p).km : '') }, { titulo: 'KM saída', valor: p => (p.saida && p.entrada ? p.saida.campos.km : '') },
        ...P.csvComum,
        { titulo: 'Checklist 03', valor: p => (checklist03De(p.id) || {}).numero || '' },
        { titulo: 'Vistoria 17 pontos', valor: p => { const v = vistoriaDe(p.id); return v ? (v.checklistNumero || v.situacao) : ''; } },
      ];
      alvo.replaceChildren(
        h('div', { class: 'sec' },
          h('div', { class: 'sec-h' }, h('h2', null, `Frota no pátio · Distrito (${noLocal.length})`), h('span', { class: 'sec-note' }, 'Chegadas registradas no Lists. As fotos do CTRC chegam pelo fluxo.')),
          P.tabela(noLocal, [...colunas, P.noLocalCol], { vazio: 'Nenhum veículo da frota no pátio.', id: 'frota-patio' })),
        P.blocoHistorico({ chave: 'frota', titulo: 'Histórico da frota', filtro: eh, colunas: [...colunas, P.entradaCol, P.saidaCol, P.porCol], csv, portaria: 'DIS' }),
      );
    },
  };
})();
