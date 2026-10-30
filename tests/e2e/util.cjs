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

// Primeiro acesso: cria o administrador e entra.
async function primeiroAcesso(page, { nome = 'Admin', senha = '1234' } = {}) {
  await page.fill('#adm-nome', nome);
  await page.fill('#adm-senha', senha);
  await page.fill('#adm-senha2', senha);
  await page.click('#adm-form button[type=submit]');
  await page.click(`#quem-lista button:has-text("${nome}")`);
  await page.waitForSelector('#tabs:not([hidden])');
}

// Grava eventos direto pelo painel (atalho para montar cenários).
const gravar = (page, tipo, portaria, dados) => page.evaluate(([t, p, d]) => window.__painel.gravar(t, p, d), [tipo, portaria, dados]);
const estado = (page, fn) => page.evaluate(fn);

// Cópias de itens do Lists e alertas, como o Power Automate grava.
const PASTA = { DIS: 'Distrito', MAC: 'Machado' };
let idSeq = 1000;
async function espelho(page, { lista, portaria = 'DIS', id = ++idSeq, campos, anexos = [], criado = new Date().toISOString(), autor = 'Porteiro' }) {
  const item = { lista, portaria, id, criado, modificado: new Date().toISOString(), autor, editor: autor, link: `https://exemplo/${lista}/${id}`, campos, anexos };
  await page.evaluate(async ([cam, nome, txt]) => { await window.__painel.Armazenamento.gravarArquivo(cam, nome, txt); await window.__painel.recarregar(); },
    [['listas', PASTA[portaria], lista], `${id}.json`, JSON.stringify(item)]);
  return item;
}
async function alerta(page, a) {
  await page.evaluate(async ([nome, txt]) => { await window.__painel.Armazenamento.gravarArquivo(['alertas'], nome, txt); await window.__painel.recarregar(); },
    [`DIS_${a.id}.json`, JSON.stringify({ reboques: [], motorista: 'Zé', chegada: new Date().toISOString(), mensagem: 'm', ...a })]);
}
const agora = () => { const d = new Date(); return { Data: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`, Hora: String(d.getHours()), Minuto: String(d.getMinutes()) }; };
const chegadaFrota = (placa, extra = {}) => ({ Placa_cavalo: placa, Placa_reboque1: 'BBB2B22', Motorista: 'Zé da Silva', Situacao: 'Chegada', KM: '1000', ...agora(), ...extra });

module.exports = { abrir, primeiroAcesso, gravar, estado, assert, espelho, alerta, agora, chegadaFrota };

// Desbloqueia a área do administrador na aba aberta.
async function desbloquear(page, senha = '1234') {
  await page.fill('#senha-adm', senha);
  await page.click('#senha-form button[type=submit]');
}
module.exports.desbloquear = desbloquear;
