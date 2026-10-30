// Exportação CSV (Excel pt-BR).
// Script clássico; carregável no Node para testes.
(function (root) {
  'use strict';

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

  const api = { gerarCsv, lerCsv, slug };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Csv = api;
})(typeof window !== 'undefined' ? window : globalThis);
