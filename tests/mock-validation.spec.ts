import { expect, test } from "@playwright/test";

test("mock API rejects unsupported wallet networks", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("textbox", { name: "E-mail", exact: true }).fill("demo@jungle.test");
  await page.getByLabel("Senha", { exact: true }).fill("Demo1234!");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/profile/);

  const result = await page.evaluate(async () => {
    const token = localStorage.getItem("jungle-nft-token");
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
    const created = await fetch("/api/wallets", {
      method: "POST",
      headers,
      body: JSON.stringify({
        label: "Invalid",
        address: "0x1234567890123456789012345678901234567890",
        network: "UnknownNetwork",
      }),
    });
    const updated = await fetch("/api/wallets/wallet-demo", {
      method: "PATCH",
      headers,
      body: JSON.stringify({ network: "UnknownNetwork" }),
    });
    const quoted = await fetch("/api/quote", {
      method: "POST",
      headers,
      body: JSON.stringify({ network: "UnknownNetwork" }),
    });
    return [created.status, updated.status, quoted.status];
  });
  expect(result).toEqual([422, 422, 422]);
});
