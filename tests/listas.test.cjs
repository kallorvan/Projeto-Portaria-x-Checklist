const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('../painel/lib/listas.js');
const frota = require('./fixtures/listas/frota-dis.json');
const colab = require('./fixtures/listas/colaboradores-dis.json');
const vis = require('./fixtures/listas/visitantes-mac.json');

test('instante digitado', () => {
  assert.equal(L.instante({ Data: '30/12/2025', Hora: '17', Minuto: '14' }, 'x'), new Date(2025, 11, 30, 17, 14).toISOString());
});

test('instante sem hora usa criado', () => {
  assert.equal(L.instante({ Data: '30/12/2025', Hora: '', Minuto: '5' }, '2025-12-30T20:15:48.000Z'), '2025-12-30T20:15:48.000Z');
  assert.equal(L.instante({ Data: '30/12/2025', Hora: '24', Minuto: '5' }, '2025-12-30T20:15:48.000Z'), '2025-12-30T20:15:48.000Z');
  assert.equal(L.instante({ Data: '2025-12-30', Hora: '7', Minuto: '5' }, '2025-12-30T20:15:48.000Z'), '2025-12-30T20:15:48.000Z');
});

test('placa', () => {
  assert.equal(L.placa(' cup-2j18 '), 'CUP2J18');
  assert.equal(L.placa('Nenhum'), '');
  assert.equal(L.placa('-'), '');
  assert.equal(L.placa(null), '');
});

test('frota: pareia saída com placa em outro formato e marca avulsa', () => {
  const ps = L.permanencias(frota);
  const p = ps.find(x => x.id === 'frota-101');
  assert.ok(p.saida, 'chegada 101 fechada');
  assert.equal(p.saida.campos.km, 123470);
  assert.equal(p.entrada.campos.placaCavalo, 'CUP2J18');
  assert.deepEqual(p.entrada.campos.reboques, ['BML6968', 'BPQ8B95']);
  assert.deepEqual(p.entrada.campos.anexos, ['fotos/Distrito/ctrc/101_ctrc1.jpg']);
  assert.equal(p.entrada.campos.motoristaNome, 'Motorista A');
  assert.equal(p.origem, 'lists');
  assert.equal(p.link, 'https://exemplo/Lists/Frota/DispForm.aspx?ID=101');
  const av = ps.find(x => x.id === 'frota-s103');
  assert.equal(av.avulsa, true);
  assert.equal(av.entrada, null);
  assert.equal(av.categoria, 'frota');
});

test('frota: duas chegadas e uma saída fecha a mais recente', () => {
  const base = frota[0];
  const c2 = { ...base, id: 110, campos: { ...base.campos, Hora: '9' } };
  const ps = L.permanencias([base, c2, frota[1]]);
  assert.equal(ps.find(x => x.id === 'frota-110').saida.campos.itemId, 102);
  assert.equal(ps.find(x => x.id === 'frota-101').saida, null);
});

test('colaborador: quatro itens viram duas permanências', () => {
  const ps = L.permanencias(colab).sort((a, b) => (a.entrada.em < b.entrada.em ? -1 : 1));
  assert.equal(ps.length, 2);
  assert.deepEqual(ps.map(p => p.saida.campos.motivo), ['intervalo', 'fim']);
  assert.equal(ps[0].entrada.campos.nome, 'Colaborador Um');
  assert.equal(ps[0].saida.campos.observacao, 'Almoço');
  assert.equal(ps[0].id, 'col-201');
});

test('visitante: saída depois da meia-noite e visitante no local', () => {
  const ps = L.permanencias(vis);
  const a = ps.find(x => x.id === 'vis-301');
  assert.equal(a.saida.em, new Date(2026, 9, 30, 16, 24).toISOString());
  assert.equal(a.saida.pessoa, 'Porteiro 2');
  assert.equal(a.entrada.campos.placa, '');
  assert.equal(a.entrada.campos.setor, 'Manutenção');
  const n = ps.find(x => x.id === 'vis-302');
  assert.equal(n.saida.em, new Date(2026, 9, 31, 1, 10).toISOString());
  assert.equal(ps.find(x => x.id === 'vis-303').saida, null);
  assert.equal(a.categoria, 'visitante');
  assert.equal(a.portaria, 'MAC');
});
