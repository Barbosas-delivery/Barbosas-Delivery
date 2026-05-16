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

## Fase 36 — Botões por status e auditoria básica

- Pedidos e vendas agora mostram somente ações compatíveis com o status atual.
- Vendas balcão finalizadas ficam restritas a Reimprimir, Ver resumo e Reabrir no PDV.
- Pedidos entregues/cancelados deixam de exibir botões operacionais indevidos.
- Reabertura de recebimento passa a exigir motivo.
- Problema na entrega passa a exigir motivo informado pelo entregador.
- Ações críticas registram auditoria: aprovação, aceite, entrega, pagamento, cancelamento, reabertura e alteração de status.
- Adicionada migração `supabase/migracao-fase-36-acoes-auditoria.sql`.

## Fase 37 — Loja pausada e produto pausado

- Adicionado modo de pausar pedidos temporariamente por 30 minutos, 1 hora ou 2 horas.
- Quando a loja está pausada, o cliente vê a loja como fechada temporariamente e o checkout fica bloqueado.
- Adicionado botão para liberar pedidos online antes do fim da pausa.
- Adicionado botão para pausar/retomar produto temporariamente sem inativar ou excluir.
- Produtos pausados somem do cardápio do cliente, PDV, kits e promoções enquanto a pausa estiver ativa.
- Adicionada migração `supabase/migracao-fase-37-pausas.sql`.

## Fase 38 — Fechamento do entregador

- Adicionada área de fechamento por entregador na aba Entregadores.
- O fechamento permite escolher entregador e período.
- Mostra entregas concluídas, taxas geradas, valor a pagar ao entregador, parte da loja, moto própria, moto da loja, atrasos e tempo médio.
- Lista as entregas do período com pedido, cliente, data, tempo, taxa e valor do entregador.
- Adicionado botão para imprimir recibo térmico do fechamento do entregador.
- Adicionado CSV do fechamento do entregador.
- Atualizado cache do PWA para a versão 6.0.6-fase-38-fechamento-entregador.


## Fase 39 — Atenção da loja, estoque baixo e backup diário

- Adicionado painel de atenção na tela principal da loja.
- Centraliza pedidos atrasados, problemas de entrega, aprovações pendentes, pagamentos pendentes, WhatsApp não marcado e estoque baixo.
- Adicionado lembrete de backup diário com data do último backup neste navegador.
- Atualizado cache do PWA para a versão 6.0.7-fase-39-atencao-loja.

## Fase 40 — Taxas por bairro

- Adicionada configuração de taxa de entrega por bairro.
- O cliente vê a taxa calculada pelo bairro informado.
- O pedido mínimo pode ser diferente por bairro.
- A loja pode bloquear bairros não cadastrados ou permitir taxa padrão.
- O PDV Entregas passa a sugerir a taxa pelo bairro do cliente selecionado.
- Adicionada migração `supabase/migracao-fase-40-taxas-bairro.sql` para preservar bairro/região no pedido.

## Fase 41 — WhatsApp por status

- Mensagens rápidas para pedido aprovado, saiu para entrega, entregue, cancelado e lembrete de pagamento.
- Textos editáveis em Configurações da loja.
- Variáveis: `{cliente}`, `{pedido}`, `{loja}`, `{total}`, `{taxa}`, `{status}`, `{previsao}` e `{pagamento}`.
- Cache do PWA atualizado para evitar versão antiga no celular.


## Fase 42 — Relatórios comerciais avançados

- Adiciona clientes recorrentes no relatório por período.
- Adiciona ranking de horários de pico.
- Adiciona lucratividade estimada por produto com base no custo cadastrado.
- Adiciona exportações CSV para clientes, horários e lucro.
- Atualiza versão para 6.0.10-fase-42-relatorios-clientes.


## Fase 43 — Fila inteligente de entregas

- Adiciona limite configurável de entregas ativas por entregador.
- Bloqueia novo aceite quando o entregador já atingiu o limite ou possui entrega atrasada própria.
- Agrupa entregas por região no painel do entregador.
- Mantém atrasadas no topo da prioridade operacional.
- Atualiza versão para 6.0.11-fase-43-fila-entregas.


## Fase 44 - Permissões por ação e limites de desconto

