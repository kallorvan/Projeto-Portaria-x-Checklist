const { abrir, primeiroAcesso, assert } = require('./util.cjs');

async function chegada(page, cavalo, reboque) {
  await page.click('#tab-frota');
  await page.fill('#frota-cavalo', cavalo);
  if (reboque) await page.fill('#frota-reb1', reboque);
  await page.fill('#frota-motorista', 'Zé da Silva');
  await page.fill('#frota-km', '1000');
  await page.click('#frota-registrar');
  await page.waitForSelector('#dlg[open] #ck03-concluir');
}

module.exports = async () => {
  const { browser, page } = await abrir();
  try {
    await primeiroAcesso(page);
    await chegada(page, 'AAA1A11', 'BBB2B22');
    assert.equal(await page.locator('#dlg .regiao').count(), 6);
    assert.match(await page.textContent('#dlg'), /Zé da Silva/);
    // concluir sem marcar nada: erro listando a região
    await page.click('#ck03-concluir');
    await page.waitForSelector('#dlg .erros');
    assert.match(await page.textContent('#dlg .erros'), /Cavalo – frente/);
    // sem avarias em todas; código A na frente do cavalo
    for (const cb of await page.locator('#dlg .regiao input[data-sem]').all()) await cb.check();
    await page.check('#dlg .regiao[data-regiao="cavalo_frente"] input[data-codigo="A"]');
    await page.fill('#dlg .regiao[data-regiao="cavalo_frente"] input[data-desc]', 'para-choque amassado');
    await page.click('#ck03-concluir');
    await page.waitForFunction(() => window.__painel.st.estado.checklists.length === 1);
    const c = await page.evaluate(() => window.__painel.st.estado.checklists[0]);
    assert.equal(c.numero, 'MAC-03-000001');
    assert.deepEqual(c.dados.regioes.cavalo_frente.codigos, ['A']);
    assert.equal(c.dados.regioes.cavalo_frente.semAvarias, false);
    assert.equal(c.dados.nomes.motorista, 'Zé da Silva');
    // rascunho: fecha sem concluir e retoma
    await chegada(page, 'CCC3C33');
    await page.check('#dlg .regiao[data-regiao="cavalo_motorista"] input[data-sem]');
    await page.keyboard.press('Escape');
    await page.waitForSelector('#dlg', { state: 'hidden' });
    await page.click('#v-frota button:has-text("Fazer checklist 03")');
    await page.waitForSelector('#dlg[open] #ck03-concluir');
    assert.ok(await page.isChecked('#dlg .regiao[data-regiao="cavalo_motorista"] input[data-sem]'), 'rascunho restaurado');
    for (const cb of await page.locator('#dlg .regiao input[data-sem]').all()) await cb.check();
    await page.click('#ck03-concluir');
    await page.waitForFunction(() => window.__painel.st.estado.checklists.length === 2);
    assert.equal(await page.evaluate(() => window.__painel.st.estado.checklists[0].numero), 'MAC-03-000002');
    assert.deepEqual(page.erros, []);
  } finally { await browser.close(); }
};
