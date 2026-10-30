// Leitura dos itens do Microsoft Lists (cópias gravadas pelo Power Automate em listas/<Pasta>/<lista>/<ID>.json)
// e montagem das permanências no mesmo formato do Estado. Script clássico; carregável no Node para testes.
(function (root) {
  'use strict';

  const R = (typeof module !== 'undefined' && module.exports) ? require('./regras.js') : root.Regras;

  const txt = (v) => (v == null ? '' : String(v).trim());
  const chave = (v) => txt(v).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const num = (v) => { const n = Number(String(v == null ? '' : v).replace(/\D/g, '')); return txt(v) && Number.isFinite(n) ? n : null; };

  // Data DD/MM/AAAA + Hora + Minuto digitados pelo porteiro, na hora local; senão, a data de criação do item.
  function instante(campos, criado) {
    const m = txt(campos.Data).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    const hh = txt(campos.Hora), mm = txt(campos.Minuto);
    if (!m || !/^\d{1,2}$/.test(hh) || !/^\d{1,2}$/.test(mm) || +hh > 23 || +mm > 59) return criado;
    return new Date(+m[3], +m[2] - 1, +m[1], +hh, +mm).toISOString();
  }

  function placa(v) {
    const p = R.normalizarPlaca(v);
    return p === 'NENHUM' ? '' : p;
  }

  const SITUACAO_FROTA = { chegada: 'entrada', entrada: 'entrada', saida: 'saida' };
  const SITUACAO_COLAB = {
    'chegada expediente': ['entrada'], entrada: ['entrada'], 'chegada intervalo': ['entrada'],
    'saida intervalo': ['saida', 'intervalo'], 'saida expediente': ['saida', 'fim'], saida: ['saida', 'fim'],
  };

  function base(item, prefixo, categoria) {
    return { id: prefixo + item.id, portaria: item.portaria, categoria, entrada: null, saida: null, avulsa: false, retorno: false,
      foraDoCadastro: [], historico: [], origem: 'lists', itens: [item.id], link: item.link || null };
  }

  // Frota e colaboradores: uma linha por movimento. Cada saída fecha a entrada aberta mais recente da mesma chave.
  function parear(movs, prefixo, categoria) {
    movs.sort((a, b) => (a.em < b.em ? -1 : a.em > b.em ? 1 : a.item.id - b.item.id));
    const abertas = new Map(), r = [];
    for (const m of movs) {
      const k = `${m.item.portaria}|${m.chave}`;
      if (m.tipo === 'entrada') {
        const p = base(m.item, prefixo, categoria);
        p.entrada = { em: m.em, pessoa: m.item.autor || '', campos: m.campos };
        r.push(p);
        (abertas.get(k) || abertas.set(k, []).get(k)).push(p);
      } else {
        const pilha = abertas.get(k) || [];
        const p = pilha.length ? pilha.pop() : null;
        const saida = { em: m.em, pessoa: m.item.editor || m.item.autor || '', campos: m.campos };
        if (p) { p.saida = saida; p.itens.push(m.item.id); continue; }
        const av = base(m.item, prefixo + 's', categoria);
        av.avulsa = true; av.saida = { ...saida, campos: { ...m.extra, ...m.campos } };
        r.push(av);
      }
    }
    return r;
  }

  function frota(itens) {
    const movs = [];
    for (const it of itens) {
      const c = it.campos || {}, tipo = SITUACAO_FROTA[chave(c.Situacao)];
      if (!tipo) continue;
      const cavalo = placa(c.Placa_cavalo);
      const em = instante(c, it.criado);
      if (tipo === 'entrada') {
        movs.push({ item: it, em, tipo, chave: cavalo, campos: {
          placaCavalo: cavalo, reboques: [c.Placa_reboque1, c.Placa_reboque2, c.Placa_reboque3].map(placa).filter(Boolean),
          motoristaNome: txt(c.Motorista), km: num(c.KM), anexos: it.anexos || [], itemId: it.id } });
      } else {
        movs.push({ item: it, em, tipo, chave: cavalo, campos: { km: num(c.KM), itemId: it.id },
          extra: { placaCavalo: cavalo, motoristaNome: txt(c.Motorista) } });
      }
    }
    return parear(movs, 'frota-', 'frota');
  }

  function colaboradores(itens) {
    const movs = [];
    for (const it of itens) {
      const c = it.campos || {}, s = SITUACAO_COLAB[chave(c['Situação'])];
      if (!s) continue;
      const nome = txt(c.Nome), em = instante(c, it.criado);
      if (s[0] === 'entrada') {
        movs.push({ item: it, em, tipo: 'entrada', chave: chave(nome), campos: {
          nome, veiculo: txt(c['Veículo']), placa: placa(c.Placa), km: num(c.KM), observacao: txt(c['Observação']) } });
      } else {
        movs.push({ item: it, em, tipo: 'saida', chave: chave(nome), campos: { motivo: s[1], km: num(c.KM), observacao: txt(c['Observação']) },
          extra: { nome } });
      }
    }
    return parear(movs, 'col-', 'colaborador');
  }

  // Visitantes: um item por visita, editado na saída (Entrada/Saída = Saída e hora_saida).
  function visitantes(itens) {
    const r = [];
    for (const it of itens) {
      const c = it.campos || {};
      const p = base(it, 'vis-', 'visitante');
      const em = instante(c, it.criado);
      p.entrada = { em, pessoa: it.autor || '', campos: {
        nome: txt(c.Nome), documento: txt(c['RG/CNH']), placa: placa(c.Placa_veiculo), setor: txt(c.Setor_visita), cracha: txt(c.cracha) } };
      const hs = txt(c.hora_saida).match(/^(\d{1,2}):(\d{2})$/);
      if (chave(c['Entrada/Saída']) === 'saida') {
        let saida = it.modificado;
        if (hs) {
          const d = new Date(em);
          const s = new Date(d.getFullYear(), d.getMonth(), d.getDate(), +hs[1], +hs[2]);
          if (s < d) s.setDate(s.getDate() + 1);
          saida = s.toISOString();
        }
        p.saida = { em: saida, pessoa: it.editor || it.autor || '', campos: {} };
      }
      r.push(p);
    }
    return r;
  }

  function permanencias(itens) {
    const por = { frota: [], colaboradores: [], visitantes: [] };
    for (const it of itens || []) if (it && it.id != null && por[it.lista]) por[it.lista].push(it);
    return [...frota(por.frota), ...colaboradores(por.colaboradores), ...visitantes(por.visitantes)];
  }

  const api = { instante, placa, permanencias };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Listas = api;
})(typeof window !== 'undefined' ? window : globalThis);
