// Aba Colaboradores (somente leitura): no local, em intervalo, jornada do dia e histórico.
(function () {
  'use strict';
  const P = window.Painel;
  const { h, botao, inp, st } = P;
  const eh = (p) => p.categoria === 'colaborador';
  const c = (p) => P.camposDe(p);
  let diaJornada = null;

  function jornada() {
    const dia = diaJornada || P.diaLocal();
    const lista = st.estado.jornadas(st.vista, dia);
    const rot = { entrada: 'Entrada', retorno: 'Retorno', saida: 'Saída' };
    const texto = (m) => `${rot[m.tipo]} ${P.hora(m.em)}${m.tipo === 'saida' && m.motivo ? ` (${P.nomeMotivo(m.motivo).toLowerCase()})` : ''}`;
    const max = Math.max(4, ...lista.map(j => j.marcacoes.length));
    const csv = [{ titulo: 'Colaborador', valor: j => j.nome }, { titulo: 'Data', valor: () => P.dataBR(dia) },
      ...Array.from({ length: max }, (_, i) => ({ titulo: `Marcação ${i + 1}`, valor: j => (j.marcacoes[i] ? texto(j.marcacoes[i]) : '') }))];
    return h('div', { class: 'sec' },
      h('div', { class: 'sec-h' }, h('h2', null, 'Jornada do dia'), h('span', { class: 'sec-note' }, 'Controle de portaria: não substitui o ponto do RH.')),
      h('div', { class: 'tools' }, inp({ type: 'date', id: 'jor-dia', value: dia, onchange: (e) => { diaJornada = e.target.value; P.render(); } }),
        botao('Exportar CSV', 'btn ghost', () => P.baixar(`jornada_${P.portariaInfo(st.vista).pasta}_${dia}.csv`, Csv.gerarCsv(csv, lista)), { id: 'jor-exportar' })),
      h('div', { class: 'tbl-scroll' }, h('table', { id: 'jornada' }, h('thead', null, h('tr', null, h('th', null, 'Colaborador'), h('th', null, 'Marcações'))),
        h('tbody', null, lista.length ? lista.map(j => h('tr', null, h('td', null, h('b', null, j.nome)), h('td', null, j.marcacoes.map(m => h('span', { class: 'marc' }, rot[m.tipo], h('b', null, P.hora(m.em)), m.tipo === 'saida' && m.motivo ? `(${P.nomeMotivo(m.motivo).toLowerCase()})` : '')))))
          : h('tr', null, h('td', { colspan: 2, class: 'sec-note' }, 'Nenhuma marcação neste dia.'))))));
  }

  const colunas = [
    { t: 'Colaborador', v: p => [h('b', null, c(p).nome), p.retorno ? [' ', h('span', { class: 'tag mv' }, 'retorno')] : null] },
    { t: 'Veículo', v: p => c(p).veiculo || '' },
    { t: 'Placa', v: p => h('span', { class: 'nm' }, c(p).placa || '') },
    { t: 'KM', v: p => h('span', { class: 'num' }, c(p).km == null ? '' : String(c(p).km)) },
  ];
  const motivoCol = { t: 'Motivo da saída', v: p => (p.saida ? P.nomeMotivo(p.saida.campos.motivo) : '') };

  P.telas.col = {
    render(alvo) {
      const noLocal = st.estado.noLocal(st.vista).filter(eh).sort((a, b) => (a.entrada.em < b.entrada.em ? -1 : 1));
      const intervalo = st.estado.emIntervalo(st.vista, P.diaLocal());
      const csv = [{ titulo: 'Nome', valor: p => c(p).nome }, { titulo: 'Situação', valor: p => (p.retorno ? 'Retorno' : 'Entrada') },
        { titulo: 'Veículo', valor: p => c(p).veiculo }, { titulo: 'Placa', valor: p => c(p).placa }, { titulo: 'KM', valor: p => c(p).km },
        { titulo: 'Motivo da saída', valor: p => (p.saida ? P.nomeMotivo(p.saida.campos.motivo) : '') }, ...P.csvComum,
        { titulo: 'Observação', valor: p => [c(p).observacao, p.saida && p.saida.campos.observacao].filter(Boolean).join(' / ') }];
      alvo.replaceChildren(
        h('div', { class: 'sec' },
          h('div', { class: 'sec-h' }, h('h2', null, `No local agora (${noLocal.length}) · Em intervalo (${intervalo.length})`), P.seletorNota()),
          P.tabela(noLocal, [...colunas, P.noLocalCol], { vazio: 'Nenhum colaborador no local.' }),
          intervalo.length ? h('p', { class: 'sec-note' }, 'Em intervalo: ', intervalo.map(x => `${x.nome} (saiu ${P.hora(x.saida.em)})`).join(' · ')) : null),
        jornada(),
        P.blocoHistorico({ chave: 'col', titulo: 'Histórico de colaboradores', filtro: eh, colunas: [...colunas, motivoCol, P.entradaCol, P.saidaCol, P.porCol], csv, portaria: st.vista }),
      );
    },
  };
})();
