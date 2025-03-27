import { Hex } from "viem";
import { baseSepolia, sepolia, arbitrumSepolia } from "viem/chains";

export const supportedChains = [
  {
    ...baseSepolia,
    name: "Base Sepolia",
    bundlerUrl: "https://bundler.biconomy.io/api/v3/84532/nJPK7B3ru.dd7f7861-190d-41bd-af80-6877f74b8f44",
    paymasterUrl: "https://paymaster.biconomy.io/api/v2/84532/9YTUGYitn.73ea1313-001c-4382-bf9b-8bb2f1f92b2a",
    usdcAddress: "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as Hex,
  },
  {
    ...sepolia,
    name: "Ethereum Sepolia",
    bundlerUrl: "https://bundler.biconomy.io/api/v3/11155111/nJPK7B3ru.dd7f7861-190d-41bd-af80-6877f74b8f44",
    paymasterUrl: "https://paymaster.biconomy.io/api/v2/11155111/ViafBEg5e.77fbbdba-6aad-480b-a673-2af42aec7ee6",
    usdcAddress: "0x1c7d4b196cb0c7b01d743fbc6116a902379c7238" as Hex,
  },
  {
    ...arbitrumSepolia,
    name: "Arbitrum Sepolia",
    bundlerUrl: "https://bundler.biconomy.io/api/v3/421614/nJPK7B3ru.dd7f7861-190d-41bd-af80-6877f74b8f44",
    paymasterUrl: "https://paymaster.biconomy.io/api/v2/421614/e0v7CCNZo.9f6e2e90-31eb-449d-b124-53ce3b686c5e",
    usdcAddress: "0x5fd84259d66cd46795cbf7644e8ff6c6d1a0f747" as Hex,
  }
];

export const getChainById = (chainId: number) => {
  return supportedChains.find(chain => chain.id === chainId);
};
