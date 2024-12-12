const { expect, test: baseTest } = require("@playwright/test");
const dappwright = require("@tenkeylabs/dappwright");
const { MetaMaskWallet } = require("@tenkeylabs/dappwright");
require("dotenv").config();

async function initializeWallet(seed = process.env.WALLET_SEED) {
  return await dappwright.bootstrap("", {
    wallet: "metamask",
    version: MetaMaskWallet.recommendedVersion,
    seed,
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

async function handleTokenApproval(page, wallet) {
  const approveButton = page.getByRole("button", { name: "Approve" });
  if (await approveButton.isVisible()) {
    await approveButton.click();
    await wallet.sign();
  }
}

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

test.beforeEach(async ({ page }) => {
  await page.goto("https://zerog-stg.netlify.app/");
});

test.afterEach(async ({ context }) => {
  await context.close();
});

test.describe("Node Purchase Flow", () => {
  test("should successfully purchase a single node when funds are available", async ({
    wallet,
    page,
  }) => {
    // --- ARRANGE ---
    await switchToStagingIDO(page);
    await connectWallet(page, wallet);

    // --- ACT ---
    await initiateNodePurchase(page, 1);
    await handleTokenApproval(page, wallet);

    // Complete purchase
    await page.getByRole("button", { name: "Purchase" }).click();
    await page.getByRole("button", { name: "Agree" }).click();
    await wallet.sign();

    // Close dialog
    await page
      .locator("div")
      .filter({ hasText: /^Share to earn rewards$/ })
      .getByRole("button")
      .click();

    // --- ASSERT ---
    await expect(page.getByText("Purchased 1 NODE")).toBeVisible();
  });

  test("should disable purchase button when amount is zero", async ({
    wallet,
    page,
  }) => {
    // --- ARRANGE ---
    await switchToStagingIDO(page);
    await connectWallet(page, wallet);

    // --- ACT ---
    await initiateNodePurchase(page, 0);

    // --- ASSERT ---
    await expect(
      page.getByRole("button", { name: "Enter an amount" })
    ).toBeDisabled();
  });

  test("should disable purchase button when amount is negative", async ({
    wallet,
    page,
  }) => {
    // --- ARRANGE ---
    await switchToStagingIDO(page);
    await connectWallet(page, wallet);

    // --- ACT ---
    await initiateNodePurchase(page, -1);

    // --- ASSERT ---
    await expect(
      page.getByRole("button", { name: "Enter an amount" })
    ).toBeDisabled();
  });

  test("should convert decimal node amounts to whole numbers", async ({
    wallet,
    page,
  }) => {
    // --- ARRANGE ---
    await switchToStagingIDO(page);
    await connectWallet(page, wallet);

    // --- ACT ---
    await initiateNodePurchase(page, 1.5);

    // --- ASSERT ---
    expect(async () => {
      const value = await page
        .getByRole("textbox", { name: "Token Amount" })
        .inputValue();
      return Number.isInteger(Number(value));
    }).toBeTruthy();
  });

  test("should disable purchase button when amount exceeds maximum limit", async ({
    wallet,
    page,
  }) => {
    // --- ARRANGE ---
    await switchToStagingIDO(page);
    await connectWallet(page, wallet);

    // --- ACT ---
    await initiateNodePurchase(page, 600);

    // --- ASSERT ---
    await expect(
      page.getByRole("button", { name: "Exceeded Purchase Limit" })
    ).toBeDisabled();
  });

  test("should handle purchase transaction rejection", async ({
    wallet,
    page,
  }) => {
    // --- ARRANGE ---
    await switchToStagingIDO(page);
    await connectWallet(page, wallet);

    // --- ACT ---
    await initiateNodePurchase(page, 1);
    await handleTokenApproval(page, wallet);

    // Reject transaction
    await page.getByRole("button", { name: "Purchase" }).click();
    await page.getByRole("button", { name: "Agree" }).click();
    await wallet.reject();

    // --- ASSERT ---
    await expect(
      page.getByText("Your recent purchase attempt was unsuccessful")
    ).toBeVisible();
  });

  test("should prevent double submission during purchase", async ({
    wallet,
    page,
  }) => {
    // --- ARRANGE ---
    await switchToStagingIDO(page);
    await connectWallet(page, wallet);

    // --- ACT ---
    await initiateNodePurchase(page, 1);
    await handleTokenApproval(page, wallet);

    await page.getByRole("button", { name: "Purchase" }).click();
    await page.getByRole("button", { name: "Agree" }).click();
    await page.getByLabel("Close the dialog").click();

    // --- ASSERT ---
    await expect(page.getByRole("button", { name: "Purchase" })).toBeDisabled();
  });

  test("should successfully purchase multiple nodes in succession", async ({
    wallet,
    page,
  }) => {
    // --- ARRANGE ---
    await switchToStagingIDO(page);
    await connectWallet(page, wallet);

    // --- ACT ---
    for (let i = 0; i < 2; i++) {
      await initiateNodePurchase(page, 1);
      await handleTokenApproval(page, wallet);

      await page.getByRole("button", { name: "Purchase" }).click();
      if (i === 0) {
        await page.getByRole("button", { name: "Agree" }).click();
      }
      await wallet.sign();

      if (i === 0) {
        // Close dialog
        await page
          .locator("div")
          .filter({ hasText: /^Share to earn rewards$/ })
          .getByRole("button")
          .click();
      }

      // --- ASSERT ---
      await expect(page.getByText("Purchased 1 NODE")).toBeVisible();
    }
  });

  test("should not proceed with purchase when agreement is rejected", async ({
    wallet,
    page,
  }) => {
    // --- ARRANGE ---
    await switchToStagingIDO(page);
    await connectWallet(page, wallet);

    // --- ACT ---
    await initiateNodePurchase(page, 1);
    await handleTokenApproval(page, wallet);

    await page.getByRole("button", { name: "Purchase" }).click();
    await page.getByLabel("Close the dialog").click();

    // --- ASSERT ---
    await expect(page.getByText("Confirm Purchase")).not.toBeVisible();
  });

  test("should handle invalid non-numeric token amount input", async ({
    wallet,
    page,
  }) => {
    // --- ARRANGE ---
    await switchToStagingIDO(page);
    await connectWallet(page, wallet);

    // --- ACT ---
    await initiateNodePurchase(page, "abc");

    // --- ASSERT ---
    await expect(
      page.getByRole("textbox", { name: "Token Amount" })
    ).toHaveValue("");
  });

  test("should handle special characters in token amount input", async ({
    wallet,
    page,
  }) => {
    // --- ARRANGE ---
    await switchToStagingIDO(page);
    await connectWallet(page, wallet);

    // --- ACT ---
    await initiateNodePurchase(page, "@#$%");

    // --- ASSERT ---
    await expect(
      page.getByRole("textbox", { name: "Token Amount" })
    ).toHaveValue("");
  });
});

const test2 = baseTest.extend({
  context: async ({}, use) => {
    const [wallet, _, context] = await initializeWallet(
      "test test test test test test test test test test test junk"
    );
    await configureWallet(wallet);
    await use(context);
  },

  wallet: async ({ context }, use) => {
    const metamask = await dappwright.getWallet("metamask", context);
    await use(metamask);
  },
});

test2.beforeEach(async ({ page }) => {
  await page.goto("https://zerog-stg.netlify.app/");
});

test2.afterEach(async ({ context }) => {
  await context.close();
});

test2.describe("Node Purchase Validation", () => {
  test2(
    "should display insufficient balance message when wallet has no funds",
    async ({ wallet, page }) => {
      // --- ARRANGE ---
      await switchToStagingIDO(page);
      await connectWallet(page, wallet);

      // --- ACT ---
      await initiateNodePurchase(page, 1);

      // --- ASSERT ---
      await expect(
        page.getByRole("button", { name: "Insufficient TUSD Balance" })
      ).toBeDisabled();
    }
  );
});
