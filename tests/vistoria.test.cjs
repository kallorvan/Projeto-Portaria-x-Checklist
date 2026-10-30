const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../painel/lib/estado.js');

let seq = 0;
const ev = (tipo, dados, em = '2026-10-30T20:00:00.000Z', portaria = 'DIS') => ({ id: 'v' + String(++seq).padStart(4, '0'), em, pessoa: 'Gil', pc: 'pc1', portaria, tipo, dados });
const chegada = (id, hora) => ({ lista: 'frota', portaria: 'DIS', id, criado: '2026-10-30T10:00:00.000Z', modificado: '2026-10-30T10:00:00.000Z', autor: 'Porteiro', editor: 'Porteiro', link: 'l' + id,
  campos: { Placa_cavalo: 'AAA0A' + String(id).padStart(2, '0'), Motorista: 'Zé', Situacao: 'Chegada', KM: '1000', Data: '30/10/2026', Hora: String(6 + (id % 10)), Minuto: '0' }, anexos: [] });
const alerta = (id, ordem) => ({ id, ordem, placaCavalo: 'AAA0A' + id, reboques: [], motorista: 'Zé', chegada: '2026-10-30T10:00:00.000Z', mensagem: 'm' });
const itens = [10, 11, 20].map(i => chegada(i));
const estado = (evs, alertas) => E.montarEstado(evs, new Date('2026-10-30T20:00'), { itens, alertas });
const auto = (s) => s.vistorias.filter(v => v.origem === 'automatica');

test('vistorias automáticas vêm dos alertas do fluxo', () => {
  const s = estado([], [alerta(10, 5), alerta(20, 10)]);
  assert.deepEqual(auto(s).map(v => [v.permanenciaId, v.ordem, v.portaria]), [['frota-10', 5, 'DIS'], ['frota-20', 10, 'DIS']]);
  assert.equal(s.ultimaOrdem, 10);
  assert.equal(s.vistorias[0].situacao, 'pendente');
});

test('alerta repetido gera uma vistoria só', () => {
  assert.equal(estado([], [alerta(10, 5), alerta(10, 5)]).vistorias.length, 1);
});

test('forçar chegada que já tem alerta não duplica', () => {
  const s = estado([ev('vistoria17_forcada', { permanenciaId: 'frota-10', justificativa: 'x' })], [alerta(10, 5)]);
  assert.equal(s.vistorias.length, 1);
  assert.equal(s.vistorias[0].origem, 'automatica');
});

test('forçar chegada sem alerta', () => {
  const s = estado([ev('vistoria17_forcada', { permanenciaId: 'frota-11', justificativa: 'denúncia' })], []);
  assert.deepEqual(s.vistorias.map(v => [v.permanenciaId, v.origem, v.justificativa]), [['frota-11', 'forcada', 'denúncia']]);
  assert.equal(s.ultimaOrdem, 0);
});

test('dispensar e concluir', () => {
  const s = estado([
    ev('vistoria17_dispensada', { permanenciaId: 'frota-10', justificativa: 'liberado' }),
    ev('checklist_salvo', { numero: 'DIS-04-000001', ficha: '04', permanenciaId: 'frota-20', versao: 1, dados: { itens: { 3: { resposta: 'NC' } } }, pdf: null }),
  ], [alerta(10, 5), alerta(20, 10)]);
  assert.equal(s.vistorias.find(v => v.permanenciaId === 'frota-10').situacao, 'dispensada');
  const v = s.vistorias.find(v => v.permanenciaId === 'frota-20');
  assert.equal(v.situacao, 'concluida');
  assert.equal(v.checklistNumero, 'DIS-04-000001');
  assert.equal(s.checklists[0].naoConforme, true);
});

test('alerta de chegada que ainda não chegou ao painel continua pendente', () => {
  const s = estado([], [alerta(99, 15)]);
  assert.equal(s.vistorias[0].permanenciaId, 'frota-99');
  assert.equal(s.vistorias[0].desde, '2026-10-30T10:00:00.000Z');
});
