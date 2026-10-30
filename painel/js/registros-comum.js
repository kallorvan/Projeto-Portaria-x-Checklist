// Partes comuns das abas de registro: no local agora, saída, saída avulsa, histórico, detalhe e correção.
(function () {
  'use strict';
  const P = window.Painel;
  const { h, botao, inp, campo, st } = P;

  const CATEGORIAS = { visitante: 'Visitante', prestador: 'Prestador', frota: 'Frota', colaborador: 'Colaborador' };
  const MOTIVOS = [['intervalo', 'Intervalo'], ['fim', 'Fim do expediente'], ['outro', 'Outro']];
  const nomeMotivo = (m) => (MOTIVOS.find(x => x[0] === m) || [m, m || ''])[1];

  const vendoOutra = () => st.vista && st.vista !== st.portaria;
  const portariaVista = () => st.vista || st.portaria;
  const camposDe = (p) => (p.entrada ? p.entrada.campos : (p.saida ? p.saida.campos : {}));
  const ultimaAlteracao = (p) => p.historico[p.historico.length - 1];

  function identificacao(p) {
    const c = camposDe(p);
    if (p.categoria === 'frota') return [c.placaCavalo, ...(c.reboques || [])].filter(Boolean).join(' / ') + (c.motoristaNome ? ` · ${c.motoristaNome}` : '');
    if (p.categoria === 'colaborador') return c.nome || '';
    return c.nome || '';
  }

  /* ---------- listas para autocompletar ---------- */
  function datalists() {
    const e = st.estado;
    const ativos = (m) => [...m.values()].filter(x => x.ativo !== false);
    const dl = (id, valores) => h('datalist', { id }, valores.map(v => h('option', { value: v })));
    return h('div', { hidden: true },
      dl('dl-placas-cavalo', ativos(e.veiculos).filter(v => v.tipo === 'cavalo').map(v => v.placa)),
      dl('dl-placas-reboque', ativos(e.veiculos).filter(v => v.tipo === 'reboque').map(v => v.placa)),
      dl('dl-placas-leve', ativos(e.veiculos).filter(v => v.tipo === 'leve').map(v => v.placa)),
      dl('dl-motoristas', ativos(e.funcionarios).filter(f => f.motorista).map(f => f.nome)),
      dl('dl-funcionarios', ativos(e.funcionarios).map(f => f.nome)));
  }
  const acharFuncionario = (nome) => {
    const n = String(nome || '').trim().toLowerCase();
    return n ? [...st.estado.funcionarios.values()].find(f => f.ativo !== false && f.nome.toLowerCase() === n) || null : null;
  };

  /* ---------- saída ---------- */
  function registrarSaida(p) {
    const c = camposDe(p);
    const corpo = [h('p', { style: 'margin:0' }, `${CATEGORIAS[p.categoria]}: `, h('b', null, identificacao(p)), ` · entrada ${P.dataHora(p.entrada.em)} (${P.duracao(p.entrada.em)})`)];
    let ler = () => ({});
    const err = h('div');
    if (p.categoria === 'visitante' || p.categoria === 'prestador') {
      const cb = h('input', { type: 'checkbox', id: 'saida-cracha', checked: !c.cracha ? false : true });
      corpo.push(c.cracha ? h('label', { class: 'check' }, cb, `Crachá nº ${c.cracha} devolvido`) : h('p', { class: 'sec-note' }, 'Sem crachá registrado.'));
      ler = () => ({ crachaDevolvido: c.cracha ? cb.checked : null });
    } else if (p.categoria === 'frota') {
      const km = inp({ id: 'saida-km', type: 'number', min: 0, inputmode: 'numeric' });
      corpo.push(campo('KM na saída', km));
      ler = () => ({ km: km.value ? Number(km.value) : null });
    } else if (p.categoria === 'colaborador') {
      const motivo = P.sel(MOTIVOS, 'fim', { id: 'saida-motivo' });
      const km = inp({ id: 'saida-km', type: 'number', min: 0 });
      const obs = inp({ id: 'saida-obs' });
      corpo.push(h('div', { class: 'grid2' }, campo('Motivo da saída', motivo, { req: true }), c.veiculo === 'empresa' ? campo('KM', km, { req: true }) : null, campo('Observação', obs)));
      ler = () => {
        if (c.veiculo === 'empresa' && !km.value) throw new Error('Informe o KM do veículo da empresa.');
        if (motivo.value === 'outro' && !obs.value.trim()) throw new Error('Descreva o motivo na observação.');
        return { motivo: motivo.value, km: km.value ? Number(km.value) : null, observacao: obs.value.trim() };
      };
    }
    corpo.push(err);
    const dlg = P.dialogo({
      id: 'dlg2', cod: 'Registrar saída', titulo: identificacao(p), corpo,
      acoes: [{ txt: 'Cancelar', cls: 'btn ghost', fn: () => dlg.fechar() }, { txt: 'Registrar saída', props: { id: 'saida-ok' }, fn: async () => {
        let campos;
        try { campos = ler(); } catch (e) { return err.replaceChildren(P.listaErros([e.message])); }
        if (await P.acao(() => P.gravar('saida_registrada', p.portaria, { permanenciaId: p.id, campos }), 'Saída registrada.')) dlg.fechar();
      } }],
    });
  }

  // Saída sem entrada registrada no painel (ex.: veículo que pernoitou antes do painel existir).
  function saidaAvulsa(categoria) {
    const err = h('div');
    const f = {};
    const linhas = [];
    if (categoria === 'frota') {
      f.placaCavalo = inp({ id: 'avulsa-placa', list: 'dl-placas-cavalo' }); f.motoristaNome = inp({ id: 'avulsa-motorista', list: 'dl-motoristas' }); f.km = inp({ type: 'number', id: 'avulsa-km' });
      linhas.push(campo('Placa do cavalo', f.placaCavalo, { req: true }), campo('Motorista', f.motoristaNome), campo('KM', f.km));
    } else {
      f.nome = inp({ id: 'avulsa-nome', list: categoria === 'colaborador' ? 'dl-funcionarios' : null }); f.documento = inp({ id: 'avulsa-doc' });
      linhas.push(campo('Nome', f.nome, { req: true }), categoria === 'colaborador' ? null : campo('Documento', f.documento));
    }
    f.observacao = inp({ id: 'avulsa-obs' });
    linhas.push(campo('Observação', f.observacao));
    const cat = categoria === 'visitante' ? P.sel([['visitante', 'Visitante'], ['prestador', 'Prestador']], 'visitante') : null;
    const dlg = P.dialogo({
      id: 'dlg2', cod: 'Saída avulsa', titulo: 'Saída sem entrada registrada',
      corpo: [h('p', { class: 'sec-note', style: 'margin:0' }, 'Use quando a pessoa ou o veículo sai sem ter a entrada registrada no painel.'), cat ? campo('Categoria', cat) : null, h('div', { class: 'grid2' }, linhas), err],
      acoes: [{ txt: 'Cancelar', cls: 'btn ghost', fn: () => dlg.fechar() }, { txt: 'Registrar saída', fn: async () => {
        const campos = {};
        for (const [k, el] of Object.entries(f)) campos[k] = el.value.trim();
        if (categoria === 'frota') { campos.placaCavalo = Regras.normalizarPlaca(campos.placaCavalo); campos.km = campos.km ? Number(campos.km) : null; }
        if (!(campos.placaCavalo || campos.nome)) return err.replaceChildren(P.listaErros(['Preencha o campo obrigatório.']));
        if (categoria === 'colaborador') { const fu = acharFuncionario(campos.nome); campos.funcionarioId = fu ? fu.id : null; campos.motivo = 'outro'; }
        const ok = await P.acao(() => P.gravar('saida_registrada', st.portaria, { permanenciaId: P.novoId(), avulsa: true, categoria: cat ? cat.value : categoria, campos }), 'Saída avulsa registrada.');
        if (ok) dlg.fechar();
      } }],
    });
  }

  /* ---------- detalhe e correção ---------- */
  const ROTULOS = {
    nome: 'Nome', documento: 'Documento', placa: 'Placa', setor: 'Setor a visitar', cracha: 'Nº crachá', observacao: 'Observação',
    placaCavalo: 'Placa cavalo', motoristaNome: 'Motorista', km: 'KM', ctrc1: 'CTRC 1', ctrc2: 'CTRC 2', veiculo: 'Veículo',
    crachaDevolvido: 'Crachá devolvido', motivo: 'Motivo da saída',
  };
  const valorTexto = (k, v) => (v === true ? 'Sim' : v === false ? 'Não' : Array.isArray(v) ? v.filter(Boolean).join(', ') : k === 'motivo' ? nomeMotivo(v) : v == null ? '' : String(v));

  function detalhe(p) {
    const c = camposDe(p);
    const kv = h('dl', { class: 'kv' });
    const add = (rot, val) => { if (val !== '' && val != null) kv.append(h('dt', null, rot), h('dd', null, val)); };
    add('Portaria', P.portariaInfo(p.portaria).nome);
    add('Entrada', p.entrada ? `${P.dataHora(p.entrada.em)} por ${p.entrada.pessoa}` : 'sem entrada registrada');
    add('Saída', p.saida ? `${P.dataHora(p.saida.em)} por ${p.saida.pessoa}` : 'no local');
    for (const [k, v] of Object.entries(c)) if (ROTULOS[k]) add(ROTULOS[k], valorTexto(k, v));
    if (c.reboques) add('Reboques', valorTexto('', c.reboques));
    if (p.saida) for (const [k, v] of Object.entries(p.saida.campos)) if (ROTULOS[k]) add(ROTULOS[k] + ' (saída)', valorTexto(k, v));
    if (p.foraDoCadastro.length) add('Fora do cadastro', p.foraDoCadastro.join(', '));
    const tl = h('div', { class: 'card timeline' }, p.historico.map(e => h('div', { class: 'tl' }, h('span', { class: 'mo' }, P.dataHora(e.em)),
      h('span', null, { entrada_registrada: 'Entrada registrada', saida_registrada: 'Saída registrada', registro_corrigido: `Correção: ${e.dados.motivo}` }[e.tipo] || e.tipo),
      h('span', { class: 'acc' }, e.pessoa))));
    const fotos = c.fotos && c.fotos.length ? [h('h4', null, 'Fotos'), P.miniaturas(c.fotos)] : null;
    const dlg = P.dialogo({
      id: 'dlg', cod: CATEGORIAS[p.categoria], titulo: identificacao(p),
      corpo: [h('div', { class: 'card pad' }, kv), fotos, h('h4', { style: 'margin:0' }, 'Histórico'), tl],
      acoes: [{ txt: 'Fechar', cls: 'btn ghost', fn: () => dlg.fechar() }, { txt: 'Corrigir', fn: () => corrigir(p) }],
    });
  }

  function corrigir(p) {
    const c = camposDe(p);
    const editaveis = Object.entries(c).filter(([k, v]) => ROTULOS[k] && (typeof v === 'string' || typeof v === 'number' || v == null) && k !== 'veiculo' && k !== 'motivo');
    const inputs = editaveis.map(([k, v]) => [k, inp({ value: v == null ? '' : v, id: 'cor-' + k, type: typeof v === 'number' ? 'number' : 'text' })]);
    const motivo = h('textarea', { id: 'cor-motivo', rows: 2 });
    const err = h('div');
    const dlg = P.dialogo({
      id: 'dlg2', cod: 'Corrigir registro', titulo: identificacao(p),
      corpo: [h('div', { class: 'grid2' }, inputs.map(([k, el]) => campo(ROTULOS[k], el))), h('div', { class: 'fld' }, h('label', { for: 'cor-motivo', class: 'req' }, 'Motivo da correção'), motivo), err],
      acoes: [{ txt: 'Cancelar', cls: 'btn ghost', fn: () => dlg.fechar() }, { txt: 'Salvar correção', fn: async () => {
        if (!motivo.value.trim()) return err.replaceChildren(P.listaErros(['Informe o motivo da correção.']));
        const campos = {};
        for (const [k, el] of inputs) {
          let v = el.type === 'number' ? (el.value ? Number(el.value) : null) : el.value.trim();
          if (/^placa/i.test(k)) v = Regras.normalizarPlaca(v);
          if (v !== c[k]) campos[k] = v;
        }
        if (!Object.keys(campos).length) return err.replaceChildren(P.listaErros(['Nenhum campo foi alterado.']));
        if (await P.acao(() => P.gravar('registro_corrigido', p.portaria, { permanenciaId: p.id, campos, motivo: motivo.value.trim() }), 'Correção salva.')) { dlg.fechar(); P.$('#dlg').close(); }
      } }],
    });
  }

  /* ---------- tabelas ---------- */
  // colunas: [{ t: título, v: (p) => conteúdo }]
  function tabela(lista, colunas, { vazio = 'Nenhum registro.', acoes, classe } = {}) {
    return h('div', { class: 'tbl-scroll' }, h('table', null,
      h('thead', null, h('tr', null, colunas.map(c => h('th', null, c.t)), acoes ? h('th', null, '') : null)),
      h('tbody', null, lista.length ? lista.map(p => h('tr', { class: ['click', classe ? classe(p) : ''].join(' '), tabindex: 0, onclick: (e) => { if (!e.target.closest('button')) detalhe(p); } },
        colunas.map(c => h('td', null, c.v(p))), acoes ? h('td', null, acoes(p)) : null))
        : h('tr', null, h('td', { colspan: colunas.length + (acoes ? 1 : 0), class: 'sec-note' }, vazio)))));
  }

  function baixar(nome, texto) {
    const a = h('a', { href: URL.createObjectURL(new Blob([texto], { type: 'text/csv;charset=utf-8' })), download: nome });
    document.body.append(a); a.click(); a.remove();
  }

  // Bloco de histórico com período, busca e exportação. filtro(p) decide a categoria.
  const periodos = {};
  function blocoHistorico({ chave, titulo, filtro, colunas, csv, classe }) {
    const per = periodos[chave] || (periodos[chave] = { de: P.diaLocal(new Date(Date.now() - 6 * 86400000)), ate: P.diaLocal(), q: '' });
    const instante = (p) => (p.entrada ? p.entrada.em : p.saida.em);
    const lista = () => st.estado.permanencias.filter(p => p.portaria === portariaVista() && filtro(p))
      .filter(p => { const d = Estado.diaDe(instante(p)); return d >= per.de && d <= per.ate; })
      .filter(p => !per.q || JSON.stringify(camposDe(p)).toLowerCase().includes(per.q.toLowerCase()))
      .sort((a, b) => (instante(a) < instante(b) ? 1 : -1));
    const corpo = h('div');
    const desenhar = () => corpo.replaceChildren(tabela(lista(), colunas, { classe }));
    const de = inp({ type: 'date', value: per.de, id: `${chave}-de`, onchange: (e) => { per.de = e.target.value; desenhar(); } });
    const ate = inp({ type: 'date', value: per.ate, id: `${chave}-ate`, onchange: (e) => { per.ate = e.target.value; desenhar(); } });
    desenhar();
    return h('div', { class: 'sec' },
      h('div', { class: 'sec-h' }, h('h2', null, titulo), h('span', { class: 'sec-note' }, 'Clique num registro para ver os detalhes, o histórico e corrigir.')),
      h('div', { class: 'tools' }, h('label', { class: 'sec-note' }, 'De'), de, h('label', { class: 'sec-note' }, 'até'), ate,
        h('input', { type: 'search', placeholder: 'Buscar', value: per.q, oninput: (e) => { per.q = e.target.value; desenhar(); } }),
        botao('Exportar CSV', 'btn ghost', () => baixar(`${chave}_${P.portariaInfo(portariaVista()).pasta}_${per.de}_a_${per.ate}.csv`, Csv.gerarCsv(csv, lista())), { id: `${chave}-exportar` })),
      corpo);
  }

  const avisoOutraPortaria = () => h('p', { class: 'msg info' }, `Você está vendo a portaria ${P.portariaInfo(st.vista).nome}. Novos registros só podem ser feitos na portaria deste computador (${P.portariaInfo(st.portaria).nome}).`);

  // Colunas e CSV comuns.
  const entradaCol = { t: 'Entrada', v: (p) => (p.entrada ? h('span', { class: 'num' }, P.dataHora(p.entrada.em)) : h('span', { class: 'tag' }, 'avulsa')) };
  const saidaCol = { t: 'Saída', v: (p) => (p.saida ? h('span', { class: 'num' }, P.dataHora(p.saida.em)) : h('span', { class: 'tag ok' }, 'no local')) };
  const porCol = { t: 'Registrado por', v: (p) => (p.entrada || p.saida).pessoa };
  const csvComum = [
    { titulo: 'Entrada', valor: p => (p.entrada ? P.dataHora(p.entrada.em) : '') },
    { titulo: 'Saída', valor: p => (p.saida ? P.dataHora(p.saida.em) : '') },
    { titulo: 'Registrado por', valor: p => (p.entrada || p.saida).pessoa },
    { titulo: 'Última modificação', valor: p => `${P.dataHora(ultimaAlteracao(p).em)} por ${ultimaAlteracao(p).pessoa}` },
  ];

  Object.assign(P, {
    CATEGORIAS, MOTIVOS, nomeMotivo, vendoOutra, portariaVista, camposDe, identificacao, datalists, acharFuncionario,
    registrarSaida, saidaAvulsa, detalhe, tabela, baixar, blocoHistorico, avisoOutraPortaria, entradaCol, saidaCol, porCol, csvComum, ultimaAlteracao,
  });
})();
