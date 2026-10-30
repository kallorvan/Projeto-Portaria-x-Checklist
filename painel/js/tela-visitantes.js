// Aba Visitantes e Prestadores.
(function () {
  'use strict';
  const P = window.Painel;
  const { h, botao, inp, campo, st } = P;
  const eh = (p) => p.categoria === 'visitante' || p.categoria === 'prestador';

  function formulario() {
    const pid = P.novoId();
    const fotos = [];
    const f = {
      categoria: P.sel([['visitante', 'Visitante'], ['prestador', 'Prestador de serviço']], 'visitante', { id: 'vis-categoria' }),
      nome: inp({ id: 'vis-nome' }), documento: inp({ id: 'vis-documento' }), placa: inp({ id: 'vis-placa', maxlength: 8 }),
      setor: inp({ id: 'vis-setor' }), cracha: inp({ id: 'vis-cracha' }), observacao: inp({ id: 'vis-obs' }),
    };
    const err = h('div');
    return h('form', { class: 'card form-card', id: 'vis-form', onsubmit: async (ev) => {
      ev.preventDefault();
      const campos = { nome: f.nome.value.trim(), documento: f.documento.value.trim(), placa: Regras.normalizarPlaca(f.placa.value), setor: f.setor.value.trim(), cracha: f.cracha.value.trim(), observacao: f.observacao.value.trim(), fotos };
      const erros = [];
      if (!campos.nome) erros.push('Informe o nome.');
      if (!campos.documento) erros.push('Informe o documento.');
      if (!campos.setor) erros.push('Informe o setor a visitar.');
      if (erros.length) return err.replaceChildren(P.listaErros(erros));
      const aberto = st.estado.noLocal(st.portaria).find(p => eh(p) && campos.cracha && p.entrada.campos.cracha === campos.cracha);
      if (aberto && !confirm(`O crachá ${campos.cracha} está com ${aberto.entrada.campos.nome}, que ainda não saiu. Registrar mesmo assim?`)) return;
      await P.acao(() => P.gravar('entrada_registrada', st.portaria, { permanenciaId: pid, categoria: f.categoria.value, campos }), `Entrada de ${campos.nome} registrada.`);
    } },
      h('h3', null, 'Nova entrada'),
      h('div', { class: 'grid3' }, campo('Categoria', f.categoria, { req: true }), campo('Nome', f.nome, { req: true }), campo('Documento', f.documento, { req: true }),
        campo('Placa do veículo', f.placa), campo('Setor a visitar', f.setor, { req: true }), campo('Nº do crachá', f.cracha), campo('Observação', f.observacao)),
      h('div', { class: 'fld' }, h('label', null, 'Foto do crachá'), P.blocoFotos(fotos, { alvo: `VIS-${pid}`, ponto: 'cracha', rotulo: 'Foto do crachá' })),
      err,
      h('div', null, h('button', { class: 'btn', type: 'submit', id: 'vis-registrar' }, 'Registrar entrada')));
  }

  const colunas = [
    { t: 'Nome', v: p => h('b', null, P.camposDe(p).nome) },
    { t: 'Tipo', v: p => P.CATEGORIAS[p.categoria] },
    { t: 'Documento', v: p => P.camposDe(p).documento || '' },
    { t: 'Placa', v: p => h('span', { class: 'nm' }, P.camposDe(p).placa || '') },
    { t: 'Setor', v: p => P.camposDe(p).setor || '' },
    { t: 'Crachá', v: p => P.camposDe(p).cracha || '' },
  ];

  P.telas.vis = {
    preservar: true,
    render(alvo) {
      const noLocal = st.estado.noLocal(P.portariaVista()).filter(eh).sort((a, b) => (a.entrada.em < b.entrada.em ? -1 : 1));
      const csv = [
        { titulo: 'Categoria', valor: p => P.CATEGORIAS[p.categoria] }, { titulo: 'Nome', valor: p => P.camposDe(p).nome },
        { titulo: 'Documento', valor: p => P.camposDe(p).documento }, { titulo: 'Placa veículo', valor: p => P.camposDe(p).placa },
        { titulo: 'Setor a visitar', valor: p => P.camposDe(p).setor }, { titulo: 'Nº crachá', valor: p => P.camposDe(p).cracha },
        ...P.csvComum.slice(0, 2),
        { titulo: 'Crachá devolvido', valor: p => (p.saida && p.saida.campos.crachaDevolvido != null ? (p.saida.campos.crachaDevolvido ? 'Sim' : 'Não') : '') },
        ...P.csvComum.slice(2),
        { titulo: 'Foto crachá', valor: p => (P.camposDe(p).fotos || []).join(' | ') }, { titulo: 'Observação', valor: p => P.camposDe(p).observacao },
      ];
      alvo.replaceChildren(
        P.datalists(),
        h('div', { class: 'sec' }, P.vendoOutra() ? P.avisoOutraPortaria() : formulario()),
        h('div', { class: 'sec' },
          h('div', { class: 'sec-h' }, h('h2', null, `No local agora (${noLocal.length})`), P.vendoOutra() ? null : botao('Saída avulsa', 'btn ghost', () => P.saidaAvulsa('visitante'))),
          P.tabela(noLocal, [...colunas, { t: 'Entrada', v: p => h('span', { class: 'num' }, `${P.dataHora(p.entrada.em)} · ${P.duracao(p.entrada.em)}`) }],
            { vazio: 'Nenhum visitante ou prestador no local.', acoes: (p) => (P.vendoOutra() ? null : botao('Registrar saída', 'send', () => P.registrarSaida(p))) })),
        P.blocoHistorico({ chave: 'vis', titulo: 'Histórico', filtro: eh, colunas: [...colunas, P.entradaCol, P.saidaCol, P.porCol], csv }),
      );
    },
  };
})();
