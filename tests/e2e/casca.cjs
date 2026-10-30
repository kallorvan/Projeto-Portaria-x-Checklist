const { abrir, primeiroAcesso, desbloquear, espelho, chegadaFrota, assert } = require('./util.cjs');

module.exports = async () => {
  const { browser, page } = await abrir();
  try {
    await primeiroAcesso(page);
    assert.match(await page.textContent('#top'), /Centro de controle/);
    assert.equal(await page.locator('#tab-cad').count(), 0);
    assert.equal(await page.locator('#portaria-lista').count(), 0);
    // aba Pessoas: Ana como coordenadora
    await page.click('#tab-pes');
    await desbloquear(page);
    await page.fill('#pes-nome', 'Ana');
    await page.uncheck('#pes-papel-gr');
    await page.check('#pes-papel-coordenador');
    await page.click('#pes-form button[type=submit]');
    await page.waitForFunction(() => window.__painel.st.estado.pessoas.some(p => p.nome === 'Ana'));
    const ana = await page.evaluate(() => window.__painel.st.estado.pessoas.find(p => p.nome === 'Ana'));
    assert.deepEqual(ana.papeis, ['coordenador']);
    // cópia de item do Lists chega e é relida quando o fluxo sobrescreve o arquivo
    const it = await espelho(page, { lista: 'frota', id: 77, campos: chegadaFrota('AAA1A11') });
    assert.equal(await page.evaluate(() => window.__painel.st.estado.permanencias.length), 1);
    await page.waitForTimeout(1100);
    await espelho(page, { ...it, campos: { ...it.campos, Placa_cavalo: 'ZZZ9Z99' } });
    assert.equal(await page.evaluate(() => window.__painel.st.estado.permanencias[0].entrada.campos.placaCavalo), 'ZZZ9Z99');
    assert.deepEqual(page.erros, []);
  } finally { await browser.close(); }
};
