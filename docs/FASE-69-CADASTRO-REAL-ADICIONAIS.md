# Fase 69 — Correção real do cadastro de adicionais por categoria

Esta fase corrige a falha operacional identificada depois dos testes da Fase 68: o teste validava dados no banco, mas não garantia que o atendente conseguiria criar adicionais pela interface.

## Entregue

- Nova aba **Adicionais** no menu da loja.
- Formulário direto para criar adicional por categoria.
- Listagem por categoria com botão **Pausar**, **Ativar** e **Remover**.
- Cadastro usando RPC `create_category_addon`, com fallback para insert direto.
- RPC `set_category_addon_active` para ativar/pausar adicionais.
- Policies de `select`, `insert`, `update` e `delete` para `category_addons`.
- View operacional `category_addons_operational_view`.
- Teste automático `scripts/addons-ui-test-fase69.mjs` incluído no `npm test`.

## Regra operacional

O adicional pertence à categoria. Exemplo: se cadastrar **Bacon extra** na categoria **Lanches**, todos os produtos dessa categoria passam a receber esse adicional na personalização.
