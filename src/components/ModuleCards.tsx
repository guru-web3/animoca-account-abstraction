import { useEffect, useState } from "react";
import { useModules } from "../hooks/useModules";
import { NexusClient, toSmartSessionsValidator } from "@biconomy/abstractjs";
import {
  toWebAuthnKey,
  toPasskeyValidator,
  WebAuthnMode,
} from "@biconomy/passkey";
import { privateKeyToAccount } from "viem/accounts";
import { waitForUserOperationReceipt } from "@/utils/biconomy";
import { SpinnerIcon } from "./Icons/SpinnerIcon";
import { PasskeyIcon } from "./Icons/PasskeyIcon";
import { SessionModuleIcon } from "./Icons/SessionModuleIcon";
import { useToast } from "@/providers/ToastContex";
import { openTransactionExplorer } from "@/utils/chains";
import { Hex } from "viem";

interface ModuleCardsProps {
  client: NexusClient | null;
}

export default function ModuleCards({ client }: ModuleCardsProps) {
  const {
    installedModules,
    loading,
    installModule,
    uninstallModule,
    KNOWN_MODULES,
    refreshModules,
  } = useModules(client);
  const { showToast } = useToast();
  const [chainId, setChainId] = useState<number>();

  useEffect(() => {
    const init = async() => {
      if (client) {
        const chainId = await client?.getChainId();
        setChainId(chainId);
        refreshModules();
      }
    }
    init();
  }, [client]);

  const [loadingPasskey, setLoadingPasskey] = useState<boolean>(false);
  const [loadingSession, setLoadingSession] = useState<boolean>(false);
  const [isPasskeyPresent, setIsPasskeyPresent] = useState<boolean>(true);

  const hasPasskeyModule = installedModules.some(
    (module) => module.address === KNOWN_MODULES.PASSKEY.address
  );
  const hasSessionModule = installedModules.some(
    (module) => module.address === KNOWN_MODULES.SESSION.address
  );

  const checkIfPasskeyExistsAndCreate = async (
    loginPasskey: boolean = false
  ) => {
    let cachedWebAuthnKey = localStorage.getItem(`webAuthnKey_${chainId}`);
    if (!cachedWebAuthnKey) {
      setIsPasskeyPresent(false);
    }
    if (!cachedWebAuthnKey && loginPasskey) {
      const reloadedKey = await toWebAuthnKey({
        passkeyName: `${client?.account.address}_${chainId}`,
        mode: WebAuthnMode.Login,
      });
      cachedWebAuthnKey = JSON.stringify({
        pubX: reloadedKey.pubX.toString(),
        pubY: reloadedKey.pubY.toString(),
        authenticatorId: reloadedKey.authenticatorId,
        authenticatorIdHash: reloadedKey.authenticatorIdHash,
      });
      localStorage.setItem(`webAuthnKey_${chainId}`, cachedWebAuthnKey);
      setIsPasskeyPresent(true);
      refreshModules();
    }
  };

  useEffect(() => {
    if (hasPasskeyModule && chainId) {
      checkIfPasskeyExistsAndCreate();
    }
  }, [hasPasskeyModule, chainId]);

  const registerPasskey = async () => {
    try {
      if (!client?.account.address) {
        console.error("Account address is needed");
        return;
      }
      const webAuthnKey = await toWebAuthnKey({
        passkeyName: `${client?.account.address}_${chainId}`,
        mode: WebAuthnMode.Register,
      });

      const passkeyValidator = await toPasskeyValidator({
        // @ts-expect-error Account type from client is not fully compatible with expected type
        account: client?.account,
        webAuthnKey,
      });

      const formattedWebAuthnKey = {
        pubX: webAuthnKey.pubX.toString(),
        pubY: webAuthnKey.pubY.toString(),
        authenticatorId: webAuthnKey.authenticatorId,
        authenticatorIdHash: webAuthnKey.authenticatorIdHash,
      };
      const txReceipt = await installModule(
        KNOWN_MODULES.PASSKEY.address,
        passkeyValidator?.initData || "0x"
      );
      console.log({txReceipt});

      // store webAuthnKey in localStorage
      localStorage.setItem(
        `webAuthnKey_${chainId}`,
        JSON.stringify(formattedWebAuthnKey)
      );
      showToast("Passkey module installed successfully", "success", 3000, () => {
        openTransactionExplorer(txReceipt?.receipt.transactionHash || client.account.address, chainId || 0)
      });

      // reInstallPasskeyValidator(passkeyValidator?.initData);
    } catch (error) {
      console.error("Error registering passkey:", error);
      showToast(`Error registering passkey ${(error as Error).message || JSON.stringify(error)}`, "error");
    } finally {
      // setIsLoading((prev) => ({ ...prev, register: false }));
    }
  };

  const installSmartSessionModule = async () => {
    try {
      if (!client || !client.account) {
        throw new Error("client not initialized");
      } else if(!process.env.NEXT_PUBLIC_SESSION_PRIVATE_KEY) {
        throw new Error("SESSION_PRIVATE_KEY not initialized");
      }
  
      const sessionKey = privateKeyToAccount(
        process.env.NEXT_PUBLIC_SESSION_PRIVATE_KEY as Hex
      );
      const sessionsModule = toSmartSessionsValidator({
        account: client.account,
        signer: sessionKey, // The session key granted permission
      });
      // Install the smart sessions module on the Nexus client's smart contract account
      const hash = await client.installModule({
        module: sessionsModule.moduleInitData,
      });
      localStorage.setItem(
        "sessionModule",
        JSON.stringify(sessionsModule?.moduleData)
      );
      const transactionReceipt = await waitForUserOperationReceipt(client, hash);
      showToast("Session module installed successfully", "success", 3000, () => {
        openTransactionExplorer(transactionReceipt?.receipt.transactionHash || client.account.address, chainId || 0)
      });
      refreshModules();
    } catch(error) {
      console.error("Error installing session module:", error);
      showToast(`Error installing session module ${(error as Error).message || JSON.stringify(error)}`, "error");
    }
  };

  const handlePasskeyModule = async () => {
    if (!client) return;

    setLoadingPasskey(true);
    try {
      if (hasPasskeyModule && !isPasskeyPresent) {
        await checkIfPasskeyExistsAndCreate(true);
      } else if (hasPasskeyModule) {
        const receipt = await uninstallModule(KNOWN_MODULES.PASSKEY.address);
        showToast("Passkey module Uninstalled successfully", "success", 3000, () => {
          openTransactionExplorer(receipt?.receipt.transactionHash || client.account.address, chainId || 0)
        });
      } else {
        await registerPasskey();
      }
    } catch (error) {
      console.error("Error managing passkey module:", error);
    } finally {
      setLoadingPasskey(false);
    }
  };

  const handleSessionModule = async () => {
    if (!client) return;

    setLoadingSession(true);
    try {
      if (hasSessionModule) {
        const receipt = await uninstallModule(KNOWN_MODULES.SESSION.address);
        showToast("Passkey module Uninstalled successfully", "success", 3000, () => {
          openTransactionExplorer(receipt?.receipt.transactionHash || client.account.address, chainId || 0)
        });
      } else {
        await installSmartSessionModule();
      }
    } catch (error) {
      console.error("Error managing session module:", error);
    } finally {
      setLoadingSession(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
      {/* passkey module */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md transition-transform duration-300 ease-in-out hover:scale-105">
        <div className="flex items-center mb-4">
          <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-full mr-4">
            <PasskeyIcon className="h-6 w-6 text-blue-600 dark:text-blue-300" />
          </div>
          <h3 className="text-xl font-bold text-gray-800 dark:text-white">
            Passkey Module
          </h3>
        </div>

        <p className="mb-6 text-gray-600 dark:text-gray-300">
          {hasPasskeyModule
            ? "Passkey module is installed. You can use passkeys for authentication."
            : "Install the passkey module to enable passwordless authentication."}
        </p>

        <button
          onClick={handlePasskeyModule}
          disabled={loadingPasskey || !client}
          className={`w-full py-3 px-4 rounded-lg font-medium transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 ${
            !isPasskeyPresent
              ? "bg-green-600 hover:bg-green-700 text-white focus:ring-green-500"
              : hasPasskeyModule
              ? "bg-red-600 hover:bg-red-700 text-white focus:ring-red-500"
              : "bg-green-600 hover:bg-green-700 text-white focus:ring-green-500"
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {loadingPasskey ? (
            <span className="flex items-center justify-center">
              <SpinnerIcon className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
              Processing...
            </span>
          ) : !isPasskeyPresent ? (
            "Login With Passkey"
          ) : hasPasskeyModule ? (
            "Uninstall Module"
          ) : (
            "Install Module"
          )}
        </button>
      </div>

      {/* session module */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md transition-transform duration-300 ease-in-out hover:scale-105">
        <div className="flex items-center mb-4">
          <div className="bg-purple-100 dark:bg-purple-900 p-3 rounded-full mr-4">
            <SessionModuleIcon className="h-6 w-6 text-purple-600 dark:text-purple-300" />
          </div>
          <h3 className="text-xl font-bold text-gray-800 dark:text-white">
            Smart Session Module
          </h3>
        </div>

        <p className="mb-6 text-gray-600 dark:text-gray-300">
          {hasSessionModule
            ? "Smart Session module is installed. You can create temporary sessions."
            : "Install the Smart Session module to enable temporary session keys."}
        </p>

        <button
          onClick={handleSessionModule}
          disabled={loadingSession || !client}
          className={`w-full py-3 px-4 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
            hasSessionModule
              ? "bg-red-600 hover:bg-red-700 text-white focus:ring-red-500"
              : "bg-green-600 hover:bg-green-700 text-white focus:ring-green-500"
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {loadingSession ? (
            <span className="flex items-center justify-center">
              <SpinnerIcon className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
              Processing...
            </span>
          ) : hasSessionModule ? (
            "Uninstall Module"
          ) : (
            "Install Module"
          )}
        </button>
      </div>
    </div>
  );
}
