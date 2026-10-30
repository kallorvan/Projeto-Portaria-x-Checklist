const test = require('node:test');
const assert = require('node:assert/strict');
const F = require('../painel/lib/fichas.js');

test('regiões só do cavalo', () => {
  assert.equal(F.regioesDoVeiculo([]).length, 3);
});

test('regiões com dois reboques', () => {
  const r = F.regioesDoVeiculo(['AAA1A11', 'BBB2B22']);
  assert.equal(r.length, 9);
  assert.equal(r[8].id, 'reboque2_traseira');
  assert.match(r[8].nome, /BBB2B22/);
});

test('17 itens na ordem da ficha', () => {
  assert.equal(F.ITENS_17.length, 17);
  assert.equal(F.ITENS_17[11].nome, 'Portas');
});

test('portarias', () => {
  assert.deepEqual(F.PORTARIAS.map(p => p.id), ['DIS', 'MAC']);
  assert.deepEqual(F.PORTARIAS.map(p => p.frota), [true, false]);
});

test('cabeçalho do REG LOG 04 usa LOG 04', () => {
  assert.equal(F.CABECALHO_FICHAS['04'].reg, 'LOG 04');
  assert.equal(F.CABECALHO_FICHAS['03'].reg, 'LOG 03');
});
