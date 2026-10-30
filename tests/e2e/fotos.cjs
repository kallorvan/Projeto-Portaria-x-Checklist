const { abrir, primeiroAcesso, assert } = require('./util.cjs');

module.exports = async () => {
  const { browser, page } = await abrir();
  try {
    await primeiroAcesso(page);
    // simula o celular: foto 3000x2000 em fotos-entrada/Distrito/
    await page.evaluate(async () => {
      const c = document.createElement('canvas'); c.width = 3000; c.height = 2000;
      const g = c.getContext('2d'); g.fillStyle = '#c33'; g.fillRect(0, 0, 3000, 2000);
      const b = await new Promise(ok => c.toBlob(ok, 'image/jpeg', 0.9));
      await window.__painel.Armazenamento.gravarArquivo(['fotos-entrada', 'Distrito'], 'IMG_0001.jpg', b);
      window.__r = window.Painel.escolherFotos({ alvo: 'DIS-03-000001', ponto: 'cavalo_frente' });
    });
    await page.waitForSelector('#dlg3 .galeria input');
    await page.check('#dlg3 .galeria input');
    await page.click('#fotos-ok');
    const r = await page.evaluate(async () => {
      const caminhos = await window.__r;
      const A = window.__painel.Armazenamento;
      const partes = caminhos[0].split('/');
      const f = await A.lerArquivo(partes.slice(0, -1), partes.at(-1));
      const bmp = await createImageBitmap(f);
      const entrada = await A.listar(['fotos-entrada', 'Distrito']);
      return { caminhos, w: bmp.width, h: bmp.height, entrada: entrada.length, ev: window.__painel.st.estado.eventos.filter(e => e.tipo === 'foto_vinculada').length };
    });
    assert.equal(r.caminhos.length, 1);
    assert.match(r.caminhos[0], /^fotos\/Distrito\/\d{4}-\d{2}\/DIS-03-000001_cavalo_frente_1\.jpg$/);
    assert.ok(Math.max(r.w, r.h) <= 1600, `maior lado ${Math.max(r.w, r.h)}`);
    assert.equal(r.entrada, 0);
    assert.equal(r.ev, 1);
    assert.deepEqual(page.erros, []);
  } finally { await browser.close(); }
};
