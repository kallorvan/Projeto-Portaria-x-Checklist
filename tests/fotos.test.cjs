const test = require('node:test');
const assert = require('node:assert/strict');
const F = require('../painel/lib/fotos.js');

test('nomeDestino', () => {
  assert.equal(F.nomeDestino({ alvo: 'MAC-03-000127', ponto: 'cavalo_frente', n: 2 }), 'MAC-03-000127_cavalo_frente_2.jpg');
  assert.equal(F.nomeDestino({ alvo: 'a/b c', ponto: 'x:y', n: 1 }), 'a-b-c_x-y_1.jpg');
});

test('pastaDestino', () => {
  assert.deepEqual(F.pastaDestino('Machado', new Date('2026-10-30T10:00')), ['fotos', 'Machado', '2026-10']);
});

test('esquecidas', () => {
  const agora = new Date('2026-10-30T10:00');
  const dias = (n) => new Date(agora - n * 86400000);
  assert.equal(F.esquecidas([{ nome: 'a.jpg', modificado: dias(8) }, { nome: 'b.jpg', modificado: dias(2) }], agora).length, 1);
});

test('ehImagem', () => {
  assert.equal(F.ehImagem('IMG_1.JPG'), true);
  assert.equal(F.ehImagem('x.heic'), true);
  assert.equal(F.ehImagem('nota.txt'), false);
});
