# Leia antes de rodar a migração final

Use sempre a migração final mais recente deste pacote:

```txt
supabase/migracao-final-producao-6-0-43.sql
```

Ela consolida as tabelas/funções usadas pelo aplicativo web e pelo Electron Desktop.

## Funções importantes

- `apply_product_stock_deltas`: movimentação atômica de estoque.
- `replace_kit_items`: substituição transacional de itens de kits.
- `replace_tab_account_items`: substituição transacional de itens de comanda/fiado.
- `claim_pending_print_jobs`: reserva segura de impressões pendentes para o Electron.
- `mark_print_job_printed`: marca impressão como concluída.
- `mark_print_job_failed`: registra falha de impressão.

## Depois de rodar

1. Publique o app web.
2. Rode `pnpm run build` no computador da loja.
3. Rode `pnpm run desktop`.
4. Configure Supabase e impressora no painel local.
5. Teste impressão.
6. Ative a impressão automática.
