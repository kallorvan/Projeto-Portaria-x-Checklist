// Exportação CSV (Excel pt-BR) e importação de cadastros por planilha.
// Script clássico; carregável no Node para testes.
(function (root) {
  'use strict';

  const R = (typeof module !== 'undefined' && module.exports) ? require('./regras.js') : root.Regras;

  const semAcento = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
  const slug = (s) => semAcento(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  function celula(v) {
    const s = v == null ? '' : String(v);
    return /[;"\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  function gerarCsv(colunas, linhas) {
    const out = [colunas.map(c => celula(c.titulo)).join(';')];
    for (const l of linhas) out.push(colunas.map(c => celula(c.valor(l))).join(';'));
    return '﻿' + out.join('\r\n') + '\r\n';
  }

  function lerCsv(texto) {
    const t = String(texto || '').replace(/^﻿/, '');
    const primeira = t.split(/\r?\n/)[0];
    const sep = primeira.includes(';') ? ';' : ',';
    const linhas = [];
    let linha = [], cel = '', aspas = false;
    for (let i = 0; i < t.length; i++) {
      const ch = t[i];
      if (aspas) {
        if (ch === '"') { if (t[i + 1] === '"') { cel += '"'; i++; } else aspas = false; }
        else cel += ch;
      } else if (ch === '"') aspas = true;
      else if (ch === sep) { linha.push(cel); cel = ''; }
      else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && t[i + 1] === '\n') i++;
        linha.push(cel); linhas.push(linha); linha = []; cel = '';
      } else cel += ch;
    }
    if (cel !== '' || linha.length) { linha.push(cel); linhas.push(linha); }
    return linhas.filter(l => l.some(c => c.trim() !== ''));
  }

  // Lê a planilha como objetos com cabeçalho normalizado; linha = número da linha no arquivo.
  function registros(texto) {
    const [cab, ...resto] = lerCsv(texto);
    const chaves = (cab || []).map(semAcento);
    return resto.map((l, i) => ({ linha: i + 2, v: (nome) => String(l[chaves.indexOf(nome)] || '').trim() }));
  }

  const TIPOS = { cavalo: 'cavalo', reboque: 'reboque', leve: 'leve' };
  const VINCULOS = { proprio: 'proprio', terceiro: 'terceiro' };

  function importarVeiculos(texto) {
    const itens = [], erros = [];
    for (const r of registros(texto)) {
      const placa = R.normalizarPlaca(r.v('placa'));
      const tipo = TIPOS[semAcento(r.v('tipo'))];
      const vinculo = VINCULOS[semAcento(r.v('vinculo'))] || (r.v('vinculo') ? null : 'proprio');
      if (!placa) { erros.push(`Linha ${r.linha}: placa vazia`); continue; }
      if (!tipo) { erros.push(`Linha ${r.linha}: tipo '${r.v('tipo')}' inválido`); continue; }
      if (!vinculo) { erros.push(`Linha ${r.linha}: vínculo '${r.v('vinculo')}' inválido`); continue; }
      itens.push({ placa, tipo, modelo: r.v('modelo'), vinculo, ativo: true });
    }
    return { itens, erros };
  }

  function importarFuncionarios(texto) {
    const itens = [], erros = [];
    for (const r of registros(texto)) {
      const nome = r.v('nome');
      if (!nome) { erros.push(`Linha ${r.linha}: nome vazio`); continue; }
      const mot = semAcento(r.v('motorista'));
      if (mot && !['sim', 'nao'].includes(mot)) { erros.push(`Linha ${r.linha}: motorista '${r.v('motorista')}' inválido (use Sim ou Não)`); continue; }
      const val = r.v('validadecnh');
      let cnhValidade = null;
      if (val) {
        const m = val.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (!m) { erros.push(`Linha ${r.linha}: validade da CNH '${val}' inválida (use DD/MM/AAAA)`); continue; }
        cnhValidade = `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
      }
      const matricula = r.v('matricula');
      itens.push({ id: matricula || slug(nome), nome, matricula, setor: r.v('setor'), motorista: mot === 'sim', cnhNumero: r.v('cnh'), cnhValidade, ativo: true });
    }
    return { itens, erros };
  }

  const api = { gerarCsv, lerCsv, importarVeiculos, importarFuncionarios, slug };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Csv = api;
})(typeof window !== 'undefined' ? window : globalThis);
