// Escolha e vínculo de fotos que chegaram do celular em fotos-entrada/<Portaria>/.
(function () {
  'use strict';
  const P = window.Painel;
  const A = window.Armazenamento;
  const { h, st } = P;

  // As fotos vêm da pasta da portaria do registro (o GR pode vistoriar veículo de outra portaria).
  const pastaEntrada = (portaria) => ['fotos-entrada', P.portariaInfo(portaria || st.portaria).pasta];
  const urls = new Map(); // caminho → object URL (miniaturas já carregadas)

  async function url(caminho) {
    if (urls.has(caminho)) return urls.get(caminho);
    const partes = caminho.split('/');
    const u = await A.urlDe(partes.slice(0, -1), partes.at(-1));
    urls.set(caminho, u);
    return u;
  }

  // Miniaturas das fotos já vinculadas (lista de caminhos).
  function miniaturas(caminhos) {
    const box = h('div', { class: 'fotos' });
    for (const c of caminhos || []) {
      const img = h('img', { alt: c.split('/').at(-1), title: c.split('/').at(-1) });
      url(c).then(u => { img.src = u; }).catch(() => { img.alt = 'foto não encontrada'; });
      box.append(h('a', { href: '#', onclick: async (e) => { e.preventDefault(); window.open(await url(c), '_blank'); } }, img));
    }
    return box;
  }

  // Mostra as fotos da pasta de entrada da portaria; as marcadas são reduzidas, gravadas em fotos/... e
  // removidas da entrada. Resolve com os caminhos gravados (vazio se cancelar).
  function escolherFotos({ alvo, ponto, rotulo, portaria }) {
    portaria = portaria || st.portaria;
    return new Promise(async (resolver) => {
      let feito = false;
      const lista = (await A.listar(pastaEntrada(portaria))).filter(f => Fotos.ehImagem(f.nome)).sort((a, b) => b.modificado - a.modificado);
      const galeria = h('div', { class: 'galeria' }, lista.length ? lista.map(f => {
        const box = Fotos.ehHeic(f.nome) ? h('div', { class: 'semfoto' }, 'Formato HEIC não suportado: ajuste a câmera do celular para JPG') : h('img', { alt: f.nome });
        if (!Fotos.ehHeic(f.nome)) f.handle.getFile().then(x => { box.src = URL.createObjectURL(x); });
        return h('label', null, h('input', { type: 'checkbox', value: f.nome, disabled: Fotos.ehHeic(f.nome) }), box, `${f.nome} · ${P.dataHora(f.modificado)}`);
      }) : h('p', { class: 'sec-note' }, 'Nenhuma foto na pasta de entrada desta portaria.'));
      const dlg = P.dialogo({
        id: 'dlg3', cod: 'Adicionar fotos', titulo: rotulo || 'Escolha as fotos',
        corpo: [h('p', { class: 'sec-note', style: 'margin:0' }, `Fotos enviadas pelo celular (app OneDrive) para a pasta ${pastaEntrada(portaria).join('/')}. Marque as que pertencem a este ponto. Não apareceu? Aguarde a sincronização e clique em Atualizar.`), galeria],
        acoes: [
          { txt: 'Atualizar', cls: 'btn ghost', fn: () => { feito = true; dlg.fechar(); escolherFotos({ alvo, ponto, rotulo, portaria }).then(resolver); } },
          { txt: 'Cancelar', cls: 'btn ghost', fn: () => dlg.fechar() },
          { txt: 'Vincular fotos marcadas', props: { id: 'fotos-ok' }, fn: async () => {
            const marcadas = [...galeria.querySelectorAll('input:checked')].map(i => lista.find(f => f.nome === i.value));
            if (!marcadas.length) return P.aviso('Marque ao menos uma foto.', 'err');
            const gravados = [];
            const ok = await P.acao(async () => {
              const destino = Fotos.pastaDestino(P.portariaInfo(portaria).pasta, new Date());
              const existentes = new Set((await A.listar(destino)).map(f => f.nome));
              let n = 1;
              for (const f of marcadas) {
                while (existentes.has(Fotos.nomeDestino({ alvo, ponto, n }))) n++;
                const nome = Fotos.nomeDestino({ alvo, ponto, n });
                existentes.add(nome);
                await A.gravarArquivo(destino, nome, await Fotos.reduzir(await f.handle.getFile()));
                await A.remover(pastaEntrada(portaria), f.nome);
                const caminho = [...destino, nome].join('/');
                gravados.push(caminho);
                await P.gravar('foto_vinculada', portaria, { origem: f.nome, destino: caminho, alvo: { alvo, ponto } });
              }
            }, `${marcadas.length} foto(s) vinculada(s).`);
            if (ok) { feito = true; dlg.fechar(); resolver(gravados); }
          } },
        ],
        aoFechar: () => { if (!feito) resolver([]); },
      });
    });
  }

  // Bloco "Fotos" para formulários: miniaturas + botão "Adicionar fotos". lista é mutada.
  function blocoFotos(lista, { alvo, ponto, rotulo, portaria }) {
    const box = h('div', { class: 'fotos' });
    const desenhar = () => box.replaceChildren(miniaturas(lista), P.botao(`Adicionar fotos${lista.length ? ` (${lista.length})` : ''}`, 'btn ghost', async () => {
      const novos = await escolherFotos({ alvo: typeof alvo === 'function' ? alvo() : alvo, ponto, rotulo, portaria });
      lista.push(...novos); desenhar();
    }, { 'data-ponto': ponto }));
    desenhar();
    return box;
  }

  Object.assign(P, { escolherFotos, miniaturas, blocoFotos });
})();
