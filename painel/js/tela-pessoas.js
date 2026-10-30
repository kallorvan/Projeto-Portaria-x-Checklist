// Aba Pessoas (administrador): quem opera o painel e seus papéis.
(function () {
  'use strict';
  const P = window.Painel;
  const { h, botao, inp, st } = P;

  const PAPEIS = [['porteiro', 'Porteiro'], ['gr', 'GR'], ['admin', 'Administrador']];

  function caixas(prefixo, marcados) {
    return h('div', { class: 'pessoas', style: 'justify-content:flex-start' }, PAPEIS.map(([id, nome]) =>
      h('label', { class: 'check' }, h('input', { type: 'checkbox', id: `${prefixo}-papel-${id}`, value: id, checked: marcados.includes(id) }), nome)));
  }
  const lidos = (box) => [...box.querySelectorAll('input:checked')].map(i => i.value);

  P.telas.pes = {
    admin: true,
    render(alvo) {
      const nome = inp({ id: 'pes-nome', placeholder: 'Nome da pessoa', maxlength: 40 });
      const papeis = caixas('pes', ['porteiro']);
      const form = h('form', { id: 'pes-form', class: 'form-card', onsubmit: async (ev) => {
        ev.preventDefault();
        const n = nome.value.trim(), ps = lidos(papeis);
        if (!n) return P.aviso('Informe o nome.', 'err');
        if (!ps.length) return P.aviso('Marque ao menos um papel.', 'err');
        if (st.estado.pessoas.some(p => p.nome.toLowerCase() === n.toLowerCase())) return P.aviso('Já existe uma pessoa com esse nome.', 'err');
        await P.acao(() => P.gravar('pessoa_adicionada', null, { nome: n, papeis: ps }), `${n} cadastrada.`);
      } }, h('h3', null, 'Adicionar pessoa'), nome, papeis, h('div', null, h('button', { class: 'btn', type: 'submit' }, 'Adicionar')));

      const linhas = st.estado.pessoas.map(p => {
        const box = caixas('p-' + P.slug(p.nome), p.papeis);
        return h('tr', null,
          h('td', null, h('b', null, p.nome)),
          h('td', null, box),
          h('td', null,
            botao('Salvar papéis', 'btn ghost', async () => {
              const ps = lidos(box);
              if (!ps.length) return P.aviso('Marque ao menos um papel.', 'err');
              await P.acao(() => P.gravar('papeis_definidos', null, { nome: p.nome, papeis: ps }), 'Papéis salvos.');
            }), ' ',
            p.nome === st.pessoa ? null : botao('Remover', 'btn ghost', async () => {
              if (!confirm(`Remover ${p.nome} da lista de pessoas?`)) return;
              await P.acao(() => P.gravar('pessoa_removida', null, { nome: p.nome }), `${p.nome} removida.`);
            })));
      });
      alvo.replaceChildren(
        h('div', { class: 'sec card' }, form),
        h('div', { class: 'sec' }, h('div', { class: 'sec-h' }, h('h2', null, 'Pessoas do painel'), h('span', { class: 'sec-note' }, 'Porteiro registra entradas, saídas e o REG LOG 03. GR faz e dispensa a vistoria 17 pontos. Administrador cuida dos cadastros.')),
          h('div', { class: 'tbl-scroll' }, h('table', null, h('thead', null, h('tr', null, h('th', null, 'Nome'), h('th', null, 'Papéis'), h('th', null, ''))), h('tbody', null, linhas)))),
      );
    },
  };
})();
