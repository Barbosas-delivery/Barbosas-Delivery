# Fase 73 — Personalização da marca

Versão: `6.0.61-fase-73-personalizacao-marca`

Esta fase permite trocar a identidade visual da loja sem alterar o código.

## Entregas

- Nome exibido da loja configurável.
- Nome curto configurável.
- Slogan do cliente configurável.
- Logo/foto da loja configurável por URL ou arquivo local leve.
- Imagem de capa configurável por URL ou arquivo local leve.
- Nome do cupom configurável.
- Opção para usar ou não a logo no cupom térmico.
- Cupons via navegador e fila `print_jobs` passam a receber marca dinâmica.
- RPC `update_store_brand_settings` para suporte/manutenção.
- Teste `run_phase_73_brand_test`.

## Como usar no painel

Acesse:

```txt
Painel da loja > Configurações > Marca da loja
```

Atualize:

```txt
Nome exibido da loja
Nome curto
Slogan do cliente
Nome no cupom
Logo/foto
Capa
Usar logo no cupom
```

A imagem carregada direto no painel é salva no `store_settings.default`, por isso deve ser leve, preferencialmente menor que 900 KB.

## Teste SQL

```sql
select * from public.run_phase_73_brand_test('Gabriel', true);
```

Resumo:

```sql
select *
from public.phase_73_brand_test_summary_view
order by created_at desc
limit 1;
```
