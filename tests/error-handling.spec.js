const { expect, test: baseTest } = require("@playwright/test");
const dappwright = require("@tenkeylabs/dappwright");
require("dotenv").config();

const {
  initializeWallet,
  configureWallet,
  switchToStagingIDO,
  connectWallet,
  initiateNodePurchase,
  handleTokenApproval,
} = require("./utils/helpers");

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

test.describe("Error Handling", () => {
  test("should handle purchase transaction rejection", async ({
    wallet,
    page,
  }) => {
    await switchToStagingIDO(page);
    await connectWallet(page, wallet);
    await initiateNodePurchase(page, 1);
    await handleTokenApproval(page, wallet);

    await page.getByRole("button", { name: "Purchase" }).click();
    await page.getByRole("button", { name: "Agree" }).click();
    await wallet.reject();

    await expect(
      page.getByText("Your recent purchase attempt was unsuccessful")
    ).toBeVisible();
  });

  test("should display insufficient balance message", async ({
    wallet,
    page,
    context,
  }) => {
    await wallet.createAccount();
    await wallet.switchAccount(2);
    await wallet.addToken({
      tokenAddress: "0x51c94B0C9d787d4E16c46b1630D5e791bf40F816",
      symbol: "TUSD",
    });

    const pages = context.pages();
    const targetPage = pages.find((page) =>
      page.url().includes("zerog-stg.netlify.app")
    );
    await targetPage.bringToFront();

    await switchToStagingIDO(page);
    await connectWallet(page, wallet);
    await initiateNodePurchase(page, 1);

    await expect(
      page.getByRole("button", { name: "Insufficient TUSD Balance" })
    ).toBeDisabled();
  });

  test("should prevent double submission during purchase", async ({
    wallet,
    page,
  }) => {
    await switchToStagingIDO(page);
    await connectWallet(page, wallet);
    await initiateNodePurchase(page, 1);
    await handleTokenApproval(page, wallet);

    // Initiate first purchase attempt
    await page.getByRole("button", { name: "Purchase" }).click();
    await page.getByRole("button", { name: "Agree" }).click();

    // Close the dialog without completing the transaction
    await page.getByLabel("Close the dialog").click();

    // Verify purchase button is disabled
    await expect(page.getByRole("button", { name: "Purchase" })).toBeDisabled();
  });
});
