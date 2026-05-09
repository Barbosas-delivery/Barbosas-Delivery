# Diagnóstico do sistema

A Fase 30 adiciona a aba **Diagnóstico** no painel da loja.

Use essa tela quando precisar conferir rapidamente se o sistema está pronto para operar ou quando algo não carregar como esperado.

## O que a aba mostra

- versão do app;
- status básico das variáveis do Supabase;
- conexão do navegador;
- disponibilidade do armazenamento local;
- status PWA/service worker;
- status da loja aberta/fechada;
- modo de impressão configurado;
- WhatsApp da loja configurado ou pendente;
- quantidade de produtos, clientes, pedidos, entregadores, cupons e kits carregados;
- status de sincronização das configurações da loja;
- status do caixa.

## Botão Baixar diagnóstico

O botão baixa um arquivo `.json` com informações técnicas básicas do ambiente e dos dados carregados.

Esse arquivo ajuda a conferir problemas de instalação, variáveis `.env`, impressão local, PWA e sincronização. Ele não deve ser enviado para clientes finais.

## Permissão

A aba fica disponível para administradores e gerentes. Operadores e caixas continuam sem acesso a essa área técnica.
