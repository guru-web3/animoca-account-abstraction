import { useState, useEffect } from "react";
import { MAINNET_ADDRESS_K1_VALIDATOR_ADDRESS, ModularSmartAccount, NexusClient, SMART_SESSIONS_ADDRESS } from "@biconomy/abstractjs";
import { useAccountStore } from "../store/accountStore";
import { Module } from "../types";
import { Chain, Client, Hex, Transport } from "viem";
import { waitForUserOperationReceipt } from "@/utils/biconomy";

// Define known module addresses and their details
const KNOWN_MODULES = {
  PASSKEY: {
    address: "0xD990393C670dCcE8b4d8F858FB98c9912dBFAa06" as Hex,
    name: "Passkey Module",
    description: "Enables passwordless authentication using passkeys",
  },
  SESSION: {
    address: SMART_SESSIONS_ADDRESS as Hex,
    name: "Smart Session Module",
    description: "Enables temporary session keys for improved UX" as Hex,
  },
  K1: {
    address: MAINNET_ADDRESS_K1_VALIDATOR_ADDRESS,
    name: "K1 Module",
    description: "Enables K1 keys for improved UX" as Hex,
  },
};

export const useModules = (
  client: NexusClient<
    Transport,
    Chain | undefined,
    ModularSmartAccount | undefined,
    Client | undefined,
    undefined
  > | null
) => {
  const [installedModules, setInstalledModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const { updateInstalledModules } = useAccountStore();

  const refreshModules = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  useEffect(() => {
    const fetchModules = async () => {
      if (!client) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const isDeployed = await client.account.isDeployed();
        if(isDeployed) {
          const moduleAddresses = await client.getInstalledValidators();
          const flatArray = moduleAddresses?.flat();
          const modules: Module[] = flatArray.map((address) => {
            if (address === KNOWN_MODULES.PASSKEY.address) {
              return KNOWN_MODULES.PASSKEY;
            } else if (address === KNOWN_MODULES.SESSION.address) {
              return KNOWN_MODULES.SESSION;
            } else if (address === KNOWN_MODULES.K1.address) {
              return KNOWN_MODULES.K1;
            } else {
              return {
                address: address,
                name: "Unknown Module",
                description: "Custom module",
              };
            }
          });
          setInstalledModules(modules);
          updateInstalledModules(modules);
        } else {
          setInstalledModules([]);
          updateInstalledModules([]);
        }
      } catch (error) {
        setInstalledModules([]);
        updateInstalledModules([]);
        console.error("Error fetching modules:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchModules();
  }, [client, refreshTrigger, updateInstalledModules]);

  const installModule = async (moduleAddress: Hex, initData: Hex) => {
    if (!client) return null;

    try {
      // Replace with actual module installation logic
      const userOpHash = await client.installModule({
        module: {
          address: moduleAddress,
          type: "validator",
          initData: initData,
        },
      });
      const transactionReceipt = await waitForUserOperationReceipt(client, userOpHash);
      refreshModules();
      return transactionReceipt;
    } catch (error) {
      console.error("Error installing module:", error);
      return null;
    }
  };

  const uninstallModule = async (moduleAddress: Hex) => {
    if (!client) return null;

    try {
      // Replace with actual module uninstallation logic
      const userOpHash = await client?.uninstallModule({
        module: {
          address: moduleAddress,
          type: "validator",
          deInitData: "0x",
        },
      });
      const transactionReceipt = await waitForUserOperationReceipt(client, userOpHash);
      refreshModules();
      return transactionReceipt;
    } catch (error) {
      console.error("Error uninstalling module:", error);
      return null;
    }
  };

  return {
    installedModules,
    loading,
    installModule,
    uninstallModule,
    refreshModules,
    KNOWN_MODULES,
  };
};
