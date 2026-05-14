# Auditoria final adicional — Kits sincronizados no Supabase

Versão: `6.0.25-fase-50-auditoria-final-producao-real`

## Correção aplicada

Durante a nova revisão linha a linha foi encontrado um risco real: a edição de kits alterava nome, preço, data e itens apenas no estado da tela, sem gravar as mudanças nas tabelas `kits` e `kit_items` do Supabase.

Isso poderia causar o seguinte comportamento em produção:

- a loja edita um kit;
- a tela parece atualizada naquele momento;
- após atualizar a página ou abrir como cliente, o kit volta para a versão antiga.

## Como ficou

Ao clicar em salvar edição do kit, o sistema agora:

1. valida nome e itens;
2. atualiza a linha do kit na tabela `kits`;
3. remove os itens antigos da tabela `kit_items` daquele kit;
4. grava os itens atuais novamente;
5. recarrega os kits direto do Supabase.

## Validação

A suíte de fumaça agora verifica que a edição de kits não voltou a ser apenas local.
