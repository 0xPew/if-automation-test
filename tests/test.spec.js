const { expect, test: baseTest } = require("@playwright/test");
const dappwright = require("@tenkeylabs/dappwright");
const { MetaMaskWallet } = require("@tenkeylabs/dappwright");
require("dotenv").config();

const test = baseTest.extend({
  context: async ({}, use) => {
    // Initialize MetaMask wallet
    const [wallet, _, context] = await dappwright.bootstrap("", {
      wallet: "metamask",
      version: MetaMaskWallet.recommendedVersion,
      seed: process.env.WALLET_SEED,
      headless: false,
    });

    // Configure Arbitrum Sepolia
    await wallet.addNetwork({
      networkName: "Arbitrum Sepolia",
      rpc: "https://sepolia-rollup.arbitrum.io/rpc",
      chainId: 421614,
      symbol: "ETH",
    });

    // Set Arbitrum Sepolia as the active network
    await wallet.switchNetwork("Arbitrum Sepolia");

    // Add TUSD token to the wallet
    await wallet.addToken({
      tokenAddress: "0x51c94B0C9d787d4E16c46b1630D5e791bf40F816",
      symbol: "TUSD",
    });

    await use(context);
  },

  wallet: async ({ context }, use) => {
    const metamask = await dappwright.getWallet("metamask", context);
    await use(metamask);
  },
});

// Navigate to testing environment before each test
test.beforeEach(async ({ page }) => {
  await page.goto("https://zerog-stg.netlify.app/");
});

// Test case: Purchase a single node
test("Purchase 1 Node", async ({ wallet, page }) => {
  // Toggle use staging IDO
  await page.getByRole("navigation").getByRole("button").nth(1).click();
  await page.getByRole("checkbox").check();

  // Open wallet connection dialog
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Connect Wallet" })
    .click();

  // Select and connect MetaMask wallet
  await page.getByTestId("rk-wallet-option-metaMask").click();
  await wallet.approve();

  // Initialize node purchase
  await page.getByRole("button", { name: "1 Test Sales Interview" }).click();
  await page.getByRole("textbox", { name: "Token Amount" }).fill("1");

  // Handle token approval if needed
  if (await page.getByRole("button", { name: "Approve" }).isVisible()) {
    await page.getByRole("button", { name: "Approve" }).click();
    await wallet.sign();
  }

  // Complete purchase transaction
  await page.getByRole("button", { name: "Purchase" }).click();
  await page.getByRole("button", { name: "Agree" }).click();
  await wallet.sign();

  // Close success dialog
  await page
    .locator("div")
    .filter({ hasText: /^Share to earn rewards$/ })
    .getByRole("button")
    .click();

  // Verify purchase completion
  await expect(page.getByText("Purchased 1 NODE")).toBeVisible();
});
