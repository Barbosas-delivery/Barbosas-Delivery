# Atualizar aplicativo instalado no PC da loja

## Caminho recomendado

```bash
pnpm install
pnpm run desktop:installer
```

Depois, abra a pasta `release` e execute o instalador gerado.

## Antes de instalar

- Feche o Barbosa's Delivery Desktop antigo.
- Confirme que o SQL da fase atual já foi rodado no Supabase.
- Se a loja já usa impressão automática, abra o painel antigo e anote a impressora configurada.

## Depois de instalar

No painel Desktop:

1. Confira a versão `6.0.53-fase-65-atualizacao-desktop-instalado`.
2. Teste conexão Supabase.
3. Teste impressão.
4. Ative impressão automática.
5. Ative iniciar com Windows, se desejar.
6. Faça backup da configuração local.
7. Registre a instalação no Supabase.
