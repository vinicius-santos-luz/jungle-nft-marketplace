# Auditoria de Performance — KURIO NFT Marketplace

**Data:** 05/11/2026
**Ferramenta:** Lighthouse 13.6.0
**Ambiente:** Vite Preview, build de produção
**Navegador:** Chromium
**Execuções:** 3 medições por página e dispositivo (12 no total)

## 1. Metodologia

Foram avaliadas duas páginas:

- Home (`/`)
- Detalhe do NFT (`/nft/nft-1`)

Em dois perfis:

- Desktop: preset desktop do Lighthouse.
- Mobile: viewport de 390 × 844 px, emulação mobile e escala 1.

Foram realizadas três execuções independentes por combinação de página e dispositivo. Os resultados abaixo apresentam as medianas.

As medições da Home correspondem às auditorias anteriores, enquanto as medições do detalhe NFT foram realizadas novamente após os ajustes de layout.

## 2. Resultados consolidados

| Métrica | Home Desktop | Home Mobile | NFT Desktop | NFT Mobile |
|---|---:|---:|---:|---:|
| Performance | 99 | 87 | 99 | 86 |
| Accessibility | 97 | 97 | 93 | 96 |
| Best Practices | 100 | 100 | 100 | 100 |
| SEO | 92 | 92 | 92 | 92 |
| LCP (ms) | 871.915 | 3725.027 | 864.503 | 3650.489 |
| CLS | 0.000527 | 0.004800 | 0.003252 | 0.078995 |
| TBT (ms) | 0 | 175 | 0 | 184 |

## 3. Análise dos resultados

### Desktop

As duas páginas alcançaram Performance 99.

O LCP permaneceu abaixo de 900 ms nas medianas, com CLS muito baixo e TBT igual a zero.

O resultado indica bom desempenho nas condições laboratoriais utilizadas.

### Mobile

A Home alcançou Performance 87 e o detalhe NFT alcançou Performance 86.

Os principais pontos observados:

- LCP de aproximadamente 3,7 segundos nas duas páginas.
- CLS de 0,005 na Home.
- CLS de 0,079 no detalhe NFT.
- TBT de 175 ms na Home e 184 ms no detalhe.

O CLS das duas páginas permanece abaixo de 0,1, limite considerado bom pelo Core Web Vitals.

O LCP mobile está na faixa que necessita de melhoria, considerando o limite de 2,5 segundos para uma boa experiência.

### Acessibilidade e SEO

As notas de acessibilidade ficaram entre 93 e 97.

As notas de SEO ficaram em 92 nas quatro combinações.

As boas práticas alcançaram 100 em todas as medições.

Essas pontuações representam avaliações automatizadas do Lighthouse e não substituem auditorias manuais completas.

## 4. Ajuste de estabilidade visual

Na página de detalhes do NFT, foi identificado um deslocamento de layout durante o carregamento.

O skeleton foi ajustado para reservar melhor o espaço da galeria e do painel de informações.

Resultados comparativos:

| Ambiente | CLS anterior | CLS após ajuste |
|---|---:|---:|
| Desktop | 0.270459 | 0.003252 |
| Mobile | 0.129182 | 0.078995 |

No desktop, a redução do CLS foi expressiva.

No mobile, houve redução, mas ainda existe espaço para melhoria.

## 5. Limitações da medição

- Os resultados são de laboratório, não de usuários reais.
- TBT é uma métrica laboratorial e não substitui INP.
- As medições não comprovam Core Web Vitals de campo.
- As medições da Home foram realizadas anteriormente às novas medições do detalhe.
- O CLS e o LCP podem variar conforme dispositivo, rede e condições de execução.
- Não foi realizada auditoria completa de acessibilidade manual.

## 6. Conclusão

O projeto apresenta desempenho elevado em desktop e resultados satisfatórios de estabilidade visual em mobile.

As principais oportunidades de melhoria permanecem concentradas no LCP mobile e na acessibilidade da página de detalhes.

Os resultados foram documentados sem introduzir novas alterações funcionais na aplicação.
