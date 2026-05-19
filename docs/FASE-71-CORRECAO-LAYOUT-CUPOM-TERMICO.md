# Fase 71 — Correção do layout do cupom térmico

Versão: `6.0.59-fase-71-correcao-layout-cupom-termico`

## Problema corrigido

O cupom estava imprimindo deslocado para a lateral, com texto cortado e grande área em branco. Isso acontece quando o Electron envia o HTML para a impressora sem informar corretamente a largura física do papel, ou quando o driver do Windows usa uma página maior/errada.

## Correções aplicadas

- O Desktop/Electron agora força `pageSize` em microns para impressoras 80mm/58mm.
- A impressão usa margem zero no Electron.
- Os templates de cupom usam largura segura de 72mm para papel 80mm.
- O HTML completo recebido da fila também recebe uma camada de CSS corretivo antes de imprimir.
- O conteúdo deixa de usar centralização automática que podia causar corte lateral.

## Conferência no PC

1. Instale a versão Desktop 6.0.59.
2. Abra o painel de impressão.
3. Selecione a impressora térmica correta.
4. Confira largura do papel como 80mm.
5. No Windows, confira nas preferências da impressora se o papel está como 80mm/Receipt.
6. Reprocesse uma impressão da fila.

Se ainda sair cortado, o próximo ajuste deve ser no driver da impressora, não no banco.
