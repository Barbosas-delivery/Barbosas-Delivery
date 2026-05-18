# Fase 64 — Finalização profissional

Versão: `6.0.52-fase-64-finalizacao-profissional`

Esta fase fecha o ciclo de adaptação do Barbosa's Delivery para lanchonete com uma camada final de validação operacional antes de produção.

## Objetivos

- Revisar o fluxo completo de pedido do cliente até a fila de impressão.
- Reforçar o diagnóstico do sistema com checklist de produção.
- Consolidar validações de Supabase, estoque, impressão, Vercel, desktop e backup.
- Criar SQL de apoio para registrar validações operacionais da produção.
- Deixar documentação objetiva para conferência antes de abrir a loja.

## Mudanças no app

- Versão atualizada para `6.0.52-fase-64-finalizacao-profissional`.
- Aba **Diagnóstico** ganhou o bloco **Pronto para produção**.
- O diagnóstico exportado em JSON agora inclui `productionReadiness` com:
  - quantidade de checks aprovados;
  - total de checks;
  - percentual de conclusão;
  - lista detalhada dos itens avaliados.
- Checklist final avalia:
  - Supabase configurado;
  - pedido completo testado;
  - impressão validada;
  - estoque protegido;
  - Vercel conferido;
  - desktop de impressão pronto;
  - rotina de backup definida.

## SQL da fase

Arquivo criado:

```txt
supabase/migracao-final-producao-6-0-52.sql
```

Ele adiciona estrutura para registrar rodadas de validação operacional sem afetar pedidos existentes:

- tabela `production_validation_runs`;
- view `production_validation_summary_view`;
- função `register_production_validation_run(jsonb, text)`;
- configuração `store_settings.production_readiness`.

## Checklist recomendado depois de subir

1. Rodar o SQL `supabase/migracao-final-producao-6-0-52.sql`.
2. Fazer deploy no Vercel.
3. Abrir o app em janela anônima ou celular.
4. Criar um pedido de teste com:
   - lanche;
   - adicional;
   - ingrediente removido;
   - observação por item;
   - escolha de combo/porção, se houver.
5. Conferir se a loja recebe o pedido direto como aguardando retirada/preparo.
6. Conferir se entram vias de impressão para cozinha e entrega.
7. Abrir o Desktop de impressão e processar a fila.
8. Conferir baixa de estoque.
9. Baixar o diagnóstico na aba **Diagnóstico**.
10. Registrar internamente se a operação está pronta para venda real.

## Observação

Esta fase não remove tabelas antigas de fiado nem apaga histórico. O foco é estabilização, validação e produção segura.
