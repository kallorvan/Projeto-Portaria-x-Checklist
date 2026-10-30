const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../painel/lib/estado.js');
const A = require('../painel/lib/alerta.js');

let seq = 0;
const ev = (tipo, dados, em, portaria = 'MAC') => ({ id: 'v' + String(++seq).padStart(4, '0'), em, pessoa: 'Ana', pc: 'pc1', portaria, tipo, dados });
const hora = (i) => `2026-10-30T${String(6 + Math.floor(i / 60)).padStart(2, '0')}:${String(i % 60).padStart(2, '0')}:00`;
const chegada = (pid, i, portaria = 'MAC') => ev('entrada_registrada', { permanenciaId: pid, categoria: 'frota', campos: { placaCavalo: 'ABC1D23', reboques: [], motoristaNome: 'Zé' } }, hora(i), portaria);
const estado = (evs) => E.montarEstado(evs, new Date('2026-10-30T20:00'));

function base() {
  const evs = [];
  for (let i = 1; i <= 12; i++) evs.push(chegada('m' + i, i * 2));
  for (let i = 1; i <= 3; i++) evs.push(chegada('j' + i, i * 2 + 1, 'JP'));
  evs.push(ev('entrada_registrada', { permanenciaId: 'vis', categoria: 'visitante', campos: { nome: 'X' } }, hora(1)));
  evs.push(ev('entrada_registrada', { permanenciaId: 'col', categoria: 'colaborador', campos: { nome: 'Y' } }, hora(3)));
  return evs;
}
const automaticas = (s, portaria) => s.vistorias.filter(v => v.portaria === portaria && v.origem === 'automatica');

test('vistorias automáticas na 5ª e 10ª chegada da portaria', () => {
  const s = estado(base());
  assert.deepEqual(automaticas(s, 'MAC').map(v => [v.permanenciaId, v.ordem]), [['m5', 5], ['m10', 10]]);
  assert.equal(automaticas(s, 'JP').length, 0);
  assert.deepEqual(s.contadores.MAC, { chegadas: 12, faltam: 3 });
  assert.deepEqual(s.contadores.JP, { chegadas: 3, faltam: 2 });
});

test('a ordem de leitura dos eventos não muda o resultado', () => {
  const evs = base();
  const embaralhados = [...evs].reverse();
  [embaralhados[0], embaralhados[7]] = [embaralhados[7], embaralhados[0]];
  assert.deepEqual(automaticas(estado(embaralhados), 'MAC').map(v => v.permanenciaId), ['m5', 'm10']);
});

test('forçar não altera a contagem', () => {
  const s = estado([...base(), ev('vistoria17_forcada', { permanenciaId: 'm2', justificativa: 'suspeita' }, hora(100))]);
  const f = s.vistorias.find(v => v.permanenciaId === 'm2');
  assert.equal(f.origem, 'forcada');
  assert.equal(f.ordem, null);
  assert.equal(f.justificativa, 'suspeita');
  assert.deepEqual(automaticas(s, 'MAC').map(v => v.permanenciaId), ['m5', 'm10']);
});

test('forçar uma chegada que já é automática mantém a automática', () => {
  const s = estado([...base(), ev('vistoria17_forcada', { permanenciaId: 'm5', justificativa: 'x' }, hora(100))]);
  assert.equal(s.vistorias.filter(v => v.permanenciaId === 'm5').length, 1);
  assert.equal(s.vistorias.find(v => v.permanenciaId === 'm5').origem, 'automatica');
});

test('dispensar', () => {
  const s = estado([...base(), ev('vistoria17_dispensada', { permanenciaId: 'm5', justificativa: 'veículo saiu' }, hora(100))]);
  const v = s.vistorias.find(v => v.permanenciaId === 'm5');
  assert.equal(v.situacao, 'dispensada');
  assert.equal(v.justificativa, 'veículo saiu');
});

const itens = (resp) => Object.fromEntries(Array.from({ length: 17 }, (_, i) => [i + 1, { resposta: resp }]));
const ck04 = (numero, pid, versao, dadosItens, em) => ev('checklist_salvo', { numero, ficha: '04', permanenciaId: pid, versao, dados: { tipoCarga: 'vazio', itens: dadosItens }, pdf: null }, em);

test('conclusão da vistoria', () => {
  const s = estado([...base(), ck04('MAC-04-000001', 'm10', 1, itens('C'), hora(100))]);
  const v = s.vistorias.find(v => v.permanenciaId === 'm10');
  assert.equal(v.situacao, 'concluida');
  assert.equal(v.checklistNumero, 'MAC-04-000001');
  assert.equal(s.vistorias.find(v => v.permanenciaId === 'm5').situacao, 'pendente');
});

test('versões de checklist', () => {
  const s = estado([...base(), ck04('MAC-04-000001', 'm10', 1, itens('C'), hora(100)), ck04('MAC-04-000001', 'm10', 2, itens('C'), hora(110))]);
  assert.equal(s.checklists.length, 1);
  assert.equal(s.checklists[0].versao, 2);
  assert.equal(s.checklists[0].versoes.length, 2);
});

test('não conforme', () => {
  const it = itens('C'); it[3] = { resposta: 'NC', obs: 'furo' };
  const s = estado([...base(), ck04('MAC-04-000001', 'm10', 1, it, hora(100))]);
  assert.equal(s.checklists[0].naoConforme, true);
});

test('mensagem do alerta', () => {
  const perm = { id: 'p1', portaria: 'MAC', entrada: { em: '2026-10-30T14:32:00', campos: { placaCavalo: 'abc1d23', reboques: ['BBB2B22'], motoristaNome: 'Fulano' } } };
  const a = A.montarAlerta(perm, { origem: 'automatica' }, 'Tóliman Machado');
  assert.match(a.conteudo.mensagem, /Portaria Machado — Cavalo ABC1D23 \/ Reb\. BBB2B22/);
  assert.match(a.conteudo.mensagem, /Motorista Fulano — chegada 30\/10 14:32/);
  assert.equal(a.nome, 'MAC_ABC1D23_20261030-1432_p1.json');
  const f = A.montarAlerta(perm, { origem: 'forcada', justificativa: 'denúncia' }, 'Tóliman Machado');
  assert.match(f.conteudo.mensagem, /\(forçada: denúncia\)$/);
});
