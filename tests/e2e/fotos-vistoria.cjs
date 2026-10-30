// Fotos da vistoria vêm da pasta fotos-entrada/Distrito (enviadas pelo celular do GR).
const { abrir, primeiroAcesso, espelho, alerta, chegadaFrota, assert } = require('./util.cjs');

module.exports = async () => {
  const { browser, page } = await abrir();
  try {
    await primeiroAcesso(page);
    await espelho(page, { lista: 'frota', id: 5, campos: chegadaFrota('DSA0A05') });
    await alerta(page, { id: 5, ordem: 5, placaCavalo: 'DSA0A05' });
    await page.evaluate(async () => {
      const c = document.createElement('canvas'); c.width = 400; c.height = 300;
      const b = await new Promise(ok => c.toBlob(ok, 'image/jpeg', 0.9));
      await window.__painel.Armazenamento.gravarArquivo(['fotos-entrada', 'Distrito'], 'DIS_0001.jpg', b);
      await window.__painel.Armazenamento.gravarArquivo(['fotos-entrada', 'Machado'], 'MAC_0001.jpg', b);
    });
    await page.click('#tab-ck');
    await page.click('#fila-gr tr:has-text("DSA0A05") button:has-text("Fazer vistoria")');
    await page.click('#dlg .item17[data-n="1"] button[data-ponto]');
    await page.waitForSelector('#dlg3 .galeria input');
    const nomes = await page.$$eval('#dlg3 .galeria input', l => l.map(i => i.value));
    assert.deepEqual(nomes, ['DIS_0001.jpg']);
    await page.check('#dlg3 .galeria input');
    await page.click('#fotos-ok');
    await page.waitForSelector('#dlg3', { state: 'hidden' });
    const ev = await page.evaluate(() => window.__painel.st.estado.eventos.find(e => e.tipo === 'foto_vinculada'));
    assert.match(ev.dados.destino, /^fotos\/Distrito\//);
    assert.equal(ev.portaria, 'DIS');
    assert.deepEqual(page.erros, []);
  } finally { await browser.close(); }
};
