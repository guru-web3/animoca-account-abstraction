import { useState, useEffect } from "react";
import {
  createSmartAccountClient,
  toNexusAccount,
  createBicoPaymasterClient,
} from "@biconomy/abstractjs";
import { privateKeyToAccount } from "viem/accounts";
import { Hex, http } from "viem";
import { arbitrumSepolia, baseSepolia, sepolia } from "viem/chains";
import { ClientsMap, ChainConfig } from "../types";
import { useClientStore } from "@/store/clientStore";

export const useSmartAccount = () => {
  const { setClients, setLoading, setError } = useClientStore();

  const initializeClients = async (privateKey: Hex) => {
    if (!privateKey) return;

    try {
      setLoading(true);
      const account = privateKeyToAccount(privateKey);

      const chainConfigs: ChainConfig[] = [
        {
          chain: baseSepolia,
          bundlerUrl:
            "https://bundler.biconomy.io/api/v3/84532/nJPK7B3ru.dd7f7861-190d-41bd-af80-6877f74b8f44",
          paymasterUrl:
            "https://paymaster.biconomy.io/api/v2/84532/9YTUGYitn.73ea1313-001c-4382-bf9b-8bb2f1f92b2a",
        },
        {
          chain: sepolia,
          bundlerUrl:
            "https://bundler.biconomy.io/api/v3/11155111/nJPK7B3ru.dd7f7861-190d-41bd-af80-6877f74b8f44",
          paymasterUrl:
            "https://paymaster.biconomy.io/api/v2/11155111/ViafBEg5e.77fbbdba-6aad-480b-a673-2af42aec7ee6",
        },
        {
          chain: arbitrumSepolia,
          bundlerUrl:
            "https://bundler.biconomy.io/api/v3/421614/nJPK7B3ru.dd7f7861-190d-41bd-af80-6877f74b8f44",
          paymasterUrl:
            "https://paymaster.biconomy.io/api/v2/421614/e0v7CCNZo.9f6e2e90-31eb-449d-b124-53ce3b686c5e",
        },
      ];

      const newClients: ClientsMap = {};

      for (const config of chainConfigs) {
        const nexusClient = createSmartAccountClient({
          account: await toNexusAccount({
            signer: account,
            chain: config.chain,
            transport: http(),
          }),
          transport: http(config.bundlerUrl),
          paymaster: createBicoPaymasterClient({
            paymasterUrl: config.paymasterUrl,
          }),
        });

        newClients[config.chain.id] = nexusClient;
      }

      setClients(newClients);
    } catch (err) {
      console.error("Error initializing smart account clients:", err);
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  };

  return { initializeClients };
};
