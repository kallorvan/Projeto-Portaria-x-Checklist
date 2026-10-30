const test = require('node:test');
const assert = require('node:assert/strict');
const R = require('../painel/lib/regras.js');

const todos = (resp) => Object.fromEntries(Array.from({ length: 17 }, (_, i) => [i + 1, { resposta: resp, obs: '' }]));

test('normalizarPlaca', () => {
  assert.equal(R.normalizarPlaca(' abc-1d23 '), 'ABC1D23');
});

test('numeroChecklist', () => {
  assert.equal(R.numeroChecklist('JP', '04', 12), 'JP-04-000012');
});

test('proximaSequencia', () => {
  assert.equal(R.proximaSequencia(['MAC-03-000009', 'MAC-03-000010', 'JP-03-000050', 'MAC-04-000099'], 'MAC', '03'), 11);
  assert.equal(R.proximaSequencia([], 'DIS', '04'), 1);
});

test('faltamParaVistoria', () => {
  assert.equal(R.faltamParaVistoria(0), 5);
  assert.equal(R.faltamParaVistoria(3), 2);
  assert.equal(R.faltamParaVistoria(5), 5);
});

test('indicesVistoria', () => {
  assert.equal(R.indicesVistoria(5), true);
  assert.equal(R.indicesVistoria(4), false);
});

test('itensTravados', () => {
  assert.deepEqual(R.itensTravados({ tipoCarga: 'container_com_carga', lacres: {} }), [12, 13, 14, 15, 16, 17]);
  assert.equal(R.itensTravados({ tipoCarga: 'container_vazio', lacres: { containerVazio: 'L123' } }).length, 6);
  assert.deepEqual(R.itensTravados({ tipoCarga: 'container_vazio', lacres: { containerVazio: ' ' } }), []);
  assert.deepEqual(R.itensTravados({ tipoCarga: 'vazio', lacres: {} }), []);
});

test('validarChecklist04 ok', () => {
  assert.deepEqual(R.validarChecklist04({ tipoCarga: 'vazio', lacres: {}, itens: todos('C') }), []);
});

test('validarChecklist04 NC sem observação', () => {
  const itens = todos('C'); itens[3] = { resposta: 'NC', obs: '' };
  const e = R.validarChecklist04({ tipoCarga: 'vazio', lacres: {}, itens });
  assert.equal(e.length, 1);
  assert.match(e[0], /3/);
});

test('validarChecklist04 item travado precisa ser NA', () => {
  const e = R.validarChecklist04({ tipoCarga: 'container_com_carga', lacres: {}, itens: todos('C') });
  assert.ok(e.length > 0);
});

test('validarChecklist04 sem tipo de carga e item sem resposta', () => {
  const itens = todos('C'); delete itens[5];
  const e = R.validarChecklist04({ lacres: {}, itens });
  assert.equal(e.length, 2);
});

test('validarChecklist03', () => {
  const regioes = [{ id: 'a', nome: 'Cavalo – frente' }, { id: 'b', nome: 'B' }];
  const e = R.validarChecklist03({ regioes: { a: { semAvarias: true }, b: { codigos: [] } } }, regioes);
  assert.deepEqual(e, ["Região B: marque 'Sem avarias' ou um código"]);
});

test('temNaoConforme', () => {
  const itens = todos('C'); itens[2] = { resposta: 'NC', obs: 'x' };
  assert.equal(R.temNaoConforme({ itens }), true);
  assert.equal(R.temNaoConforme({ itens: todos('C') }), false);
});

test('avisoCnh', () => {
  const hoje = new Date('2026-10-30T12:00');
  assert.equal(R.avisoCnh('2026-10-29', hoje), 'vencida');
  assert.equal(R.avisoCnh('2026-10-30', hoje), 'vence_em_breve');
  assert.equal(R.avisoCnh('2026-11-29', hoje), 'vence_em_breve');
  assert.equal(R.avisoCnh('2026-12-31', hoje), null);
  assert.equal(R.avisoCnh(null, hoje), null);
});
