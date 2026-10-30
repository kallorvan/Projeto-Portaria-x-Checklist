const { abrir, primeiroAcesso, assert } = require('./util.cjs');

module.exports = async () => {
  const { browser, page } = await abrir();
  try {
    await primeiroAcesso(page);
    assert.match(await page.textContent('#top'), /Tóliman Machado/);
    // aba Pessoas: desbloqueia e adiciona Ana como GR
    await page.click('#tab-pes');
    await page.fill('#senha-adm', '1234');
    await page.click('#senha-form button[type=submit]');
    await page.fill('#pes-nome', 'Ana');
    await page.uncheck('#pes-papel-porteiro');
    await page.check('#pes-papel-gr');
    await page.click('#pes-form button[type=submit]');
    await page.waitForFunction(() => window.__painel.st.estado.pessoas.some(p => p.nome === 'Ana'));
    const ana = await page.evaluate(() => window.__painel.st.estado.pessoas.find(p => p.nome === 'Ana'));
    assert.deepEqual(ana.papeis, ['gr']);
    // presença gravada
    assert.match(await page.textContent('#pres'), /Admin/);
    assert.deepEqual(page.erros, []);
  } finally { await browser.close(); }
};
