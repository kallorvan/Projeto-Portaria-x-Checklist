// GR num PC da Machado fazendo a vistoria de um veículo de João Pessoa: as fotos vêm da pasta de João Pessoa.
const { abrir, primeiroAcesso, gravar, assert } = require('./util.cjs');

module.exports = async () => {
  const { browser, page } = await abrir();
  try {
    await primeiroAcesso(page);
    await gravar(page, 'papeis_definidos', null, { nome: 'Admin', papeis: ['admin', 'porteiro', 'gr'] });
    for (let i = 1; i <= 5; i++) await gravar(page, 'entrada_registrada', 'JP', { permanenciaId: 'jp' + i, categoria: 'frota', campos: { placaCavalo: `JPA0A0${i}`, reboques: [], motoristaNome: 'Zé' } });
    await page.evaluate(async () => {
      const c = document.createElement('canvas'); c.width = 400; c.height = 300;
      const b = await new Promise(ok => c.toBlob(ok, 'image/jpeg', 0.9));
      await window.__painel.Armazenamento.gravarArquivo(['fotos-entrada', 'JoaoPessoa'], 'JP_0001.jpg', b);
      await window.__painel.Armazenamento.gravarArquivo(['fotos-entrada', 'Machado'], 'MAC_0001.jpg', b);
    });
    await page.click('#tab-ck');
    await page.click('#fila-gr tr:has-text("JPA0A05") button:has-text("Fazer vistoria")');
    await page.click('#dlg .item17[data-n="1"] button[data-ponto]');
    await page.waitForSelector('#dlg3 .galeria input');
    const nomes = await page.$$eval('#dlg3 .galeria input', l => l.map(i => i.value));
    assert.deepEqual(nomes, ['JP_0001.jpg']);
    await page.check('#dlg3 .galeria input');
    await page.click('#fotos-ok');
    await page.waitForSelector('#dlg3', { state: 'hidden' });
    const ev = await page.evaluate(() => window.__painel.st.estado.eventos.find(e => e.tipo === 'foto_vinculada'));
    assert.match(ev.dados.destino, /^fotos\/JoaoPessoa\//);
    assert.equal(ev.portaria, 'JP');
    assert.deepEqual(page.erros, []);
  } finally { await browser.close(); }
};