- Reforça permissões por perfil para ações sensíveis.
- Adiciona limites de desconto manual por perfil.
- Protege cancelamento, reabertura, estoque, produtos e promoções.
- Atualiza versão para 6.0.12-fase-44-permissoes-acoes.

## Fase 45 — Estoque no PDV

- Reforça validação de estoque no PDV Balcão e PDV Entregas.
- Caixa e operador ficam bloqueados quando não há estoque suficiente.
- Gerente e administrador podem autorizar venda sem estoque mediante confirmação.
- Registra autorização na auditoria como `pdv_stock_override`.
- Atualiza versão para `6.0.13-fase-45-estoque-pdv`.

## Fase 46 — Motivos operacionais padronizados

- Adiciona motivos padronizados para problema na entrega.
- O entregador pode escolher o motivo por número ou descrever um motivo próprio.
- O motivo `Outro motivo` exige descrição complementar.
- Amplia os motivos de cancelamento de pedidos/vendas.
- O cancelamento com `Outro motivo` exige detalhes obrigatórios.
- Atualiza cache do PWA para evitar celulares carregarem versão antiga.
- Atualiza versão para `6.0.16-fase-48-hoje-operacional`.

## Fase 47 — Auditoria operacional

- Adicionada aba **Auditoria** no painel da loja.
- Consulta de ações importantes registradas em `audit_logs`.
- Filtros por texto, tipo de usuário e ação.
- Métricas de registros carregados, ações do dia, ações sensíveis e usuários.
- Exportação CSV dos registros filtrados.
- Documentação em `docs/AUDITORIA-OPERACIONAL.md`.


## Fase 48 — Hoje operacional

- Adiciona o bloco **Hoje na loja** no painel principal.
- Mostra vendido hoje, entregas ativas, vendas balcão e pagamentos pendentes.
- Lista próximas ações operacionais: aprovações, atrasos, pagamentos, estoque zerado e backup.
- Adiciona fila rápida de entregas, com atrasadas primeiro e pedidos mais antigos em seguida.
- Documentação em `docs/HOJE-OPERACIONAL.md`.
- Atualiza versão para `6.0.16-fase-48-hoje-operacional`.

## Fase 49 — Fechamento do dia

- Adiciona o bloco **Fechamento do dia** no painel principal.
- Confere entregas ativas, pagamentos pendentes, pedidos aguardando aprovação e backup diário.
- Mostra status geral **Tudo certo** ou **Conferir pendências**.
- Adiciona botão **Baixar backup diário** diretamente no checklist quando o backup estiver pendente.
- Documentação em `docs/FECHAMENTO-DO-DIA.md`.
- Atualiza cache do PWA para evitar celulares carregarem versão antiga.
- Atualiza versão para `6.0.17-fase-49-fechamento-dia`.

## Fase 50 — Revisão final de produção

- Revisão final antes de publicar o aplicativo.
- Atualiza versão para `6.0.22-fase-50-auditoria-linha-a-linha-final`.
- Atualiza cache do PWA para `barbosas-delivery-6-0-22-fase-50-auditoria-linha-a-linha-final-sem-cache`.
- Adiciona `.env.example` com variáveis obrigatórias do Supabase.
- Protege o cliente Supabase contra travamento quando variáveis de ambiente estiverem ausentes.
- Amplia diagnóstico para indicar cliente Supabase ativo ou desativado.
- Documentação em `docs/FASE-50-REVISAO-FINAL-PRODUCAO.md`.

## Fase 50 corrigida — Correção emergencial de produção

- Atualiza versão para `6.0.22-fase-50-auditoria-linha-a-linha-final`.
- Remove dependência de cache/localStorage para configurações importantes da loja.
- Sincroniza categorias de produtos no Supabase via `store_settings.settings.productGroups`.
- Reativa produto excluído quando o mesmo código de barras é recadastrado.
- Recarrega catálogo do Supabase após edição/cadastro para refletir no cliente.
- Altera service worker para política `network-only` e limpeza de caches antigos.
- Adiciona documentação `docs/CORRECAO-EMERGENCIAL-FINAL.md`.



## Fase 50.2 — Auditoria final sem cache

