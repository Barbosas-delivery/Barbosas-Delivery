# Manual de Instalação e Operação — Barbosa's Delivery

Este manual reúne os passos essenciais para instalar, configurar, publicar e operar o Barbosa's Delivery.

> Versão documentada: fases 1 a 27, incluindo produtos, sabores, clientes, entregadores, funcionamento, tempo automático, notificações, WhatsApp assistido, impressão, backup, relatórios, estoque, cupons, acessos e impressão local preparada.

---

## 1. Visão geral do sistema

O Barbosa's Delivery é um sistema de delivery/PDV com foco em operação rápida pelo celular e pela loja.

Principais módulos:

- Cardápio do cliente;
- Carrinho e checkout mobile;
- Produtos, grupos, kits e promoções;
- Sabores/variações de produto;
- Clientes;
- Entregadores;
- PDV Entregas;
- Vendas de balcão;
- Comandas;
- Caixa e pagamentos;
- Notificações internas;
- WhatsApp assistido;
- Impressão de pedidos;
- Backup e restauração;
- Relatórios;
- Estoque;
- Cupons;
- Acessos e permissões.

---

## 2. Requisitos para rodar o projeto

No computador, instale:

- Node.js LTS;
- Git;
- VS Code;
- Conta no GitHub;
- Projeto Supabase configurado.

O projeto usa:

- React;
- Vite;
- Supabase;
- Tailwind;
- Lucide React;
- Framer Motion.

---

## 3. Instalação local

Abra o terminal na pasta do projeto:

```bash
cd C:\Users\gabri\barbosas-delivery
```

Instale as dependências:

```bash
npm install
```

Rode em modo desenvolvimento:

```bash
npm run dev
```

Teste o build de produção:

```bash
npm run build
```

Rodar verificação de lint:

```bash
npm run lint
```

Se aparecer `built successfully` ou `✓ built`, o build passou.

---

## 4. Variáveis de ambiente

O arquivo `src/supabaseClient.js` usa:

```txt
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

Crie um arquivo `.env` na raiz do projeto com:

```env
VITE_SUPABASE_URL=SUA_URL_DO_SUPABASE
VITE_SUPABASE_ANON_KEY=SUA_CHAVE_ANON_PUBLICA
```

Nunca coloque a chave `service_role` no front-end.

---

## 5. Publicar no GitHub

Depois de substituir os arquivos pela fase nova, rode:

```bash
cd C:\Users\gabri\barbosas-delivery
npm install
npm run build
git status
git add .
git commit -m "Atualiza Barbosa Delivery"
git push
```

Se o deploy estiver conectado ao GitHub, a publicação acontece automaticamente após o `git push`.

---

## 6. Supabase — SQLs necessários

Na pasta `supabase/`, existem migrações que precisam ser rodadas no SQL Editor do Supabase.

Ordem recomendada:

```txt
1. migracao-fases-1-a-12.sql
2. migracao-fase-14-store-settings.sql
3. migracao-fase-18-entregadores.sql
4. migracao-fase-19-pagamentos.sql
5. migracao-fase-22-estoque.sql
6. migracao-fase-23-cupons.sql
7. migracao-fase-24-acessos-loja.sql
```

Para rodar:

1. Abra o painel do Supabase;
2. Entre em SQL Editor;
3. Abra o arquivo `.sql` no VS Code;
4. Copie todo o conteúdo;
5. Cole no SQL Editor;
6. Clique em Run.

Importante: não cole apenas o nome do arquivo no SQL Editor. Cole o conteúdo do arquivo.

---

## 7. Correção da tabela `store_settings`, se necessário

Se a tabela `store_settings` já existir com estrutura errada, rode:

```sql
drop table if exists store_settings;

