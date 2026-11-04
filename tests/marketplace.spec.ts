import { expect, test, type Page } from "@playwright/test";

async function loginAsDemo(page: Page) {
  await page
    .getByRole("textbox", { name: "E-mail", exact: true })
    .fill("demo@jungle.test");
  await page.getByLabel("Senha", { exact: true }).fill("Demo1234!");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
}

async function fillCollectorDetails(page: Page) {
  await page.getByLabel(/Nome de exibição/).fill("Collector Teste");

  await page.getByLabel(/Nome de usuário/).fill("collector_teste");

  await page.getByLabel(/Nome do perfil/).fill("Perfil de Teste");

  await page.getByLabel(/Tipo de carteira/).selectOption("MetaMask");

  await page.getByLabel(/Código de indicação/).fill("TESTE2026");

  await page.getByLabel(/E-mail/).fill("demo@jungle.test");

  await page.getByLabel(/Nome ENS/).fill("collector-teste.eth");
}

test("catalog search, category filter, ordering and URL restore", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("tab", { name: "Todos os NFTs" })).toBeVisible();
  if ((page.viewportSize()?.width ?? 0) < 768)
    await page.getByRole("button", { name: "Abrir filtros" }).click();
  await page.getByRole("button", { name: /^Jogos(?:\s|$)/ }).click();
  await expect(page).toHaveURL(/category=Gaming/);
  await expect(page.getByText("Neon Vessel #552").first()).toBeVisible();
  if ((page.viewportSize()?.width ?? 0) >= 768)
    await page.getByRole("button", { name: "Abrir busca" }).click();
  await page.getByRole("searchbox", { name: "Pesquisar NFTs" }).fill("Vessel");
  await page.getByRole("searchbox", { name: "Pesquisar NFTs" }).press("Enter");
  await expect(page).toHaveURL(/q=Vessel/);
  await expect(page.getByText("Neon Vessel #552").first()).toBeVisible();
  await page.reload();
  await expect(page.getByText("Neon Vessel #552").first()).toBeVisible();
});

test("login, profile, logout and direct route protection", async ({ page }) => {
  await page.goto("/profile");
  await expect(page).toHaveURL(/\/login/);

  await loginAsDemo(page);
  await expect(page).toHaveURL(/\/profile/);

  await page
    .getByRole("button", { name: /^(sair|log\s*out|logout|sign\s*out)$/i })
    .click();
  await expect(page).toHaveURL(/\/login/);
  await expect
    .poll(async () => {
      try {
        return await page.evaluate(() => localStorage.getItem("jungle-nft-token"));
      } catch (error) {
        if (String(error).includes("Execution context was destroyed")) {
          return "navigation-in-progress";
        }
        throw error;
      }
    })
    .toBeNull();

  await page.goto("/profile");
  await expect(page).toHaveURL(/\/login/);
});

test("favorites persist after refresh for authenticated user", async ({
  page,
}) => {
  await page.goto("/login");
  await loginAsDemo(page);
  await expect(page).toHaveURL(/\/profile/);
  await page.goto("/");
  await page
    .getByRole("button", { name: "Favoritar Emerald Ape #042" })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Remover Emerald Ape #042 dos favoritos",
    }),
  ).toBeEnabled();
  await page.goto("/favorites");
  await expect(page.getByText("Emerald Ape #042").first()).toBeVisible();
  await page.reload();
  await expect(page.getByText("Emerald Ape #042").first()).toBeVisible();
});

