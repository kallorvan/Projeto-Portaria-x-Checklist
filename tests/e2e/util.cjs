// Utilitários dos testes de navegador.
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const assert = require('node:assert/strict');

const URL = 'http://127.0.0.1:8765/painel.html?demo=1';

// Abre um navegador limpo (OPFS e localStorage vazios) e devolve { browser, page }.
async function abrir() {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await browser.newContext({ acceptDownloads: true, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' });
  const page = await ctx.newPage();
  const erros = [];
  page.on('pageerror', e => erros.push(e.message));
  page.erros = erros;
  await page.goto(URL);
  return { browser, page };
}

// Primeiro acesso: cria o administrador, escolhe a portaria e entra.
async function primeiroAcesso(page, { nome = 'Admin', senha = '1234', portaria = 'Tóliman Machado' } = {}) {
  await page.fill('#adm-nome', nome);
  await page.fill('#adm-senha', senha);
  await page.fill('#adm-senha2', senha);
  await page.click('#adm-form button[type=submit]');
  await page.click(`#portaria-lista button:has-text("${portaria}")`);
  await page.click(`#quem-lista button:has-text("${nome}")`);
  await page.waitForSelector('#tabs:not([hidden])');
}

// Grava eventos direto pelo painel (atalho para montar cenários).
const gravar = (page, tipo, portaria, dados) => page.evaluate(([t, p, d]) => window.__painel.gravar(t, p, d), [tipo, portaria, dados]);
const estado = (page, fn) => page.evaluate(fn);

module.exports = { abrir, primeiroAcesso, gravar, estado, assert };

// Desbloqueia a área do administrador na aba aberta.
async function desbloquear(page, senha = '1234') {
  await page.fill('#senha-adm', senha);
  await page.click('#senha-form button[type=submit]');
}
module.exports.desbloquear = desbloquear;
