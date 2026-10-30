// Formulário do REG LOG 04 – Ficha para Inspeção de Segurança de Veículos 17 Pontos (feita pelo GR).
(function () {
  'use strict';
  const P = window.Painel;
  const { h, inp, campo, st } = P;

  function dadosIniciais(p) {
    const c = p.entrada.campos;
    return {
      unidade: P.portariaInfo(p.portaria).nome, dataVistoria: P.diaLocal(), motorista: c.motoristaNome || '',
      placas: { cavalo: c.placaCavalo, reboques: [...(c.reboques || [])] },
      lacres: Object.fromEntries(Fichas.LACRES_04.map(l => [l.id, ''])), containers: ['', ''], tipoCarga: '',
      itens: Object.fromEntries(Fichas.ITENS_17.map(i => [i.n, { resposta: '', obs: '', fotos: [] }])), observacoes: '', lider: '',
    };
  }

  async function abrirChecklist04(pid, { corrigir } = {}) {
    if (!P.podeVistoriar()) return P.aviso('Só o GR e o coordenador fazem as vistorias.', 'err');
    const p = st.estado.permanencias.find(x => x.id === pid);
    if (!p || !p.entrada) return P.aviso('A chegada deste alerta ainda não chegou do Lists. Aguarde a sincronização e tente de novo.', 'err');
    const existente = corrigir ? st.estado.checklists.find(c => c.numero === corrigir) : null;
    const d = existente ? JSON.parse(JSON.stringify(existente.dados)) : (P.lerRascunho('04', pid) || dadosIniciais(p));
    let concluido = false;

    /* 17 itens */
    const linhas = new Map();
    const lista = h('div', { class: 'card', style: 'overflow:hidden' }, Fichas.ITENS_17.map(it => {
      const r = d.itens[it.n] || (d.itens[it.n] = { resposta: '', obs: '', fotos: [] });
      const obs = inp({ 'data-obs': '', value: r.obs || '', placeholder: 'Observações', oninput: (e) => { r.obs = e.target.value; } });
      const resp = P.seg([['C', 'Conforme'], ['NC', 'Não conforme'], ['NA', 'Não aplicável']], r.resposta, (v) => { r.resposta = v; marcarObs(); }, { class: 'seg nc' });
      const fld = h('div', { class: 'fld' }, obs);
      const marcarObs = () => { fld.classList.toggle('erro', r.resposta === 'NC' && !r.obs.trim()); obs.placeholder = r.resposta === 'NC' ? 'Observação obrigatória para Não conforme' : 'Observações'; };
      obs.addEventListener('input', marcarObs);
      marcarObs();
      const linha = h('div', { class: 'item17', 'data-n': it.n }, h('span', { class: 'n' }, String(it.n)), h('b', null, it.nome), resp,
        h('div', { class: 'extra' }, fld, P.blocoFotos(r.fotos, { alvo: `${p.portaria}-04-${pid}`, ponto: `item${it.n}`, rotulo: `${it.n}. ${it.nome}`, portaria: p.portaria })));
      linhas.set(it.n, { linha, resp, r });
      return linha;
    }));

    // Itens 12 a 17 ficam "Não aplicável" e travados conforme o tipo de carga e o lacre de container vazio.
    function aplicarTrava() {
      const travados = Regras.itensTravados(d);
      for (const [n, x] of linhas) {
        const t = travados.includes(n);
        if (t) { x.r.resposta = 'NA'; x.resp.definir('NA'); }
        x.resp.travar(t);
        x.linha.classList.toggle('travado', t);
      }
      aviso.hidden = !travados.length;
    }
    const aviso = h('p', { class: 'msg info', style: 'margin:0' }, 'ATENÇÃO: com container com carga, ou vazio já lacrado com lacre de segurança de container vazio, os itens 12, 13, 14, 15, 16 e 17 não são inspecionados e ficam como Não aplicável.');

    const carga = P.seg(Fichas.TIPOS_CARGA.map(t => [t.id, t.nome]), d.tipoCarga, (v) => { d.tipoCarga = v; aplicarTrava(); }, { 'data-carga': '' });
    const lacres = h('div', { class: 'grid3' }, Fichas.LACRES_04.map(l => campo(l.nome, inp({ value: d.lacres[l.id] || '', 'data-lacre': l.id, oninput: (e) => { d.lacres[l.id] = e.target.value; if (l.id === 'containerVazio') aplicarTrava(); } }))));
    const containers = h('div', { class: 'grid2' }, [0, 1].map(i => campo(`Nº do container ${i + 1}`, inp({ value: d.containers[i] || '', oninput: (e) => { d.containers[i] = e.target.value; } }))));
    const txt = (chave, rot, props = {}) => campo(rot, inp({ value: d[chave] || '', oninput: (e) => { d[chave] = e.target.value; }, ...props }));
    const err = h('div');

    const corpo = [
      P.resumoVeiculo(p),
      P.secao('Dados da vistoria', h('div', { class: 'grid3' }, txt('unidade', 'Unidade Tóliman'), txt('dataVistoria', 'Data da vistoria', { type: 'date' }), txt('motorista', 'Motorista'))),
      P.secao('Lacres e containers', lacres, containers),
      P.secao('Tipo de carga', carga, aviso),
      P.secao('Descrição da inspeção', h('p', { class: 'sec-note', style: 'margin:0' }, 'Não conforme exige observação.'), lista),
      P.secao('Fechamento', h('div', { class: 'fld' }, h('label', null, 'Observações gerais'), h('textarea', { rows: 3, oninput: (e) => { d.observacoes = e.target.value; } }, d.observacoes || '')),
        h('div', { class: 'grid2' }, campo('Conferente', inp({ value: st.pessoa, disabled: true })), txt('lider', 'Nome do líder da Tóliman Matriz'))),
      err,
    ];
    aplicarTrava();

    const dlg = P.dialogo({
      id: 'dlg', cod: `REG LOG 04 · ${existente ? existente.numero + ' · correção' : 'Inspeção de segurança 17 pontos'}`, titulo: `${p.entrada.campos.placaCavalo} · Vistoria 17 pontos`, corpo,
      acoes: [
        { txt: existente ? 'Cancelar' : 'Fechar e continuar depois', cls: 'btn ghost', fn: () => dlg.fechar() },
        { txt: existente ? 'Salvar correção' : 'Concluir vistoria', props: { id: 'ck04-concluir' }, fn: async () => {
          const erros = Regras.validarChecklist04(d);
          if (erros.length) { err.replaceChildren(P.listaErros(erros)); err.scrollIntoView({ block: 'nearest' }); return; }
          let motivo = null;
          if (existente) { motivo = await P.pedirTexto('Motivo da correção', 'Motivo', { cod: existente.numero }); if (!motivo) return; }
          let numero = null;
          const ok = await P.acao(async () => { numero = await P.salvarChecklist({ ficha: '04', permanencia: p, dados: d, corrigir: existente && existente.numero, motivo }); });
          if (ok) { concluido = true; dlg.fechar(); P.aviso(`Vistoria ${numero} ${existente ? 'corrigida' : 'concluída'}${Regras.temNaoConforme(d) ? ' com não conformidade' : ''}.`, Regras.temNaoConforme(d) ? 'err' : 'ok'); }
        } },
      ],
      aoFechar: () => { if (!concluido && !existente) P.guardarRascunho('04', pid, d); },
    });
  }

  P.abrirChecklist04 = abrirChecklist04;
})();
