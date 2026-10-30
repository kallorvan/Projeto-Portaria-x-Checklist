// Aba Início: indicadores da portaria, vistorias pendentes e avisos.
(function () {
  'use strict';
  const P = window.Painel;
  const { h, botao, st } = P;

  function kpi(rotulo, valor, sub, cls, aba, id) {
    return h('button', { type: 'button', class: 'kpi ' + (cls || ''), id, onclick: aba ? () => P.trocarAba(aba) : null },
      h('div', { class: 'lab' }, rotulo), h('div', { class: 'val' }, String(valor)), h('div', { class: 'sub' + (cls === 'k-necessario' && valor ? ' alert' : '') }, sub || ''));
  }

  P.telas.ini = {
    render(alvo) {
      const e = st.estado, por = P.portariaVista(), hoje = P.diaLocal();
      const local = e.noLocal(por);
      const conta = (f) => local.filter(f).length;
      const vis = conta(p => p.categoria === 'visitante' || p.categoria === 'prestador');
      const frota = conta(p => p.categoria === 'frota');
      const col = conta(p => p.categoria === 'colaborador');
      const intervalo = e.emIntervalo(por, hoje).length;
      const entradasHoje = e.permanencias.filter(p => p.portaria === por && p.entrada && Estado.diaDe(p.entrada.em) === hoje).length;
      const crachas = e.permanencias.filter(p => p.portaria === por && (p.categoria === 'visitante' || p.categoria === 'prestador') && p.entrada && p.entrada.campos.cracha &&
        ((p.saida && p.saida.campos.crachaDevolvido === false) || (!p.saida && Date.now() - new Date(p.entrada.em) > 12 * 3600000)));
      const pend = e.vistorias.filter(v => v.situacao === 'pendente' && v.portaria === por);
      const cont = e.contadores[por] || { chegadas: 0, faltam: Regras.A_CADA };
      const sem03 = local.filter(p => p.categoria === 'frota' && !e.checklists.some(c => c.ficha === '03' && c.permanenciaId === p.id));
      const fotos = st.fotosEntrada.filter(f => Fotos.ehImagem(f.nome));
      const esquecidas = Fotos.esquecidas(fotos, new Date());

      const avisos = [];
      if (pend.length) avisos.push(h('div', { class: 'destaque' }, `${pend.length} vistoria(s) 17 pontos pendente(s)`, h('small', null, pend.map(v => { const p = e.permanencias.find(x => x.id === v.permanenciaId); return `${p.entrada.campos.placaCavalo} (há ${P.duracao(v.desde)})`; }).join(' · ')),
        h('div', { style: 'margin-top:10px;position:relative;z-index:1' }, botao('Abrir fila do GR', 'btn ghost', () => P.trocarAba('ck')))));
      if (sem03.length) avisos.push(h('p', { class: 'msg info' }, `Checklist 03 não preenchido: ${sem03.map(p => p.entrada.campos.placaCavalo).join(', ')}. `, botao('Ir para Frota', 'linkbtn', () => P.trocarAba('frota'))));
      if (P.temPapel('admin') && esquecidas.length) avisos.push(h('p', { class: 'msg err' }, `${esquecidas.length} foto(s) há mais de ${Fotos.DIAS_ESQUECIDA} dias na pasta fotos-entrada/${P.portariaInfo(por).pasta} sem vínculo. Vincule ou apague pelo OneDrive.`));
      const foraCad = e.permanencias.filter(p => p.foraDoCadastro.length).length;
      if (P.temPapel('admin') && foraCad) avisos.push(h('p', { class: 'msg info' }, `${foraCad} registro(s) com placa ou pessoa fora do cadastro. `, botao('Ver em Cadastros', 'linkbtn', () => P.trocarAba('cad'))));

      alvo.replaceChildren(
        h('div', { class: 'sec' }, h('div', { class: 'sec-h' }, h('h2', null, `No local agora · ${P.portariaInfo(por).nome}`), h('span', { class: 'sec-note' }, `Atualizado às ${P.hora(new Date())}`))),
        h('div', { class: 'kpis', style: 'margin-top:0' },
          kpi('Visitantes e prestadores', vis, 'no local agora', '', 'vis', 'kpi-vis'),
          kpi('Frota', frota, 'no local agora', '', 'frota', 'kpi-frota'),
          kpi('Colaboradores', col, intervalo ? `${intervalo} em intervalo` : 'no local agora', '', 'col', 'kpi-col'),
          kpi('Entradas hoje', entradasHoje, 'todas as categorias', '', null, 'kpi-hoje'),
          kpi('Crachás não devolvidos', crachas.length, crachas.length ? crachas.map(p => p.entrada.campos.cracha).join(', ') : 'tudo em ordem', crachas.length ? 'k-necessario' : '', 'vis', 'kpi-cracha'),
          kpi('Vistorias 17 pontos pendentes', pend.length, `próxima em ${cont.faltam} chegada(s)`, pend.length ? 'k-necessario' : '', 'ck', 'kpi-17'),
          kpi('Fotos aguardando vínculo', fotos.length, `pasta fotos-entrada/${P.portariaInfo(por).pasta}`, '', null, 'kpi-fotos'),
        ),
        avisos.length ? h('div', { class: 'sec', style: 'display:grid;gap:10px' }, avisos) : null,
      );
    },
  };
})();
