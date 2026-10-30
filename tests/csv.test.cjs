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

test('importarVeiculos', () => {
  const r = C.importarVeiculos('Placa;Tipo;Modelo;Vinculo\nabc-1d23;Cavalo;Volvo FH;Próprio\nXYZ9K87;Carreta;;Terceiro');
  assert.deepEqual(r.itens, [{ placa: 'ABC1D23', tipo: 'cavalo', modelo: 'Volvo FH', vinculo: 'proprio', ativo: true }]);
  assert.deepEqual(r.erros, ["Linha 3: tipo 'Carreta' inválido"]);
});

test('importarFuncionarios', () => {
  const r = C.importarFuncionarios('Nome;Matricula;Setor;Motorista;CNH;ValidadeCNH\nJosé Silva;123;Logística;Sim;999;05/01/2027\nMaria;;RH;Não;;');
  assert.deepEqual(r.erros, []);
  assert.equal(r.itens[0].cnhValidade, '2027-01-05');
  assert.equal(r.itens[0].motorista, true);
  assert.equal(r.itens[0].id, '123');
  assert.equal(r.itens[1].id, 'maria');
  assert.equal(r.itens[1].motorista, false);
});

test('modelos de cadastro são importáveis', () => {
  const fs = require('node:fs');
  assert.equal(C.importarVeiculos(fs.readFileSync('entrega/modelo-cadastro-veiculos.csv', 'utf8')).itens.length, 2);
  assert.equal(C.importarFuncionarios(fs.readFileSync('entrega/modelo-cadastro-funcionarios.csv', 'utf8')).itens.length, 2);
});
