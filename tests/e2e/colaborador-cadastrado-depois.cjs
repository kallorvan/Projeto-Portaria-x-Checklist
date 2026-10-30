// Colaborador que entrou fora do cadastro e foi cadastrado durante o dia: a saída ainda encontra a entrada aberta.
const { abrir, primeiroAcesso, gravar, assert } = require('./util.cjs');

module.exports = async () => {
  const { browser, page } = await abrir();
  try {
    await primeiroAcesso(page);
    await page.click('#tab-col');
    await page.fill('#col-nome', 'Pedro Novo');
    await page.click('#col-acao');
    await page.waitForFunction(() => window.__painel.st.estado.permanencias.length === 1);
    await gravar(page, 'funcionario_salvo', null, { id: '900', nome: 'Pedro Novo', matricula: '900', setor: '', motorista: false, ativo: true });
    await page.fill('#col-nome', 'Pedro Novo');
    assert.match(await page.textContent('#col-acao'), /Registrar saída/);
    await page.click('#col-acao');
    await page.waitForFunction(() => window.__painel.st.estado.permanencias[0].saida);
    assert.deepEqual(page.erros, []);
  } finally { await browser.close(); }
};
