// Centro de controle: vistorias da Distrito, as duas portarias lado a lado e alertas de dados.
(function () {
  'use strict';
  const P = window.Painel;
  const { h, st } = P;
  const LISTAS = { frota: 'Frota', visitantes: 'Visitantes', colaboradores: 'Colaboradores' };

  function kpi(id, rotulo, valor, sub, cls, aba, depois) {
    return h('button', { type: 'button', class: 'kpi ' + (cls || ''), id, onclick: aba ? () => { if (depois) depois(); P.trocarAba(aba); } : null },
      h('div', { class: 'lab' }, rotulo), h('div', { class: 'val' }, String(valor)), h('div', { class: 'sub' + (cls === 'k-necessario' && valor ? ' alert' : '') }, sub || ''));
  }

  function blocoPortaria(por) {
    const e = st.estado, info = P.portariaInfo(por), hoje = P.diaLocal();
    const local = e.noLocal(por);
    const conta = (cat) => local.filter(p => p.categoria === cat).length;
    const doDia = (m) => m && Estado.diaDe(m.em) === hoje;
    const movimentos = P.visiveis(p => p.portaria === por).reduce((n, p) => n + (doDia(p.entrada) ? 1 : 0) + (doDia(p.saida) ? 1 : 0), 0);
    const ver = () => { st.vista = por; };
    return h('div', { class: 'sec' },
      h('div', { class: 'sec-h' }, h('h2', null, info.nome), h('span', { class: 'sec-note' }, info.frota ? 'Frota, pessoas e vistorias' : 'Pessoas')),
      h('div', { class: 'kpis', style: 'margin-top:0' },
        kpi(`ctl-${por}-vis`, 'Visitantes no local', conta('visitante'), 'agora', '', 'vis', ver),
        kpi(`ctl-${por}-col`, 'Colaboradores no local', conta('colaborador'), 'agora', '', 'col', ver),
        kpi(`ctl-${por}-intervalo`, 'Em intervalo', e.emIntervalo(por, hoje).length, 'saíram para o intervalo', '', 'col', ver),
        info.frota ? kpi(`ctl-${por}-frota`, 'Frota no pátio', conta('frota'), 'chegadas sem saída', '', 'frota') : null,
        kpi(`ctl-${por}-mov`, 'Movimentos hoje', movimentos, 'entradas e saídas', '', null)));
  }

  function alertasDeDados() {
    const hoje = P.diaLocal(), r = [];
    const avulsas = P.visiveis(p => p.avulsa && p.saida && Estado.diaDe(p.saida.em) === hoje);
    if (avulsas.length) r.push(`Saída sem entrada hoje: ${avulsas.map(p => `${P.identificacao(p)} (${P.portariaInfo(p.portaria).pasta} ${P.hora(p.saida.em)})`).join(', ')}.`);
    const longas = P.visiveis(p => p.entrada && !p.saida && p.categoria !== 'frota' && Date.now() - new Date(p.entrada.em) > 12 * 3600000);
    if (longas.length) r.push(`No local há mais de 12 h (provável saída não registrada): ${longas.map(p => `${P.identificacao(p)} (${P.portariaInfo(p.portaria).pasta})`).join(', ')}.`);
    // Atraso das cópias: lista sem arquivo novo há mais de 24 h (só listas que já enviaram algo).
    const ultimo = new Map();
    for (const it of st.fontes.itens) {
      const k = `${it.portaria}|${it.lista}`;
      if (!ultimo.has(k) || it.modificado > ultimo.get(k)) ultimo.set(k, it.modificado);
    }
    for (const [k, m] of ultimo) if (Date.now() - new Date(m) > 24 * 3600000) {
      const [por, lista] = k.split('|');
      r.push(`A lista ${LISTAS[lista] || lista} da ${P.portariaInfo(por).nome} não envia registros desde ${P.dataHora(m)}. Confira o fluxo no Power Automate.`);
    }
    return r;
  }

  P.telas.ini = {
    render(alvo) {
      const e = st.estado;
      const chegadas03 = P.aguardando03();
      const pend = e.vistorias.filter(v => v.situacao === 'pendente');
      const nc = e.checklists.filter(c => c.naoConforme && Date.now() - new Date(c.em) < 7 * 86400000);
      const maisAntiga = (lista) => P.duracao(lista.sort()[0]);
      const dados = alertasDeDados();
      alvo.replaceChildren(
        h('div', { class: 'sec' },
          h('div', { class: 'sec-h' }, h('h2', null, 'Vistorias · Distrito'), h('span', { class: 'sec-note' }, `Atualizado às ${P.hora(new Date())}`)),
          h('div', { class: 'kpis', style: 'margin-top:0' },
            kpi('ctl-03', 'Aguardando checklist 03', chegadas03.length, chegadas03.length ? `mais antiga há ${maisAntiga(chegadas03.map(p => p.entrada.em))}` : 'em dia', chegadas03.length ? 'k-necessario' : '', 'ck'),
            kpi('ctl-17', 'Vistorias 17 pontos pendentes', pend.length, pend.length ? `mais antiga há ${maisAntiga(pend.map(v => v.desde))}` : 'em dia', pend.length ? 'k-necessario' : '', 'ck'),
            kpi('ctl-nc', 'Não conformidades', nc.length, 'últimos 7 dias', nc.length ? 'k-necessario' : '', 'ck'),
            kpi('ctl-ordem', 'Última vistoria do fluxo', e.ultimaOrdem ? `${e.ultimaOrdem}ª` : '—', 'chegada da contagem', '', null))),
        blocoPortaria('DIS'),
        blocoPortaria('MAC'),
        h('div', { class: 'sec', id: 'ctl-dados', style: 'display:grid;gap:10px' },
          h('div', { class: 'sec-h', style: 'margin:0' }, h('h2', null, 'Alertas de dados')),
          dados.length ? dados.map(t => h('p', { class: 'msg info', style: 'margin:0' }, t)) : h('p', { class: 'sec-note', style: 'margin:0' }, 'Nenhuma inconsistência nos registros de hoje.')),
      );
    },
  };
})();
