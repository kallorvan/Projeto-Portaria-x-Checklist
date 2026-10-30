// Única camada que toca arquivos. Hoje: pasta do SharePoint sincronizada pelo OneDrive,
// aberta pela File System Access API (ou OPFS no modo demonstração).
// Na fase 2 (Microsoft Graph) só este arquivo muda.
(function (root) {
  'use strict';

  let raiz = null, pendente = null;
  const cache = new Map(); // caminho do evento → evento já lido com sucesso

  /* ---------- IndexedDB: lembra a pasta escolhida ---------- */
  function idb() {
    return new Promise((ok, ko) => {
      const q = indexedDB.open('portaria-toliman', 1);
      q.onupgradeneeded = () => q.result.createObjectStore('kv');
      q.onsuccess = () => ok(q.result); q.onerror = () => ko(q.error);
    });
  }
  async function idbGet(k) { const db = await idb(); return new Promise((ok, ko) => { const r = db.transaction('kv').objectStore('kv').get(k); r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error); }); }
  async function idbSet(k, v) { const db = await idb(); return new Promise((ok, ko) => { const t = db.transaction('kv', 'readwrite'); t.objectStore('kv').put(v, k); t.oncomplete = ok; t.onerror = () => ko(t.error); }); }

  async function iniciar({ demo }) {
    if (demo) {
      try { raiz = await navigator.storage.getDirectory(); return 'ok'; } catch { return 'sem-suporte'; }
    }
    if (!('showDirectoryPicker' in window)) return 'sem-suporte';
    let h = null;
    try { h = await idbGet('pasta'); } catch {}
    if (!h) return 'escolher';
    try { if (await h.queryPermission({ mode: 'readwrite' }) === 'granted') { raiz = h; return 'ok'; } } catch {}
    pendente = h;
    return 'reconectar';
  }

  async function escolherPasta() {
    const h = await window.showDirectoryPicker({ id: 'portaria-toliman', mode: 'readwrite' });
    try { await idbSet('pasta', h); } catch {}
    raiz = h; cache.clear();
    return 'ok';
  }

  async function permitir() {
    if (pendente && await pendente.requestPermission({ mode: 'readwrite' }) === 'granted') { raiz = pendente; return 'ok'; }
    return 'reconectar';
  }

  const nomePasta = () => (raiz ? raiz.name || 'demonstração' : (pendente ? pendente.name : null));
  const nomePendente = () => (pendente ? pendente.name : null);

  async function pasta(caminho, criar = true) {
    let d = raiz;
    for (const p of caminho) d = await d.getDirectoryHandle(p, { create: criar });
    return d;
  }

  async function gravarArquivo(caminho, nome, conteudo) {
    const d = await pasta(caminho);
    const fh = await d.getFileHandle(nome, { create: true });
    const w = await fh.createWritable();
    await w.write(conteudo);
    await w.close();
  }

  // Lê eventos/**.json. Arquivo que falha no parse (ainda sincronizando) é tentado de novo na próxima leitura.
  async function lerEventos() {
    async function varrer(d, prefixo) {
      for await (const [nome, h] of d.entries()) {
        const cam = prefixo + '/' + nome;
        if (h.kind === 'directory') { await varrer(h, cam); continue; }
        if (!nome.endsWith('.json') || cache.has(cam)) continue;
        try {
          const ev = JSON.parse(await (await h.getFile()).text());
          if (ev && ev.id && ev.tipo && ev.em) cache.set(cam, ev);
        } catch { /* incompleto: tenta de novo depois */ }
      }
    }
    await varrer(await pasta(['eventos']), 'eventos');
    return [...cache.values()];
  }

  async function gravarEvento(ev, subpasta) {
    const nome = `${ev.em.replace(/[:.]/g, '-')}_${ev.pessoaSlug || 'x'}_${ev.id}.json`;
    const copia = { ...ev }; delete copia.pessoaSlug;
    await gravarArquivo(['eventos', subpasta], nome, JSON.stringify(copia, null, 1));
    cache.set(`eventos/${subpasta}/${nome}`, copia);
    return copia;
  }

  async function listar(caminho) {
    let d;
    try { d = await pasta(caminho, false); } catch { return []; }
    const r = [];
    for await (const [nome, h] of d.entries()) {
      if (h.kind !== 'file') continue;
      try { const f = await h.getFile(); r.push({ nome, handle: h, modificado: new Date(f.lastModified), tamanho: f.size }); } catch {}
    }
    return r;
  }

  async function lerArquivo(caminho, nome) {
    const d = await pasta(caminho, false);
    return (await d.getFileHandle(nome)).getFile();
  }

  async function remover(caminho, nome) {
    const d = await pasta(caminho, false);
    await d.removeEntry(nome);
  }

  async function urlDe(caminho, nome) {
    return URL.createObjectURL(await lerArquivo(caminho, nome));
  }

  root.Armazenamento = { eventos: () => [...cache.values()], iniciar, escolherPasta, permitir, nomePasta, nomePendente, gravarArquivo, lerEventos, gravarEvento, listar, lerArquivo, remover, urlDe, criarPasta: (c) => pasta(c) };
})(window);
