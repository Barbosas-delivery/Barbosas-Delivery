# Histórico de fases do Barbosa's Delivery

Este arquivo resume as principais fases implementadas no sistema para facilitar manutenção, conferência e suporte.

## Versão atual

- **Versão do app:** `6.0.1-final`
- **Base de código:** Fase 31 revisada + ajustes de rastreabilidade da Fase 32
- **Objetivo da Fase 32:** alinhar versão do app, diagnóstico e backup operacional para evitar confusão entre pacotes antigos e versão publicada.

## Fases principais

| Fase | Entrega principal |
|---|---|
| 1 | Remoção do NCM e exclusões lógicas de produtos, clientes e entregadores |
| 2 | Alteração e remoção de foto dos produtos |
| 3 | Produtos com sabores/variações |
| 4 | Funcionamento por horários da semana |
| 5 | Tempo automático de entrega por demanda |
| 6 | Notificações internas para loja e entregadores |
| 7 | WhatsApp opção A com mensagem pronta para o cliente |
| 8 | Correções críticas do cliente mobile e notificações |
| 9 | Impressão assistida de pedidos |
| 10 | Configurações de impressão |
| 11 | Estabilização, pagamento e duplicidade de clientes |
| 12 | Migração consolidada do Supabase |
| 13 | Configurações persistidas no navegador |
| 14 | Configurações sincronizadas no Supabase |
| 15 | Baixar backup operacional |
| 16 | Restaurar backup operacional |
| 17 | Revisão do fluxo de pedido do cliente |
| 18 | Revisão do painel do entregador |
| 19 | Revisão de caixa e pagamentos |
| 20 | Revisão final mobile e ajustes de produção |
| 21 | Relatórios de vendas e CSVs |
| 22 | Controle avançado de estoque |
| 23 | Cupons de desconto |
| 24 | Acessos e permissões da loja |
| 25 | Revisão final geral |
| 26 | Manual de instalação e operação |
| 27 | Preparação para impressão local automática |
| 28 | Checklist de teste real de produção |
| 29 | PWA para instalar no celular |
| 30 | Aba de diagnóstico do sistema |
| 31 | Pente fino das áreas ligadas ao cliente |
| 32 | Rastreabilidade de versão e backup alinhado com a versão atual |

## Observação sobre backups

A partir da Fase 32, o campo `version` do backup operacional usa a mesma versão exibida no diagnóstico do sistema. Isso ajuda a identificar de qual pacote saiu cada backup restaurado.

## Conferência antes de publicar

Antes de subir uma nova versão, rode:

```bash
npm install
npm run lint
npm run build
```

Depois teste no sistema publicado:

1. Pedido pelo celular;
2. Produto comum;
3. Produto com sabor;
4. Cupom;
5. WhatsApp;
6. Impressão;
7. Entregador;
8. Caixa;
9. Backup;
10. Diagnóstico.

## Revisão final 6.0.1

- Pente fino geral do pacote final.
- Versão interna alinhada com service worker e backup.
- Removido log de desenvolvimento.
- Adicionado `npm run test` com testes de fumaça.
- Lint, teste e build validados sem erros.


## Fase 35 — Promoções, balcão e entregador

- Adicionada exclusão lógica de promoções.
- Vendas de balcão finalizadas mostram apenas Reimprimir e Reabrir no PDV.
- Reabertura de venda cancela pagamento antigo, devolve estoque e carrega os itens no PDV para correção.
- Painel do entregador passa a mostrar ganhos do dia e entregas atrasadas.
- Entregador com entrega própria atrasada não consegue aceitar novas entregas até finalizar a atrasada.
