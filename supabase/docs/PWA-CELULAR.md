# Fase 29 — Instalação no celular (PWA)

Esta fase prepara o Barbosa's Delivery para funcionar melhor como aplicativo instalado no celular.

## O que foi adicionado

- `public/manifest.webmanifest`: informações do app para instalação no celular.
- `public/service-worker.js`: cache básico dos arquivos principais do sistema.
- Registro do service worker em produção.
- Metatags no `index.html` para Android/iOS.

## Como instalar no celular

### Android / Chrome

1. Abra o sistema publicado no Chrome.
2. Toque nos três pontos do navegador.
3. Escolha **Adicionar à tela inicial** ou **Instalar app**.
4. Confirme.

### iPhone / Safari

1. Abra o sistema publicado no Safari.
2. Toque no botão de compartilhar.
3. Escolha **Adicionar à Tela de Início**.
4. Confirme.

## Observação importante

O sistema ainda depende de internet para dados do Supabase, pedidos, produtos e notificações. O PWA ajuda na instalação e no carregamento da interface, mas não transforma o sistema em offline completo.
