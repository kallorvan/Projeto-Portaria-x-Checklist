// Aba Colaboradores: registro rápido (um botão que alterna entrada/saída) e jornada do dia.
(function () {
  'use strict';
  const P = window.Painel;
  const { h, botao, inp, campo, st } = P;
  const eh = (p) => p.categoria === 'colaborador';
  let diaJornada = null;

  // Um colaborador pode ter registros pela matrícula e pelo nome (se foi cadastrado durante o dia): aceita os dois.
  const chavesDe = (nome) => { const fu = P.acharFuncionario(nome); const k = 'nome:' + String(nome || '').trim().toLowerCase(); return fu ? [fu.id, k] : [k]; };
  const abertaDe = (nome) => { const ks = chavesDe(nome); return st.estado.noLocal(st.portaria).find(p => eh(p) && ks.includes(Estado.chaveColaborador(p.entrada.campos))); };
  const emIntervalo = (nome) => { const ks = chavesDe(nome); return st.estado.emIntervalo(st.portaria, P.diaLocal()).some(x => ks.includes(x.chave)); };

  function formulario() {
    const nome = inp({ id: 'col-nome', list: 'dl-funcionarios', placeholder: 'Digite o nome do colaborador' });
    const veiculo = P.sel([['nenhum', 'A pé / sem veículo'], ['proprio', 'Carro próprio'], ['empresa', 'Veículo da empresa']], 'nenhum', { id: 'col-veiculo' });
    const placa = inp({ id: 'col-placa', list: 'dl-placas-leve', maxlength: 8 });
    const km = inp({ id: 'col-km', type: 'number', min: 0 });
    const motivo = P.sel(P.MOTIVOS, 'intervalo', { id: 'col-motivo' });
    const kmSaida = inp({ id: 'col-km-saida', type: 'number', min: 0 });
    const obs = inp({ id: 'col-obs' });
    const acao = h('button', { class: 'btn', type: 'submit', id: 'col-acao' }, 'Registrar entrada');
    const situacao = h('span', { class: 'sec-note' });
    const blocoEmpresa = h('div', { class: 'grid2' }, campo('Placa do veículo da empresa', placa, { req: true }), campo('KM', km, { req: true }));
    const entrada = h('div', { class: 'grid2' }, campo('Veículo', veiculo));
    const saida = h('div', { class: 'grid2' }, campo('Motivo da saída', motivo, { req: true }), campo('KM (veículo da empresa)', kmSaida, { req: true }));
    const err = h('div');

    function atualizar() {
      const ab = nome.value.trim() ? abertaDe(nome.value) : null;
      entrada.hidden = !!ab; saida.hidden = !ab;
      blocoEmpresa.hidden = !!ab || veiculo.value !== 'empresa';
      kmSaida.closest('.fld').hidden = !ab || ab.entrada.campos.veiculo !== 'empresa';
      acao.textContent = ab ? 'Registrar saída' : (nome.value.trim() && emIntervalo(nome.value) ? 'Registrar retorno' : 'Registrar entrada');
      situacao.textContent = !nome.value.trim() ? '' : ab ? `Está no local desde ${P.hora(ab.entrada.em)}${ab.entrada.campos.veiculo === 'empresa' ? ` com o veículo ${ab.entrada.campos.placa}` : ''}.` : (emIntervalo(nome.value) ? 'Saiu para o intervalo.' : 'Está fora.');
      err.replaceChildren();
    }
    nome.addEventListener('input', atualizar); veiculo.addEventListener('change', atualizar);
    atualizar();

    return h('form', { class: 'card form-card', id: 'col-form', onsubmit: async (ev) => {
      ev.preventDefault();
      const n = nome.value.trim();
      if (!n) return err.replaceChildren(P.listaErros(['Informe o nome do colaborador.']));
      const fu = P.acharFuncionario(n);
      const ab = abertaDe(n);
      if (ab) {
        const empresa = ab.entrada.campos.veiculo === 'empresa';
        const erros = [];
        if (empresa && !kmSaida.value) erros.push('Informe o KM do veículo da empresa.');
        if (motivo.value === 'outro' && !obs.value.trim()) erros.push('Descreva o motivo na observação.');
        if (erros.length) return err.replaceChildren(P.listaErros(erros));
        await P.acao(() => P.gravar('saida_registrada', st.portaria, { permanenciaId: ab.id, campos: { motivo: motivo.value, km: empresa ? Number(kmSaida.value) : null, observacao: obs.value.trim() } }), `Saída de ${n} registrada.`);
        return;
      }
      const campos = { funcionarioId: fu ? fu.id : null, nome: fu ? fu.nome : n, veiculo: veiculo.value, placa: '', km: null, observacao: obs.value.trim() };
      if (veiculo.value === 'empresa') {
        campos.placa = Regras.normalizarPlaca(placa.value);
        campos.km = km.value ? Number(km.value) : null;
        const erros = [];
        if (!campos.placa) erros.push('Informe a placa do veículo da empresa.');
        if (campos.km == null) erros.push('Informe o KM do veículo da empresa.');
        if (erros.length) return err.replaceChildren(P.listaErros(erros));
      }
      await P.acao(() => P.gravar('entrada_registrada', st.portaria, { permanenciaId: P.novoId(), categoria: 'colaborador', campos }), `Entrada de ${campos.nome} registrada.`);
    } },
      h('h3', null, 'Registro rápido'),
      h('div', { class: 'rapido' }, campo('Colaborador', nome, { req: true }), h('div', { style: 'padding-bottom:9px' }, situacao)),
      entrada, blocoEmpresa, saida, campo('Observação', obs), err, h('div', null, acao));
  }

  function jornada() {
    const dia = diaJornada || P.diaLocal();
    const lista = st.estado.jornadas(P.portariaVista(), dia);
    const rot = { entrada: 'Entrada', retorno: 'Retorno', saida: 'Saída' };
    const texto = (m) => `${rot[m.tipo]} ${P.hora(m.em)}${m.tipo === 'saida' && m.motivo ? ` (${P.nomeMotivo(m.motivo).toLowerCase()})` : ''}`;
    const max = Math.max(4, ...lista.map(j => j.marcacoes.length));
    const csv = [{ titulo: 'Colaborador', valor: j => j.nome }, { titulo: 'Data', valor: () => P.dataBR(dia) },
      ...Array.from({ length: max }, (_, i) => ({ titulo: `Marcação ${i + 1}`, valor: j => (j.marcacoes[i] ? texto(j.marcacoes[i]) : '') }))];
    return h('div', { class: 'sec' },
      h('div', { class: 'sec-h' }, h('h2', null, 'Jornada do dia'), h('span', { class: 'sec-note' }, 'Controle de portaria: não substitui o ponto do RH.')),
      h('div', { class: 'tools' }, inp({ type: 'date', id: 'jor-dia', value: dia, onchange: (e) => { diaJornada = e.target.value; P.render(); } }),
        botao('Exportar CSV', 'btn ghost', () => P.baixar(`jornada_${P.portariaInfo(P.portariaVista()).pasta}_${dia}.csv`, Csv.gerarCsv(csv, lista)), { id: 'jor-exportar' })),
      h('div', { class: 'tbl-scroll' }, h('table', { id: 'jornada' }, h('thead', null, h('tr', null, h('th', null, 'Colaborador'), h('th', null, 'Marcações'))),
        h('tbody', null, lista.length ? lista.map(j => h('tr', null, h('td', null, h('b', null, j.nome)), h('td', null, j.marcacoes.map(m => h('span', { class: 'marc' }, rot[m.tipo], h('b', null, P.hora(m.em)), m.tipo === 'saida' && m.motivo ? `(${P.nomeMotivo(m.motivo).toLowerCase()})` : '')))))
          : h('tr', null, h('td', { colspan: 2, class: 'sec-note' }, 'Nenhuma marcação neste dia.'))))));
  }

  const c = (p) => P.camposDe(p);
  const colunas = [
    { t: 'Colaborador', v: p => [h('b', null, c(p).nome), p.retorno ? [' ', h('span', { class: 'tag mv' }, 'retorno')] : null] },
    { t: 'Veículo', v: p => ({ nenhum: '', proprio: 'Carro próprio', empresa: 'Empresa' }[c(p).veiculo] || '') },
    { t: 'Placa', v: p => h('span', { class: 'nm' }, c(p).placa || '') },
    { t: 'KM', v: p => h('span', { class: 'num' }, c(p).km == null ? '' : String(c(p).km)) },
    { t: 'Motivo da saída', v: p => (p.saida ? P.nomeMotivo(p.saida.campos.motivo) : '') },
  ];

  P.telas.col = {
    preservar: true,
    render(alvo) {
      const noLocal = st.estado.noLocal(P.portariaVista()).filter(eh).sort((a, b) => (a.entrada.em < b.entrada.em ? -1 : 1));
      const intervalo = st.estado.emIntervalo(P.portariaVista(), P.diaLocal());
      const csv = [{ titulo: 'Nome', valor: p => c(p).nome }, { titulo: 'Situação', valor: p => (p.retorno ? 'Retorno' : 'Entrada') },
        { titulo: 'Veículo', valor: p => c(p).veiculo }, { titulo: 'Placa', valor: p => c(p).placa }, { titulo: 'KM entrada', valor: p => (p.entrada ? c(p).km : '') },
        ...P.csvComum.slice(0, 2), { titulo: 'Motivo da saída', valor: p => (p.saida ? P.nomeMotivo(p.saida.campos.motivo) : '') }, { titulo: 'KM saída', valor: p => (p.saida ? p.saida.campos.km : '') },
        ...P.csvComum.slice(2), { titulo: 'Observação', valor: p => [c(p).observacao, p.saida && p.saida.campos.observacao].filter(Boolean).join(' / ') }];
      alvo.replaceChildren(
        P.datalists(),
        h('div', { class: 'sec' }, P.vendoOutra() ? P.avisoOutraPortaria() : formulario()),
        jornada(),
        h('div', { class: 'sec' },
          h('div', { class: 'sec-h' }, h('h2', null, `No local agora (${noLocal.length}) · Em intervalo (${intervalo.length})`), P.vendoOutra() ? null : botao('Saída avulsa', 'btn ghost', () => P.saidaAvulsa('colaborador'))),
          P.tabela(noLocal, [...colunas.slice(0, 4), { t: 'Entrada', v: p => h('span', { class: 'num' }, `${P.dataHora(p.entrada.em)} · ${P.duracao(p.entrada.em)}`) }],
            { vazio: 'Nenhum colaborador no local.', acoes: (p) => (P.vendoOutra() ? null : botao('Registrar saída', 'send', () => P.registrarSaida(p))) })),
        P.blocoHistorico({ chave: 'col', titulo: 'Histórico de colaboradores', filtro: eh, colunas: [...colunas, P.entradaCol, P.saidaCol, P.porCol], csv }),
      );
    },
  };
})();
