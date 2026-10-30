const { abrir, primeiroAcesso, gravar, assert } = require('./util.cjs');

async function chegada(page, i, { forcar } = {}) {
  await page.click('#tab-frota');
  await page.fill('#frota-cavalo', `AAA0A0${i}`);
  await page.fill('#frota-motorista', 'Zé da Silva');
  await page.fill('#frota-km', '1000');
  if (forcar) { await page.check('#frota-forcar'); await page.fill('#frota-justificativa', forcar); }
  await page.click('#frota-registrar');
  await page.waitForSelector('#dlg[open]');
  await page.keyboard.press('Escape');
  await page.waitForSelector('#dlg', { state: 'hidden' });
}

module.exports = async () => {
  const { browser, page } = await abrir();
  try {
    await primeiroAcesso(page);
    for (let i = 1; i <= 5; i++) await chegada(page, i);
    // sem papel GR: vê a pendência, mas não faz a vistoria
    await page.click('#tab-ck');
    assert.match(await page.textContent('#fila-gr'), /AAA0A05/);
    assert.equal(await page.locator('#fila-gr button:has-text("Fazer vistoria")').count(), 0);
    // troca para uma pessoa do GR
    await gravar(page, 'pessoa_adicionada', null, { nome: 'Gil', papeis: ['gr'] });
    await page.click('#trocar-pessoa');
    await page.click('#quem-lista button:has-text("Gil")');
    await page.click('#tab-ck');
    await page.click('#fila-gr tr:has-text("AAA0A05") button:has-text("Fazer vistoria")');
    await page.waitForSelector('#dlg[open] #ck04-concluir');
    // container com carga: itens 12 a 17 travados em NA
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
    assert.equal(c.numero, 'MAC-04-000001');
    assert.equal(c.naoConforme, true);
    assert.equal(c.dados.itens[12].resposta, 'NA');
    assert.ok(await page.locator('#hist-ck tr.nc:has-text("MAC-04-000001")').count() === 1, 'linha em vermelho');
    // forçar na 6ª chegada e dispensar
    await chegada(page, 6, { forcar: 'denúncia anônima' });
    await page.click('#tab-ck');
    await page.click('#fila-gr tr:has-text("AAA0A06") button:has-text("Dispensar")');
    await page.fill('#pedir-texto', 'veículo liberado pela matriz');
    await page.click('#pedir-ok');
    await page.waitForFunction(() => window.__painel.st.estado.vistorias.some(v => v.origem === 'forcada' && v.situacao === 'dispensada'));
    assert.deepEqual(page.erros, []);
  } finally { await browser.close(); }
};
