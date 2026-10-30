const path = require('node:path');
const { abrir, primeiroAcesso, desbloquear, assert } = require('./util.cjs');

module.exports = async () => {
  const { browser, page } = await abrir();
  try {
    await primeiroAcesso(page);
    await page.click('#tab-cad');
    await desbloquear(page);
    // importar a planilha-modelo de veículos
    await page.setInputFiles('#cad-arquivo', path.join(__dirname, '../../entrega/modelo-cadastro-veiculos.csv'));
    await page.waitForSelector('#cad-importar-ok');
    assert.match(await page.textContent('#dlg'), /2 veículos/);
    await page.click('#cad-importar-ok');
    await page.waitForFunction(() => window.__painel.st.estado.veiculos.size === 2);
    // incluir funcionário motorista com CNH vencida
    await page.click('#cad-sub-fun');
    await page.click('#cad-novo');
    await page.fill('#fun-nome', 'Zé Motorista');
    await page.fill('#fun-matricula', '777');
    await page.check('#fun-motorista');
    await page.fill('#fun-cnh-validade', '2026-01-01');
    await page.click('#cad-salvar');
    await page.waitForFunction(() => window.__painel.st.estado.funcionarios.has('777'));
    assert.match(await page.textContent('#v-cad table'), /vencida/);
    // desativar e reativar veículo
    await page.click('#cad-sub-vei');
    await page.click('tr:has-text("ABC1D23") button:has-text("Desativar")');
    await page.waitForFunction(() => window.__painel.st.estado.veiculos.get('ABC1D23').ativo === false);
    assert.deepEqual(page.erros, []);
  } finally { await browser.close(); }
};
