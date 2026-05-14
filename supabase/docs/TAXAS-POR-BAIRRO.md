# Taxas por bairro

A Fase 40 adiciona configuração de taxa de entrega por bairro/região.

## Como configurar

1. Entre como loja.
2. Abra **Configurações da loja**.
3. Na área **Taxas por bairro**, clique em **Adicionar bairro**.
4. Informe:
   - Bairro;
   - Taxa;
   - Pedido mínimo opcional;
   - Status ativo/inativo.

Se a opção **Atender bairros não cadastrados usando a taxa padrão** estiver marcada, bairros sem regra usam a taxa padrão da loja.

Se essa opção estiver desmarcada, o cliente que informar bairro não cadastrado fica bloqueado de finalizar o pedido e recebe uma mensagem para falar com a loja.

## Comportamento no cliente

O cliente vê:

- endereço de entrega;
- taxa calculada do bairro;
- pedido mínimo aplicado ao bairro;
- total atualizado no carrinho e no checkout.

## PDV Entregas

Ao selecionar um cliente no PDV Entregas, o sistema sugere automaticamente a taxa configurada para o bairro cadastrado do cliente.

## Supabase

Rode o arquivo:

```sql
supabase/migracao-fase-40-taxas-bairro.sql
```

Ele adiciona colunas para preservar o bairro/região usado no cálculo do pedido.
