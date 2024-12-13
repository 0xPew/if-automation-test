const dappwright = require("@tenkeylabs/dappwright");
const { MetaMaskWallet } = require("@tenkeylabs/dappwright");

async function initializeWallet(seed = process.env.WALLET_SEED) {
  return await dappwright.bootstrap("", {
    wallet: "metamask",
    version: MetaMaskWallet.recommendedVersion,
    seed,
    headless: false,
  });
}

async function configureWallet(wallet) {
  await wallet.addNetwork({
    networkName: "Arbitrum Sepolia",
    rpc: "https://sepolia-rollup.arbitrum.io/rpc",
    chainId: 421614,
    symbol: "ETH",
  });

  await wallet.switchNetwork("Arbitrum Sepolia");

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

module.exports = {
  initializeWallet,
  configureWallet,
  switchToStagingIDO,
  connectWallet,
  initiateNodePurchase,
  handleTokenApproval,
};
