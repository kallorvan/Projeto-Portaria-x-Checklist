// Aba Cadastros (administrador): veículos, funcionários, fora do cadastro e importação de planilha.
(function () {
  'use strict';
  const P = window.Painel;
  const { h, botao, inp, sel, campo, st } = P;

  const TIPOS = [['cavalo', 'Cavalo'], ['reboque', 'Reboque'], ['leve', 'Veículo leve']];
  const VINCULOS = [['proprio', 'Próprio'], ['terceiro', 'Agregado/Terceiro']];
  const nomeDe = (lista, id) => (lista.find(x => x[0] === id) || [id, id])[1];
  let sub = 'vei', busca = '', inativos = false;

  function chipCnh(validade) {
    const a = Regras.avisoCnh(validade, new Date());
    if (a === 'vencida') return h('span', { class: 'tag warn' }, 'vencida');
    if (a === 'vence_em_breve') return h('span', { class: 'tag pre' }, 'vence em breve');
    return null;
  }

  /* ---------- diálogos de edição ---------- */
  function editarVeiculo(v = {}) {
    const placa = inp({ id: 'vei-placa', value: v.placa || '', maxlength: 8, disabled: !!v.placa && v.ativo !== undefined });
    const tipo = sel(TIPOS, v.tipo || 'cavalo', { id: 'vei-tipo' });
    const modelo = inp({ id: 'vei-modelo', value: v.modelo || '' });
    const vinculo = sel(VINCULOS, v.vinculo || 'proprio', { id: 'vei-vinculo' });
    const err = h('div');
    const dlg = P.dialogo({
      id: 'dlg2', cod: 'Cadastro', titulo: v.ativo !== undefined ? `Veículo ${v.placa}` : 'Incluir veículo',
      corpo: [h('div', { class: 'grid2' }, campo('Placa', placa, { req: true }), campo('Tipo', tipo, { req: true }), campo('Modelo / descrição', modelo), campo('Vínculo', vinculo)), err],
      acoes: [{ txt: 'Cancelar', cls: 'btn ghost', fn: () => dlg.fechar() }, { txt: 'Salvar', props: { id: 'cad-salvar' }, fn: async () => {
        const p = Regras.normalizarPlaca(placa.value);
        if (!p) return err.replaceChildren(P.listaErros(['Informe a placa.']));
        if (v.ativo === undefined && st.estado.veiculos.has(p) && !v.placa) return err.replaceChildren(P.listaErros([`A placa ${p} já está cadastrada.`]));
        const ok = await P.acao(() => P.gravar('veiculo_salvo', null, { placa: p, tipo: tipo.value, modelo: modelo.value.trim(), vinculo: vinculo.value, ativo: v.ativo === undefined ? true : v.ativo }), `Veículo ${p} salvo.`);
        if (ok) dlg.fechar();
      } }],
    });
  }

  function editarFuncionario(f = {}) {
    const nome = inp({ id: 'fun-nome', value: f.nome || '' });
    const matricula = inp({ id: 'fun-matricula', value: f.matricula || '', disabled: f.id !== undefined && !!f.matricula });
    const setor = inp({ id: 'fun-setor', value: f.setor || '' });
    const mot = h('input', { type: 'checkbox', id: 'fun-motorista', checked: !!f.motorista });
    const cnh = inp({ id: 'fun-cnh', value: f.cnhNumero || '' });
    const val = inp({ id: 'fun-cnh-validade', type: 'date', value: f.cnhValidade || '' });
    const blocoCnh = h('div', { class: 'grid2' }, campo('Nº da CNH', cnh), campo('Validade da CNH', val));
    const mostrar = () => { blocoCnh.hidden = !mot.checked; };
    mot.addEventListener('change', mostrar); mostrar();
    const err = h('div');
    const dlg = P.dialogo({
      id: 'dlg2', cod: 'Cadastro', titulo: f.id ? f.nome : 'Incluir funcionário',
      corpo: [h('div', { class: 'grid2' }, campo('Nome', nome, { req: true }), campo('Matrícula', matricula), campo('Setor / função', setor)),
        h('label', { class: 'check' }, mot, 'É motorista'), blocoCnh, err],
      acoes: [{ txt: 'Cancelar', cls: 'btn ghost', fn: () => dlg.fechar() }, { txt: 'Salvar', props: { id: 'cad-salvar' }, fn: async () => {
        const n = nome.value.trim();
        if (!n) return err.replaceChildren(P.listaErros(['Informe o nome.']));
        const id = f.id || matricula.value.trim() || Csv.slug(n);
        if (!f.id && st.estado.funcionarios.has(id)) return err.replaceChildren(P.listaErros(['Já existe funcionário com essa matrícula ou nome.']));
        const dados = { id, nome: n, matricula: matricula.value.trim(), setor: setor.value.trim(), motorista: mot.checked,
          cnhNumero: mot.checked ? cnh.value.trim() : '', cnhValidade: mot.checked && val.value ? val.value : null, ativo: f.ativo === undefined ? true : f.ativo };
        const ok = await P.acao(() => P.gravar('funcionario_salvo', null, dados), `${n} salvo.`);
        if (ok) dlg.fechar();
      } }],
    });
  }
  // Usado por outras telas (fora do cadastro → "Cadastrar").
  P.editarVeiculo = editarVeiculo;
  P.editarFuncionario = editarFuncionario;

  /* ---------- importação ---------- */
  async function importar(arquivo) {
    const texto = await arquivo.text();
    const vei = sub === 'vei';
    const r = vei ? Csv.importarVeiculos(texto) : Csv.importarFuncionarios(texto);
    const rotulo = vei ? 'veículos' : 'funcionários';
    const dlg = P.dialogo({
      id: 'dlg', cod: 'Importar planilha', titulo: arquivo.name,
      corpo: [h('p', null, `${r.itens.length} ${rotulo} prontos para importar. Itens já cadastrados são atualizados com os dados da planilha.`),
        r.erros.length ? [h('p', null, `${r.erros.length} linha(s) com erro não serão importadas:`), P.listaErros(r.erros)] : null,
        h('div', { class: 'tbl-scroll' }, h('table', null, h('tbody', null, r.itens.slice(0, 50).map(i => h('tr', null,
          vei ? [h('td', { class: 'nm' }, i.placa), h('td', null, nomeDe(TIPOS, i.tipo)), h('td', null, i.modelo), h('td', null, nomeDe(VINCULOS, i.vinculo))]
            : [h('td', null, h('b', null, i.nome)), h('td', null, i.matricula), h('td', null, i.setor), h('td', null, i.motorista ? 'Motorista' : ''), h('td', null, P.dataBR(i.cnhValidade))])))))],
      acoes: [{ txt: 'Cancelar', cls: 'btn ghost', fn: () => dlg.fechar() }, { txt: `Importar ${r.itens.length}`, props: { id: 'cad-importar-ok', disabled: !r.itens.length }, fn: async () => {
        const ok = await P.acao(async () => { for (const i of r.itens) await P.gravar(vei ? 'veiculo_salvo' : 'funcionario_salvo', null, i); }, `${r.itens.length} ${rotulo} importados.`);
        if (ok) dlg.fechar();
      } }],
    });
  }

  /* ---------- tela ---------- */
  function tabelaVeiculos() {
    const q = busca.toUpperCase().replace(/[^A-Z0-9 ]/g, '');
    const lista = [...st.estado.veiculos.values()].filter(v => (inativos || v.ativo !== false) && (!q || (v.placa + ' ' + (v.modelo || '').toUpperCase()).includes(q))).sort((a, b) => a.placa.localeCompare(b.placa));
    return h('table', null, h('thead', null, h('tr', null, ['Placa', 'Tipo', 'Modelo', 'Vínculo', 'Situação', ''].map(t => h('th', null, t)))),
      h('tbody', null, lista.length ? lista.map(v => h('tr', null,
        h('td', { class: 'nm' }, v.placa), h('td', null, nomeDe(TIPOS, v.tipo)), h('td', null, v.modelo || ''), h('td', null, nomeDe(VINCULOS, v.vinculo)),
        h('td', null, v.ativo === false ? h('span', { class: 'tag' }, 'inativo') : h('span', { class: 'tag ok' }, 'ativo')),
        h('td', null, botao('Editar', 'btn ghost', () => editarVeiculo(v)), ' ',
          botao(v.ativo === false ? 'Reativar' : 'Desativar', 'btn ghost', () => P.acao(() => P.gravar('veiculo_salvo', null, { ...v, ativo: v.ativo === false }), v.ativo === false ? 'Veículo reativado.' : 'Veículo desativado.'))))) :
        h('tr', null, h('td', { colspan: 6, class: 'sec-note' }, 'Nenhum veículo.'))));
  }

  function tabelaFuncionarios() {
    const q = busca.toLowerCase();
    const lista = [...st.estado.funcionarios.values()].filter(f => (inativos || f.ativo !== false) && (!q || `${f.nome} ${f.matricula} ${f.setor}`.toLowerCase().includes(q))).sort((a, b) => a.nome.localeCompare(b.nome));
    return h('table', null, h('thead', null, h('tr', null, ['Nome', 'Matrícula', 'Setor', 'Motorista', 'CNH', 'Situação', ''].map(t => h('th', null, t)))),
      h('tbody', null, lista.length ? lista.map(f => h('tr', null,
        h('td', null, h('b', null, f.nome)), h('td', { class: 'num' }, f.matricula || ''), h('td', null, f.setor || ''), h('td', null, f.motorista ? 'Sim' : ''),
        h('td', null, f.motorista ? [f.cnhNumero || '', ' ', P.dataBR(f.cnhValidade), ' ', chipCnh(f.cnhValidade)] : ''),
        h('td', null, f.ativo === false ? h('span', { class: 'tag' }, 'inativo') : h('span', { class: 'tag ok' }, 'ativo')),
        h('td', null, botao('Editar', 'btn ghost', () => editarFuncionario(f)), ' ',
          botao(f.ativo === false ? 'Reativar' : 'Desativar', 'btn ghost', () => P.acao(() => P.gravar('funcionario_salvo', null, { ...f, ativo: f.ativo === false }), f.ativo === false ? 'Funcionário reativado.' : 'Funcionário desativado.'))))) :
        h('tr', null, h('td', { colspan: 7, class: 'sec-note' }, 'Nenhum funcionário.'))));
  }

  function tabelaFora() {
    const lista = st.estado.permanencias.filter(p => p.foraDoCadastro.length).sort((a, b) => (a.entrada.em < b.entrada.em ? 1 : -1));
    return h('table', null, h('thead', null, h('tr', null, ['Entrada', 'Portaria', 'Registro', 'Fora do cadastro', ''].map(t => h('th', null, t)))),
      h('tbody', null, lista.length ? lista.map(p => {
        const c = p.entrada.campos;
        const pendentes = p.foraDoCadastro.filter(f => (f.startsWith('placa:') ? !st.estado.veiculos.has(f.slice(6)) : true));
        return h('tr', null, h('td', { class: 'num' }, P.dataHora(p.entrada.em)), h('td', null, P.portariaInfo(p.portaria).pasta),
          h('td', null, p.categoria === 'frota' ? `Frota ${c.placaCavalo} · ${c.motoristaNome || ''}` : `Colaborador ${c.nome || ''}`),
          h('td', null, pendentes.map(f => h('span', { class: 'tag pre' }, f.startsWith('placa:') ? 'placa ' + f.slice(6) : f))),
          h('td', null, pendentes.map(f => f.startsWith('placa:') ? botao(`Cadastrar ${f.slice(6)}`, 'btn ghost', () => editarVeiculo({ placa: f.slice(6), tipo: p.categoria === 'colaborador' ? 'leve' : 'cavalo' }))
            : botao(`Cadastrar ${f}`, 'btn ghost', () => editarFuncionario({ nome: f === 'motorista' ? c.motoristaNome : c.nome, motorista: f === 'motorista' })))));
      }) : h('tr', null, h('td', { colspan: 5, class: 'sec-note' }, 'Nada fora do cadastro.'))));
  }

  P.telas.cad = {
    admin: true, preservar: true,
    render(alvo) {
      const chips = [['vei', 'Veículos'], ['fun', 'Funcionários'], ['fora', 'Fora do cadastro']].map(([id, t]) =>
        botao(t, 'chip', () => { sub = id; busca = ''; P.render(); }, { id: 'cad-sub-' + id, 'aria-pressed': String(sub === id) }));
      const arquivo = h('input', { type: 'file', id: 'cad-arquivo', accept: '.csv,text/csv', hidden: true, onchange: (e) => { const f = e.target.files[0]; e.target.value = ''; if (f) importar(f); } });
      const ferramentas = sub === 'fora' ? null : h('div', { class: 'tools' },
        h('input', { type: 'search', id: 'cad-busca', placeholder: sub === 'vei' ? 'Buscar placa ou modelo' : 'Buscar nome, matrícula ou setor', value: busca, oninput: (e) => { busca = e.target.value; corpo.replaceChildren(sub === 'vei' ? tabelaVeiculos() : tabelaFuncionarios()); } }),
        h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: inativos, onchange: (e) => { inativos = e.target.checked; P.render(); } }), 'Mostrar inativos'),
        botao(sub === 'vei' ? 'Incluir veículo' : 'Incluir funcionário', 'btn', () => (sub === 'vei' ? editarVeiculo() : editarFuncionario()), { id: 'cad-novo' }),
        botao('Importar planilha (CSV)', 'btn ghost', () => arquivo.click(), { id: 'cad-importar' }), arquivo);
      const corpo = h('div', { class: 'tbl-scroll' }, sub === 'vei' ? tabelaVeiculos() : sub === 'fun' ? tabelaFuncionarios() : tabelaFora());
      const nota = sub === 'fora' ? 'Registros feitos na portaria com placa ou pessoa que não está no cadastro. Cadastre para completar.'
        : 'A planilha deve ter as colunas do modelo (pasta entrega/ do pacote): ' + (sub === 'vei' ? 'Placa; Tipo (Cavalo, Reboque ou Leve); Modelo; Vinculo (Próprio ou Terceiro).' : 'Nome; Matricula; Setor; Motorista (Sim/Não); CNH; ValidadeCNH (DD/MM/AAAA).');
      alvo.replaceChildren(h('div', { class: 'sec' }, h('div', { class: 'tools' }, chips), h('p', { class: 'sec-note' }, nota), ferramentas, corpo));
    },
  };
})();
