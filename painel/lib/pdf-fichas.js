// PDF dos checklists REG LOG 03 e 04 no layout das fichas em papel (A4 retrato), com jsPDF.
(function (root) {
  'use strict';

  const INK = [28, 37, 67], MUTED = [118, 123, 141], LINHA = [190, 194, 208], CORAL = [221, 70, 99], FUNDO = [239, 240, 245];
  const M = 12, L = 210 - 2 * M, FIM = 285;

  const nomePdf = (numero, placa, versao) => `${numero}_${String(placa || '').replace(/[^A-Za-z0-9]/g, '')}${versao > 1 ? '_v' + versao : ''}.pdf`;
  const dois = (n) => String(n).padStart(2, '0');
  const dataHora = (em) => { const d = new Date(em); return `${dois(d.getDate())}/${dois(d.getMonth() + 1)}/${d.getFullYear()} ${dois(d.getHours())}:${dois(d.getMinutes())}`; };
  const dataBR = (iso) => (iso ? iso.split('-').reverse().join('/') : '');

  function gerar(ck, fotos) {
    const { jsPDF } = root.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const cab = root.Fichas.CABECALHO_FICHAS[ck.ficha];
    let y = 0;

    const fonte = (tam, estilo = 'normal', cor = INK) => { doc.setFont('helvetica', estilo); doc.setFontSize(tam); doc.setTextColor(...cor); };
    const caixa = (x, yy, w, hh, preencher) => { doc.setDrawColor(...LINHA); doc.setLineWidth(0.25); if (preencher) { doc.setFillColor(...preencher); doc.rect(x, yy, w, hh, 'FD'); } else doc.rect(x, yy, w, hh); };

    function cabecalho() {
      caixa(M, 8, L, 26);
      try { doc.addImage(root.LOGOS.toliman, 'PNG', M + 2, 10, 36, 11.7); } catch { fonte(16, 'bold'); doc.text('TÓLIMAN', M + 3, 18); }
      fonte(11.5, 'bold'); doc.text(doc.splitTextToSize(cab.titulo, L - 90), M + 42 + (L - 84) / 2, 14, { align: 'center' });
      fonte(8, 'normal', MUTED); doc.text('Nº Checklist', M + L - 3, 12.5, { align: 'right' });
      fonte(10.5, 'bold'); doc.text(ck.numero + (ck.versao > 1 ? ` (v${ck.versao})` : ''), M + L - 3, 18, { align: 'right' });
      doc.setDrawColor(...LINHA); doc.line(M, 22, M + L, 22);
      fonte(6.8, 'italic'); doc.text(`Elaboração: ${cab.elaboracao}`, M + 2, 25.5); doc.text(`Revisão: ${cab.revisaoPor}`, M + 2, 28.5); doc.text(`Aprovação: ${cab.aprovacao}`, M + 2, 31.5);
      const cols = [['Nº Reg.', cab.reg], ['Revisão', cab.revisao], ['Data', cab.data], ['Página', `${doc.getNumberOfPages()}`]];
      const x0 = M + 52, w = (L - 52) / cols.length;
      cols.forEach(([t, v], i) => { const x = x0 + i * w; doc.line(x, 22, x, 34); fonte(6.8, 'bold'); doc.text(t, x + w / 2, 26, { align: 'center' }); fonte(8); doc.text(String(v), x + w / 2, 31.5, { align: 'center' }); });
      y = 39;
    }
    function novaPagina() { doc.addPage(); cabecalho(); }
    const garantir = (h) => { if (y + h > FIM) novaPagina(); };

    function titulo(t) { garantir(26); doc.setFillColor(...INK); doc.rect(M, y, L, 6, 'F'); fonte(8.5, 'bold', [255, 255, 255]); doc.text(t.toUpperCase(), M + 2, y + 4.2); y += 8; }

    // Pares rótulo/valor em colunas.
    function campos(pares, colunas = 2) {
      const w = L / colunas;
      for (let i = 0; i < pares.length; i += colunas) {
        const linha = pares.slice(i, i + colunas);
        fonte(6.5, 'bold'); const rotulos = linha.map(([r]) => doc.splitTextToSize(r.toUpperCase(), w - 4));
        fonte(9); const valores = linha.map(([, v]) => doc.splitTextToSize(String(v == null || v === '' ? '—' : v), w - 4));
        const nr = Math.max(...rotulos.map(r => r.length));
        const hh = 1 + nr * 3 + Math.max(...valores.map(v => v.length)) * 4;
        garantir(hh);
        linha.forEach(([r, v], j) => {
          const x = M + j * w;
          caixa(x, y, w, hh);
          fonte(6.5, 'bold', MUTED); doc.text(rotulos[j], x + 2, y + 3.2);
          fonte(9); doc.text(valores[j], x + 2, y + 3.8 + nr * 3);
        });
        y += hh;
      }
      y += 2;
    }

    // Tabela com quebra de texto; cols: [{ t, w, alinhar }]; linhas: arrays de texto; destaque(i) pinta a linha.
    function tabela(cols, linhas, destaque) {
      const desenharCab = () => { garantir(7); let x = M; doc.setFillColor(...FUNDO); doc.rect(M, y, L, 6, 'F'); fonte(7, 'bold'); cols.forEach(c => { doc.text(c.t, c.alinhar === 'center' ? x + c.w / 2 : x + 1.5, y + 4.2, { align: c.alinhar || 'left' }); x += c.w; }); y += 6; };
      desenharCab();
      linhas.forEach((l, i) => {
        const partes = l.map((v, j) => doc.splitTextToSize(String(v == null ? '' : v), cols[j].w - 3));
        const hh = 2.5 + Math.max(1, ...partes.map(p => p.length)) * 3.8;
        if (y + hh > FIM) { novaPagina(); desenharCab(); }
        if (destaque && destaque(i)) { doc.setFillColor(251, 226, 231); doc.rect(M, y, L, hh, 'F'); }
        let x = M;
        partes.forEach((p, j) => { caixa(x, y, cols[j].w, hh); fonte(8.3, cols[j].negrito ? 'bold' : 'normal', destaque && destaque(i) && cols[j].alinhar === 'center' && p[0] === 'X' ? CORAL : INK); doc.text(p, cols[j].alinhar === 'center' ? x + cols[j].w / 2 : x + 1.5, y + 4, { align: cols[j].alinhar || 'left' }); x += cols[j].w; });
        y += hh;
      });
      y += 3;
    }

    function texto(t, tam = 8.5, estilo = 'normal', cor = INK) {
      fonte(tam, estilo, cor);
      const p = doc.splitTextToSize(t, L - 4);
      garantir(p.length * 4 + 2); fonte(tam, estilo, cor); doc.text(p, M + 2, y + 3.5); y += p.length * 4 + 2;
    }

    function assinaturas(pares) {
      garantir(24);
      const w = L / pares.length;
      pares.forEach(([rot, nome], i) => {
        const x = M + i * w + 3;
        doc.setDrawColor(...INK); doc.line(x, y + 12, x + w - 6, y + 12);
        fonte(7.5, 'bold'); doc.text(rot, x, y + 15.5);
        fonte(8); doc.text(nome || '', x, y + 19.5);
      });
      y += 24;
    }

    function blocoFotos() {
      if (!fotos || !fotos.length) return;
      titulo('Fotos');
      const w = (L - 6) / 2, hh = w * 0.66;
      fotos.forEach((f, i) => {
        if (i % 2 === 0) garantir(hh + 8);
        const x = M + (i % 2) * (w + 6);
        try { doc.addImage(f.dataUrl, 'JPEG', x, y, w, hh, undefined, 'FAST'); } catch { caixa(x, y, w, hh); }
        fonte(7.5, 'normal', MUTED); doc.text(doc.splitTextToSize(f.ponto, w), x, y + hh + 3.5);
        if (i % 2 === 1 || i === fotos.length - 1) y += hh + 8;
      });
    }

    cabecalho();
    const d = ck.dados;
    if (ck.ficha === '03') {
      campos([['Unidade Tóliman', ck.portariaNome], ['Chegada', dataHora(ck.chegada)], ['Placa veículo / cavalo', ck.placaCavalo], ['Placas reboques', (ck.reboques || []).join(' / ')],
        ['Motorista', d.nomes.motorista], ['Vistoriador / conferente', ck.pessoa]]);
      titulo('Limpeza e organização interna do veículo');
      const sn = (v) => (v == null ? '—' : v ? 'Sim' : 'Não');
      campos(root.Fichas.LIMPEZA_03.map(it => [it.nome, sn(d.limpeza[it.id])]), 3);
      titulo('Avarias por região');
      texto('A - Amassado   R - Riscado   F - Faltando   Q - Quebrado   C - Cortado   M - Marcado guia', 7.5, 'normal', MUTED);
      const regioes = root.Fichas.regioesDoVeiculo(ck.reboques);
      tabela([{ t: 'Região', w: 70, negrito: true }, { t: 'Avarias', w: 40 }, { t: 'Descrição', w: L - 110 }],
        regioes.map(g => { const r = d.regioes[g.id] || {}; return [g.nome, r.semAvarias ? 'Sem avarias' : (r.codigos || []).join(', '), r.descricao || '']; }),
        (i) => { const r = d.regioes[regioes[i].id] || {}; return !r.semAvarias && (r.codigos || []).length; });
      titulo('Preenchimento exclusivo do motorista');
      const itens = root.Fichas.ITENS_MOTORISTA_03.filter(it => !/reboque(\d)/.test(it.id) || (ck.reboques || []).length >= Number(it.id.slice(-1)));
      campos([...itens.map(it => [it.nome, d.motorista[it.id] ? 'Verificado' : 'Não verificado']), ['Condição da cabine', { otimo: 'Ótimo', regular: 'Regular', ruim: 'Ruim' }[d.cabine] || '']], 3);
      titulo('Carretas, container e lacre');
      campos([['Qtde de estepes', d.estepes], ['Carreta dianteira', d.carretaDianteira], ['Carreta traseira', d.carretaTraseira], ['Container', d.container], ['Lacre', d.lacre]], 3);
      titulo('Assinaturas');
      assinaturas([['Vistoriador / Conferente', ck.pessoa], ['Motorista', d.nomes.motorista], ['Porteiro', d.nomes.porteiro], ['Líder', d.nomes.lider]]);
    } else {
      const lac = Object.fromEntries(root.Fichas.LACRES_04.map(l => [l.id, d.lacres[l.id]]));
      campos([['Unidade Tóliman', d.unidade], ['Data da vistoria', dataBR(d.dataVistoria)], ['Motorista', d.motorista], ['Placa cavalo', d.placas.cavalo],
        ['Semi-reboque 1', d.placas.reboques[0]], ['Semi-reboque 2', d.placas.reboques[1]], ['Semi-reboque 3', d.placas.reboques[2]], ['Chegada', dataHora(ck.chegada)]]);
      titulo('Lacres e containers');
      campos([['Nº do lacre armador', [lac.armador1, lac.armador2].filter(Boolean).join(' / ')], ['Nº do lacre exportador', [lac.exportador1, lac.exportador2].filter(Boolean).join(' / ')],
        ['Nº do lacre alfandegário', lac.alfandegario], ['Nº do lacre provisório Tóliman', lac.provisorioToliman],
        ['Nº de lacre de segurança / container vazio inspecionado e aprovado', lac.containerVazio], ['Nº dos containers 1, 2', (d.containers || []).filter(Boolean).join(' / ')]]);
      root.Fichas.TIPOS_CARGA.forEach(t => texto(`(${d.tipoCarga === t.id ? 'X' : '   '}) ${t.nome}`, 8.5, d.tipoCarga === t.id ? 'bold' : 'normal'));
      titulo('Descrição da inspeção');
      tabela([{ t: 'Nº', w: 9, alinhar: 'center' }, { t: 'Item alvo da avaliação', w: 52, negrito: true }, { t: 'Em conformidade', w: 22, alinhar: 'center' }, { t: 'Não conforme', w: 20, alinhar: 'center' }, { t: 'Não aplicável', w: 20, alinhar: 'center' }, { t: 'Observações', w: L - 123 }],
        root.Fichas.ITENS_17.map(it => { const r = d.itens[it.n] || {}; return [it.n, it.nome, r.resposta === 'C' ? 'X' : '', r.resposta === 'NC' ? 'X' : '', r.resposta === 'NA' ? 'X' : '', r.obs || '']; }),
        (i) => (d.itens[i + 1] || {}).resposta === 'NC');
      texto('ATENÇÃO: Os itens a seguir não serão inspecionados quando o veículo estiver carregado com container com carga, ou vazio já lacrado com lacre de segurança de container vazio: 12, 13, 14, 15, 16, 17. E devem ser classificados como não aplicável.', 7.5, 'italic', MUTED);
      titulo('Observações');
      texto(d.observacoes || '—');
      titulo('Assinaturas');
      assinaturas([['Conferente', ck.pessoa], ['Líder da Tóliman Matriz', d.lider]]);
    }
    blocoFotos();
    // Rodapé com o total de páginas.
    const total = doc.getNumberOfPages();
    for (let i = 1; i <= total; i++) {
      doc.setPage(i);
      fonte(7, 'normal', MUTED);
      doc.text(`Gerado pelo painel Portaria Tóliman em ${dataHora(ck.em)} · ${ck.numero} · versão ${ck.versao} · página ${i}/${total}`, M, 292);
    }
    return doc.output('blob');
  }

  root.PdfFichas = { gerar, nomePdf };
})(window);