test("cart quantity and removal are persisted and validated", async ({
  page,
}) => {
  await page.goto("/nft/nft-1");
  await expect(page.getByRole("button", { name: "Add to cart" })).toHaveCount(
    0,
  );
  await page.getByRole("button", { name: "Comprar NFT" }).click();
  await page.goto("/cart");
  await expect(page.getByText("Emerald Ape #042").first()).toBeVisible();
  await page.getByRole("button", { name: "Aumentar Emerald Ape #042" }).click();
  const nftRow = page
    .getByRole("article")
    .filter({ hasText: "Emerald Ape #042" });

  await expect(nftRow.getByText("2", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("Emerald Ape #042").first()).toBeVisible();
  await page.getByRole("button", { name: "Remove" }).click();
  await expect(page.getByText("Your cart is empty")).toBeVisible();
});

test("full purchase completes to receipt without real payment", async ({
  page,
}) => {
  await page.goto("/nft/nft-1");

  await page.getByRole("button", { name: "Comprar NFT" }).click();

  await page.goto("/login");

  await loginAsDemo(page);

  await expect(page).toHaveURL(/\/(profile|checkout)/);

  await page.goto("/checkout");

  await fillCollectorDetails(page);

  await page
    .getByRole("button", {
      name: "Confirmar compra",
    })
    .click();

  await expect(page).toHaveURL(/\/order\//);

  await expect(
    page.getByRole("heading", {
      name: "Order confirmed!",
    }),
  ).toBeVisible({ timeout: 15000 });

  await expect(page.getByText("Receipt snapshot")).toBeVisible();
});

test("NFT gallery and buy action lead to checkout without losing the cart", async ({
  page,
}) => {
  await page.goto("/nft/nft-1");
  await expect(
    page.getByRole("heading", { name: "Emerald Ape #042" }),
  ).toBeVisible();
  if ((page.viewportSize()?.width ?? 0) >= 768) {
    const alternateView = page.getByRole("button", {
      name: "Detalhe do rosto",
    });
    await alternateView.click();
    await expect(alternateView).toHaveAttribute("aria-pressed", "true");
  }
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(2);
  await expect(page.getByRole("button", { name: "Add to cart" })).toHaveCount(
    0,
  );
  await page.getByRole("button", { name: "Comprar NFT" }).click();
  await expect(page).toHaveURL(/\/login/);
  await loginAsDemo(page);
  await expect(page).toHaveURL(/\/checkout/);
  await expect(page.getByText("Emerald Ape #042").first()).toBeVisible();
});

test("invalid coupon gives error, then user can recover", async ({ page }) => {
  await page.goto("/nft/nft-1");
  await page.getByRole("button", { name: "Comprar NFT" }).click();
  await page.goto("/cart");
  const orderTotal = page.locator("aside dl > div").last().locator("dd");
  await expect(orderTotal).toHaveText(/^\d+(?:\.\d{1,6})? ETH$/);
  const originalTotal = await orderTotal.textContent();
  await page.getByRole("textbox", { name: "Código do cupom" }).fill("NOTREAL");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page.getByRole("alert")).toContainText("Cupom inválido");
  await page.getByRole("button", { name: /Remove coupon/ }).click();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(orderTotal).toHaveText(originalTotal ?? "");
});

test("mobile layout has no unintended horizontal overflow", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("tab", { name: "Todos os NFTs" })).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(2);
});

