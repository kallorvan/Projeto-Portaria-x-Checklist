const fs = require('node:fs');
const path = require('node:path');
const { abrir, primeiroAcesso, gravar, assert } = require('./util.cjs');

// Guarda os PDFs gerados em tests/e2e/saida/ para conferência visual.
const SAIDA = path.join(__dirname, 'saida');

async function lerPdf(page, caminho) {
  return page.evaluate(async (c) => {
    const A = window.__painel.Armazenamento;
    const f = await A.lerArquivo(c.slice(0, -1), c.at(-1));
    const b = new Uint8Array(await f.arrayBuffer());
    let s = ''; for (const x of b) s += String.fromCharCode(x);
    return btoa(s);
  }, caminho);
}

module.exports = async () => {
  const { browser, page } = await abrir();
  try {
    await primeiroAcesso(page);
    await gravar(page, 'papeis_definidos', null, { nome: 'Admin', papeis: ['admin', 'porteiro', 'gr'] });
    // foto do celular
    await page.evaluate(async () => {
      const c = document.createElement('canvas'); c.width = 800; c.height = 600;
      const g = c.getContext('2d'); g.fillStyle = '#4a7'; g.fillRect(0, 0, 800, 600); g.fillStyle = '#fff'; g.font = '60px sans-serif'; g.fillText('AVARIA', 200, 320);
      const b = await new Promise(ok => c.toBlob(ok, 'image/jpeg', 0.9));
      await window.__painel.Armazenamento.gravarArquivo(['fotos-entrada', 'Machado'], 'IMG_0001.jpg', b);
      await window.__painel.Armazenamento.gravarArquivo(['fotos-entrada', 'Machado'], 'IMG_0002.jpg', b);
    });
    for (let i = 1; i <= 5; i++) {
      await page.click('#tab-frota');
      await page.fill('#frota-cavalo', `AAA0A0${i}`);
      await page.fill('#frota-reb1', 'BBB2B22');
      await page.fill('#frota-motorista', 'Zé da Silva');
      await page.fill('#frota-km', '1000');
      await page.click('#frota-registrar');
      await page.waitForSelector('#dlg[open] #ck03-concluir');
      if (i < 5) { await page.keyboard.press('Escape'); await page.waitForSelector('#dlg', { state: 'hidden' }); }
    }
    // REG LOG 03 com 1 foto
    for (const cb of await page.locator('#dlg .regiao input[data-sem]').all()) await cb.check();
    await page.check('#dlg .regiao[data-regiao="cavalo_frente"] input[data-codigo="A"]');
    await page.fill('#dlg .regiao[data-regiao="cavalo_frente"] input[data-desc]', 'para-choque amassado');
    await page.click('#dlg .regiao[data-regiao="cavalo_frente"] button[data-ponto]');
    await page.check('#dlg3 .galeria input >> nth=0');
    await page.click('#fotos-ok');
    await page.waitForSelector('#dlg3', { state: 'hidden' });
    await page.click('#ck03-concluir');
    await page.waitForFunction(() => window.__painel.st.estado.checklists.length === 1);
    // REG LOG 04 com 1 foto
    await page.click('#tab-ck');
    await page.click('#fila-gr button:has-text("Fazer vistoria")');
    await page.click('#dlg [data-carga] button[data-v="container_com_carga"]');
    for (let n = 1; n <= 11; n++) await page.click(`#dlg .item17[data-n="${n}"] button[data-v="${n === 3 ? 'NC' : 'C'}"]`);
    await page.fill('#dlg .item17[data-n="3"] [data-obs]', 'pneu com corte');
    await page.click('#dlg .item17[data-n="3"] button[data-ponto]');
    await page.check('#dlg3 .galeria input >> nth=0');
    await page.click('#fotos-ok');
    await page.waitForSelector('#dlg3', { state: 'hidden' });
    await page.click('#ck04-concluir');
    await page.waitForFunction(() => window.__painel.st.estado.checklists.length === 2);

    const cks = await page.evaluate(() => window.__painel.st.estado.checklists.map(c => ({ numero: c.numero, pdf: c.pdf })));
    fs.mkdirSync(SAIDA, { recursive: true });
    for (const c of cks) {
      assert.ok(c.pdf, `${c.numero} sem pdf`);
      assert.match(c.pdf.join('/'), new RegExp(`^checklists/Machado/\\d{4}-\\d{2}/${c.numero}_AAA0A05\\.pdf$`));
      const b = Buffer.from(await lerPdf(page, c.pdf), 'base64');
      assert.equal(b.subarray(0, 4).toString(), '%PDF');
      assert.ok(b.length > 5000, `${c.numero} com ${b.length} bytes`);
      fs.writeFileSync(path.join(SAIDA, c.pdf.at(-1)), b);
    }
    // correção do 04 gera _v2
    await page.click('#hist-ck tr:has-text("MAC-04-000001")');
    await page.click('#dlg button:has-text("Corrigir")');
    await page.waitForSelector('#dlg[open] #ck04-concluir');
    await page.fill('#dlg .item17[data-n="3"] [data-obs]', 'pneu com corte lateral');
    await page.click('#ck04-concluir');
    await page.fill('#pedir-texto', 'detalhe da observação');
    await page.click('#pedir-ok');
    await page.waitForFunction(() => window.__painel.st.estado.checklists.find(c => c.ficha === '04').versao === 2);
    const v2 = await page.evaluate(() => window.__painel.st.estado.checklists.find(c => c.ficha === '04').pdf);
    assert.match(v2.at(-1), /^MAC-04-000001_AAA0A05_v2\.pdf$/);
    assert.deepEqual(page.erros, []);
  } finally { await browser.close(); }
};
