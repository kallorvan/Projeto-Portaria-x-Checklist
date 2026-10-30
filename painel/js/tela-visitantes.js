// Aba Visitantes (somente leitura): no local e histórico da portaria escolhida no topo.
(function () {
  'use strict';
  const P = window.Painel;
  const { h, st } = P;
  const eh = (p) => p.categoria === 'visitante' || p.categoria === 'prestador';
  const c = (p) => P.camposDe(p);

  const colunas = [
    { t: 'Nome', v: p => h('b', null, c(p).nome) },
    { t: 'Documento', v: p => c(p).documento || '' },
    { t: 'Placa', v: p => h('span', { class: 'nm' }, c(p).placa || '') },
    { t: 'Setor', v: p => c(p).setor || '' },
    { t: 'Crachá', v: p => c(p).cracha || '' },
  ];

  P.telas.vis = {
    render(alvo) {
      const noLocal = st.estado.noLocal(st.vista).filter(eh).sort((a, b) => (a.entrada.em < b.entrada.em ? -1 : 1));
      const csv = [
        { titulo: 'Nome', valor: p => c(p).nome }, { titulo: 'RG/CNH', valor: p => c(p).documento }, { titulo: 'Placa veículo', valor: p => c(p).placa },
        { titulo: 'Setor a visitar', valor: p => c(p).setor }, { titulo: 'Crachá', valor: p => c(p).cracha }, ...P.csvComum,
      ];
      alvo.replaceChildren(
        h('div', { class: 'sec' },
          h('div', { class: 'sec-h' }, h('h2', null, `Visitantes no local (${noLocal.length})`), P.seletorNota()),
          P.tabela(noLocal, [...colunas, P.noLocalCol], { vazio: 'Nenhum visitante no local.' })),
        P.blocoHistorico({ chave: 'vis', titulo: 'Histórico de visitas', filtro: eh, colunas: [...colunas, P.entradaCol, P.saidaCol, P.porCol], csv, portaria: st.vista }),
      );
    },
  };
})();