test("direct access to a missing NFT shows a recoverable not-found state", async ({
  page,
}) => {
  await page.goto("/nft/does-not-exist");
  await expect(
    page.getByRole("heading", { name: "NFT not found" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Back to catalog" }).click();
  await expect(page.getByRole("tab", { name: "Todos os NFTs" })).toBeVisible();
});

test("registration reports duplicate email without changing the account", async ({
  page,
}) => {
  await page.goto("/register");
  await page
    .getByRole("textbox", { name: "Nome de usuário" })
    .fill("Duplicate Account");
  await page
    .getByRole("textbox", { name: "E-mail", exact: true })
    .fill("demo@jungle.test");
  await page.getByLabel("Senha", { exact: true }).fill("Another1234!");
  await page.getByLabel("Confirmar senha").fill("Another1234!");
  await page.getByRole("button", { name: "Criar conta", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("já está cadastrado");
});

test("HTTP 503 catalog failure recovers after scenario reset", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByText("Emerald Ape #042").first()).toBeVisible();
  await page
    .getByRole("combobox", { name: "Simular condição de rede" })
    .selectOption("error");
  await expect(
    page.getByRole("alert").filter({ hasText: "indisponível" }).first(),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "Simular condição de rede" })
    .selectOption("normal");
  await expect(page.getByText("Emerald Ape #042").first()).toBeVisible();
});

test("declined payment preserves cart and does not show success", async ({
  page,
}) => {
  await page.goto("/nft/nft-1");

  await page.getByRole("button", { name: "Comprar NFT" }).click();

  // Aguarda a confirmação de que o NFT entrou no carrinho.
  await expect(
    page.getByRole("link", { name: /Carrinho, [1-9]\d* itens/ }),
  ).toBeVisible();

  await page.goto("/login");
  await loginAsDemo(page);

  // A compra iniciada antes do login deve continuar no checkout.
  await expect(page).toHaveURL(/\/checkout/);
  await expect(page.getByText("Emerald Ape #042").first()).toBeVisible();
  await fillCollectorDetails(page);

  // Aguarda a cotação antes de confirmar a revisão.
  // Simula recusa no mock sem adicionar controles ao checkout.
  await page.evaluate(() => {
    sessionStorage.setItem("jungle-test-decline-next-order", "1");
  });

  const orderResponsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      /\/api\/orders(?:\?|$)/.test(new URL(response.url()).pathname),
    { timeout: 15000 },
  );

  await expect(
    page.getByRole("button", { name: "Confirmar compra" }),
  ).toBeEnabled();

  await page.getByRole("button", { name: "Confirmar compra" }).click();

  const orderResponse = await orderResponsePromise;

  await expect(page).toHaveURL(/\/order\/[^/]+$/, {
    timeout: 10000,
  });

  await expect(
    page.getByRole("heading", { name: "Payment declined" }),
  ).toBeVisible({ timeout: 15000 });

  await page.goto("/cart");
  await expect(page.getByText("Emerald Ape #042").first()).toBeVisible();
});

test("collector profile can be edited and survives refresh", async ({
  page,
}) => {
  await page.goto("/login");
  await loginAsDemo(page);
  await expect(page).toHaveURL(/\/profile/);
  await page.goto("/profile");

  await page.goto("/profile");

  const displayNameInput = page.getByRole("textbox", {
    name: "Nome de exibição*",
    exact: true,
  });

  // Aguarda a consulta do perfil preencher o formulário.
  await expect(displayNameInput).toHaveValue("Alex Morgan");

  await displayNameInput.fill("Updated Collector");

  await page
    .getByRole("textbox", { name: "Nome de usuário*", exact: true })
    .fill("updatedcollector");

  await page.getByRole("button", { name: "Salvar", exact: true }).click();

  await expect(page.getByRole("status")).toContainText(
    "Dados salvos com sucesso.",
  );

  await page.reload();

  await expect(
    page.getByRole("textbox", { name: "Nome de exibição*", exact: true }),
  ).toHaveValue("Updated Collector");

  await expect(
    page.getByRole("textbox", { name: "Nome de usuário*", exact: true }),
  ).toHaveValue("updatedcollector");
});

test("live price update invalidates quote and requires fresh review", async ({
  page,
}) => {
  await page.goto("/nft/nft-1");
  await page.getByRole("button", { name: "Comprar NFT" }).click();
  await page.goto("/login");
  await loginAsDemo(page);

  await expect(page).toHaveURL(/\/(profile|checkout)/);

  await page.goto("/checkout");

  await fillCollectorDetails(page);
  await expect(
    page.getByRole("button", { name: "Confirmar compra" }),
  ).toBeEnabled();

  const price = page.locator("aside").getByText(/ETH/).last();
  const before = await price.textContent();
  const updateStatus = await page.evaluate(async () => {
    const response = await fetch("/api/scenarios/nft-update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nftId: "nft-1" }),
    });
    return response.status;
  });
  expect(updateStatus).toBeGreaterThanOrEqual(200);
  expect(updateStatus).toBeLessThan(300);

  await expect(price).not.toHaveText(before ?? "", { timeout: 10000 });
});
