// Roda os testes de navegador (tests/e2e/*.cjs) contra o painel servido por http no modo demonstração.
// Uso: npm run e2e [-- nome]   (nome filtra os arquivos)
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const PORTA = 8765;
const filtro = process.argv[2] || '';
const arquivos = fs.readdirSync(__dirname).filter(f => f.endsWith('.cjs') && !['rodar.cjs', 'util.cjs'].includes(f) && f.includes(filtro)).sort();

(async () => {
  const srv = spawn('python3', ['-m', 'http.server', String(PORTA), '--bind', '127.0.0.1'], { cwd: path.join(__dirname, '../../painel'), stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 800));
  let falhas = 0;
  try {
    for (const f of arquivos) {
      const t0 = Date.now();
      try {
        await require(path.join(__dirname, f))();
        console.log(`ok   ${f} (${Date.now() - t0} ms)`);
      } catch (e) {
        falhas++;
        console.log(`FAIL ${f}\n     ${(e && e.stack || e).toString().split('\n').slice(0, 6).join('\n     ')}`);
      }
    }
  } finally { srv.kill(); }
  console.log(`\n${arquivos.length - falhas}/${arquivos.length} passaram`);
  process.exit(falhas ? 1 : 0);
})();
