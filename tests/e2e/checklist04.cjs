const { abrir, primeiroAcesso, gravar, espelho, alerta, chegadaFrota, assert } = require('./util.cjs');

module.exports = async () => {
  const { browser, page } = await abrir();
  try {
    await primeiroAcesso(page);
    // pessoa só administradora: vê a pendência, mas não faz a vistoria
    await gravar(page, 'papeis_definidos', null, { nome: 'Admin', papeis: ['admin'] });
    await espelho(page, { lista: 'frota', id: 10, campos: chegadaFrota('AAA0A05') });
    await espelho(page, { lista: 'frota', id: 11, campos: chegadaFrota('AAA0A06') });
    await alerta(page, { id: 10, ordem: 5, placaCavalo: 'AAA0A05' });
    await page.click('#tab-ck');
    assert.match(await page.textContent('#fila-gr'), /AAA0A05/);
    assert.match(await page.textContent('#fila-gr'), /5ª chegada/);
    assert.equal(await page.locator('#fila-gr button:has-text("Fazer vistoria")').count(), 0);
    // coordenadora faz a vistoria
    await gravar(page, 'pessoa_adicionada', null, { nome: 'Cora', papeis: ['coordenador'] });
    await page.click('#trocar-pessoa');
    await page.click('#quem-lista button:has-text("Cora")');
    await page.click('#tab-ck');
    await page.click('#fila-gr tr:has-text("AAA0A05") button:has-text("Fazer vistoria")');
    await page.waitForSelector('#dlg[open] #ck04-concluir');
    await page.click('#dlg [data-carga] button[data-v="container_com_carga"]');
    for (let n = 12; n <= 17; n++) {
      assert.ok(await page.isDisabled(`#dlg .item17[data-n="${n}"] button[data-v="C"]`), `item ${n} travado`);
      assert.equal(await page.getAttribute(`#dlg .item17[data-n="${n}"] button[data-v="NA"]`, 'aria-pressed'), 'true');
    }
    for (let n = 1; n <= 11; n++) await page.click(`#dlg .item17[data-n="${n}"] button[data-v="${n === 3 ? 'NC' : 'C'}"]`);
    await page.click('#ck04-concluir');
    await page.waitForSelector('#dlg .erros');
    assert.match(await page.textContent('#dlg .erros'), /Item 3/);
    await page.fill('#dlg .item17[data-n="3"] [data-obs]', 'pneu com corte');
    await page.click('#ck04-concluir');
    await page.waitForFunction(() => window.__painel.st.estado.vistorias.find(v => v.ordem === 5).situacao === 'concluida');
    const c = await page.evaluate(() => window.__painel.st.estado.checklists.find(x => x.ficha === '04'));
    assert.equal(c.numero, 'DIS-04-000001');
    assert.equal(c.naoConforme, true);
    assert.ok(await page.locator('#hist-ck tr.nc:has-text("DIS-04-000001")').count() === 1, 'linha em vermelho');
    // forçar outra chegada (aba Frota) e dispensar
    await page.click('#tab-frota');
    await page.click('#frota-patio tr:has-text("AAA0A06") button:has-text("Forçar 17 pontos")');
    await page.fill('#pedir-texto', 'denúncia anônima');
    await page.click('#pedir-ok');
    await page.waitForFunction(() => window.__painel.st.estado.vistorias.some(v => v.origem === 'forcada'));
    const alertas = await page.evaluate(async () => (await window.__painel.Armazenamento.listar(['alertas'])).length);
    assert.equal(alertas, 1, 'forçar não grava em alertas/');
    await page.click('#tab-ck');
    await page.click('#fila-gr tr:has-text("AAA0A06") button:has-text("Dispensar")');
    await page.fill('#pedir-texto', 'veículo liberado pela matriz');
    await page.click('#pedir-ok');
    await page.waitForFunction(() => window.__painel.st.estado.vistorias.some(v => v.origem === 'forcada' && v.situacao === 'dispensada'));
    assert.deepEqual(page.erros, []);
  } finally { await browser.close(); }
};
