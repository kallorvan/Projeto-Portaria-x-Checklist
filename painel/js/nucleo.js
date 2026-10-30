// Núcleo do painel: conexão com a pasta, eventos, pessoa e portaria do computador,
// abas, presença e utilitários de interface usados pelas telas (js/tela-*.js).
(function () {
  'use strict';

  const A = window.Armazenamento;
  const DEMO = new URLSearchParams(location.search).get('demo') === '1';
  const LS = (k, v) => { try { if (v === undefined) return localStorage.getItem('portaria.' + k); if (v === null) localStorage.removeItem('portaria.' + k); else localStorage.setItem('portaria.' + k, v); } catch { return null; } };

  const st = {
    demo: DEMO, estado: null, pessoa: LS('pessoa'), portaria: LS('portaria'), vista: null,
    pc: LS('pc') || (() => { const id = novoId(); LS('pc', id); return id; })(),
    adminOk: false, aba: 'ini', presenca: [], ultimaLeitura: null, erro: null, fotosEntrada: [],
  };

  /* ---------- utilitários ---------- */
  function novoId() { return [...crypto.getRandomValues(new Uint8Array(8))].map(b => b.toString(16).padStart(2, '0')).join(''); }
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const slug = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'x';
  const dois = (n) => String(n).padStart(2, '0');
  const diaLocal = (d = new Date()) => `${d.getFullYear()}-${dois(d.getMonth() + 1)}-${dois(d.getDate())}`;
  const dataHora = (em) => { if (!em) return ''; const d = new Date(em); return `${dois(d.getDate())}/${dois(d.getMonth() + 1)}/${d.getFullYear()} ${dois(d.getHours())}:${dois(d.getMinutes())}`; };
  const hora = (em) => { if (!em) return ''; const d = new Date(em); return `${dois(d.getHours())}:${dois(d.getMinutes())}`; };
  const dataBR = (iso) => (iso ? iso.split('-').reverse().join('/') : '');
  function duracao(de, ate = new Date()) {
    const min = Math.max(0, Math.round((new Date(ate) - new Date(de)) / 60000));
    if (min < 60) return `${min} min`;
    const h = Math.floor(min / 60);
    return h < 24 ? `${h} h ${dois(min % 60)}` : `${Math.floor(h / 24)} d ${h % 24} h`;
  }
  const portariaInfo = (id) => Fichas.PORTARIAS.find(p => p.id === id) || { id, nome: id, pasta: id };
  const temPapel = (papel, nome = st.pessoa) => !!(st.estado && st.estado.pessoas.find(p => p.nome === nome && p.papeis.includes(papel)));

  // Construtor de elementos: h('div', { class: 'x', onclick }, filho, 'texto', [filhos]).
  function h(tag, props, ...filhos) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) {
      if (v == null || v === false) continue;
      if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else if (k === 'class') e.className = v;
      else if (k === 'html') e.innerHTML = v;
      else if (k === 'dataset') Object.assign(e.dataset, v);
      else if (k in e && typeof v !== 'string') e[k] = v;
      else e.setAttribute(k, v === true ? '' : v);
    }
    for (const f of filhos.flat(Infinity)) if (f != null && f !== false) e.append(f instanceof Node ? f : String(f));
    return e;
  }
  const botao = (txt, cls, fn, props = {}) => h('button', { type: 'button', class: cls, onclick: fn, ...props }, txt);

  // Campo de formulário com rótulo.
  function campo(rotulo, input, { req = false, dica = null } = {}) {
    if (!input.id) input.id = 'c-' + novoId();
    return h('div', { class: 'fld' }, h('label', { for: input.id, class: req ? 'req' : null }, rotulo), input, dica && h('span', { class: 'sec-note' }, dica));
  }
  const inp = (props = {}) => h('input', { class: 'inp', autocomplete: 'off', ...props });
  function sel(opcoes, valor, props = {}) {
    const s = h('select', { class: 'inp', ...props });
    for (const o of opcoes) { const [v, t] = Array.isArray(o) ? o : [o, o]; s.append(h('option', { value: v, selected: v === valor }, t)); }
    return s;
  }
  function seg(opcoes, valor, onChange, props = {}) {
    const box = h('div', { class: 'seg', role: 'group', ...props });
    box.value = valor;
    const marcar = () => $$('button', box).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === box.value)));
    for (const [v, t] of opcoes) box.append(h('button', { type: 'button', dataset: { v }, onclick: () => { if (box.disabled) return; box.value = v; marcar(); onChange && onChange(v); } }, t));
    marcar();
    box.definir = (v) => { box.value = v; marcar(); };
    box.travar = (sim) => { box.disabled = sim; $$('button', box).forEach(b => b.disabled = sim); };
    return box;
  }

  let toastT = null;
  function aviso(msg, tipo = 'info') {
    const t = $('#toast');
    t.className = 'msg ' + tipo; t.textContent = msg; t.hidden = false;
    clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, tipo === 'err' ? 9000 : 4500);
  }

  function listaErros(erros) { return h('ul', { class: 'erros', role: 'alert' }, erros.map(e => h('li', null, e))); }

  // Diálogo: cabeçalho escuro, corpo e rodapé com ações. Devolve { fechar, corpo, el }.
  function dialogo({ id = 'dlg', cod = '', titulo, corpo, acoes = [], aoFechar }) {
    const d = $('#' + id);
    d.innerHTML = '';
    const fechar = () => { if (d.open) d.close(); };
    d.onclose = () => { aoFechar && aoFechar(); };
    d.append(
      h('div', { class: 'dlg-h' }, cod && h('div', { class: 'cod' }, cod), h('h3', null, titulo), botao('×', 'x', fechar, { 'aria-label': 'Fechar' })),
      h('div', { class: 'dlg-b' }, corpo),
      acoes.length ? h('div', { class: 'dlg-f' }, acoes.map(a => botao(a.txt, a.cls || 'btn', a.fn, a.props))) : null,
    );
    if (!d.open) d.showModal();
    return { fechar, el: d, corpo: $('.dlg-b', d) };
  }

  // Pede um texto obrigatório (motivo, justificativa). Resolve null se cancelar.
  function pedirTexto(titulo, rotulo, { cod = '' } = {}) {
    return new Promise(ok => {
      const ta = h('textarea', { id: 'pedir-texto', rows: 3 });
      let feito = false;
      const err = h('div');
      const dlg = dialogo({
        id: 'dlg2', cod, titulo, corpo: [h('div', { class: 'fld' }, h('label', { for: 'pedir-texto', class: 'req' }, rotulo), ta), err],
        acoes: [
          { txt: 'Cancelar', cls: 'btn ghost', fn: () => dlg.fechar() },
          { txt: 'Confirmar', cls: 'btn', props: { id: 'pedir-ok' }, fn: () => {
            const v = ta.value.trim();
            if (!v) { err.replaceChildren(listaErros(['Preencha este campo.'])); return; }
            feito = true; dlg.fechar(); ok(v);
          } },
        ],
        aoFechar: () => { if (!feito) ok(null); },
      });
      ta.focus();
    });
  }

  /* ---------- pasta e eventos ---------- */
  let timers = [];
  async function iniciar() {
    $('#logo-dinamo').src = window.LOGOS.dinamo;
    $('#logo-toliman').src = window.LOGOS.toliman;
    const r = await A.iniciar({ demo: DEMO });
    if (r === 'ok') return conectado();
    portao(r);
  }

  function esconderApp() {
    ['#tabs', '#quem', '#eu-wrap', '#vista-wrap', '#rodape'].forEach(s => { $(s).hidden = true; });
    $$('section[role=tabpanel]').forEach(s => { s.hidden = true; });
  }

  function portao(tipo) {
    esconderApp();
    const g = $('#gate'); g.hidden = false;
    const a = $('#gate-a'); a.innerHTML = '';
    if (tipo === 'sem-suporte') {
      $('#gate-t').textContent = 'Abra este painel no Microsoft Edge ou no Google Chrome';
      $('#gate-p').textContent = 'O painel lê e grava os dados na pasta compartilhada, e só esses navegadores permitem isso com o arquivo aberto direto da pasta.';
      return;
    }
    if (tipo === 'reconectar') {
      $('#gate-t').textContent = `Reconectar à pasta "${A.nomePendente()}"`;
      $('#gate-p').textContent = 'Por segurança, o navegador pede sua confirmação para o painel voltar a ler e gravar a pasta da Portaria.';
      a.append(botao('Permitir acesso à pasta', 'btn', async () => {
        try { if (await A.permitir() === 'ok') conectado(); } catch (e) { aviso('Não foi possível acessar a pasta: ' + e.message, 'err'); }
      }), botao('Escolher outra pasta', 'btn ghost', escolherPasta));
      return;
    }
    $('#gate-t').textContent = 'Escolha a pasta da Portaria no SharePoint';
    $('#gate-p').innerHTML = 'Selecione a pasta compartilhada sincronizada pelo OneDrive (a mesma onde está este <span class="num">painel.html</span>). O navegador vai pedir permissão para ler e gravar nela; isso acontece só na primeira vez.';
    a.append(botao('Escolher pasta', 'btn', escolherPasta));
  }

  async function escolherPasta() {
    try { await A.escolherPasta(); conectado(); }
    catch (e) { if (e.name !== 'AbortError') aviso('Não foi possível usar a pasta: ' + e.message, 'err'); }
  }

  async function conectado() {
    $('#gate').hidden = true;
    await recarregar();
    timers.forEach(clearInterval);
    timers = [setInterval(recarregar, 20000), setInterval(presenca, 60000)];
    window.addEventListener('focus', recarregar);
    entrarOuPerguntar();
  }

  async function recarregar() {
    try { await A.lerEventos(); st.erro = null; st.ultimaLeitura = new Date(); }
    catch (e) { st.erro = 'Falha ao ler a pasta: ' + e.message; }
    try { st.fotosEntrada = await A.listar(['fotos-entrada', portariaInfo(st.vista || st.portaria).pasta]); } catch { st.fotosEntrada = []; }
    reconstruir();
  }

  function reconstruir() {
    st.estado = Estado.montarEstado(A.eventos(), new Date());
    render();
  }

  // Grava um evento (um arquivo novo em eventos/) e atualiza a tela.
  async function gravar(tipo, portaria, dados) {
    const ev = { id: novoId(), em: new Date().toISOString(), pessoa: st.pessoa, pc: st.pc, portaria: portaria || null, tipo, dados: dados || {} };
    await A.gravarEvento({ ...ev, pessoaSlug: slug(st.pessoa) }, portaria ? portariaInfo(portaria).pasta : 'geral');
    reconstruir();
    return ev;
  }

  // Executa uma gravação mostrando erro amigável; devolve true se deu certo.
  async function acao(fn, okMsg) {
    try { await fn(); if (okMsg) aviso(okMsg, 'ok'); return true; }
    catch (e) { console.error(e); aviso('Não foi possível salvar na pasta: ' + e.message, 'err'); return false; }
  }

  /* ---------- presença ---------- */
  async function presenca() {
    if (!st.pessoa) return;
    try {
      await A.gravarArquivo(['presenca'], `${slug(st.pessoa)}__${st.pc}.json`, JSON.stringify({ pessoa: st.pessoa, pc: st.pc, portaria: st.portaria, em: new Date().toISOString() }));
      const lista = [];
      for (const f of await A.listar(['presenca'])) {
        try { lista.push(JSON.parse(await (await f.handle.getFile()).text())); } catch {}
      }
      st.presenca = lista.filter(p => Date.now() - new Date(p.em) < 3 * 60000);
    } catch { /* sem presença nesta rodada */ }
    renderTopo();
  }

  /* ---------- pessoa, portaria e administrador ---------- */
  async function hashSenha(senha, salt) {
    const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${salt}:${senha}`));
    return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
  }
  async function senhaConfere(senha) {
    const a = st.estado.admin;
    return !!a && await hashSenha(senha, a.salt) === a.hash;
  }

  function entrarOuPerguntar() {
    const q = $('#quem');
    const e = st.estado;
    $('#adm-novo').hidden = $('#portaria-escolha').hidden = $('#pessoa-escolha').hidden = true;
    if (!e.admin) { esconderApp(); q.hidden = false; $('#adm-novo').hidden = false; return; }
    if (!st.portaria || !Fichas.PORTARIAS.some(p => p.id === st.portaria)) {
      esconderApp(); q.hidden = false; $('#portaria-escolha').hidden = false;
      $('#portaria-lista').replaceChildren(...Fichas.PORTARIAS.map(p => botao(p.nome, 'chip', () => { st.portaria = p.id; LS('portaria', p.id); entrarOuPerguntar(); })));
      return;
    }
    if (!st.pessoa || !e.pessoas.some(p => p.nome === st.pessoa)) {
      esconderApp(); q.hidden = false; $('#pessoa-escolha').hidden = false;
      $('#quem-lista').replaceChildren(...e.pessoas.map(p => botao(p.nome, 'chip', () => definirPessoa(p.nome))));
      return;
    }
    q.hidden = true;
    mostrarApp();
  }

  function definirPessoa(nome) {
    st.pessoa = nome; LS('pessoa', nome); st.adminOk = false;
    st.vista = st.portaria;
    entrarOuPerguntar();
    presenca();
  }

  $('#adm-form').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const nome = $('#adm-nome').value.trim(), s1 = $('#adm-senha').value, s2 = $('#adm-senha2').value;
    if (!nome) return aviso('Informe seu nome.', 'err');
    if (s1.length < 4) return aviso('A senha precisa ter pelo menos 4 caracteres.', 'err');
    if (s1 !== s2) return aviso('As senhas não conferem.', 'err');
    const salt = novoId();
    st.pessoa = nome;
    const ok = await acao(async () => {
      await gravar('admin_definido', null, { salt, hash: await hashSenha(s1, salt) });
      await gravar('pessoa_adicionada', null, { nome, papeis: ['admin', 'porteiro'] });
    }, 'Administrador criado.');
    st.pessoa = LS('pessoa');
    if (ok) { st.adminOk = true; entrarOuPerguntar(); }
  });

  $('#trocar-pessoa').addEventListener('click', () => { st.pessoa = null; LS('pessoa', null); entrarOuPerguntar(); });
  $('#vista').addEventListener('change', (e) => { st.vista = e.target.value; recarregar(); });

  // Formulário de senha do administrador dentro de uma aba; chama depois() ao desbloquear.
  function pedirSenhaAdmin(alvo, depois) {
    const s = inp({ id: 'senha-adm', type: 'password', placeholder: 'Senha do administrador', 'aria-label': 'Senha do administrador' });
    const f = h('form', { class: 'addrow', id: 'senha-form', onsubmit: async (ev) => {
      ev.preventDefault();
      if (await senhaConfere(s.value)) { st.adminOk = true; depois(); }
      else aviso('Senha incorreta.', 'err');
    } }, s, h('button', { class: 'btn', type: 'submit' }, 'Desbloquear'));
    alvo.replaceChildren(h('div', { class: 'card empty sec' }, h('div', { class: 'big' }, 'Área do administrador'), h('p', null, 'Digite a senha do administrador para continuar. O desbloqueio vale só enquanto esta aba estiver aberta.'), f));
    s.focus();
  }

  /* ---------- abas ---------- */
  const ABAS = { ini: 'v-ini', vis: 'v-vis', frota: 'v-frota', col: 'v-col', ck: 'v-ck', cad: 'v-cad', pes: 'v-pes' };
  const telas = {};
  for (const id of Object.keys(ABAS)) $('#tab-' + id).addEventListener('click', () => trocarAba(id));

  function trocarAba(id) { st.aba = id; render(); window.scrollTo({ top: 0 }); }

  function mostrarApp() {
    $('#tabs').hidden = false; $('#eu-wrap').hidden = false; $('#rodape').hidden = false;
    st.vista = st.vista || st.portaria;
    render();
  }

  function renderTopo() {
    const p = portariaInfo(st.vista || st.portaria);
    $('#titulo').textContent = st.portaria ? p.nome : 'Portaria Tóliman';
    $('#eu-nome').textContent = st.pessoa || '';
    const gr = temPapel('gr');
    $('#vista-wrap').hidden = !gr || $('#tabs').hidden;
    if (gr) {
      const v = $('#vista');
      if (!v.options.length) Fichas.PORTARIAS.forEach(x => v.append(h('option', { value: x.id }, x.nome)));
      v.value = st.vista || st.portaria;
    }
    const s = $('#sync');
    s.className = 'sync ' + (st.erro ? 'err' : st.demo ? 'local' : 'on');
    $('#sync-t').textContent = st.erro || (st.demo ? 'Modo demonstração (dados só neste navegador)' : `Pasta "${A.nomePasta()}"${st.ultimaLeitura ? ' · lida às ' + hora(st.ultimaLeitura) : ''}`);
    const pres = st.presenca.map(x => h('b', null, `${x.pessoa} (${portariaInfo(x.portaria).pasta})`));
    $('#pres').replaceChildren(...(pres.length ? [h('span', null, 'No painel agora:'), ...pres] : []));
  }

  function render() {
    if (!st.estado) return;
    renderTopo();
    if ($('#tabs').hidden) return;
    if (st.pessoa && !st.estado.pessoas.some(p => p.nome === st.pessoa)) return entrarOuPerguntar();
    const admin = temPapel('admin');
    $('#tab-cad').hidden = $('#tab-pes').hidden = !admin;
    if (!admin && (st.aba === 'cad' || st.aba === 'pes')) st.aba = 'ini';
    const pend = st.estado.vistorias.filter(v => v.situacao === 'pendente' && (temPapel('gr') || v.portaria === st.portaria)).length;
    $('#n-pend').textContent = pend ? String(pend) : '';
    for (const [id, sec] of Object.entries(ABAS)) {
      const ativa = id === st.aba;
      $('#tab-' + id).setAttribute('aria-selected', String(ativa));
      $('#' + sec).hidden = !ativa;
    }
    const alvo = $('#' + ABAS[st.aba]);
    const tela = telas[st.aba];
    if (!tela) { alvo.replaceChildren(h('div', { class: 'card empty sec' }, h('p', null, 'Em construção.'))); return; }
    if (tela.admin && !st.adminOk) return pedirSenhaAdmin(alvo, render);
    // Não redesenha a aba enquanto a pessoa digita num formulário dela (releitura a cada 20 s).
    if (tela.preservar && alvo.contains(document.activeElement) && /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName) && alvo.dataset.desenhada === st.aba + st.vista) {
      tela.atualizar && tela.atualizar(alvo);
      return;
    }
    alvo.dataset.desenhada = st.aba + st.vista;
    tela.render(alvo);
  }

  window.Painel = {
    st, telas, iniciar, gravar, acao, recarregar, render, trocarAba, aviso, dialogo, pedirTexto, listaErros,
    h, botao, campo, inp, sel, seg, $, $$, slug, novoId, dataHora, hora, dataBR, diaLocal, duracao, portariaInfo, temPapel, LS,
  };
  window.__painel = { st, gravar, recarregar, Armazenamento: A };
})();
