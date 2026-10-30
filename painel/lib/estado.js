// Estado do painel recalculado a partir de todos os eventos (um JSON por alteração).
// Script clássico; carregável no Node para testes.
(function (root) {
  'use strict';

  const noNode = typeof module !== 'undefined' && module.exports;
  const R = noNode ? require('./regras.js') : root.Regras;
  const Listas = noNode ? require('./listas.js') : root.Listas;
  const placa = R.normalizarPlaca;

  // Data local AAAA-MM-DD de um instante ISO.
  function diaDe(em) {
    const d = new Date(em);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function chaveColaborador(campos) {
    return campos.funcionarioId || ('nome:' + String(campos.nome || '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase());
  }

  function ordenar(eventos) {
    const porId = new Map();
    for (const e of eventos || []) if (e && e.id && e.tipo && e.em) porId.set(e.id, e);
    return [...porId.values()].sort((a, b) => (a.em < b.em ? -1 : a.em > b.em ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  }

  // fontes: itens do Lists (cópias gravadas pelo fluxo) e alertas do 5º veículo (ADR 0003).
  function montarEstado(eventos, agora, fontes = {}) {
    const evs = ordenar(eventos);
    let admin = null;
    const pessoas = new Map();
    const veiculos = new Map();
    const funcionarios = new Map();
    const perm = new Map();
    const ocultos = new Map();

    const permanencia = (id, e) => {
      if (!perm.has(id)) perm.set(id, { id, portaria: e.portaria, categoria: null, entrada: null, saida: null, avulsa: false, retorno: false, foraDoCadastro: [], historico: [] });
      return perm.get(id);
    };

    for (const e of evs) {
      const d = e.dados || {};
      switch (e.tipo) {
        case 'admin_definido': admin = { salt: d.salt, hash: d.hash }; break;
        case 'pessoa_adicionada':
        case 'papeis_definidos': pessoas.set(d.nome, { nome: d.nome, papeis: [...(d.papeis || [])] }); break;
        case 'pessoa_removida': pessoas.delete(d.nome); break;
        case 'veiculo_salvo': veiculos.set(placa(d.placa), { ...d, placa: placa(d.placa) }); break;
        case 'funcionario_salvo': funcionarios.set(d.id, { ...d }); break;
        case 'entrada_registrada': {
          const p = permanencia(d.permanenciaId, e);
          p.historico.push(e);
          if (!p.entrada) { p.categoria = d.categoria; p.portaria = e.portaria; p.entrada = { em: e.em, pessoa: e.pessoa, campos: { ...(d.campos || {}) } }; }
          break;
        }
        case 'saida_registrada': {
          const p = permanencia(d.permanenciaId, e);
          p.historico.push(e);
          if (d.avulsa && !p.entrada) { p.avulsa = true; p.categoria = p.categoria || d.categoria; }
          if (!p.saida) p.saida = { em: e.em, pessoa: e.pessoa, campos: { ...(d.campos || {}) } };
          break;
        }
        case 'registro_ocultado': ocultos.set(d.permanenciaId, { motivo: d.motivo || '', pessoa: e.pessoa, em: e.em }); break;
        case 'registro_corrigido': {
          const p = perm.get(d.permanenciaId);
          if (!p) break;
          p.historico.push(e);
          if (p.entrada) Object.assign(p.entrada.campos, d.campos || {});
          else if (p.saida) Object.assign(p.saida.campos, d.campos || {});
          break;
        }
      }
    }

    for (const p of Listas.permanencias(fontes.itens || [])) perm.set(p.id, p);
    const permanencias = [...perm.values()];
    for (const p of permanencias) if (ocultos.has(p.id)) p.oculto = ocultos.get(p.id);
    const visiveis = permanencias.filter(p => !p.oculto);
    const temCadastro = veiculos.size > 0 || funcionarios.size > 0;
    for (const p of permanencias) {
      if (!temCadastro || !p.entrada) continue;
      const c = p.entrada.campos;
      if (p.categoria === 'frota') {
        for (const pl of [c.placaCavalo, ...(c.reboques || [])].filter(Boolean).map(placa)) if (!veiculos.has(pl)) p.foraDoCadastro.push('placa:' + pl);
        if (!c.motoristaId) p.foraDoCadastro.push('motorista');
      } else if (p.categoria === 'colaborador') {
        if (!c.funcionarioId) p.foraDoCadastro.push('funcionario');
        if (c.veiculo === 'empresa' && c.placa && !veiculos.has(placa(c.placa))) p.foraDoCadastro.push('placa:' + placa(c.placa));
      }
    }

    // Colaboradores: retorno depois de saída por intervalo no mesmo dia.
    const instante = (p) => (p.entrada ? p.entrada.em : p.saida.em);
    const colaboradores = visiveis.filter(p => p.categoria === 'colaborador' && (p.entrada || p.saida))
      .sort((a, b) => (instante(a) < instante(b) ? -1 : 1));
    const anterior = new Map();
    for (const p of colaboradores) {
      const campos = p.entrada ? p.entrada.campos : (p.saida.campos || {});
      const k = `${p.portaria}|${chaveColaborador(campos)}|${diaDe(instante(p))}`;
      const ant = anterior.get(k);
      if (p.entrada && ant && ant.saida && ant.saida.campos.motivo === 'intervalo') p.retorno = true;
      anterior.set(k, p);
    }

    function doDia(portaria, dia) {
      const grupos = new Map();
      for (const p of colaboradores) {
        if (p.portaria !== portaria || diaDe(instante(p)) !== dia) continue;
        const campos = p.entrada ? p.entrada.campos : (p.saida.campos || {});
        const k = chaveColaborador(campos);
        if (!grupos.has(k)) grupos.set(k, { chave: k, nome: campos.nome || '', perms: [] });
        grupos.get(k).perms.push(p);
      }
      return [...grupos.values()];
    }

    function jornadas(portaria, dia) {
      return doDia(portaria, dia).map(g => {
        const marcacoes = [];
        for (const p of g.perms) {
          if (p.entrada) marcacoes.push({ tipo: p.retorno ? 'retorno' : 'entrada', em: p.entrada.em, permanenciaId: p.id });
          if (p.saida) marcacoes.push({ tipo: 'saida', em: p.saida.em, motivo: p.saida.campos.motivo || null, permanenciaId: p.id });
        }
        marcacoes.sort((a, b) => (a.em < b.em ? -1 : 1));
        return { chave: g.chave, nome: g.nome, marcacoes };
      }).sort((a, b) => a.nome.localeCompare(b.nome));
    }

    function emIntervalo(portaria, dia) {
      const r = [];
      for (const g of doDia(portaria, dia)) {
        const ult = g.perms[g.perms.length - 1];
        if (ult.saida && ult.saida.campos.motivo === 'intervalo') r.push({ chave: g.chave, nome: g.nome, saida: ult.saida });
      }
      return r;
    }

    // Checklists: última versão por número.
    const ck = new Map();
    for (const e of evs) {
      if (e.tipo !== 'checklist_salvo') continue;
      const d = e.dados || {};
      const atual = ck.get(d.numero);
      const versoes = atual ? [...atual.versoes, e] : [e];
      if (atual && (atual.versao || 0) > (d.versao || 0)) { atual.versoes = versoes; continue; }
      ck.set(d.numero, {
        numero: d.numero, ficha: d.ficha, portaria: e.portaria, permanenciaId: d.permanenciaId, versao: d.versao || 1,
        dados: d.dados || {}, pdf: d.pdf || null, em: e.em, pessoa: e.pessoa,
        criadoPor: atual ? atual.criadoPor : e.pessoa, motivo: d.motivo || null,
        naoConforme: d.ficha === '04' && R.temNaoConforme(d.dados), versoes,
      });
    }
    const checklists = [...ck.values()].sort((a, b) => (a.em < b.em ? 1 : -1));

    // Vistorias 17 pontos: as automáticas vêm dos alertas gravados pelo fluxo (ADR 0003).
    const vistorias = [];
    const porPerm = new Map();
    let ultimaOrdem = 0;
    for (const a of fontes.alertas || []) {
      if (!a || a.id == null) continue;
      const pid = 'frota-' + a.id;
      if (porPerm.has(pid)) continue;
      const p = perm.get(pid);
      const v = { permanenciaId: pid, portaria: (p && p.portaria) || 'DIS', origem: 'automatica', ordem: a.ordem || null, situacao: 'pendente', justificativa: null, checklistNumero: null,
        desde: p && p.entrada ? p.entrada.em : a.chegada, alerta: a };
      vistorias.push(v); porPerm.set(pid, v);
      if ((a.ordem || 0) > ultimaOrdem) ultimaOrdem = a.ordem;
    }
    for (const e of evs) {
      const d = e.dados || {};
      if (e.tipo === 'vistoria17_forcada' && !porPerm.has(d.permanenciaId)) {
        const p = perm.get(d.permanenciaId);
        if (!p || !p.entrada) continue;
        const v = { permanenciaId: p.id, portaria: p.portaria, origem: 'forcada', ordem: null, situacao: 'pendente', justificativa: d.justificativa || '', checklistNumero: null, desde: p.entrada.em };
        vistorias.push(v); porPerm.set(p.id, v);
      }
    }
    for (const e of evs) {
      const d = e.dados || {};
      const v = porPerm.get(d.permanenciaId);
      if (!v) continue;
      if (e.tipo === 'checklist_salvo' && d.ficha === '04' && v.situacao !== 'concluida') {
        v.situacao = 'concluida'; v.checklistNumero = d.numero;
      } else if (e.tipo === 'vistoria17_dispensada' && v.situacao === 'pendente') {
        v.situacao = 'dispensada'; v.justificativa = d.justificativa || ''; v.dispensadaPor = e.pessoa;
      }
    }

    const noLocal = (portaria) => visiveis.filter(p => p.entrada && !p.saida && p.portaria === portaria);

    return {
      agora, admin,
      pessoas: [...pessoas.values()].sort((a, b) => a.nome.localeCompare(b.nome)),
      veiculos, funcionarios, permanencias,
      noLocal, jornadas, emIntervalo,
      checklists, vistorias, ultimaOrdem,
      eventos: evs,
    };
  }

  const api = { montarEstado, diaDe, chaveColaborador };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Estado = api;
})(typeof window !== 'undefined' ? window : globalThis);
