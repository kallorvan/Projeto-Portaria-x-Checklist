const { abrir, primeiroAcesso, espelho, chegadaFrota, assert } = require('./util.cjs');

module.exports = async () => {
  const { browser, page } = await abrir();
  try {
    await primeiroAcesso(page);
    await espelho(page, { lista: 'frota', id: 11, campos: chegadaFrota('AAA1A11') });
    await espelho(page, { lista: 'frota', id: 12, campos: { ...chegadaFrota('CCC3C33'), Placa_reboque1: null } });
    await page.click('#tab-ck');
    assert.equal(await page.locator('#fila-03 tbody tr button:has-text("Fazer checklist 03")').count(), 2);
    await page.click('#fila-03 tr:has-text("AAA1A11") button:has-text("Fazer checklist 03")');
    await page.waitForSelector('#dlg[open] #ck03-concluir');
    assert.equal(await page.locator('#dlg .regiao').count(), 6);
    assert.match(await page.textContent('#dlg'), /Zé da Silva/);
    assert.match(await page.textContent('#dlg'), /Ver no Lists/);
    // concluir sem marcar nada: erro listando a região
    await page.click('#ck03-concluir');
    await page.waitForSelector('#dlg .erros');
    assert.match(await page.textContent('#dlg .erros'), /Cavalo – frente/);
    for (const cb of await page.locator('#dlg .regiao input[data-sem]').all()) await cb.check();
    await page.check('#dlg .regiao[data-regiao="cavalo_frente"] input[data-codigo="A"]');
    await page.fill('#dlg .regiao[data-regiao="cavalo_frente"] input[data-desc]', 'para-choque amassado');
    await page.click('#ck03-concluir');
    await page.waitForFunction(() => window.__painel.st.estado.checklists.length === 1);
    const c = await page.evaluate(() => window.__painel.st.estado.checklists[0]);
    assert.equal(c.numero, 'DIS-03-000001');
    assert.deepEqual(c.dados.regioes.cavalo_frente.codigos, ['A']);
    assert.equal(c.dados.nomes.motorista, 'Zé da Silva');
    assert.equal(await page.locator('#fila-03 tbody tr button:has-text("Fazer checklist 03")').count(), 1);
    // rascunho: fecha sem concluir e retoma
    await page.click('#fila-03 tr:has-text("CCC3C33") button:has-text("Fazer checklist 03")');
    await page.waitForSelector('#dlg[open] #ck03-concluir');
    await page.check('#dlg .regiao[data-regiao="cavalo_motorista"] input[data-sem]');
    await page.keyboard.press('Escape');
    await page.waitForSelector('#dlg', { state: 'hidden' });
    await page.click('#fila-03 tr:has-text("CCC3C33") button:has-text("Fazer checklist 03")');
    await page.waitForSelector('#dlg[open] #ck03-concluir');
    assert.ok(await page.isChecked('#dlg .regiao[data-regiao="cavalo_motorista"] input[data-sem]'), 'rascunho restaurado');
    for (const cb of await page.locator('#dlg .regiao input[data-sem]').all()) await cb.check();
    await page.click('#ck03-concluir');
    await page.waitForFunction(() => window.__painel.st.estado.checklists.length === 2);
    assert.equal(await page.evaluate(() => window.__painel.st.estado.checklists[0].numero), 'DIS-03-000002');
    // chegada que já saiu sem checklist 03 continua na fila, marcada como "já saiu"
    await espelho(page, { lista: 'frota', id: 13, campos: chegadaFrota('DDD4D44') });
    await espelho(page, { lista: 'frota', id: 14, campos: { ...chegadaFrota('DDD4D44'), Situacao: 'Saída' } });
    await page.click('#tab-ck');
    assert.match(await page.textContent('#fila-03 tr:has-text("DDD4D44")'), /já saiu/);
    await page.click('#tab-ini');
    assert.equal(await page.textContent('#ctl-03 .val'), '1');
    assert.deepEqual(page.erros, []);
  } finally { await browser.close(); }
};
