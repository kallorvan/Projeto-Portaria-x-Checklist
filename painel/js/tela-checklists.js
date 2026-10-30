// Aba Checklists: fila do GR (vistorias 17 pontos pendentes) e histórico dos REG LOG 03 e 04.
(function () {
  'use strict';
  const P = window.Painel;
  const A = window.Armazenamento;
  const { h, botao, inp, st } = P;
  const filtro = { portaria: null, ficha: '', placa: '', de: null, ate: null };

  const permDe = (id) => st.estado.permanencias.find(p => p.id === id);
  const placaDe = (c) => (c.dados.placas && c.dados.placas.cavalo) || ((permDe(c.permanenciaId) || {}).entrada || { campos: {} }).campos.placaCavalo || '';

  async function dispensar(v) {
    const p = permDe(v.permanenciaId);
    const j = await P.pedirTexto(`Dispensar vistoria 17 pontos · ${p.entrada.campos.placaCavalo}`, 'Justificativa', { cod: 'Exceção à regra do 5º veículo' });
    if (j) await P.acao(() => P.gravar('vistoria17_dispensada', v.portaria, { permanenciaId: v.permanenciaId, justificativa: j }), 'Vistoria dispensada.');
  }

  function filaGr() {
    const gr = P.temPapel('gr');
    const lista = st.estado.vistorias.filter(v => v.situacao === 'pendente' && (gr || v.portaria === st.portaria)).sort((a, b) => (a.desde < b.desde ? -1 : 1));
    return h('div', { class: 'sec' },
      h('div', { class: 'sec-h' }, h('h2', null, `Fila do GR · vistorias 17 pontos pendentes (${lista.length})`), h('span', { class: 'sec-note' }, gr ? 'Todas as portarias.' : 'Só pessoas do GR fazem ou dispensam a vistoria.')),
      h('div', { class: 'tbl-scroll' }, h('table', { id: 'fila-gr' }, h('thead', null, h('tr', null, ['Portaria', 'Cavalo', 'Reboques', 'Motorista', 'Chegada', 'Origem', 'Pendente há', ''].map(t => h('th', null, t)))),
        h('tbody', null, lista.length ? lista.map(v => {
          const c = permDe(v.permanenciaId).entrada.campos;
          return h('tr', null, h('td', null, P.portariaInfo(v.portaria).pasta), h('td', { class: 'nm' }, c.placaCavalo), h('td', { class: 'nm' }, (c.reboques || []).join(' / ')),
            h('td', null, c.motoristaNome || ''), h('td', { class: 'num' }, P.dataHora(v.desde)),
            h('td', null, v.origem === 'automatica' ? `automática · ${v.ordem}ª chegada` : h('span', { title: v.justificativa }, `forçada: ${v.justificativa}`)),
            h('td', null, h('span', { class: 'tag warn' }, P.duracao(v.desde))),
            h('td', null, gr ? [botao('Fazer vistoria', 'send', () => P.abrirChecklist04(v.permanenciaId)), ' ', botao('Dispensar', 'btn ghost', () => dispensar(v))] : null));
        }) : h('tr', null, h('td', { colspan: 8, class: 'sec-note' }, 'Nenhuma vistoria pendente.'))))));
  }

  function podeCorrigir(c) { return c.criadoPor === st.pessoa || (P.temPapel('admin') && st.adminOk); }

  async function abrirPdf(c) {
    if (!c.pdf) return P.aviso('Este checklist não tem PDF.', 'err');
    try { window.open(await A.urlDe(c.pdf.slice(0, -1), c.pdf.at(-1)), '_blank'); }
    catch (e) { P.aviso('PDF ainda não sincronizado nesta pasta: ' + e.message, 'err'); }
  }

  function detalhe(c) {
    const p = permDe(c.permanenciaId);
    const resumo = c.ficha === '04'
      ? h('div', { class: 'tbl-scroll' }, h('table', null, h('thead', null, h('tr', null, ['Nº', 'Item', 'Resposta', 'Observação'].map(t => h('th', null, t)))),
        h('tbody', null, Fichas.ITENS_17.map(it => { const r = c.dados.itens[it.n] || {}; return h('tr', { class: r.resposta === 'NC' ? 'nc' : '' }, h('td', { class: 'num' }, String(it.n)), h('td', null, it.nome), h('td', null, { C: 'Conforme', NC: 'Não conforme', NA: 'Não aplicável' }[r.resposta] || ''), h('td', null, r.obs || '')); }))))
      : h('div', { class: 'tbl-scroll' }, h('table', null, h('thead', null, h('tr', null, ['Região', 'Avarias', 'Descrição'].map(t => h('th', null, t)))),
        h('tbody', null, Object.entries(c.dados.regioes || {}).map(([id, r]) => h('tr', null, h('td', null, (Fichas.regioesDoVeiculo(p.entrada.campos.reboques).find(g => g.id === id) || { nome: id }).nome), h('td', null, r.semAvarias ? 'Sem avarias' : r.codigos.join(', ')), h('td', null, r.descricao || ''))))));
    const versoes = h('div', { class: 'card timeline' }, c.versoes.map(e => h('div', { class: 'tl' }, h('span', { class: 'mo' }, P.dataHora(e.em)), h('span', null, `Versão ${e.dados.versao}${e.dados.motivo ? ` · correção: ${e.dados.motivo}` : ''}`), h('span', { class: 'acc' }, e.pessoa))));
    const dlg = P.dialogo({
      id: 'dlg', cod: `REG LOG ${c.ficha} · ${P.portariaInfo(c.portaria).nome}`, titulo: `${c.numero} · ${placaDe(c)}`,
      corpo: [c.naoConforme ? h('p', { class: 'msg err', style: 'margin:0' }, 'Vistoria com item Não conforme.') : null, resumo, h('h4', { style: 'margin:0' }, 'Versões'), versoes],
      acoes: [{ txt: 'Fechar', cls: 'btn ghost', fn: () => dlg.fechar() }, { txt: 'Abrir PDF', cls: 'btn ghost', fn: () => abrirPdf(c) },
        ...(podeCorrigir(c) && (c.ficha === '03' || P.temPapel('gr')) ? [{ txt: 'Corrigir', fn: () => { dlg.fechar(); (c.ficha === '03' ? P.abrirChecklist03 : P.abrirChecklist04)(c.permanenciaId, { corrigir: c.numero }); } }] : [])],
    });
  }

  function historico() {
    filtro.portaria = filtro.portaria || P.portariaVista();
    filtro.de = filtro.de || P.diaLocal(new Date(Date.now() - 29 * 86400000));
    filtro.ate = filtro.ate || P.diaLocal();
    const lista = () => st.estado.checklists.filter(c => (filtro.portaria === 'todas' || c.portaria === filtro.portaria) && (!filtro.ficha || c.ficha === filtro.ficha)
      && (!filtro.placa || placaDe(c).includes(Regras.normalizarPlaca(filtro.placa))) && Estado.diaDe(c.versoes[0].em) >= filtro.de && Estado.diaDe(c.versoes[0].em) <= filtro.ate);
    const corpo = h('tbody');
    const desenhar = () => {
      const l = lista();
      corpo.replaceChildren(...(l.length ? l.map(c => h('tr', { class: 'click' + (c.naoConforme ? ' nc' : ''), tabindex: 0, onclick: () => detalhe(c) },
        h('td', { class: 'nm' }, c.numero), h('td', null, c.ficha === '03' ? 'Operacional' : '17 pontos'), h('td', null, P.portariaInfo(c.portaria).pasta), h('td', { class: 'nm' }, placaDe(c)),
        h('td', { class: 'num' }, P.dataHora(c.versoes[0].em)), h('td', null, c.criadoPor), h('td', null, c.versao > 1 ? h('span', { class: 'tag pre' }, `v${c.versao}`) : 'v1'),
        h('td', null, c.naoConforme ? h('span', { class: 'tag warn' }, 'não conforme') : ''))) : [h('tr', null, h('td', { colspan: 8, class: 'sec-note' }, 'Nenhum checklist no período.'))]));
    };
    desenhar();
    const portarias = [['todas', 'Todas as portarias'], ...Fichas.PORTARIAS.map(p => [p.id, p.nome])];
    return h('div', { class: 'sec' },
      h('div', { class: 'sec-h' }, h('h2', null, 'Histórico de checklists'), h('span', { class: 'sec-note' }, 'Clique para ver os detalhes, as versões e o PDF.')),
      h('div', { class: 'tools' },
        P.sel(portarias, filtro.portaria, { 'aria-label': 'Portaria', onchange: (e) => { filtro.portaria = e.target.value; desenhar(); } }),
        P.sel([['', 'REG LOG 03 e 04'], ['03', 'REG LOG 03'], ['04', 'REG LOG 04']], filtro.ficha, { 'aria-label': 'Ficha', onchange: (e) => { filtro.ficha = e.target.value; desenhar(); } }),
        h('input', { type: 'search', placeholder: 'Placa', value: filtro.placa, oninput: (e) => { filtro.placa = e.target.value; desenhar(); } }),
        inp({ type: 'date', value: filtro.de, onchange: (e) => { filtro.de = e.target.value; desenhar(); } }), inp({ type: 'date', value: filtro.ate, onchange: (e) => { filtro.ate = e.target.value; desenhar(); } })),
      h('div', { class: 'tbl-scroll' }, h('table', { id: 'hist-ck' }, h('thead', null, h('tr', null, ['Nº', 'Ficha', 'Portaria', 'Placa', 'Data', 'Preenchido por', 'Versão', ''].map(t => h('th', null, t)))), corpo)));
  }

  P.telas.ck = {
    preservar: true,
    render(alvo) { alvo.replaceChildren(filaGr(), historico()); },
  };
})();