- Atualiza versão para `6.0.22-fase-50-auditoria-linha-a-linha-final`.
- Remove o registro de service worker no app e força desregistro de service workers antigos.
- Limpa caches antigos do navegador na abertura do app.
- Mantém o arquivo de service worker apenas como limpeza/network-only para instalações antigas.
- Corrige condição de corrida entre carregamento de configurações e reconstrução de categorias pelos produtos.
- Permite recadastrar produto com código de barras de cadastro inativo/excluído sem bloqueio local indevido.
- Remove dados de demonstração do estado inicial de clientes e pedidos na operação real.
- Fortalece teste de fumaça para impedir retorno de service worker com cache e regressão de categorias/código de barras.


## Fase 50 — Revisão linha a linha final

- Atualiza versão para `6.0.22-fase-50-auditoria-linha-a-linha-final`.
- Corrige recadastro de produto excluído para reativar pelo ID exato, evitando atualização ampla por código de barras.
- Adiciona atualização periódica silenciosa do catálogo para cliente aberto, sem depender de cache nem apenas do realtime.
- Mantém remoção de service workers e caches antigos.
- Adiciona `docs/REVISAO-LINHA-A-LINHA-FINAL.md`.

## Fase 50 — Auditoria linha a linha final 6.0.22

- Atualiza versão para `6.0.22-fase-50-auditoria-linha-a-linha-final`.
- Salva categorias imediatamente no Supabase ao adicionar grupo.
- Substitui IDs críticos baseados só em `Date.now()` por IDs numéricos com sufixo aleatório.
- Normaliza validação de código de barras em edição e ignora produtos inativos/excluídos.
- Passa a alertar quando atualização de estoque retorna erro do Supabase.
- Mantém o app sem cache operacional/localStorage crítico para produtos, categorias e configurações.


## Fase 50 — Auditoria final criteriosa

Versão: `6.0.23-fase-50-auditoria-final-criteriosa`

Correção adicional: produtos com `active` nulo/ausente no Supabase agora são tratados como ativos para evitar que produtos antigos sumam do catálogo do cliente após atualização, mantendo ocultação por `active=false` ou `deleted_at`.


## Revisão 6.0.24 — auditoria final kit Supabase

- Edição de kits agora salva dados principais e itens no Supabase.
- A tela recarrega os kits do Supabase após salvar.
- Teste de fumaça ampliado para impedir edição de kit apenas local.

## Revisão 6.0.25 — auditoria final de produção real

- Estoque sincronizado com Supabase usando `await` antes de atualizar a tela.
- Pedido salvo sem itens agora tenta rollback automático.
- Kit salvo sem itens agora tenta rollback automático.
- Adicionado SQL consolidado `supabase/migracao-final-producao-6-0-28.sql` para banco novo ou antigo.
- Documentação: `docs/AUDITORIA-FINAL-PRODUCAO-REAL.md`.

## Revisão 6.0.28 — auditoria de estoque atômico

- Corrigida sincronização de estoque para atualizar somente produtos alterados.
- Corrigido risco de mensagem de sucesso mascarar falha ao gravar estoque no Supabase.
- Adicionada notificação operacional quando pedido/venda é salvo, mas o estoque não sincroniza.
- Corrigido diagnóstico do WhatsApp da loja para usar `storePhone`.


## Revisão 6.0.28 — estoque atômico sem negativo

- Corrigida a função `apply_product_stock_deltas` para bloquear baixas que deixariam estoque negativo.
- Removido fallback não atômico de estoque no front-end.
- Adicionada migração `supabase/migracao-final-producao-6-0-28.sql`.
- O app passa a exigir a função SQL de produção para não mascarar erro de configuração do Supabase.


## Revisão 6.0.30 — reserva de estoque antes de salvar pedido

- Pedidos do cliente, vendas de balcão, PDV Entregas e fechamento de comandas agora aplicam delta atômico de estoque antes de gravar a operação final.
- Se o pedido/venda não for salvo depois da reserva, o sistema tenta devolver o estoque automaticamente.
- O sistema não mantém pedido como sucesso quando a reserva de estoque no Supabase falha.
- Migração obrigatória: `supabase/migracao-final-producao-6-0-30.sql`.


## Revisão 6.0.32 — revisão completa do script

- Corrigida migração final com coluna duplicada em `cash_sessions`.
- Categoria nova só é aplicada na tela após salvar no Supabase.
- Ajuste manual de estoque usa delta atômico também em correções.
- Migração obrigatória: `supabase/migracao-final-producao-6-0-32.sql`.