create table store_settings (
  id text primary key,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

insert into store_settings (id, settings)
values ('default', '{}'::jsonb)
on conflict (id) do update
set updated_at = now();
```

Use isso somente se a migração da Fase 14 der erro por tabela antiga incompatível.

---

## 8. Login e acessos

A Fase 24 adicionou usuários internos da loja.

Usuário inicial criado pela migração:

```txt
Usuário: gabrieladmin
Senha: B4rb@2026!
```

Depois do primeiro acesso, troque essa senha pela aba **Acessos**.

Perfis disponíveis:

- Administrador;
- Gerente;
- Caixa;
- Operador.

Somente administrador acessa a aba **Acessos**.

---

## 9. Configurações da loja

Na aba de configurações, configure:

- Nome da loja;
- WhatsApp da loja;
- Taxa de entrega;
- Pedido mínimo;
- Horários de funcionamento;
- Impressão;
- Mensagem padrão do WhatsApp.

As configurações ficam salvas:

- No navegador local;
- No Supabase, quando a tabela `store_settings` está correta.

---

## 10. Funcionamento da loja

O sistema calcula automaticamente se a loja está aberta ou fechada.

Configure por dia:

- Segunda;
- Terça;
- Quarta;
- Quinta;
- Sexta;
- Sábado;
- Domingo.

Cada dia permite:

- Fechado;
- Horário de abertura;
- Horário de fechamento.

Fora do horário, o cliente não consegue finalizar pedido.

---

## 11. Produtos

Na área de produtos, é possível:

- Criar produto;
- Editar produto;
- Alterar foto;
- Remover foto;
- Excluir/desativar produto;
- Controlar estoque;
- Exportar estoque em CSV.

A exclusão é lógica. O produto não aparece para venda, mas o histórico de pedidos continua preservado.

---

## 12. Sabores e variações

Ao cadastrar ou editar produto, use a opção:

```txt
Este produto possui sabores/variações
```

Cada sabor pode ter:

- Nome;
- Foto própria.

No cardápio do cliente, o produto principal aparece como um só item. Ao escolher, abre uma janela para selecionar os sabores e quantidades.

Exemplo:

```txt
Copão
- 2x Frutas vermelhas
- 1x Maracujá
```

---

## 13. Cliente e checkout mobile

A parte do cliente foi otimizada para celular.

Fluxo esperado:

1. Cliente informa dados;
2. Escolhe produtos;
3. O card mostra quantidade e subtotal na hora;
4. A barra inferior mostra total atualizado;
5. Cliente confere pedido;
6. Informa pagamento;
7. Envia pedido;
8. Recebe confirmação na tela.

O botão de envio bloqueia clique duplo para evitar pedido duplicado.

---

## 14. Tempo automático de entrega

O tempo estimado é calculado automaticamente.

Regra atual:

```txt
Cada pedido/entrega ativa adiciona 7 minutos.
```

Pedidos cancelados, finalizados ou entregues não entram no cálculo.

---

## 15. Notificações

O sistema possui notificações para:

- Loja;
- Cliente;
- Entregador.

Quando uma notificação é marcada como lida, ela sai do painel principal.

Notificações antigas de um pedido são resolvidas quando o pedido muda de etapa, é cancelado ou é finalizado.

---

## 16. WhatsApp — Opção A

O sistema não envia mensagens automaticamente por API.

Ele prepara a mensagem e abre o WhatsApp com o texto pronto.

Fluxo:

```txt
Pedido criado
↓
Loja clica em Enviar WhatsApp
↓
Abre WhatsApp com mensagem pronta para o cliente
↓
Funcionário clica em enviar
```

Também existe botão para copiar a mensagem.

---

## 17. Impressão de pedidos

O sistema possui impressão por navegador e preparação para serviço local.

Configurações disponíveis:

- Impressão automática ligada/desligada;
- Quantidade de vias automáticas;
- Quantidade de vias ao reimprimir;
- Fechar janela após alguns segundos;
- Modo navegador;
- Modo serviço local automático.

Modo padrão recomendado:

```txt
Navegador / janela de impressão
```

O modo local exige um serviço instalado no computador da loja, por exemplo:

```txt
http://localhost:9191/print
```

Sem esse serviço, mantenha o modo navegador.

---

## 18. PDV Entregas

No PDV Entregas, a loja pode lançar pedido manualmente.

O pedido pode gerar:

- Notificação;
- Impressão;
- WhatsApp pronto;
- Tempo estimado;
- Controle de pagamento;
- Entrega para motoboy.

---

## 19. Entregadores

No painel do entregador, existem ações:

- Aceitar e retirar;
- Recusar;
- Informar problema;
- Marcar entregue;
- Abrir rota;
- Chamar cliente no WhatsApp.

O sistema protege contra clique duplo nas ações.

Entregas aceitas por outro motoboy deixam de aparecer para os demais.

---

## 20. Caixa e pagamentos

O sistema controla pagamentos com status:

- Pendente;
- Falta receber;
- Pago;
- Reaberto/cancelado no controle de pagamentos.

A loja pode:

- Confirmar pagamento;
- Reabrir recebimento;
- Fechar caixa;
- Exportar relatórios.

Se o caixa estiver fechado e o pedido não tiver caixa vinculado, o sistema bloqueia confirmação de pagamento para evitar recebimento fora do fechamento.

---

## 21. Relatórios

Relatórios disponíveis:

- Total vendido;
- Total recebido;
- Ticket médio;
- Formas de pagamento;
- Pedidos cancelados;
- Produtos mais vendidos;
- Categorias.

Exportações CSV:

- Vendas;
- Produtos;
- Categorias;
- Estoque.

---

## 22. Estoque

O controle de estoque permite:

- Entrada/reposição;
- Saída/perda;
- Correção para estoque exato;
- Histórico de movimentação;
- Exportação em CSV.

Validações importantes:

- Não permite saída maior que o estoque;
- Exige motivo;
- Exige produto;
- Não aceita quantidade zerada em entrada/saída.

---

## 23. Cupons

Na área de promoções, é possível criar cupons com:

- Código;
- Descrição;
- Tipo de desconto;
- Valor;
- Pedido mínimo;
- Desconto máximo;
- Limite de uso;
- Data inicial;
- Data final;
- Ativo/inativo.

O cliente digita o cupom no checkout.

O desconto é aplicado sobre os produtos. A taxa de entrega continua separada.

---

## 24. Backup operacional

Em Configurações da loja, existe a área **Backup operacional**.

Use:

```txt
Baixar backup
```

antes de grandes alterações.

O backup inclui:

- Configurações;
- Produtos;
- Grupos;
- Promoções;
- Kits;
- Clientes;
- Entregadores;
- Pedidos;
- Notificações;
- Pagamentos;
- Caixa;
- Fechamentos;
- Comandas;
- Limites de crédito;
- Cupons.

---

## 25. Restaurar backup

Use:

```txt
Restaurar backup
```

Selecione um arquivo `.json` gerado pelo próprio sistema.

O sistema valida o arquivo e pede confirmação antes de substituir os dados carregados.

Recomendação: baixe um backup atual antes de restaurar qualquer arquivo antigo.

---

## 26. Rotina recomendada da loja

Antes de abrir:

1. Conferir se o sistema está online;
2. Conferir se a loja está dentro do horário de funcionamento;
3. Conferir se impressora está funcionando;
4. Conferir caixa aberto;
5. Conferir produtos principais e estoque.

Durante operação:

1. Acompanhar novos pedidos;
2. Aprovar pedidos;
3. Enviar WhatsApp ao cliente;
4. Imprimir pedido;
5. Atribuir/acompanhar entregas;
6. Confirmar pagamento;
7. Finalizar entregas.

Após fechar:

1. Conferir pedidos pendentes;
2. Fechar caixa;
3. Baixar backup;
4. Conferir relatório do dia.

---

## 27. Teste completo antes de publicar

Antes de divulgar para clientes, faça um teste com:

- Produto comum;
- Produto com sabor;
- Cupom válido;
- Cupom inválido;
- Pedido Pix;
- Pedido dinheiro com troco;
- Pedido cartão;
- Pedido cancelado;
- Pedido aprovado;
- Pedido entregue;
- WhatsApp;
- Impressão;
- Entregador aceitando;
- Entregador recusando;
- Fechamento de caixa;
- Backup;
- Restauração.

---

## 28. Problemas comuns

### O build mostrou aviso de chunk grande

Se o build finalizou com sucesso, é apenas aviso. O app pode ser publicado.

### O Supabase deu erro ao rodar SQL

Verifique se você colou o conteúdo completo do arquivo `.sql`, e não apenas o caminho do arquivo.

### Configurações não salvam

Confira se a tabela `store_settings` existe e se tem a coluna `settings` do tipo `jsonb`.

### Impressão automática não abre

O navegador pode bloquear abertura automática. Use o botão **Reimprimir**.

Para impressão 100% sem clique, configure um serviço local de impressão.

### WhatsApp não abre

Verifique se o telefone do cliente tem DDD e está correto.

Use o botão **Copiar mensagem** como alternativa.

---

## 29. Comandos rápidos

Rodar local:

```bash
npm run dev
```

Testar build:

```bash
npm run build
```

Verificar código:

```bash
npm run lint
```

Enviar ao GitHub:

```bash
git status
git add .
git commit -m "Atualiza sistema Barbosa Delivery"
git push
```

---

## 30. Observação final

Este sistema já possui vários recursos críticos para operação real. Antes de usar com clientes, faça testes completos no celular, no computador da loja e com a impressora usada no dia a dia.

Sempre baixe backup antes de grandes mudanças.
