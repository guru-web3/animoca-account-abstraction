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

  useEffect(() => {
    if (client) {
      refreshModules();
    }
  }, [client, refreshModules]);

  const [loadingPasskey, setLoadingPasskey] = useState<boolean>(false);
  const [loadingSession, setLoadingSession] = useState<boolean>(false);

  const hasPasskeyModule = installedModules.some(
    (module) => module.address === KNOWN_MODULES.PASSKEY.address
  );
  const hasSessionModule = installedModules.some(
    (module) => module.address === KNOWN_MODULES.SESSION.address
  );

  const registerPasskey = async () => {
    try {
      if(!client?.account.address) {
        console.error("Account address is needed");
        return ;
      }
      const webAuthnKey = await toWebAuthnKey({
        passkeyName: client?.account.address,
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
      await installModule(
        KNOWN_MODULES.PASSKEY.address,
        passkeyValidator?.initData || "0x"
      );

      const chainId = await client?.getChainId();
      // store webAuthnKey in localStorage
      localStorage.setItem(`webAuthnKey_${chainId}`, JSON.stringify(formattedWebAuthnKey));

      // toast.success(`Using passkey for ${passkeyName}`, {
      //   position: "bottom-right",
      // });

      // reInstallPasskeyValidator(passkeyValidator?.initData);
    } catch (error) {
      console.error("Error registering passkey:", error);
    } finally {
      // setIsLoading((prev) => ({ ...prev, register: false }));
    }
  };

  const installSmartSessionModule = async() => {
    if(!client || !client.account) {
      throw new Error("client not initialized")
    }
    
    const sessionKey = privateKeyToAccount("0x6f13f1ce2e98994e4bec67a9731b86acf08eda789dd686c8b77deb0f2155f396");;
    const sessionsModule = toSmartSessionsValidator({
      account: client.account,
      signer: sessionKey, // The session key granted permission
    });
    // Install the smart sessions module on the Nexus client's smart contract account
    const hash = await client.installModule({
      module: sessionsModule.moduleInitData
    })
    localStorage.setItem("sessionModule", JSON.stringify(sessionsModule?.moduleData));
    const transactionReceipt = await waitForUserOperationReceipt(client, hash);
    console.log({transactionReceipt});
    refreshModules();
  }

  const handlePasskeyModule = async () => {
    if (!client) return;

    setLoadingPasskey(true);
    try {
      if (hasPasskeyModule) {
        await uninstallModule(KNOWN_MODULES.PASSKEY.address);
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
        await uninstallModule(KNOWN_MODULES.SESSION.address);
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
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md transition-all hover:shadow-lg">
        <div className="flex items-center mb-4">
          <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-full mr-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-blue-600 dark:text-blue-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
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
          disabled={
            loadingPasskey || !client
          }
          className={`w-full py-3 px-4 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
            hasPasskeyModule
              ? "bg-red-600 hover:bg-red-700 text-white focus:ring-red-500"
              : "bg-green-600 hover:bg-green-700 text-white focus:ring-green-500"
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {loadingPasskey ? (
            <span className="flex items-center justify-center">
              <svg
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Processing...
            </span>
          ) : hasPasskeyModule ? (
            "Uninstall Module"
          ) : (
            <>Install Module</>
          )}
        </button>
      </div>

      {/* session module */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md transition-all hover:shadow-lg">
        <div className="flex items-center mb-4">
          <div className="bg-purple-100 dark:bg-purple-900 p-3 rounded-full mr-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-purple-600 dark:text-purple-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
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
              <svg
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
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
