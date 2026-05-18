# Fase 67 — Testes funcionais completos

Versão: `6.0.55-fase-67-testes-funcionais-completos`

Esta fase foi criada para validar a Fase 66 como uma operação real de lanchonete, não apenas como build técnico.

## Objetivo

Validar, com dados de teste seguros, se o sistema consegue executar o fluxo completo:

1. criar categoria de lanches;
2. criar adicional por categoria;
3. cadastrar lanche sem estoque obrigatório;
4. manter bebida com estoque controlado;
5. cadastrar combo no lugar de kit;
6. lançar item no PDV Balcão;
7. criar comanda com número, mesa e responsável;
8. adicionar novos itens à comanda;
9. gerar impressão de adição de comanda;
10. imprimir consumo completo;
11. fechar comanda como venda normal;
12. limpar dados de teste sem afetar produtos reais.

## Dados usados

Todos os dados criados pela rotina SQL usam o prefixo:

```txt
TESTE FASE 67
```

Isso facilita localizar e apagar os dados depois.

## Comando principal no Supabase

Depois de rodar a migração da fase 67, execute:

```sql
select * from public.run_phase_67_functional_test('Gabriel', true);
```

O resultado deve retornar `status = passed` e `ready_percent = 100`.

## Limpeza dos dados de teste

Depois de conferir, execute:

```sql
select public.cleanup_phase_67_test_data();
```

## Teste local do código

No projeto:

```bash
npm test
```

O comando agora roda:

```txt
smoke-test
desktop-smoke-test
functional-test-fase67
```

## Onde conferir no app

Na aba **Diagnóstico**, foi adicionada a seção:

```txt
Teste funcional da Fase 67
```

Ela mostra o checklist operacional de produto, adicional, combo, PDV, comanda, impressão e estoque.

## Observação importante

O teste automatizado local simula os fluxos principais usando as funções do projeto. O teste SQL cria dados reais no Supabase para validar as tabelas, funções e fluxo de persistência.
