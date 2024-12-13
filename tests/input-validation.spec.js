const { expect, test: baseTest } = require("@playwright/test");
const dappwright = require("@tenkeylabs/dappwright");
require("dotenv").config();

const {
  initializeWallet,
  configureWallet,
  switchToStagingIDO,
  connectWallet,
  initiateNodePurchase,
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

test.describe("Input Validation", () => {
  test.beforeEach(async ({ wallet, page }) => {
    await switchToStagingIDO(page);
    await connectWallet(page, wallet);
  });

  const invalidInputTests = [
    {
      amount: 0,
      expectedButton: "Enter an amount",
      description: "zero amount",
    },
    {
      amount: -1,
      expectedButton: "Enter an amount",
      description: "negative amount",
    },
    {
      amount: 600,
      expectedButton: "Exceeded Purchase Limit",
      description: "amount exceeding maximum limit",
    },
    {
      amount: "abc",
      expectedValue: "",
      description: "non-numeric characters",
    },
    {
      amount: "@#$%",
      expectedValue: "",
      description: "special characters",
    },
  ];

  for (const {
    amount,
    expectedButton,
    expectedValue,
    description,
  } of invalidInputTests) {
    test(`should handle invalid input when user enters ${description}`, async ({
      page,
    }) => {
      await initiateNodePurchase(page, amount);

      if (expectedButton) {
        await expect(
          page.getByRole("button", { name: expectedButton })
        ).toBeDisabled();
      }
      if (expectedValue !== undefined) {
        await expect(
          page.getByRole("textbox", { name: "Token Amount" })
        ).toHaveValue(expectedValue);
      }
    });
  }

  test("should convert decimal node amounts to whole numbers", async ({
    page,
  }) => {
    await initiateNodePurchase(page, 1.5);
    const value = await page
      .getByRole("textbox", { name: "Token Amount" })
      .inputValue();
    expect(Number.isInteger(Number(value))).toBeTruthy();
  });
});
