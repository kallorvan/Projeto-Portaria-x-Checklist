const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../painel/lib/estado.js');

let seq = 0;
const ev = (tipo, dados = {}, em, portaria = 'MAC', extra = {}) =>
  ({ id: 'e' + String(++seq).padStart(4, '0'), em: em || `2026-10-30T08:${String(seq % 60).padStart(2, '0')}:00`, pessoa: 'Ana', pc: 'pc1', portaria, tipo, dados, ...extra });
const estado = (evs) => E.montarEstado(evs, new Date('2026-10-30T18:00'));

const visitante = (pid, em) => ev('entrada_registrada', { permanenciaId: pid, categoria: 'visitante', campos: { nome: 'João', documento: '123', cracha: '7' } }, em);

test('deduplica eventos pelo id', () => {
  const e = visitante('p1');
  assert.equal(estado([e, { ...e }]).permanencias.length, 1);
});

test('ignora evento sem id, tipo ou em', () => {
  const s = estado([{ tipo: 'entrada_registrada', dados: {} }, { id: 'x', em: '2026-10-30T08:00' }, visitante('p1')]);
  assert.equal(s.permanencias.length, 1);
});

test('entrada e saída de visitante', () => {
  const s = estado([visitante('p1', '2026-10-30T08:00'), ev('saida_registrada', { permanenciaId: 'p1', campos: { crachaDevolvido: true } }, '2026-10-30T09:00')]);
  assert.equal(s.noLocal('MAC').length, 0);
  assert.equal(s.permanencias[0].saida.campos.crachaDevolvido, true);
});

test('vale a primeira saída', () => {
  const s = estado([
    visitante('p1', '2026-10-30T08:00'),
    ev('saida_registrada', { permanenciaId: 'p1', campos: { crachaDevolvido: false } }, '2026-10-30T10:05'),
    ev('saida_registrada', { permanenciaId: 'p1', campos: { crachaDevolvido: true } }, '2026-10-30T10:00'),
  ]);
  const p = s.permanencias[0];
  assert.equal(p.saida.em, '2026-10-30T10:00');
  assert.equal(p.historico.length, 3);
});

test('saída avulsa', () => {
  const s = estado([ev('saida_registrada', { permanenciaId: 'p9', avulsa: true, categoria: 'frota', campos: { km: 10 } })]);
  const p = s.permanencias[0];
  assert.equal(p.entrada, null);
  assert.equal(p.avulsa, true);
  assert.equal(p.categoria, 'frota');
});

test('correção de registro', () => {
  const s = estado([visitante('p1', '2026-10-30T08:00'), ev('registro_corrigido', { permanenciaId: 'p1', campos: { nome: 'João Silva' }, motivo: 'grafia' }, '2026-10-30T08:10')]);
  assert.equal(s.permanencias[0].entrada.campos.nome, 'João Silva');
  assert.equal(s.permanencias[0].entrada.campos.cracha, '7');
});

test('fora do cadastro na chegada da frota', () => {
  const s = estado([
    ev('veiculo_salvo', { placa: 'ABC1D23', tipo: 'cavalo', modelo: '', vinculo: 'proprio', ativo: true }, '2026-10-30T07:00', null),
    ev('entrada_registrada', { permanenciaId: 'f1', categoria: 'frota', campos: { placaCavalo: 'abc-1d23', reboques: ['zzz9z99'], motoristaId: null, motoristaNome: 'Zé' } }, '2026-10-30T08:00'),
  ]);
  assert.deepEqual(s.permanencias[0].foraDoCadastro, ['placa:ZZZ9Z99', 'motorista']);
});

test('sem cadastro nenhum não marca fora do cadastro', () => {
  const s = estado([ev('entrada_registrada', { permanenciaId: 'f1', categoria: 'frota', campos: { placaCavalo: 'ABC1D23', reboques: [], motoristaId: null } })]);
  assert.deepEqual(s.permanencias[0].foraDoCadastro, []);
});

test('pessoas e papéis', () => {
  const s = estado([
    ev('pessoa_adicionada', { nome: 'Bia', papeis: ['porteiro'] }, '2026-10-30T07:00', null),
    ev('pessoa_adicionada', { nome: 'Ana', papeis: ['admin'] }, '2026-10-30T07:01', null),
    ev('papeis_definidos', { nome: 'Bia', papeis: ['porteiro', 'gr'] }, '2026-10-30T07:02', null),
    ev('pessoa_adicionada', { nome: 'Caio', papeis: ['porteiro'] }, '2026-10-30T07:03', null),
    ev('pessoa_removida', { nome: 'Caio' }, '2026-10-30T07:04', null),
    ev('admin_definido', { salt: 's', hash: 'h' }, '2026-10-30T07:05', null),
  ]);
  assert.deepEqual(s.pessoas, [{ nome: 'Ana', papeis: ['admin'] }, { nome: 'Bia', papeis: ['porteiro', 'gr'] }]);
  assert.deepEqual(s.admin, { salt: 's', hash: 'h' });
});

test('funcionário: vale o último salvo', () => {
  const s = estado([
    ev('funcionario_salvo', { id: 'f1', nome: 'Zé', motorista: false, ativo: true }, '2026-10-30T07:00', null),
    ev('funcionario_salvo', { id: 'f1', nome: 'José', motorista: true, ativo: true }, '2026-10-30T07:01', null),
  ]);
  assert.equal(s.funcionarios.size, 1);
  assert.equal(s.funcionarios.get('f1').nome, 'José');
});

test('jornada do dia com intervalo e retorno', () => {
  const col = (pid, em) => ev('entrada_registrada', { permanenciaId: pid, categoria: 'colaborador', campos: { funcionarioId: 'f1', nome: 'Zé', veiculo: 'nenhum' } }, em);
  const sai = (pid, motivo, em) => ev('saida_registrada', { permanenciaId: pid, campos: { motivo } }, em);
  const manha = [col('c1', '2026-10-30T07:02'), sai('c1', 'intervalo', '2026-10-30T11:58')];
  const tarde = [col('c2', '2026-10-30T13:01'), sai('c2', 'fim', '2026-10-30T17:05')];
  const s = estado([...tarde, ...manha]);
  assert.deepEqual(s.jornadas('MAC', '2026-10-30')[0].marcacoes.map(m => m.tipo), ['entrada', 'saida', 'retorno', 'saida']);
  assert.equal(s.permanencias.find(p => p.id === 'c2').retorno, true);
  assert.deepEqual(estado(manha).emIntervalo('MAC', '2026-10-30').map(x => x.chave), ['f1']);
  assert.deepEqual(estado([...manha, tarde[0]]).emIntervalo('MAC', '2026-10-30'), []);
  assert.deepEqual(s.emIntervalo('MAC', '2026-10-30'), []);
});
