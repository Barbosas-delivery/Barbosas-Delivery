# Checklist manual — Teste funcional Fase 67

Use este roteiro no app depois de subir a versão 6.0.55 e rodar o SQL.

## 1. Cadastro de categoria e adicional

- [ ] Abrir painel da loja.
- [ ] Ir em cadastro/cardápio.
- [ ] Confirmar que adicionais são por categoria.
- [ ] Criar categoria de lanches, se necessário.
- [ ] Criar adicional para a categoria Lanches.
- [ ] Confirmar que o adicional aparece em todos os lanches da categoria.

## 2. Cadastro de produto/lanche

- [ ] Criar um lanche.
- [ ] Confirmar que lanche não exige estoque.
- [ ] Confirmar que o cliente não vê marcação de estoque para lanche.
- [ ] Confirmar que observação por item continua disponível.

## 3. Bebida com estoque

- [ ] Criar bebida com estoque controlado.
- [ ] Fazer venda com bebida.
- [ ] Confirmar baixa de estoque.
- [ ] Tentar vender quantidade maior que estoque.
- [ ] Confirmar bloqueio por estoque insuficiente.

## 4. Combo

- [ ] Abrir a aba de combos.
- [ ] Confirmar que a interface fala Combo, não Kit.
- [ ] Criar combo com lanche + bebida + porção.
- [ ] Confirmar preço e itens do combo.
- [ ] Testar adicionar combo no cliente e no PDV.

## 5. PDV Balcão e comanda

- [ ] Abrir caixa.
- [ ] Adicionar itens no PDV Balcão.
- [ ] Clicar em criar comanda.
- [ ] Informar número de 1 a 100.
- [ ] Informar mesa.
- [ ] Informar nome completo do responsável.
- [ ] Confirmar criação da comanda.

## 6. Adicionar itens em comanda aberta

- [ ] Abrir comanda criada.
- [ ] Adicionar novo item.
- [ ] Confirmar que o item entrou na comanda.
- [ ] Confirmar que a impressão gerada é só dos novos itens.

## 7. Impressão

- [ ] Testar impressão de adição de comanda.
- [ ] Testar impressão de consumo completo.
- [ ] Testar impressão de fechamento.
- [ ] Conferir adicionais, observação e combo no cupom.

## 8. Fechamento da comanda

- [ ] Fechar comanda com Pix.
- [ ] Fechar comanda com Dinheiro.
- [ ] Testar pagamento misto.
- [ ] Confirmar que comanda fechada vira venda normal.
- [ ] Confirmar que não aparece como fiado.

## 9. Limpeza

No Supabase, após terminar:

```sql
select public.cleanup_phase_67_test_data();
```
