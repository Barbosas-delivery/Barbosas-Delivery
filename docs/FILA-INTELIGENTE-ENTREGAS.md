# Fila inteligente de entregas

A Fase 43 melhora o painel do entregador para operação real de delivery.

## Regras

- Entregas atrasadas continuam no topo.
- Se o entregador tiver uma entrega atrasada sob responsabilidade dele, não consegue aceitar outra.
- O limite de entregas ativas por entregador é configurável em **Configurações da loja**.
- O padrão é 2 entregas ativas por entregador.
- O limite mínimo é 1 e o máximo é 6.

## Regiões

O painel do entregador agora mostra entregas agrupadas por região/bairro. Isso ajuda a combinar pedidos próximos e reduzir tempo de rota.

## Supabase

Não precisa rodar SQL novo. A configuração fica salva dentro das configurações da loja.
