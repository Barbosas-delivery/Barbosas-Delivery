# Checklist de teste real de produção — Barbosa’s Delivery

Use este checklist antes de divulgar o link para clientes ou depois de subir uma nova versão no GitHub.

> Objetivo: testar o fluxo completo do sistema como se fosse um dia real de operação da loja.

---


## 0. Publicação e ambiente

- [ ] Rodar `npm ci`.
- [ ] Rodar `npm run test`.
- [ ] Rodar `npm run lint`.
- [ ] Rodar `npm run build`.
- [ ] Configurar `VITE_SUPABASE_URL` no provedor de hospedagem.
- [ ] Configurar `VITE_SUPABASE_ANON_KEY` no provedor de hospedagem.
- [ ] Conferir a aba **Diagnóstico** depois do deploy.
- [ ] Confirmar que o item **Cliente Supabase ativo** aparece como aprovado.
- [ ] Trocar a senha padrão do administrador antes de divulgar o link.

---

## 1. Antes de começar

- [ ] Rode todos os SQLs necessários no Supabase.
- [ ] Suba a versão atual no GitHub.
- [ ] Aguarde o deploy terminar.
- [ ] Abra o sistema publicado no celular.
- [ ] Abra o painel da loja no computador.
- [ ] Faça login com um usuário administrador.
- [ ] Confira se as configurações da loja carregaram corretamente.
- [ ] Confira se a loja aparece aberta dentro do horário cadastrado.
- [ ] Faça um backup operacional antes dos testes.

---

## 2. Configurações da loja

- [ ] Nome da loja correto.
- [ ] WhatsApp da loja correto.
- [ ] Taxa de entrega correta.
- [ ] Pedido mínimo correto.
- [ ] Horários de funcionamento corretos.
- [ ] Impressão configurada no modo desejado.
- [ ] Quantidade de vias correta.
- [ ] Configurações salvas após atualizar a página.

---

## 3. Produtos e sabores

Teste pelo painel da loja:

- [ ] Criar produto simples.
- [ ] Alterar foto do produto.
- [ ] Remover foto do produto.
- [ ] Criar produto com sabores.
- [ ] Cadastrar pelo menos 2 sabores com fotos.
- [ ] Editar nome de um sabor.
- [ ] Alterar foto de um sabor.
- [ ] Desativar/excluir um produto de teste.
- [ ] Confirmar que produto excluído não aparece para cliente.

Teste pelo celular do cliente:

- [ ] Produto simples aparece corretamente.
- [ ] Produto com sabores aparece como produto único.
- [ ] Ao tocar em produto com sabores, abre modal de escolha.
- [ ] É possível escolher quantidades diferentes por sabor.
- [ ] Produto entra no carrinho com sabor correto.
- [ ] Total atualiza imediatamente.

---

## 4. Pedido pelo cliente no celular

- [ ] Abrir link do sistema no celular.
- [ ] Preencher nome.
- [ ] Preencher telefone.
- [ ] Preencher endereço.
- [ ] Adicionar produto simples.
- [ ] A quantidade aparece no card do produto.
- [ ] O subtotal aparece corretamente.
- [ ] A barra inferior mostra itens, taxa e total.
- [ ] Adicionar produto com sabor.
- [ ] Aplicar cupom válido, se existir.
- [ ] Testar cupom inválido.
- [ ] Escolher forma de pagamento Pix.
- [ ] Escolher forma de pagamento Dinheiro com troco válido.
- [ ] Testar troco menor que o total e confirmar bloqueio.
- [ ] Enviar pedido.
- [ ] Confirmar que aparece cartão de pedido enviado.
- [ ] Confirmar que o pedido aparece no painel da loja.

---

## 5. Painel da loja

- [ ] Novo pedido aparece no painel.
- [ ] Notificação de novo pedido aparece.
- [ ] Som/alerta é disparado, se permitido pelo navegador.
- [ ] Impressão automática assistida tenta abrir.
- [ ] Botão Reimprimir funciona.
- [ ] Botão Enviar WhatsApp abre conversa com mensagem pronta.
- [ ] Botão Copiar mensagem funciona.
- [ ] Botão Marcar WhatsApp enviado funciona.
- [ ] Aprovar pedido funciona.
- [ ] Cliente recebe atualização do pedido.
- [ ] Cancelar pedido funciona.
- [ ] Cliente recebe atualização de cancelamento.
- [ ] Notificações somem ao marcar como lidas.

---

## 6. Entregador

- [ ] Entrar como entregador no celular.
- [ ] Pedido disponível aparece.
- [ ] Botão Aceitar e retirar funciona.
- [ ] Pedido aceito some para outros entregadores.
- [ ] Botão Abrir rota abre Google Maps.
- [ ] Botão WhatsApp abre conversa com cliente.
- [ ] Botão Problema funciona.
- [ ] Loja recebe aviso de problema.
- [ ] Botão Marcar entregue funciona.
- [ ] Cliente recebe atualização de entrega.
- [ ] Pedido entregue sai do painel ativo.

---

## 7. Caixa e pagamentos

- [ ] Abrir caixa.
- [ ] Criar pedido com Pix.
- [ ] Criar pedido com dinheiro.
- [ ] Confirmar pagamento.
- [ ] Verificar se o pagamento entra no caixa.
- [ ] Reabrir recebimento.
- [ ] Confirmar que pagamento reaberto não entra duplicado no fechamento.
- [ ] Fechar caixa.
- [ ] Conferir total por forma de pagamento.

---

## 8. PDV Entregas

