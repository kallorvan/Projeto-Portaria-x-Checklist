// Aba Frota: chegada (abre o REG LOG 03), regra do 5º veículo, alerta ao GR e saída.
(function () {
  'use strict';
  const P = window.Painel;
  const A = window.Armazenamento;
  const { h, botao, inp, campo, st } = P;
  const eh = (p) => p.categoria === 'frota';

  // Grava o arquivo de alerta lido pelo fluxo do Power Automate (só o painel que registrou a chegada).
  async function gravarAlerta(permanenciaId) {
    const v = st.estado.vistorias.find(x => x.permanenciaId === permanenciaId);
    if (!v) return;
    const p = st.estado.permanencias.find(x => x.id === permanenciaId);
    const a = Alerta.montarAlerta(p, v, P.portariaInfo(p.portaria).nome);
    await A.gravarArquivo(['alertas'], a.nome, JSON.stringify(a.conteudo, null, 1));
    P.aviso('Este veículo vai para vistoria 17 pontos: alerta enviado ao GR.', 'info');
  }
  P.gravarAlerta = gravarAlerta;

  const checklist03De = (pid) => st.estado.checklists.find(c => c.ficha === '03' && c.permanenciaId === pid);
  const vistoriaDe = (pid) => st.estado.vistorias.find(v => v.permanenciaId === pid);

  function situacaoChecklists(p) {
    const c3 = checklist03De(p.id), v = vistoriaDe(p.id);
    return [
      c3 ? h('span', { class: 'tag ok' }, c3.numero) : (p.entrada ? botao('Fazer checklist 03', 'linkbtn', () => P.abrirChecklist03(p.id)) : null), ' ',
      v ? h('span', { class: 'tag ' + (v.situacao === 'pendente' ? 'warn' : v.situacao === 'concluida' ? 'ok' : 'mv') }, v.situacao === 'pendente' ? '17 pontos pendente' : v.situacao === 'concluida' ? v.checklistNumero : '17 pontos dispensada')
        : (p.entrada && !P.vendoOutra() ? botao('Forçar 17 pontos', 'linkbtn', () => forcar(p)) : null),
    ];
  }

  async function forcar(p) {
    const j = await P.pedirTexto(`Forçar vistoria 17 pontos · ${p.entrada.campos.placaCavalo}`, 'Justificativa', { cod: 'Exceção à regra do 5º veículo' });
    if (!j) return;
    await P.acao(async () => {
      await P.gravar('vistoria17_forcada', p.portaria, { permanenciaId: p.id, justificativa: j });
      await gravarAlerta(p.id);
    }, 'Vistoria 17 pontos forçada.');
  }

  function formulario() {
    const cont = st.estado.contadores[st.portaria] || { chegadas: 0, faltam: Regras.A_CADA };
    const f = {
      placaCavalo: inp({ id: 'frota-cavalo', list: 'dl-placas-cavalo', maxlength: 8 }),
      reb1: inp({ id: 'frota-reb1', list: 'dl-placas-reboque', maxlength: 8 }), reb2: inp({ id: 'frota-reb2', list: 'dl-placas-reboque', maxlength: 8 }), reb3: inp({ id: 'frota-reb3', list: 'dl-placas-reboque', maxlength: 8 }),
      motorista: inp({ id: 'frota-motorista', list: 'dl-motoristas' }), km: inp({ id: 'frota-km', type: 'number', min: 0 }),
      ctrc1: inp({ id: 'frota-ctrc1' }), ctrc2: inp({ id: 'frota-ctrc2' }), observacao: inp({ id: 'frota-obs' }),
    };
    const forcar = h('input', { type: 'checkbox', id: 'frota-forcar' });
    const just = inp({ id: 'frota-justificativa', placeholder: 'Justificativa (obrigatória)' });
    const blocoJust = h('div', { class: 'fld', hidden: true }, just);
    forcar.addEventListener('change', () => { blocoJust.hidden = !forcar.checked; });
    const avisoCnh = h('div');
    f.motorista.addEventListener('input', () => {
      const fu = P.acharFuncionario(f.motorista.value);
      const a = fu && Regras.avisoCnh(fu.cnhValidade, new Date());
      avisoCnh.replaceChildren(a ? h('p', { class: 'msg err', style: 'margin:0' }, `Atenção: a CNH de ${fu.nome} ${a === 'vencida' ? 'está vencida' : 'vence em breve'} (${P.dataBR(fu.cnhValidade)}). O registro não é bloqueado.`) : '');
    });
    const err = h('div');
    const proxima = cont.faltam === 1;
    return h('form', { class: 'card form-card', id: 'frota-form', onsubmit: async (ev) => {
      ev.preventDefault();
      const fu = P.acharFuncionario(f.motorista.value);
      const campos = {
        placaCavalo: Regras.normalizarPlaca(f.placaCavalo.value),
        reboques: [f.reb1, f.reb2, f.reb3].map(x => Regras.normalizarPlaca(x.value)).filter(Boolean),
        motoristaId: fu && fu.motorista ? fu.id : null, motoristaNome: fu ? fu.nome : f.motorista.value.trim(),
        km: f.km.value ? Number(f.km.value) : null, ctrc1: f.ctrc1.value.trim(), ctrc2: f.ctrc2.value.trim(), observacao: f.observacao.value.trim(),
      };
      const erros = [];
      if (!campos.placaCavalo) erros.push('Informe a placa do cavalo.');
      if (!campos.motoristaNome) erros.push('Informe o motorista.');
      if (campos.km == null) erros.push('Informe o KM.');
      if (forcar.checked && !just.value.trim()) erros.push('Informe a justificativa para forçar a vistoria 17 pontos.');
      if (erros.length) return err.replaceChildren(P.listaErros(erros));
      const ja = st.estado.noLocal(st.portaria).find(p => eh(p) && p.entrada.campos.placaCavalo === campos.placaCavalo);
      if (ja && !confirm(`O cavalo ${campos.placaCavalo} já está no local (entrada ${P.dataHora(ja.entrada.em)}). Registrar outra chegada mesmo assim?`)) return;
      const pid = P.novoId();
      const ok = await P.acao(async () => {
        await P.gravar('entrada_registrada', st.portaria, { permanenciaId: pid, categoria: 'frota', campos });
        if (forcar.checked) await P.gravar('vistoria17_forcada', st.portaria, { permanenciaId: pid, justificativa: just.value.trim() });
        await gravarAlerta(pid);
      }, `Chegada de ${campos.placaCavalo} registrada.`);
      if (ok) P.abrirChecklist03(pid);
    } },
      h('div', { class: 'sec-h', style: 'margin:0' }, h('h3', null, 'Nova chegada da frota'),
        h('span', { class: 'contador', id: 'frota-contador' }, 'Faltam ', h('b', null, String(cont.faltam)), ` veículo(s) para a próxima vistoria de 17 pontos · ${cont.chegadas} chegada(s) nesta portaria`)),
      proxima ? h('div', { class: 'destaque', id: 'frota-destaque' }, 'Este veículo vai para vistoria GR', h('small', null, 'É a 5ª chegada: oriente o motorista. O GR será avisado no Teams ao registrar.')) : null,
      h('div', { class: 'grid3' }, campo('Placa cavalo', f.placaCavalo, { req: true }), campo('Placa reboque 1', f.reb1), campo('Placa reboque 2', f.reb2), campo('Placa reboque 3', f.reb3),
        campo('Motorista', f.motorista, { req: true }), campo('KM', f.km, { req: true }), campo('CTRC 1', f.ctrc1), campo('CTRC 2', f.ctrc2), campo('Observação', f.observacao)),
      avisoCnh,
      proxima ? null : h('div', null, h('label', { class: 'check' }, forcar, 'Forçar vistoria 17 pontos neste veículo'), blocoJust),
      err,
      h('div', null, h('button', { class: 'btn', type: 'submit', id: 'frota-registrar' }, 'Registrar chegada e abrir checklist 03')));
  }

  const c = (p) => P.camposDe(p);
  const colunas = [
    { t: 'Cavalo', v: p => h('span', { class: 'nm' }, c(p).placaCavalo) },
    { t: 'Reboques', v: p => h('span', { class: 'nm' }, (c(p).reboques || []).join(' / ')) },
    { t: 'Motorista', v: p => [c(p).motoristaNome || '', p.foraDoCadastro.length ? [' ', h('span', { class: 'tag pre', title: p.foraDoCadastro.join(', ') }, 'fora do cadastro')] : null] },
    { t: 'KM', v: p => h('span', { class: 'num' }, c(p).km == null ? '' : String(c(p).km)) },
    { t: 'CTRC', v: p => [c(p).ctrc1, c(p).ctrc2].filter(Boolean).join(' / ') },
    { t: 'Checklists', v: situacaoChecklists },
  ];

  P.telas.frota = {
    preservar: true,
    render(alvo) {
      const noLocal = st.estado.noLocal(P.portariaVista()).filter(eh).sort((a, b) => (a.entrada.em < b.entrada.em ? -1 : 1));
      const csv = [
        { titulo: 'Placa Cavalo', valor: p => c(p).placaCavalo }, ...[0, 1, 2].map(i => ({ titulo: `Placa Reboque_${i + 1}`, valor: p => (c(p).reboques || [])[i] || '' })),
        { titulo: 'Motorista', valor: p => c(p).motoristaNome }, { titulo: 'KM entrada', valor: p => (p.entrada ? c(p).km : '') }, { titulo: 'KM saída', valor: p => (p.saida ? p.saida.campos.km : '') },
        { titulo: 'CTRC_1', valor: p => c(p).ctrc1 }, { titulo: 'CTRC_2', valor: p => c(p).ctrc2 },
        ...P.csvComum.slice(0, 2),
        { titulo: 'Checklist 03', valor: p => (checklist03De(p.id) || {}).numero || '' },
        { titulo: 'Vistoria 17 pontos', valor: p => { const v = vistoriaDe(p.id); return v ? (v.checklistNumero || v.situacao) : ''; } },
        ...P.csvComum.slice(2), { titulo: 'Observação', valor: p => c(p).observacao },
      ];
      alvo.replaceChildren(
        P.datalists(),
        h('div', { class: 'sec' }, P.vendoOutra() ? P.avisoOutraPortaria() : formulario()),
        h('div', { class: 'sec' },
          h('div', { class: 'sec-h' }, h('h2', null, `Frota no local agora (${noLocal.length})`), P.vendoOutra() ? null : botao('Saída avulsa', 'btn ghost', () => P.saidaAvulsa('frota'))),
          P.tabela(noLocal, [...colunas, { t: 'Chegada', v: p => h('span', { class: 'num' }, `${P.dataHora(p.entrada.em)} · ${P.duracao(p.entrada.em)}`) }],
            { vazio: 'Nenhum veículo da frota no local.', acoes: (p) => (P.vendoOutra() ? null : botao('Registrar saída', 'send', () => P.registrarSaida(p))) })),
        P.blocoHistorico({ chave: 'frota', titulo: 'Histórico da frota', filtro: eh, colunas: [...colunas, P.entradaCol, P.saidaCol, P.porCol], csv }),
      );
    },
  };

  // Substituído pelo formulário real em js/ficha03.js.
  if (!P.abrirChecklist03) P.abrirChecklist03 = (pid) => P.dialogo({ id: 'dlg', cod: 'REG LOG 03', titulo: 'Checklist operacional', corpo: h('p', null, 'Em construção.') });
})();