## Revisão 6.0.34 — revisão total do script final

- Estoque atômico ajustado para ser tudo-ou-nada em pedidos com múltiplos produtos.
- Edição de produto separada do estoque para evitar sobrescrita de vendas feitas em outro aparelho.
- Adicionada migração obrigatória `supabase/migracao-final-producao-6-0-34.sql`.
- Validações: `npm test`, `npm run lint`, `npm run build` e `npm audit --audit-level=moderate`.


## Revisão 6.0.35 — schema completo e kits transacionais

- Migração final reforçada para bancos antigos que já tinham tabelas sem todas as colunas atuais.
- Edição de kits agora usa a função SQL `replace_kit_items` para evitar substituição parcial de itens.
- Migração obrigatória: `supabase/migracao-final-producao-6-0-35.sql`.

## Revisão 6.0.36 — comandas transacionais

- Persistência dos itens de comanda/fiado passou a usar a função SQL `replace_tab_account_items`.
- Removido o fluxo perigoso de apagar itens de comanda e inserir novamente pelo front-end em duas etapas.
- Migração obrigatória: `supabase/migracao-final-producao-6-0-36.sql`.
- Teste de fumaça reforçado para impedir retorno do padrão `delete` + `insert` em `tab_account_items`.


## 6.0.37-fase-50-corrige-imports-vercel

- Corrigidos imports do `App.jsx` para usar extensão `.jsx` explicitamente.
- Confirmada inclusão dos arquivos `src/components/ui.jsx` e `src/components/OperationalPanels.jsx`.
- Build validado localmente para evitar erro de módulo não encontrado na Vercel.

## Fase 51 — Pedido direto sem aprovação

Versão: `6.0.38-fase-51-pedido-direto-sem-aprovacao`

- Remove a aprovação manual para pedidos feitos pelo aplicativo do cliente.
- Pedido novo entra direto como **Aguardando retirada**.
- Estoque é reservado antes de salvar o pedido, mantendo a proteção das fases anteriores.
- O painel Hoje e o Fechamento do Dia deixam de cobrar pedidos aguardando aprovação.
- A mensagem do cliente muda para **Pedido recebido**.
- Pedidos legados ainda em aprovação são convertidos pela migração `supabase/migracao-final-producao-6-0-38.sql`.


## Fase 52 — Fila de impressão no Supabase

Versão: `6.0.40-fase-53-modelos-cupom-impressao`

- Adicionada tabela `print_jobs` para separar pedido/venda da execução da impressão.
- Pedido do aplicativo e PDV Entregas criam automaticamente uma via de cozinha e uma via de entrega.
- PDV Balcão cria automaticamente uma via de balcão.
- Adicionadas funções SQL para o Electron reservar jobs pendentes, marcar como impresso e registrar falha.
- Removida a dependência de impressão automática por janela do navegador nos fluxos de criação.
- Migração obrigatória: `supabase/migracao-final-producao-6-0-40.sql`.

## Fase 53 — Modelos de cupom para impressão

Versão: `6.0.40-fase-53-modelos-cupom-impressao`

- Criados modelos padronizados de cupom para **cozinha**, **entrega** e **balcão**.
- Cada `print_job` agora recebe `payload.ticket` com título, finalidade, linhas de texto, HTML térmico e seções estruturadas.
- Pedido do app e PDV Entregas continuam gerando 2 vias: cozinha e entrega.
- PDV Balcão continua gerando 1 via: balcão.
- A via de cozinha foca preparo e observações; a via de entrega foca cliente, telefone, endereço, pagamento e itens; a via de balcão foca venda, itens, pagamento e total.
- A migração obrigatória mais recente é `supabase/migracao-final-producao-6-0-40.sql`.

## Fase 54 — Aplicativo Electron básico

Versão: `6.0.41-fase-54-electron-basico`

- Criada a estrutura inicial do aplicativo desktop com Electron.
- Adicionado painel local de impressão para configurar Supabase e impressora.
- Adicionada listagem de impressoras locais e teste de impressão.
- Configurações locais salvas no computador, sem substituir o Supabase como banco principal.
- Preparados scripts `npm run desktop` e `npm run desktop:build`.
- Adicionado teste de fumaça para validar a estrutura Electron.
