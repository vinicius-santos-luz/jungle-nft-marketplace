# Jungle NFT Marketplace — Frontend Challenge

Implementação de estudo do [desafio público da Jungle Gaming](https://github.com/junglegaming/frontend-challenge) usando React, TypeScript e APIs simuladas. **Não há blockchain nem pagamentos reais.**

> **Status:** compilação TypeScript/Vite e lint validados nesta versão. A versão anterior teve 26 testes E2E aprovados no WSL do candidato; as alterações atuais, com 28 testes definidos, ainda precisam de nova execução no Chromium. Leia [ARCHITECTURE.md](./ARCHITECTURE.md) para decisões e limitações.

## Stack

React 19, TypeScript 7, Vite 8, TanStack Router, TanStack Query, Axios, Tailwind CSS v4, componentes shadcn/ui oficiais, MSW v2, Socket.IO (`socket.io-client` + `@mswjs/socket.io-binding`), Decimal.js, Playwright e Lighthouse.

## Executar no WSL/Linux

Requer Node.js 24+ e npm.

```bash
npm ci
npm run dev
```

Acesse `http://localhost:5173/`. Em outro terminal:

```bash
npm run typecheck
npm run lint
npm run build
npm run test:e2e
```

Instale o navegador de testes caso ainda não exista: `npx playwright install chromium`. Relatório HTML: `npm run test:e2e:report`.

O build gera `dist/`; publique essa pasta e configure fallback de rotas SPA para `index.html`. Para Vercel, há `vercel.json`. O arquivo `public/mockServiceWorker.js` deve ser servido na raiz.

### Ambiente

`VITE_ENABLE_MOCKS` é `true` por padrão, inclusive no build de demonstração. Use `false` apenas com backend REST e Socket.IO próprios. **Não coloque segredos reais em variáveis `VITE_*`.**

## Contas fictícias

| Email              | Senha        |
| ------------------ | ------------ |
| `demo@jungle.test` | `Demo1234!`  |
| `test@jungle.test` | `Teste1234!` |

As senhas são comparadas com hash SHA-256 no mock, sem armazenar o texto claro. Isso **não** representa autenticação de produção.

## Demonstração manual

1. No catálogo, selecione **Jogos** (barra lateral no desktop, botão de filtros no mobile), pesquise `Vessel`, altere a ordenação, navegue no histórico e recarregue. Busca, preço, categoria e ordenação usam a URL. No desktop, abra a busca pelo ícone na navegação.
2. Abra um NFT, escolha quantidade e adicione ao carrinho pelo ícone ou use **Comprar NFT** para seguir ao checkout.
3. Altere quantidade, aplique o cupom `JUNGLE10`. `EXPIRED` e códigos desconhecidos geram erro.
4. Faça login. O carrinho de visitante será mesclado ao da conta.
5. No checkout, escolha rede/carteira, revise e confirme. O pedido passa por `pending`, `confirmed` ou `declined`.
6. Clique em **Simulate live price update** no detalhe/carrinho: endpoint MSW altera o preço e envia `nft.updated` pelo Socket.IO.
7. Marque **Simulate payment refusal** no checkout para testar recusa com carrinho preservado.
8. Teste perfil, alteração de senha, carteiras e favoritos com atualização otimista.
9. Use **Restaurar demonstração** no rodapé para restaurar fixtures, sessões, carrinhos, favoritos, carteiras e pedidos.
10. No seletor **Simular condição de rede**, alterne entre `Normal`, `Slow`, `Empty`, `HTTP 503` e `Offline` para reproduzir estados do catálogo e depois retornar a `Normal`.

## Testes e auditoria

```bash
npm run test:e2e
npm run test:e2e:update
npm run audit:mobile
npm run audit:desktop
```

Playwright está configurado para Chromium desktop (1440 px) e mobile (390 px), relatório HTML e traces de falha. Os snapshots devem ser revisados antes de versionar baselines.

Lighthouse requer Chrome/Chromium. Antes das auditorias, execute `npm run build` e `npm run preview` em outro terminal. Execute três medições por página/perfil, informe medianas e LCP/CLS/TBT. **Os relatórios de auditoria ainda não foram gerados.**

## Pastas

```text
src/components/   Shell, NFT cards, artwork, shadcn/ui
src/lib/          Tipos, API Axios, sessão
src/mocks/        Fixtures e handlers REST/Socket.IO
src/routes/       Páginas do TanStack Router
tests/            Playwright
public/           Service Worker MSW
```

## Limitações importantes

- Os oito primeiros NFTs reutilizam quatro artes exportadas da referência (algumas imagens se repetem). As artes dos demais NFTs ainda são ilustradas em CSS. A fonte monoespaçada local é uma aproximação até que a família exata e as métricas do Figma possam ser verificadas. **Não há paridade pixel a pixel validada.**
- Persistência local é por navegador/dispositivo; não existe backend de produção.
- Os cenários de rede disponíveis atualmente afetam o endpoint do catálogo; timeout após pedido, latência variável entre consultas e regressão visual ainda não possuem cobertura completa; veja `ARCHITECTURE.md`.
- Nunca use credenciais, endereços de carteiras com fundos ou dados pessoais reais na demonstração.
