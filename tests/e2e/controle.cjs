const { abrir, primeiroAcesso, espelho, chegadaFrota, agora, assert } = require('./util.cjs');

const hora = (menos) => { const a = agora(); return { ...a, Hora: String(Math.max(0, +a.Hora - menos)) }; };
const val = (page, id) => page.textContent(`#${id} .val`);

module.exports = async () => {
  const { browser, page } = await abrir();
  try {
    await primeiroAcesso(page);
    await espelho(page, { lista: 'colaboradores', campos: { Nome: 'Col A', 'Situação': 'Chegada Expediente', 'Veículo': 'Carro', Placa: 'ERU-4309', ...hora(2) } });
    await espelho(page, { lista: 'colaboradores', campos: { Nome: 'Col B', 'Situação': 'Chegada Expediente', 'Veículo': 'Nenhum', ...hora(3) } });
    await espelho(page, { lista: 'colaboradores', campos: { Nome: 'Col B', 'Situação': 'Saída Intervalo', 'Veículo': 'Nenhum', ...hora(1) } });
    await espelho(page, { lista: 'visitantes', portaria: 'MAC', campos: { Nome: 'Visitante Machado', 'RG/CNH': '123', Placa_veiculo: 'Nenhum', 'Entrada/Saída': 'Entrada', Setor_visita: 'Compras', cracha: '7', ...hora(1) } });
    await page.evaluate(async () => {
      const c = document.createElement('canvas'); c.width = 200; c.height = 150;
      const b = await new Promise(ok => c.toBlob(ok, 'image/jpeg', 0.9));
      await window.__painel.Armazenamento.gravarArquivo(['fotos', 'Distrito', 'ctrc'], '501_ctrc1.jpg', b);
    });
    await espelho(page, { lista: 'frota', id: 501, campos: chegadaFrota('AAA1A11'), anexos: ['fotos/Distrito/ctrc/501_ctrc1.jpg'] });
    await espelho(page, { lista: 'frota', id: 502, campos: chegadaFrota('BBB2B22') });
    await espelho(page, { lista: 'frota', id: 503, campos: { ...chegadaFrota('XYZ9K87'), Situacao: 'Saída' } });

    await page.click('#tab-ini');
    assert.equal(await val(page, 'ctl-DIS-col'), '1');
    assert.equal(await val(page, 'ctl-DIS-intervalo'), '1');
    assert.equal(await val(page, 'ctl-MAC-vis'), '1');
    assert.equal(await val(page, 'ctl-DIS-frota'), '2');
    assert.equal(await val(page, 'ctl-03'), '2');
    assert.match(await page.textContent('#v-ini'), /XYZ9K87/);

    await page.click('#tab-frota');
    assert.equal(await page.locator('#v-frota tr:has-text("AAA1A11") img').count() > 0, true);
    assert.equal(await page.locator('#frota-registrar').count(), 0);

    await page.click('#tab-vis');
    await page.selectOption('#vista', 'MAC');
    assert.match(await page.textContent('#v-vis'), /Visitante Machado/);
    assert.equal(await page.locator('#vis-registrar').count(), 0);

    await page.selectOption('#vista', 'DIS');
    await page.click('#tab-col');
    assert.equal(await page.locator('#col-acao').count(), 0);
    await page.click('#v-col tr:has-text("Col A") >> nth=0');
    await page.click('#dlg button:has-text("Ocultar registro")');
    await page.fill('#pedir-texto', 'registro de teste');
    await page.click('#pedir-ok');
    await page.waitForFunction(() => window.__painel.st.estado.noLocal('DIS').filter(p => p.categoria === 'colaborador').length === 0);
    assert.deepEqual(page.erros, []);
  } finally { await browser.close(); }
};