- [ ] Criar pedido pelo PDV Entregas.
- [ ] Confirmar que a taxa padrão aparece.
- [ ] Confirmar que o tempo estimado é calculado.
- [ ] Confirmar que imprime conforme configuração.
- [ ] Confirmar que WhatsApp fica disponível para o cliente.
- [ ] Confirmar que o pedido entra para o entregador.

---

## 9. Cupons

- [ ] Criar cupom de valor fixo.
- [ ] Criar cupom de porcentagem.
- [ ] Testar pedido mínimo.
- [ ] Testar data de início e fim.
- [ ] Testar limite de usos.
- [ ] Confirmar que desconto aparece no pedido.
- [ ] Confirmar que desconto aparece no WhatsApp.
- [ ] Confirmar que desconto aparece no relatório.

---

## 10. Estoque

- [ ] Fazer entrada de estoque.
- [ ] Fazer saída/perda.
- [ ] Fazer correção para estoque exato.
- [ ] Testar bloqueio de saída maior que estoque.
- [ ] Exportar CSV de estoque.
- [ ] Confirmar que venda reduz estoque corretamente, se essa regra estiver ativa no produto.

---

## 11. Relatórios

- [ ] Abrir relatório de hoje.
- [ ] Abrir relatório de 7 dias.
- [ ] Abrir relatório do mês.
- [ ] Conferir total vendido.
- [ ] Conferir ticket médio.
- [ ] Conferir formas de pagamento.
- [ ] Exportar CSV vendas.
- [ ] Exportar CSV produtos.
- [ ] Exportar CSV categorias.

---

## 12. Backup e restauração

- [ ] Baixar backup operacional.
- [ ] Guardar o arquivo em local seguro.
- [ ] Restaurar backup em ambiente de teste.
- [ ] Confirmar produtos restaurados.
- [ ] Confirmar clientes restaurados.
- [ ] Confirmar pedidos restaurados.
- [ ] Confirmar configurações restauradas.

---

## 13. Acessos e permissões

- [ ] Entrar como administrador.
- [ ] Criar usuário gerente.
- [ ] Criar usuário caixa.
- [ ] Criar usuário operador.
- [ ] Confirmar que cada perfil vê apenas as abas corretas.
- [ ] Bloquear usuário de teste.
- [ ] Confirmar que usuário bloqueado não acessa.
- [ ] Confirmar que o sistema não permite bloquear o próprio usuário logado.

---

## 14. Impressão local automática

Somente se a loja for usar serviço local:

- [ ] Selecionar modo Serviço local automático.
- [ ] Configurar URL local, exemplo: `http://localhost:9191/print`.
- [ ] Confirmar que o serviço local está rodando no computador da loja.
- [ ] Criar pedido teste.
- [ ] Confirmar impressão pelo serviço local.
- [ ] Testar fallback pelo navegador.

---

## 15. Teste final completo

Faça um pedido completo de ponta a ponta:

- [ ] Cliente cria pedido pelo celular.
- [ ] Loja recebe pedido.
- [ ] Pedido imprime.
- [ ] Loja envia WhatsApp.
- [ ] Loja aprova pedido.
- [ ] Entregador aceita.
- [ ] Entregador abre rota.
- [ ] Entregador marca entregue.
- [ ] Loja confirma pagamento.
- [ ] Pedido sai dos painéis ativos.
- [ ] Notificações antigas somem.
- [ ] Relatório mostra a venda.
- [ ] Caixa mostra o recebimento.

---

## Resultado esperado

O sistema só deve ser considerado pronto para clientes quando todos os itens essenciais estiverem funcionando em celular real, principalmente:

- pedido pelo cliente;
- carrinho atualizando na hora;
- total correto;
- pedido chegando na loja;
- impressão;
- WhatsApp;
- entregador;
- pagamento;
- notificações.


## Revisão 6.0.24 — auditoria final kit Supabase

- Edição de kits agora salva dados principais e itens no Supabase.
- A tela recarrega os kits do Supabase após salvar.
- Teste de fumaça ampliado para impedir edição de kit apenas local.

## Revisão 6.0.25 — auditoria final de produção real

- Estoque sincronizado com Supabase usando `await` antes de atualizar a tela.
- Pedido salvo sem itens agora tenta rollback automático.
- Kit salvo sem itens agora tenta rollback automático.
- Adicionado SQL consolidado `supabase/migracao-final-producao-6-0-30.sql` para banco novo ou antigo.
- Documentação: `docs/AUDITORIA-FINAL-PRODUCAO-REAL.md`.

## Revisão 6.0.30 — auditoria de estoque atômico

- Estoque de vendas, pedidos, cancelamentos, reabertura e comanda agora usa delta atômico no Supabase.
- Após movimentar estoque, o app recarrega produtos do Supabase para mostrar o valor real do banco.
- Ajuste manual de entrada/saída também usa delta; correção manual pode definir valor absoluto.
- Adicionada migração `supabase/migracao-final-producao-6-0-30.sql` com a função `apply_product_stock_deltas`.
- Falhas de estoque não são mais encobertas por mensagens de sucesso.
- Documentação: `docs/AUDITORIA-ESTOQUE-ATOMICO.md`.


## Revisão 6.0.30 — reserva de estoque antes de salvar pedido

- Pedidos do cliente, vendas de balcão, PDV Entregas e fechamento de comandas agora aplicam delta atômico de estoque antes de gravar a operação final.
- Se o pedido/venda não for salvo depois da reserva, o sistema tenta devolver o estoque automaticamente.
- O sistema não mantém pedido como sucesso quando a reserva de estoque no Supabase falha.
- Migração obrigatória: `supabase/migracao-final-producao-6-0-30.sql`.
