// Formulário do REG LOG 03 – Ficha para Inspeção Veicular Operacional (toda chegada da frota).
(function () {
  'use strict';
  const P = window.Painel;
  const { h, inp, campo, st } = P;

  function dadosIniciais(p) {
    return {
      limpeza: { limpo: null, lixo: null, odor: null }, regioes: {}, motorista: {}, cabine: '', estepes: '', carretaDianteira: '', carretaTraseira: '',
      container: '', lacre: '', nomes: { motorista: p.entrada.campos.motoristaNome || '', porteiro: p.entrada.pessoa || '', lider: '' },
    };
  }

  // corrigir: número do checklist a corrigir (abre preenchido e pede o motivo ao salvar).
  async function abrirChecklist03(pid, { corrigir } = {}) {
    if (!P.podeVistoriar()) return P.aviso('Só o GR e o coordenador fazem as vistorias.', 'err');
    const p = st.estado.permanencias.find(x => x.id === pid);
    if (!p || !p.entrada) return P.aviso('Registro de chegada não encontrado.', 'err');
    const existente = corrigir ? st.estado.checklists.find(c => c.numero === corrigir) : null;
    const d = existente ? JSON.parse(JSON.stringify(existente.dados)) : (P.lerRascunho('03', pid) || dadosIniciais(p));
    const regioes = Fichas.regioesDoVeiculo(p.entrada.campos.reboques);
    let concluido = false;

    /* limpeza */
    const limpeza = h('div', { class: 'grid3' }, Fichas.LIMPEZA_03.map(it => campo(it.nome,
      P.seg([['sim', 'Sim'], ['nao', 'Não']], d.limpeza[it.id] == null ? '' : (d.limpeza[it.id] ? 'sim' : 'nao'), (v) => { d.limpeza[it.id] = v === 'sim'; }, { 'data-limpeza': it.id }))));

    /* avarias por região */
    const blocoRegiao = (g) => {
      const r = d.regioes[g.id] || (d.regioes[g.id] = { semAvarias: false, codigos: [], descricao: '', fotos: [] });
      const sem = h('input', { type: 'checkbox', 'data-sem': '', checked: !!r.semAvarias });
      const codigos = Fichas.CODIGOS_AVARIA.map(c => h('label', { class: 'check', title: c.nome },
        h('input', { type: 'checkbox', 'data-codigo': c.id, checked: r.codigos.includes(c.id), onchange: (e) => {
          r.codigos = Fichas.CODIGOS_AVARIA.map(x => x.id).filter(id => (id === c.id ? e.target.checked : r.codigos.includes(id)));
          if (r.codigos.length) { r.semAvarias = false; sem.checked = false; }
        } }), `${c.id} – ${c.nome}`));
      sem.addEventListener('change', () => {
        r.semAvarias = sem.checked;
        if (sem.checked) { r.codigos = []; codigos.forEach(l => { l.querySelector('input').checked = false; }); }
      });
      const desc = inp({ 'data-desc': '', value: r.descricao, placeholder: 'Descrição da avaria', oninput: (e) => { r.descricao = e.target.value; } });
      return h('div', { class: 'regiao', 'data-regiao': g.id },
        h('div', { class: 't' }, g.nome, h('label', { class: 'check' }, sem, 'Sem avarias')),
        h('div', { class: 'pessoas', style: 'justify-content:flex-start' }, codigos),
        desc, P.blocoFotos(r.fotos, { alvo: `${p.portaria}-03-${pid}`, ponto: g.id, rotulo: g.nome, portaria: p.portaria }));
    };

    /* motorista */
    const itensMot = h('div', { class: 'grid3' }, Fichas.ITENS_MOTORISTA_03
      .filter(it => !/reboque(\d)/.test(it.id) || (p.entrada.campos.reboques || []).length >= Number(it.id.slice(-1)))
      .map(it => h('label', { class: 'check' }, h('input', { type: 'checkbox', 'data-mot': it.id, checked: !!d.motorista[it.id], onchange: (e) => { d.motorista[it.id] = e.target.checked; } }), it.nome)));
    const cabine = P.seg([['otimo', 'Ótimo'], ['regular', 'Regular'], ['ruim', 'Ruim']], d.cabine, (v) => { d.cabine = v; }, { id: 'ck03-cabine' });

    const texto = (chave, rot, props = {}) => campo(rot, inp({ value: d[chave] || '', oninput: (e) => { d[chave] = e.target.value; }, ...props }));
    const nome = (chave, rot) => campo(rot, inp({ value: d.nomes[chave] || '', oninput: (e) => { d.nomes[chave] = e.target.value; }, id: 'ck03-nome-' + chave }));
    const err = h('div');

    const corpo = [
      P.resumoVeiculo(p),
      P.secao('Limpeza e organização interna do veículo', limpeza),
      P.secao('Avarias por região', h('p', { class: 'sec-note', style: 'margin:0' }, 'Em cada região marque "Sem avarias" ou os códigos: A amassado, R riscado, F faltando, Q quebrado, C cortado, M marcado guia.'), ...regioes.map(blocoRegiao)),
      P.secao('Preenchimento exclusivo do motorista', itensMot, campo('Condição da cabine', cabine)),
      P.secao('Carretas, container e lacre', h('div', { class: 'grid3' }, texto('estepes', 'Qtde de estepes', { type: 'number', min: 0 }), texto('carretaDianteira', 'Carreta dianteira'), texto('carretaTraseira', 'Carreta traseira'), texto('container', 'Container'), texto('lacre', 'Lacre'))),
      P.secao('Assinaturas', h('p', { class: 'sec-note', style: 'margin:0' }, `Vistoriador/conferente: ${st.pessoa}. O PDF sai com linhas para assinatura física.`), h('div', { class: 'grid3' }, nome('motorista', 'Motorista'), nome('porteiro', 'Porteiro'), nome('lider', 'Líder'))),
      err,
    ];

    const dlg = P.dialogo({
      id: 'dlg', cod: `REG LOG 03 · ${existente ? existente.numero + ' · correção' : 'Inspeção veicular operacional'}`, titulo: `${p.entrada.campos.placaCavalo} · Checklist operacional`, corpo,
      acoes: [
        { txt: existente ? 'Cancelar' : 'Fechar e continuar depois', cls: 'btn ghost', fn: () => dlg.fechar() },
        { txt: existente ? 'Salvar correção' : 'Concluir checklist', props: { id: 'ck03-concluir' }, fn: async () => {
          const erros = Regras.validarChecklist03(d, regioes);
          if (erros.length) { err.replaceChildren(P.listaErros(erros)); err.scrollIntoView({ block: 'nearest' }); return; }
          d.regioes = Object.fromEntries(regioes.map(g => [g.id, d.regioes[g.id]]));
          let motivo = null;
          if (existente) { motivo = await P.pedirTexto('Motivo da correção', 'Motivo', { cod: existente.numero }); if (!motivo) return; }
          let numero = null;
          const ok = await P.acao(async () => { numero = await P.salvarChecklist({ ficha: '03', permanencia: p, dados: d, corrigir: existente && existente.numero, motivo }); });
          if (ok) { concluido = true; dlg.fechar(); P.aviso(`Checklist ${numero} ${existente ? 'corrigido' : 'concluído'}.`, 'ok'); }
        } },
      ],
      aoFechar: () => { if (!concluido && !existente) P.guardarRascunho('03', pid, d); },
    });
  }

  P.abrirChecklist03 = abrirChecklist03;
})();
