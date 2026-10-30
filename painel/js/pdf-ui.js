// Gera o PDF do checklist com as fotos vinculadas e grava em checklists/<portaria>/<AAAA-MM>/.
(function () {
  'use strict';
  const P = window.Painel;
  const A = window.Armazenamento;

  const lerDataUrl = (file) => new Promise((ok, ko) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = () => ko(r.error); r.readAsDataURL(file); });

  async function carregarFotos(lista) {
    const r = [];
    for (const { ponto, caminho } of lista) {
      const partes = caminho.split('/');
      try { r.push({ ponto, dataUrl: await lerDataUrl(await A.lerArquivo(partes.slice(0, -1), partes.at(-1))) }); }
      catch { r.push({ ponto: `${ponto} (foto não encontrada: ${caminho})`, dataUrl: null }); }
    }
    return r;
  }

  P.gerarPdfChecklist = async ({ numero, ficha, versao, permanencia, dados, pessoa, em }) => {
    const c = permanencia.entrada.campos;
    const fotos = [];
    if (ficha === '03') {
      for (const g of Fichas.regioesDoVeiculo(c.reboques)) for (const caminho of (dados.regioes[g.id] || {}).fotos || []) fotos.push({ ponto: g.nome, caminho });
    } else {
      for (const it of Fichas.ITENS_17) for (const caminho of (dados.itens[it.n] || {}).fotos || []) fotos.push({ ponto: `${it.n}. ${it.nome}`, caminho });
    }
    const blob = PdfFichas.gerar({
      numero, ficha, versao, dados, pessoa, em, portariaNome: P.portariaInfo(permanencia.portaria).nome,
      chegada: permanencia.entrada.em, placaCavalo: c.placaCavalo, reboques: c.reboques || [],
    }, (await carregarFotos(fotos)).filter(f => f.dataUrl));
    const d = new Date(em);
    const pasta = ['checklists', P.portariaInfo(permanencia.portaria).pasta, `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`];
    const nome = PdfFichas.nomePdf(numero, c.placaCavalo, versao);
    await A.gravarArquivo(pasta, nome, blob);
    return [...pasta, nome];
  };
})();
