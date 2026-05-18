# Instalação do Barbosa’s Delivery Desktop no Windows

## Pré-requisitos para gerar o instalador

- Node.js LTS instalado.
- pnpm funcionando.
- Projeto atualizado com a versão mais recente.

## Gerar o instalador

No terminal, dentro da pasta do projeto:

```bash
pnpm install
pnpm run build
pnpm run desktop:installer
```

O arquivo será criado na pasta:

```txt
release/
```

Nome esperado:

```txt
Barbosas-Delivery-Desktop-6.0.44-Setup.exe
```

## Instalar no computador da loja

1. Execute o arquivo `Barbosas-Delivery-Desktop-6.0.44-Setup.exe`.
2. Escolha a pasta de instalação.
3. Mantenha a criação de atalho na área de trabalho marcada.
4. Ao finalizar, abra o Barbosa’s Delivery Desktop.

## Primeira configuração

No menu superior:

```txt
Impressão → Configurar impressora
```

Preencha:

```txt
Supabase URL
Supabase anon key
Impressora local
Largura do papel: 58mm ou 80mm
```

Marque, se desejar:

```txt
Iniciar Barbosa’s Delivery Desktop junto com o Windows
```

Depois clique em:

```txt
Salvar configuração
Testar conexão
Testar impressão
Iniciar automático
```

## Conferência no Supabase

Para conferir os últimos jobs:

```sql
select
  id,
  source,
  source_id,
  print_type,
  status,
  attempts,
  locked_by,
  printed_at,
  error_message
from public.print_jobs
order by created_at desc
limit 20;
```

Status esperado quando imprime corretamente:

```txt
printed
```

## Se a impressão não sair

Confira:

- Impressora ligada.
- Impressora selecionada no painel desktop.
- Supabase URL sem `VITE_SUPABASE_URL=`.
- Chave sem `VITE_SUPABASE_ANON_KEY=`.
- Job com `source` correto: `customer_app`, `pdv_entregas` ou `pdv_balcao`.
- `print_type` correto: `kitchen`, `delivery` ou `counter`.
