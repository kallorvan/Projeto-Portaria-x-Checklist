// Partes comuns das abas de acompanhamento (somente leitura): detalhe do registro, ocultar, tabelas,
// histórico com exportação. Os registros vêm do Microsoft Lists; correções são feitas lá.
(function () {
  'use strict';
  const P = window.Painel;
  const { h, botao, inp, st } = P;

  const CATEGORIAS = { visitante: 'Visitante', prestador: 'Prestador', frota: 'Frota', colaborador: 'Colaborador' };
  const MOTIVOS = [['intervalo', 'Intervalo'], ['fim', 'Fim do expediente'], ['outro', 'Outro']];
  const nomeMotivo = (m) => (MOTIVOS.find(x => x[0] === m) || [m, m || ''])[1];

  const camposDe = (p) => (p.entrada ? p.entrada.campos : (p.saida ? p.saida.campos : {}));
  const instante = (p) => (p.entrada ? p.entrada.em : p.saida.em);
  const visiveis = (filtro) => st.estado.permanencias.filter(p => !p.oculto && filtro(p));

  function identificacao(p) {
    const c = camposDe(p);
    if (p.categoria === 'frota') return [c.placaCavalo, ...(c.reboques || [])].filter(Boolean).join(' / ') + (c.motoristaNome ? ` · ${c.motoristaNome}` : '');
    return c.nome || '';
  }

  const linkLists = (p) => (p.link ? h('a', { href: p.link, target: '_blank', rel: 'noopener', class: 'linkbtn' }, 'Ver no Lists') : null);

  /* ---------- detalhe ---------- */
  const ROTULOS = {
    nome: 'Nome', documento: 'Documento', placa: 'Placa', setor: 'Setor a visitar', cracha: 'Crachá', observacao: 'Observação',
    placaCavalo: 'Placa cavalo', motoristaNome: 'Motorista', km: 'KM', veiculo: 'Veículo', motivo: 'Motivo da saída',
  };
  const valorTexto = (k, v) => (Array.isArray(v) ? v.filter(Boolean).join(', ') : k === 'motivo' ? nomeMotivo(v) : v == null ? '' : String(v));

  function detalhe(p) {
    const c = camposDe(p);
    const kv = h('dl', { class: 'kv' });
    const add = (rot, val) => { if (val !== '' && val != null) kv.append(h('dt', null, rot), h('dd', null, val)); };
    add('Portaria', P.portariaInfo(p.portaria).nome);
    add('Entrada', p.entrada ? `${P.dataHora(p.entrada.em)} · registrada por ${p.entrada.pessoa}` : 'sem entrada registrada');
    add('Saída', p.saida ? `${P.dataHora(p.saida.em)} · registrada por ${p.saida.pessoa}` : 'no local');
    for (const [k, v] of Object.entries(c)) if (ROTULOS[k]) add(ROTULOS[k], valorTexto(k, v));
    if (c.reboques && c.reboques.length) add('Reboques', valorTexto('', c.reboques));
    if (p.saida && p.entrada) for (const [k, v] of Object.entries(p.saida.campos)) if (ROTULOS[k]) add(ROTULOS[k] + ' (saída)', valorTexto(k, v));
    if (p.oculto) add('Oculto', `${p.oculto.motivo} · ${p.oculto.pessoa}, ${P.dataHora(p.oculto.em)}`);
    const fotos = c.anexos && c.anexos.length ? [h('h4', { style: 'margin:0' }, 'Fotos do CTRC'), P.miniaturas(c.anexos)] : null;
    const acoes = [{ txt: 'Fechar', cls: 'btn ghost', fn: () => dlg.fechar() }];
    if (P.podeVistoriar() && !p.oculto) acoes.push({ txt: 'Ocultar registro', cls: 'btn ghost', fn: () => ocultar(p, dlg) });
    const dlg = P.dialogo({
      id: 'dlg', cod: CATEGORIAS[p.categoria] + (p.avulsa ? ' · saída sem entrada' : ''), titulo: identificacao(p),
      corpo: [h('div', { class: 'card pad' }, kv), fotos,
        h('p', { class: 'sec-note', style: 'margin:0' }, 'Este registro vem do Microsoft Lists. Para corrigir, edite o item no Lists: a cópia chega ao painel em alguns minutos. ', linkLists(p))],
      acoes,
    });
  }

  // Esconde do painel um registro errado ou excluído no Lists (o painel não recebe exclusões).
  async function ocultar(p, dlg) {
    const m = await P.pedirTexto(`Ocultar ${identificacao(p)}`, 'Motivo (ex.: item excluído no Lists, registro de teste)', { cod: 'Ocultar registro' });
    if (!m) return;
    if (await P.acao(() => P.gravar('registro_ocultado', p.portaria, { permanenciaId: p.id, motivo: m }), 'Registro ocultado.')) dlg.fechar();
  }

  /* ---------- tabelas ---------- */
  function tabela(lista, colunas, { vazio = 'Nenhum registro.', classe, id } = {}) {
    return h('div', { class: 'tbl-scroll' }, h('table', { id },
      h('thead', null, h('tr', null, colunas.map(c => h('th', null, c.t)))),
      h('tbody', null, lista.length ? lista.map(p => h('tr', { class: ['click', classe ? classe(p) : ''].join(' '), tabindex: 0, onclick: (e) => { if (!e.target.closest('button,a')) detalhe(p); } },
        colunas.map(c => h('td', null, c.v(p)))))
        : h('tr', null, h('td', { colspan: colunas.length, class: 'sec-note' }, vazio)))));
  }

  function baixar(nome, texto) {
    const a = h('a', { href: URL.createObjectURL(new Blob([texto], { type: 'text/csv;charset=utf-8' })), download: nome });
    document.body.append(a); a.click(); a.remove();
  }

  // Histórico com período, busca e exportação.
  const periodos = {};
  function blocoHistorico({ chave, titulo, filtro, colunas, csv, portaria }) {
    const per = periodos[chave] || (periodos[chave] = { de: P.diaLocal(new Date(Date.now() - 6 * 86400000)), ate: P.diaLocal(), q: '' });
    const lista = () => visiveis(p => p.portaria === portaria && filtro(p))
      .filter(p => { const d = Estado.diaDe(instante(p)); return d >= per.de && d <= per.ate; })
      .filter(p => !per.q || JSON.stringify(camposDe(p)).toLowerCase().includes(per.q.toLowerCase()))
      .sort((a, b) => (instante(a) < instante(b) ? 1 : -1));
    const corpo = h('div');
    const desenhar = () => corpo.replaceChildren(tabela(lista(), colunas));
    desenhar();
    return h('div', { class: 'sec' },
      h('div', { class: 'sec-h' }, h('h2', null, titulo), h('span', { class: 'sec-note' }, 'Clique num registro para ver os detalhes e o link para o Lists.')),
      h('div', { class: 'tools' }, h('label', { class: 'sec-note' }, 'De'),
        inp({ type: 'date', value: per.de, id: `${chave}-de`, onchange: (e) => { per.de = e.target.value; desenhar(); } }),
        h('label', { class: 'sec-note' }, 'até'),
        inp({ type: 'date', value: per.ate, id: `${chave}-ate`, onchange: (e) => { per.ate = e.target.value; desenhar(); } }),
        h('input', { type: 'search', placeholder: 'Buscar', value: per.q, oninput: (e) => { per.q = e.target.value; desenhar(); } }),
        botao('Exportar CSV', 'btn ghost', () => baixar(`${chave}_${P.portariaInfo(portaria).pasta}_${per.de}_a_${per.ate}.csv`, Csv.gerarCsv(csv, lista())), { id: `${chave}-exportar` })),
      corpo);
  }

  const entradaCol = { t: 'Entrada', v: (p) => (p.entrada ? h('span', { class: 'num' }, P.dataHora(p.entrada.em)) : h('span', { class: 'tag warn' }, 'sem entrada')) };
  const saidaCol = { t: 'Saída', v: (p) => (p.saida ? h('span', { class: 'num' }, P.dataHora(p.saida.em)) : h('span', { class: 'tag ok' }, 'no local')) };
  const noLocalCol = { t: 'Entrada', v: (p) => h('span', { class: 'num' }, `${P.dataHora(p.entrada.em)} · ${P.duracao(p.entrada.em)}`) };
  const porCol = { t: 'Registrado por', v: (p) => (p.entrada || p.saida).pessoa };
  const csvComum = [
    { titulo: 'Entrada', valor: p => (p.entrada ? P.dataHora(p.entrada.em) : '') },
    { titulo: 'Saída', valor: p => (p.saida ? P.dataHora(p.saida.em) : '') },
    { titulo: 'Registrado por', valor: p => (p.entrada || p.saida).pessoa },
    { titulo: 'Link no Lists', valor: p => p.link || '' },
  ];

  // Chegadas da frota (Distrito) sem checklist 03, inclusive as que já saíram: a pendência não some com a saída.
  const aguardando03 = () => visiveis(p => p.portaria === 'DIS' && p.categoria === 'frota' && p.entrada
    && !st.estado.checklists.some(c => c.ficha === '03' && c.permanenciaId === p.id)).sort((a, b) => (a.entrada.em < b.entrada.em ? -1 : 1));

  const seletorNota = () => h('p', { class: 'sec-note', style: 'margin:0' }, `Portaria ${P.portariaInfo(st.vista).nome}. Troque no seletor do topo.`);

  Object.assign(P, {
    CATEGORIAS, MOTIVOS, nomeMotivo, camposDe, identificacao, linkLists, detalhe, ocultar, tabela, baixar, blocoHistorico,
    entradaCol, saidaCol, noLocalCol, porCol, csvComum, visiveis, instante, seletorNota, aguardando03,
  });
})();
