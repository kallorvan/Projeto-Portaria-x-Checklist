const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../painel/lib/csv.js');

test('gerarCsv com BOM e aspas', () => {
  const t = C.gerarCsv([{ titulo: 'Nome', valor: l => l.n }, { titulo: 'Obs', valor: l => l.o }], [{ n: 'a;b', o: 'diz "oi"' }]);
  assert.ok(t.startsWith('﻿'));
  assert.match(t, /"a;b"/);
  assert.match(t, /"diz ""oi"""/);
});

test('lerCsv detecta vírgula', () => {
  assert.deepEqual(C.lerCsv('Placa,Tipo\nABC1D23,Cavalo'), [['Placa', 'Tipo'], ['ABC1D23', 'Cavalo']]);
});

test('lerCsv com aspas, BOM e ponto e vírgula', () => {
  assert.deepEqual(C.lerCsv('﻿a;b\r\n"x;y";"z ""q"""\r\n'), [['a', 'b'], ['x;y', 'z "q"']]);
});

