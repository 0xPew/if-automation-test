const { expect, test: baseTest } = require("@playwright/test");
const dappwright = require("@tenkeylabs/dappwright");
const { MetaMaskWallet } = require("@tenkeylabs/dappwright");
require("dotenv").config();

const test = baseTest.extend({
  context: async ({}, use) => {
    const [wallet, _, context] = await initializeWallet();
    await configureWallet(wallet);
    await use(context);
  },

  wallet: async ({ context }, use) => {
    const metamask = await dappwright.getWallet("metamask", context);
    await use(metamask);
  },
});

async function initializeWallet() {
  return await dappwright.bootstrap("", {
    wallet: "metamask",
    version: MetaMaskWallet.recommendedVersion,
    seed: process.env.WALLET_SEED,
    headless: false,
  });
}

async function configureWallet(wallet) {
  // Configure Arbitrum Sepolia
  await wallet.addNetwork({
    networkName: "Arbitrum Sepolia",
    rpc: "https://sepolia-rollup.arbitrum.io/rpc",
    chainId: 421614,
    symbol: "ETH",
  });

  await wallet.switchNetwork("Arbitrum Sepolia");

  // Add TUSD token
  await wallet.addToken({
    tokenAddress: "0x51c94B0C9d787d4E16c46b1630D5e791bf40F816",
    symbol: "TUSD",
  });
}

async function switchToStagingIDO(page) {
  await page.getByRole("navigation").getByRole("button").nth(1).click();
  await page.getByRole("checkbox").check();
}

async function connectWallet(page, wallet) {
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Connect Wallet" })
    .click();
  await page.getByTestId("rk-wallet-option-metaMask").click();
  await wallet.approve();
}

async function initiateNodePurchase(page, amount) {
  await page.getByRole("button", { name: "1 Test Sales Interview" }).click();
  await page
    .getByRole("textbox", { name: "Token Amount" })
    .fill(amount.toString());
}

test.beforeEach(async ({ page }) => {
  await page.goto("https://zerog-stg.netlify.app/");
});

test.describe("Node Purchase Tests", () => {
  test("Purchase a Node", async ({ wallet, page }) => {
    // --- ARRANGE ---
    await switchToStagingIDO(page);
    await connectWallet(page, wallet);

    // --- ACT ---
    await initiateNodePurchase(page, 1);

    // Handle token approval
    const approveButton = page.getByRole("button", { name: "Approve" });
    if (await approveButton.isVisible()) {
      await approveButton.click();
      await wallet.sign();
    }

    // Complete purchase
    await page.getByRole("button", { name: "Purchase" }).click();
    await page.getByRole("button", { name: "Agree" }).click();
    await wallet.sign();

    // Close success dialog
    await page
      .locator("div")
      .filter({ hasText: /^Share to earn rewards$/ })
      .getByRole("button")
      .click();

    // --- ASSERT ---
    await expect(page.getByText("Purchased 1 NODE")).toBeVisible();
  });

  test("Purchase Exceeding Max Limit", async ({ wallet, page }) => {
    // --- ARRANGE ---
    await switchToStagingIDO(page);
    await connectWallet(page, wallet);

    // --- ACT ---
    await initiateNodePurchase(page, 600);

    // --- ASSERT ---
    await expect(
      page.locator("div").filter({ hasText: /^Exceeded Purchase Limit$/ })
    ).toBeVisible();
  });
});
