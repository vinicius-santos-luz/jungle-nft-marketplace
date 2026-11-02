# Guia para explicar o código na entrevista

Este documento é um roteiro de estudo, não uma fala para decorar. Abra os arquivos citados e tente explicar cada trecho com suas palavras.

## Explicação de 60 segundos

"Montei um Marketplace de NFTs em React e TypeScript. O TanStack Router controla as telas e mantém filtros do catálogo na URL. Os componentes fazem requisições via Axios, e o TanStack Query gerencia cache, carregamento e invalidações. Como o desafio não utiliza backend real, construí handlers REST com MSW e uma store local de demonstração. O carrinho e o checkout calculam valores em ETH com Decimal.js. Eventos de preço e pedido passam por Socket.IO para sincronizar os dados, e a compra usa chave de idempotência para evitar duplicações. Também configurei Playwright e comandos Lighthouse, embora a validação final no navegador ainda precise ser executada."

## Perguntas prováveis e onde estudar

1. **O que é React?** Biblioteca de interface baseada em componentes. Veja `src/components/NftCard.tsx` e `src/routes/index.tsx`.
2. **O que TypeScript acrescenta?** Contratos de tipos que o compilador verifica; veja `src/lib/models.ts`.
3. **Qual a diferença entre props e state?** `nft` é uma prop do Card; `quantity` é estado local em `nft.$id.tsx`.
4. **Por que usar TanStack Router?** Navega sem recarregar toda a página; `validateSearch` transforma parâmetros da URL em estado do catálogo.
5. **Por que usar TanStack Query se existe `useState`?** Query gerencia dados remotos, carregamento, erro, cache, refetch e invalidação; `useState` guarda controles locais temporários.
6. **O que o Axios faz?** Cria requisições REST e adiciona o token fictício no interceptor de `src/lib/api.ts`.
7. **O que é o MSW?** Intercepta requisições na camada de rede e devolve respostas de uma API simulada; veja `src/mocks/handlers.ts`.
8. **Como funciona o login?** Endpoint devolve token fictício, `AuthProvider` o mantém e consulta a sessão. Rotas privadas exigem usuário. É uma simulação, não segurança real.
9. **Como o carrinho sobrevive ao refresh?** Store mock em `localStorage`; a API do carrinho lê e grava os mesmos dados.
10. **Por que Decimal.js?** Dinheiro não deve ser somado em `number` binário sem cuidados; `makeQuote` calcula ETH a partir de strings decimais.
11. **O que é atualização otimista?** Favorito muda na tela antes da resposta; em falha ocorre rollback. Veja `NftCard.tsx` (`onMutate`, `onError`).
12. **O que é Socket.IO?** Uma conexão persistente por onde a API simulada envia eventos `nft.updated` e `order.updated`. Veja `Shell.tsx` e `handlers.ts`.
13. **Como evita eventos duplicados?** Cada recurso tem uma versão; o cliente ignora versões menores ou iguais às que já processou.
14. **O que é idempotência?** Mesma tentativa de compra com mesma chave e conteúdo retorna o mesmo pedido; conteúdo diferente com a mesma chave gera 409.
15. **Por que o recibo não muda quando o preço do NFT muda?** O pedido grava um snapshot da cotação. A história da transação precisa permanecer estável.
16. **Quais testes existem?** `tests/marketplace.spec.ts` descreve fluxos de catálogo, conta, compra, falhas, preço e mobile. Execute-os no Chromium e corrija falhas antes de afirmar que passaram.
17. **O que falta?** Paridade ao Figma, auditorias Lighthouse, baselines visuais e cobertura total de falhas. Seja transparente sobre o que foi entregue e o que ainda depende de validação.

## Sequência para apresentar ao avaliador

1. Abra o catálogo; pesquise e filtre. Mostre os parâmetros da URL.
2. Abra um NFT, acrescente ao carrinho, mude quantidade e use cupom `JUNGLE10`.
3. Faça login com `demo@jungle.test` / `Demo1234!`; mostre persistência do carrinho.
4. Confirme uma compra fictícia; explique cotação, chave de idempotência e estado pendente.
5. Mostre recibo e depois um cenário de pagamento recusado.
6. Simule mudança de preço no detalhe; explique evento Socket.IO e invalidação do Query.
7. Mostre Network demo no rodapé: lento, vazio, 503 e offline.
8. Abra a arquitetura em `ARCHITECTURE.md` e explique as limitações com honestidade.

## Sugestão de estudo prático

Faça pequenas alterações por conta própria: mude texto de um botão, acrescente uma categoria de NFT na fixture, ajuste uma cor, teste um cupom inválido e explique o que acontece desde o clique até o handler. Isso ajuda a compreender a solução, mesmo que você tenha recebido assistência na implementação.
