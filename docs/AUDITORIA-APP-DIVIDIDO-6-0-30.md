# Auditoria final e separação do App.jsx — 6.0.30

Versão: `6.0.30-fase-50-app-dividido-auditoria-final`

## Objetivo

Reduzir o risco operacional do arquivo `src/App.jsx` estar grande demais e facilitar manutenção antes do deploy.

## Alterações

- Separado o bloco de componentes visuais base para `src/components/ui.jsx`.
- Separados painéis grandes de acompanhamento, diagnóstico, auditoria e dashboard para `src/components/OperationalPanels.jsx`.
- Separadas funções auxiliares operacionais para `src/utils/appRuntime.js`.
- Mantidas as regras de estoque com reserva antes de salvar pedido/venda.
- Mantida migração obrigatória `supabase/migracao-final-producao-6-0-30.sql`.

## Validação

Executar antes do deploy:

```bash
npm test
npm run lint
npm run build
npm audit --audit-level=moderate
```
