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

test.describe("Successful Purchase Scenarios", () => {
  test("should successfully purchase a single node", async ({
    wallet,
    page,
  }) => {
    await switchToStagingIDO(page);
    await connectWallet(page, wallet);
    await initiateNodePurchase(page, 1);
    await handleTokenApproval(page, wallet);

    await page.getByRole("button", { name: "Purchase" }).click();
    await page.getByRole("button", { name: "Agree" }).click();
    await wallet.sign();

    await page
      .locator("div")
      .filter({ hasText: /^Share to earn rewards$/ })
      .getByRole("button")
      .click();

    await expect(page.getByText("Purchased 1 NODE")).toBeVisible();
  });

  test("should successfully purchase multiple nodes in succession", async ({
    wallet,
    page,
  }) => {
    await switchToStagingIDO(page);
    await connectWallet(page, wallet);

    for (let i = 0; i < 2; i++) {
      await initiateNodePurchase(page, 1);
      await handleTokenApproval(page, wallet);

      await page.getByRole("button", { name: "Purchase" }).click();
      if (i === 0) {
        await page.getByRole("button", { name: "Agree" }).click();
      }
      await wallet.sign();

      if (i === 0) {
        await page
          .locator("div")
          .filter({ hasText: /^Share to earn rewards$/ })
          .getByRole("button")
          .click();
      }

      await expect(page.getByText("Purchased 1 NODE")).toBeVisible();
    }
  });
});
