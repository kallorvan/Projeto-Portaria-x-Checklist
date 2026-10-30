// Definições das fichas REG LOG 03 e REG LOG 04 e das portarias.
// Script clássico (sem módulos) para funcionar com o painel aberto direto da pasta (file://).
// Também carregável no Node para testes: module.exports no final.
(function (root) {
  'use strict';

  const PORTARIAS = [
    { id: 'MAC', nome: 'Tóliman Machado', pasta: 'Machado' },
    { id: 'JP', nome: 'Tóliman João Pessoa', pasta: 'JoaoPessoa' },
    { id: 'DIS', nome: 'Tóliman Distrito', pasta: 'Distrito' },
  ];

  const CODIGOS_AVARIA = [
    { id: 'A', nome: 'Amassado' },
    { id: 'R', nome: 'Riscado' },
    { id: 'F', nome: 'Faltando' },
    { id: 'Q', nome: 'Quebrado' },
    { id: 'C', nome: 'Cortado' },
    { id: 'M', nome: 'Marcado guia' },
  ];

  function regioesDoVeiculo(reboques) {
    const r = [
      { id: 'cavalo_motorista', nome: 'Cavalo – lado motorista' },
      { id: 'cavalo_frente', nome: 'Cavalo – frente' },
      { id: 'cavalo_carona', nome: 'Cavalo – lado carona' },
    ];
    (reboques || []).filter(Boolean).forEach((placa, i) => {
      const n = i + 1, base = `Reboque ${n} (${placa})`;
      r.push({ id: `reboque${n}_motorista`, nome: `${base} – lado motorista` });
      r.push({ id: `reboque${n}_carona`, nome: `${base} – lado carona` });
      r.push({ id: `reboque${n}_traseira`, nome: `${base} – traseira` });
    });
    return r;
  }

  const ITENS_MOTORISTA_03 = [
    { id: 'aet_sp', nome: 'AET São Paulo' },
    { id: 'aet_mg', nome: 'AET Minas Gerais' },
    { id: 'aet_denit', nome: 'AET DENIT' },
    { id: 'cnh', nome: 'CNH' },
    { id: 'crlv', nome: 'CRLV' },
    { id: 'luzes', nome: 'Verificar luzes geral' },
    { id: 'oleo', nome: 'Verificar óleo motor' },
    { id: 'agua', nome: 'Verificar água' },
    { id: 'crlv_reboque1', nome: 'CRLV placa reboque 1' },
    { id: 'crlv_reboque2', nome: 'CRLV placa reboque 2' },
    { id: 'locks', nome: 'Verificar locks' },
    { id: 'eixos', nome: 'Verificar eixos suspensão' },
    { id: 'pneus', nome: 'Bater pneus' },
  ];

  const LIMPEZA_03 = [
    { id: 'limpo', nome: 'Limpo e organizado' },
    { id: 'lixo', nome: 'Contém lixo espalhado' },
    { id: 'odor', nome: 'Contém mau odor (cigarro/comida)' },
  ];

  const CONDICAO_CABINE = ['otimo', 'regular', 'ruim'];

  const ITENS_17 = [
    'Para-choque', 'Motor', 'Pneus', 'Piso da unidade tratora', 'Tanque de combustível', 'Cabine',
    'Reservatório de ar', 'Eixo de transmissão', 'Quinta roda', 'Sistema de exaustão', 'Chassi',
    'Portas', 'Lateral direita', 'Lateral esquerda', 'Parede frontal', 'Teto', 'Piso do compartimento de carga',
  ].map((nome, i) => ({ n: i + 1, nome }));

  const TIPOS_CARGA = [
    { id: 'container_vazio', nome: 'Veículo carregado com container vazio' },
    { id: 'container_com_carga', nome: 'Veículo carregado com container com carga' },
    { id: 'vazio', nome: 'Veículo vazio (sem container)' },
  ];

  const LACRES_04 = [
    { id: 'armador1', nome: 'Nº do lacre armador' },
    { id: 'armador2', nome: 'Nº do lacre armador (2)' },
    { id: 'exportador1', nome: 'Nº do lacre exportador' },
    { id: 'exportador2', nome: 'Nº do lacre exportador (2)' },
    { id: 'alfandegario', nome: 'Nº do lacre alfandegário' },
    { id: 'provisorioToliman', nome: 'Nº do lacre provisório Tóliman' },
    { id: 'containerVazio', nome: 'Nº de lacre de segurança / container vazio inspecionado e aprovado' },
  ];

  // A ficha impressa do REG LOG 04 traz "LOG 03" no Nº Reg. por erro; o painel usa "LOG 04" (confirmado pelo usuário).
  const CABECALHO_FICHAS = {
    '03': { titulo: 'Ficha para Inspeção Veicular Operacional', reg: 'LOG 03', revisao: '05', data: '20/05/2026',
      elaboracao: 'Anderson Santana', revisaoPor: 'Alef Azevedo', aprovacao: 'Altemar Campos' },
    '04': { titulo: 'Ficha para Inspeção de Segurança de Veículos 17 Pontos', reg: 'LOG 04', revisao: '05', data: '20/05/2026',
      elaboracao: 'Alisson Oliveira', revisaoPor: 'Alef Azevedo', aprovacao: 'Altemar Campos' },
  };

  const api = { PORTARIAS, CODIGOS_AVARIA, regioesDoVeiculo, ITENS_MOTORISTA_03, LIMPEZA_03, CONDICAO_CABINE, ITENS_17, TIPOS_CARGA, LACRES_04, CABECALHO_FICHAS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Fichas = api;
})(typeof window !== 'undefined' ? window : globalThis);
