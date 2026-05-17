# Correção assets Electron 6.0.42

## Problema

O Electron carregava `dist/index.html` via `file://`, mas o Vite gerava referências absolutas para `/assets/...`. No desktop isso fazia CSS/JS falharem com `ERR_FILE_NOT_FOUND`, deixando a janela azul/escura.

## Correção

`vite.config.js` agora usa:

```js
base: "./"
```

Assim o build gera caminhos relativos (`./assets/...`) compatíveis com Electron e continua funcionando na Vercel.

## Validação

Após atualizar, rode:

```bash
pnpm run build
pnpm run desktop
```

A janela principal deve carregar o sistema em vez de ficar vazia.
