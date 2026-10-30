const fs = require('node:fs');
const { abrir, primeiroAcesso, assert } = require('./util.cjs');

const noLocal = (page) => page.evaluate(() => window.__painel.st.estado.noLocal('MAC').length);

module.exports = async () => {
  const { browser, page } = await abrir();
  try {
    await primeiroAcesso(page);

    // visitante: entrada e saída com crachá devolvido
    await page.click('#tab-vis');
    await page.fill('#vis-nome', 'João Visitante');
    await page.fill('#vis-documento', '123456');
    await page.fill('#vis-setor', 'Compras');
    await page.fill('#vis-cracha', '7');
    await page.click('#vis-registrar');
    await page.waitForFunction(() => window.__painel.st.estado.noLocal('MAC').length === 1);
    await page.click('tr:has-text("João Visitante") button:has-text("Registrar saída")');
    await page.check('#saida-cracha');
    await page.click('#saida-ok');
    await page.waitForFunction(() => window.__painel.st.estado.noLocal('MAC').length === 0);
    const v = await page.evaluate(() => window.__painel.st.estado.permanencias[0].saida.campos);
    assert.equal(v.crachaDevolvido, true);

    // exportar CSV
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#vis-exportar')]);
    const csv = fs.readFileSync(await dl.path(), 'utf8');
    assert.ok(csv.startsWith('﻿'));
    assert.match(csv, /João Visitante/);

    // frota: 5 chegadas; na 5ª aparece o destaque e é gravado um alerta
    await page.click('#tab-frota');
    for (let i = 1; i <= 5; i++) {
      await page.fill('#frota-cavalo', `AAA0A0${i}`);
      await page.fill('#frota-reb1', `BBB0B0${i}`);
      await page.fill('#frota-motorista', 'Zé da Silva');
      await page.fill('#frota-km', String(1000 * i));
      if (i === 5) assert.ok(await page.isVisible('#frota-destaque'), 'destaque do 5º veículo');
      else assert.ok(!(await page.isVisible('#frota-destaque')));
      await page.click('#frota-registrar');
      await page.waitForSelector('#dlg[open]');
      await page.keyboard.press('Escape');
      await page.waitForSelector('#dlg', { state: 'hidden' });
    }
    const alertas = await page.evaluate(async () => {
      const A = window.__painel.Armazenamento;
      const l = await A.listar(['alertas']);
      return Promise.all(l.map(async f => JSON.parse(await (await f.handle.getFile()).text())));
    });
    assert.equal(alertas.length, 1);
    assert.match(alertas[0].mensagem, /Vistoria 17 pontos/);
    assert.match(alertas[0].mensagem, /AAA0A05/);

    // colaborador com carro da empresa sem placa: não grava
    await page.click('#tab-col');
    const antes = await page.evaluate(() => window.__painel.st.estado.permanencias.length);
    await page.fill('#col-nome', 'Maria');
    await page.selectOption('#col-veiculo', 'empresa');
    await page.click('#col-acao');
    await page.waitForSelector('#v-col .erros');
    assert.equal(await page.evaluate(() => window.__painel.st.estado.permanencias.length), antes);

    // colaborador: entrada, saída para intervalo e retorno
    await page.fill('#col-nome', 'Maria');
    await page.selectOption('#col-veiculo', 'nenhum');
    assert.match(await page.textContent('#col-acao'), /Registrar entrada/);
    await page.click('#col-acao');
    await page.waitForFunction(() => window.__painel.st.estado.permanencias.some(p => p.categoria === 'colaborador'));
    await page.fill('#col-nome', 'Maria');
    assert.match(await page.textContent('#col-acao'), /Registrar saída/);
    await page.selectOption('#col-motivo', 'intervalo');
    await page.click('#col-acao');
    await page.waitForFunction(() => window.__painel.st.estado.permanencias.some(p => p.categoria === 'colaborador' && p.saida));
    await page.fill('#col-nome', 'Maria');
    assert.match(await page.textContent('#col-acao'), /Registrar (entrada|retorno)/);
    await page.click('#col-acao');
    await page.waitForFunction(() => window.__painel.st.estado.permanencias.filter(p => p.categoria === 'colaborador').length === 2);
    assert.match(await page.textContent('#jornada'), /Retorno/);

    // início mostra os indicadores
    await page.click('#tab-ini');
    assert.match(await page.textContent('#v-ini'), /No local agora/);
    assert.deepEqual(page.erros, []);
  } finally { await browser.close(); }
};
