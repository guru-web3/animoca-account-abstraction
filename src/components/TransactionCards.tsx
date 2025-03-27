// src/components/TransactionCards.tsx
import { useState, useEffect } from "react";
import {
  parseUnits,
  formatUnits,
  Hex,
  Chain,
  isAddress,
  encodeFunctionData,
  toHex,
  createPublicClient,
  http,
} from "viem";
import {
  BaseModule,
  moduleActivator,
  NexusClient,
  smartSessionUseActions,
  toSmartSessionsValidator,
} from "@biconomy/abstractjs";
import { getChainById } from "../utils/chains";
import { useERC20Balance } from "@/hooks/useBalanceErc20";
import { useAccountStore } from "@/store/accountStore";
import {
  toPasskeyValidator,
  toWebAuthnKey,
  WebAuthnMode,
} from "@biconomy/passkey";
import { privateKeyToAccount } from "viem/accounts";
import Faucet from "./Faucet";
import { SmartSessionClient } from "@/types";

interface TransactionCardsProps {
  client: NexusClient | null;
  chainId: number;
  address: Hex | null;
}

interface Module {
  name: string;
  address: string;
  type: "passkey" | "session" | "k1" | "other";
}

export default function TransactionCards({
  client,
  chainId,
  address,
}: TransactionCardsProps) {
  const [recipient, setRecipient] = useState<string>(address || "");
  const [amount, setAmount] = useState<string>("0.01");
  const [message, setMessage] = useState<string>("");
  const [signature, setSignature] = useState<string>("");
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const [txLoading, setTxLoading] = useState<boolean>(false);
  const [signLoading, setSignLoading] = useState<boolean>(false);
  const [verifyLoading, setVerifyLoading] = useState<boolean>(false);
  const [txHash, setTxHash] = useState<string>("");
  const [recipientError, setRecipientError] = useState<string>("");
  const [amountError, setAmountError] = useState<string>("");
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [availableModules, setAvailableModules] = useState<Module[]>([]);

  const { installedModules } = useAccountStore();
  const [formattedBalance, setFormattedBalance] = useState("0");
  const chainConfig = getChainById(chainId);
  const usdcAddress = chainConfig?.usdcAddress || "";
  const { balance } = useERC20Balance({
    chain: chainConfig as Chain,
    tokenAddress: chainConfig?.usdcAddress || "0x",
    address: address || "0x",
  });

  // Validate recipient address when it changes
  useEffect(() => {
    if (!recipient) {
      setRecipientError("");
      return;
    }

    if (!isAddress(recipient)) {
      setRecipientError("Invalid Ethereum address");
    } else {
      setRecipientError("");
    }
  }, [recipient]);

  // Validate amount when it changes
  useEffect(() => {
    if (!amount) {
      setAmountError("");
      return;
    }

    try {
      const amountValue = parseFloat(amount);
      if (isNaN(amountValue) || amountValue <= 0) {
        setAmountError("Amount must be a positive number");
        return;
      }

      const amountInWei = parseUnits(amount, 6);
      if (balance && amountInWei > balance) {
        setAmountError("Insufficient balance");
      } else {
        setAmountError("");
      }
    } catch (error) {
      const typedError = error as Error;
      setAmountError(`Invalid amount format: ${typedError.message || JSON.stringify(typedError)}`);
    }
  }, [amount, balance]);

  // Set up available modules
  useEffect(() => {
    if (!installedModules || installedModules.length === 0) {
      // Default to K1 validation if no modules installed
      return;
    }

    const modules: Module[] = installedModules.map((module) => {
      // Determine module type based on name or address pattern
      let type: "passkey" | "session" | "k1" | "other" = "other";
      if (module.name.toLowerCase().includes("passkey")) {
        type = "passkey";
      } else if (module.name.toLowerCase().includes("session")) {
        type = "session";
      } else if (
        module.name.toLowerCase().includes("k1") ||
        module.name.toLowerCase().includes("ecdsa")
      ) {
        type = "k1";
      }

      return {
        name: module.name,
        address: module.address,
        type,
      };
    });

    setAvailableModules(modules);

    // Set default selected module (passkey if available, otherwise k1)
    const passkeyModule = modules.find((m) => m.type === "passkey");
    const k1Module = modules.find((m) => m.type === "k1");

    setSelectedModule(passkeyModule || k1Module || modules[0]);
  }, [installedModules]);

  useEffect(() => {
    const fetchBalance = async () => {
      if (!client || !usdcAddress || !balance) return;
      try {
        setFormattedBalance(formatUnits(balance, 6)); // USDC has 6 decimals
      } catch (error) {
        console.error("Error fetching balance:", error);
      }
    };

    if (client) {
      fetchBalance();
      const interval = setInterval(fetchBalance, 15000);
      return () => clearInterval(interval);
    }
  }, [client, usdcAddress, balance]);

  const getClientWithModule = async () => {
    if (!client || !selectedModule) return client;

    // For now, we're just returning the original client for K1 validation
    // For other modules, we would extend the client with the appropriate module
    if (selectedModule.type === "session") {
      // Example of extending with session module (would need actual session data)
      const sessionKey = privateKeyToAccount(
        "0x6f13f1ce2e98994e4bec67a9731b86acf08eda789dd686c8b77deb0f2155f396"
      );

      const sessionValidator = toSmartSessionsValidator({
        account: client.account,
        signer: sessionKey,
        // moduleData: moduleData,
      });
      const sessionClient = client.extend(
        smartSessionUseActions(sessionValidator)
      );
      return sessionClient;
    } else if (selectedModule.type === "passkey") {
      // Example of extending with session module (would need actual session data)
      let cachedWebAuthnKey = localStorage.getItem(`webAuthnKey_${chainId}`);

      if (!cachedWebAuthnKey) {
        console.error("no webauthn id in local");
        const reloadedKey = await toWebAuthnKey({
          passkeyName: client.account.address,
          mode: WebAuthnMode.Login,
        });
        cachedWebAuthnKey = JSON.stringify({
          pubX: reloadedKey.pubX.toString(),
          pubY: reloadedKey.pubY.toString(),
          authenticatorId: reloadedKey.authenticatorId,
          authenticatorIdHash: reloadedKey.authenticatorIdHash,
        });
        localStorage.setItem(
          `webAuthnKey_${chainId}`,
          cachedWebAuthnKey
        );
      }
      const deFormattedWebAuthnKey = {
        pubX: BigInt(JSON.parse(cachedWebAuthnKey).pubX),
        pubY: BigInt(JSON.parse(cachedWebAuthnKey).pubY),
        authenticatorId: JSON.parse(cachedWebAuthnKey).authenticatorId,
        authenticatorIdHash: JSON.parse(cachedWebAuthnKey).authenticatorIdHash,
      };
      const passkeyValidator = await toPasskeyValidator({
        // @ts-expect-error Account type from client is not fully compatible with expected type
        account: client?.account,
        webAuthnKey: deFormattedWebAuthnKey,
      });
      return client.extend(moduleActivator(passkeyValidator as BaseModule));
      return client;
    }

    // For passkey and k1, we use the default client
    return client;
  };

  const handleSendTransaction = async () => {
    if (!client || !recipient || !amount) return;
    if (recipientError || amountError) return;

    setTxLoading(true);
    try {
      // Convert amount to proper units (USDC has 6 decimals)
      const amountInWei = parseUnits(amount, 6);

      // Get client with appropriate module
      const clientWithModule = await getClientWithModule() as SmartSessionClient;

      if (!clientWithModule) {
        throw new Error("client is required for sending userops");
      }
      // Send transaction
      const hash = await clientWithModule.sendUserOperation({
        calls: [
          {
            to: usdcAddress as Hex,
            data: encodeFunctionData({
              abi: [
                {
                  name: "transfer",
                  type: "function",
                  inputs: [
                    { name: "to", type: "address" },
                    { name: "value", type: "uint256" },
                  ],
                  outputs: [{ type: "bool" }],
                  stateMutability: "nonpayable",
                },
              ],
              functionName: "transfer",
              args: [recipient as Hex, amountInWei],
            }),
            value: BigInt(0),
          },
        ],
      });

      // wait for receipt to be completed and include that in below state variable
      setTxHash(hash);
      // Reset form
      setAmount("");
      setRecipient("");
    } catch (error) {
      console.error("Error sending transaction:", error);
    } finally {
      setTxLoading(false);
    }
  };

  const handleSignMessage = async () => {
    if (!client || !message) return;

    setSignLoading(true);
    try {
      // Get client with appropriate module
      const clientWithModule = (await getClientWithModule()) as NexusClient;

      if (!clientWithModule) {
        throw new Error("client is required for signing message");
      }
      console.log("hi", toHex(message));
      // Sign message
      console.log("modules", await clientWithModule.getInstalledValidators());
      const sig = await clientWithModule.signMessage({
        message: message,
      });

      const publicClient = createPublicClient({
        chain: chainConfig,
        transport: http(),
      });
      const valid = await publicClient.verifyMessage({
        address: client.account.address,
        message: message,
        signature: sig,
      });
      console.log({ valid });

      setSignature(sig);
      setIsVerified(null);
    } catch (error) {
      console.error("Error signing message:", error);
    } finally {
      setSignLoading(false);
    }
  };

  const handleVerifySignature = async () => {
    if (!client || !message || !signature) return;

    // client.account.isv
    setVerifyLoading(true);
    try {
      // Verify signature
      // todo: fix this validation
      //   const isValid = await client.isvalid({
      //     message,
      //     signature,
      //   });
      const isValid = true;

      setIsVerified(isValid);
    } catch (error) {
      console.error("Error verifying signature:", error);
      setIsVerified(false);
    } finally {
      setVerifyLoading(false);
    }
  };

  if (!client) {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-900/20 p-6 rounded-xl shadow-md mt-8">
        <div className="flex items-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6 text-yellow-500 mr-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <p className="text-gray-700 dark:text-gray-300">
            Please connect your account first to perform transactions.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md transition-all hover:shadow-lg">
          <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">
            Send USDC
          </h3>

          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-300">
                Your USDC Balance:
              </span>
              <span className="text-lg font-semibold text-gray-800 dark:text-white">
                {formattedBalance}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Validation Module
              </label>
              <select
                value={selectedModule?.address || ""}
                onChange={(e) => {
                  const selected = availableModules.find(
                    (m) => m.address === e.target.value
                  );
                  if (selected) setSelectedModule(selected);
                }}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                {availableModules.map((module) => (
                  <option key={module.address} value={module.address}>
                    {module.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Recipient Address
              </label>
              <input
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="0x..."
                className={`w-full px-4 py-3 rounded-lg border ${
                  recipientError ? "border-red-500" : "border-gray-300"
                } focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors dark:bg-gray-700 dark:border-gray-600 dark:text-white`}
              />
              {recipientError && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {recipientError}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Amount (USDC)
              </label>
              <input
                type="text"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.01"
                className={`w-full px-4 py-3 rounded-lg border ${
                  amountError ? "border-red-500" : "border-gray-300"
                } focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors dark:bg-gray-700 dark:border-gray-600 dark:text-white`}
              />
              {amountError && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {amountError}
                </p>
              )}
            </div>

            <button
              onClick={handleSendTransaction}
              disabled={
                txLoading ||
                !recipient ||
                !amount ||
                !!recipientError ||
                !!amountError
              }
              className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {txLoading ? (
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
              ) : (
                "Send USDC"
              )}
            </button>
          </div>

          {txHash && (
            <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Transaction sent successfully!
              </p>
              <div className="mt-2 flex items-center">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mr-2">
                  TX Hash:
                </span>
                <a
                  href={`https://sepolia.basescan.org/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 truncate"
                >
                  {txHash}
                </a>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md transition-all hover:shadow-lg">
          <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">
            Sign & Verify Message
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Validation Module
              </label>
              <select
                value={selectedModule?.address || ""}
                onChange={(e) => {
                  const selected = availableModules.find(
                    (m) => m.address === e.target.value
                  );
                  if (selected) setSelectedModule(selected);
                }}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                {availableModules.map((module) => (
                  <option key={module.address} value={module.address}>
                    {module.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Message to Sign
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Enter a message to sign..."
                rows={3}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>

            <button
              onClick={handleSignMessage}
              disabled={signLoading || !message}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {signLoading ? (
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
                  Signing...
                </span>
              ) : (
                "Sign Message"
              )}
            </button>

            {signature && (
              <>
                <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Signature:
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 break-all font-mono">
                    {signature}
                  </p>
                </div>

                <button
                  onClick={handleVerifySignature}
                  disabled={verifyLoading || !signature}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {verifyLoading ? (
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
                      Verifying...
                    </span>
                  ) : (
                    "Verify Signature"
                  )}
                </button>

                {isVerified !== null && (
                  <div
                    className={`mt-4 p-4 rounded-lg ${
                      isVerified
                        ? "bg-green-50 dark:bg-green-900/20"
                        : "bg-red-50 dark:bg-red-900/20"
                    }`}
                  >
                    <div className="flex items-center">
                      {isVerified ? (
                        <>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5 text-green-500 mr-2"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                              clipRule="evenodd"
                            />
                          </svg>
                          <p className="text-green-700 dark:text-green-400">
                            Signature is valid!
                          </p>
                        </>
                      ) : (
                        <>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5 text-red-500 mr-2"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                              clipRule="evenodd"
                            />
                          </svg>
                          <p className="text-red-700 dark:text-red-400">
                            Signature is invalid!
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md transition-all hover:shadow-lg">
          <Faucet />
        </div>
      </div>
    </>
  );
}

// // src/components/TransactionCards.tsx
// import { useState, useEffect } from "react";
// import { parseUnits, formatUnits, Hex, Chain } from "viem";
// import { NexusClient } from "@biconomy/abstractjs";
// import { getChainById } from "../utils/chains";
// import { useERC20Balance } from "@/hooks/useBalanceErc20";

// interface TransactionCardsProps {
//   client: NexusClient | null;
//   chainId: number;
//   address: Hex | null;
// }

// export default function TransactionCards({
//   client,
//   chainId,
//   address,
// }: TransactionCardsProps) {
//   const [recipient, setRecipient] = useState<string>("");
//   const [amount, setAmount] = useState<string>("");
//   const [message, setMessage] = useState<string>("");
//   const [signature, setSignature] = useState<string>("");
//   const [isVerified, setIsVerified] = useState<boolean | null>(null);
//   const [txLoading, setTxLoading] = useState<boolean>(false);
//   const [signLoading, setSignLoading] = useState<boolean>(false);
//   const [verifyLoading, setVerifyLoading] = useState<boolean>(false);
//   const [txHash, setTxHash] = useState<string>("");

//   const [formattedBalance, setFormattedBalance] = useState("0");
//   const chainConfig = getChainById(chainId);
//   const usdcAddress = chainConfig?.usdcAddress || "";
//   const { balance } = useERC20Balance({
//     chain: chainConfig as Chain,
//     tokenAddress: chainConfig?.usdcAddress!!,
//     address: address!!,
//   });

//   useEffect(() => {
//     const fetchBalance = async () => {
//       if (!client || !usdcAddress || !balance) return;
//       try {
//         setFormattedBalance(formatUnits(balance, 6)); // USDC has 6 decimals
//       } catch (error) {
//         console.error("Error fetching balance:", error);
//       }
//     };

//     if (client) {
//       fetchBalance();
//       const interval = setInterval(fetchBalance, 15000);
//       return () => clearInterval(interval);
//     }
//   }, [client, usdcAddress, balance]);

//   const handleSendTransaction = async () => {
//     if (!client || !recipient || !amount) return;

//     setTxLoading(true);
//     try {
//       // Convert amount to proper units (USDC has 6 decimals)
//       const amountInWei = parseUnits(amount, 6);

//       // Send transaction
//       const hash = await client.sendUserOperation({
//         calls: [
//           {
//             to: usdcAddress as Hex,
//             data: ("0xa9059cbb" + // transfer function selector
//               recipient.slice(2).padStart(64, "0") + // recipient address
//               amountInWei.toString(16).padStart(64, "0")) as Hex, // amount in hex
//             value: BigInt(0),
//           },
//         ],
//       });

//       setTxHash(hash);
//       // Reset form
//       setAmount("");
//       setRecipient("");
//     } catch (error) {
//       console.error("Error sending transaction:", error);
//     } finally {
//       setTxLoading(false);
//     }
//   };

//   const handleSignMessage = async () => {
//     if (!client || !message) return;

//     setSignLoading(true);
//     try {
//       // Sign message
//       const sig = await client.signMessage({
//         message,
//       });

//       setSignature(sig);
//       setIsVerified(null);
//     } catch (error) {
//       console.error("Error signing message:", error);
//     } finally {
//       setSignLoading(false);
//     }
//   };

//   const handleVerifySignature = async () => {
//     if (!client || !message || !signature) return;

//     setVerifyLoading(true);
//     try {
//       // Verify signature
//       // todo: fix this validation
//       //   const isValid = await client.isvalid({
//       //     message,
//       //     signature,
//       //   });
//       const isValid = true;

//       setIsVerified(isValid);
//     } catch (error) {
//       console.error("Error verifying signature:", error);
//       setIsVerified(false);
//     } finally {
//       setVerifyLoading(false);
//     }
//   };

//   if (!client) {
//     return (
//       <div className="bg-yellow-50 dark:bg-yellow-900/20 p-6 rounded-xl shadow-md mt-8">
//         <div className="flex items-center">
//           <svg
//             xmlns="http://www.w3.org/2000/svg"
//             className="h-6 w-6 text-yellow-500 mr-3"
//             fill="none"
//             viewBox="0 0 24 24"
//             stroke="currentColor"
//           >
//             <path
//               strokeLinecap="round"
//               strokeLinejoin="round"
//               strokeWidth={2}
//               d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
//             />
//           </svg>
//           <p className="text-gray-700 dark:text-gray-300">
//             Please connect your account first to perform transactions.
//           </p>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
//       <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md transition-all hover:shadow-lg">
//         <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">
//           Send USDC
//         </h3>

//         <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
//           <div className="flex justify-between items-center">
//             <span className="text-gray-600 dark:text-gray-300">
//               Your USDC Balance:
//             </span>
//             <span className="text-lg font-semibold text-gray-800 dark:text-white">
//               {formattedBalance}
//             </span>
//           </div>
//         </div>

//         <div className="space-y-4">
//           <div>
//             <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
//               Recipient Address
//             </label>
//             <input
//               type="text"
//               value={recipient}
//               onChange={(e) => setRecipient(e.target.value)}
//               placeholder="0x..."
//               className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors dark:bg-gray-700 dark:border-gray-600 dark:text-white"
//             />
//           </div>

//           <div>
//             <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
//               Amount (USDC)
//             </label>
//             <input
//               type="text"
//               value={amount}
//               onChange={(e) => setAmount(e.target.value)}
//               placeholder="0.01"
//               className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors dark:bg-gray-700 dark:border-gray-600 dark:text-white"
//             />
//           </div>

//           <button
//             onClick={handleSendTransaction}
//             disabled={txLoading || !recipient || !amount}
//             className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
//           >
//             {txLoading ? (
//               <span className="flex items-center justify-center">
//                 <svg
//                   className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
//                   xmlns="http://www.w3.org/2000/svg"
//                   fill="none"
//                   viewBox="0 0 24 24"
//                 >
//                   <circle
//                     className="opacity-25"
//                     cx="12"
//                     cy="12"
//                     r="10"
//                     stroke="currentColor"
//                     strokeWidth="4"
//                   ></circle>
//                   <path
//                     className="opacity-75"
//                     fill="currentColor"
//                     d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
//                   ></path>
//                 </svg>
//                 Processing...
//               </span>
//             ) : (
//               "Send USDC"
//             )}
//           </button>
//         </div>

//         {txHash && (
//           <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
//             <p className="text-sm text-gray-700 dark:text-gray-300">
//               Transaction sent successfully!
//             </p>
//             <div className="mt-2 flex items-center">
//               <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mr-2">
//                 TX Hash:
//               </span>
//               <a
//                 href={`https://sepolia.basescan.org/tx/${txHash}`}
//                 target="_blank"
//                 rel="noopener noreferrer"
//                 className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 truncate"
//               >
//                 {txHash}
//               </a>
//             </div>
//           </div>
//         )}
//       </div>

//       <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md transition-all hover:shadow-lg">
//         <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">
//           Sign & Verify Message
//         </h3>

//         <div className="space-y-4">
//           <div>
//             <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
//               Message to Sign
//             </label>
//             <textarea
//               value={message}
//               onChange={(e) => setMessage(e.target.value)}
//               placeholder="Enter a message to sign..."
//               rows={3}
//               className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors dark:bg-gray-700 dark:border-gray-600 dark:text-white"
//             />
//           </div>

//           <button
//             onClick={handleSignMessage}
//             disabled={signLoading || !message}
//             className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
//           >
//             {signLoading ? (
//               <span className="flex items-center justify-center">
//                 <svg
//                   className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
//                   xmlns="http://www.w3.org/2000/svg"
//                   fill="none"
//                   viewBox="0 0 24 24"
//                 >
//                   <circle
//                     className="opacity-25"
//                     cx="12"
//                     cy="12"
//                     r="10"
//                     stroke="currentColor"
//                     strokeWidth="4"
//                   ></circle>
//                   <path
//                     className="opacity-75"
//                     fill="currentColor"
//                     d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
//                   ></path>
//                 </svg>
//                 Signing...
//               </span>
//             ) : (
//               "Sign Message"
//             )}
//           </button>

//           {signature && (
//             <>
//               <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
//                 <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
//                   Signature:
//                 </p>
//                 <p className="text-xs text-gray-600 dark:text-gray-400 break-all font-mono">
//                   {signature}
//                 </p>
//               </div>

//               <button
//                 onClick={handleVerifySignature}
//                 disabled={verifyLoading || !signature}
//                 className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
//               >
//                 {verifyLoading ? (
//                   <span className="flex items-center justify-center">
//                     <svg
//                       className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
//                       xmlns="http://www.w3.org/2000/svg"
//                       fill="none"
//                       viewBox="0 0 24 24"
//                     >
//                       <circle
//                         className="opacity-25"
//                         cx="12"
//                         cy="12"
//                         r="10"
//                         stroke="currentColor"
//                         strokeWidth="4"
//                       ></circle>
//                       <path
//                         className="opacity-75"
//                         fill="currentColor"
//                         d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
//                       ></path>
//                     </svg>
//                     Verifying...
//                   </span>
//                 ) : (
//                   "Verify Signature"
//                 )}
//               </button>

//               {isVerified !== null && (
//                 <div
//                   className={`mt-4 p-4 rounded-lg ${
//                     isVerified
//                       ? "bg-green-50 dark:bg-green-900/20"
//                       : "bg-red-50 dark:bg-red-900/20"
//                   }`}
//                 >
//                   <div className="flex items-center">
//                     {isVerified ? (
//                       <>
//                         <svg
//                           xmlns="http://www.w3.org/2000/svg"
//                           className="h-5 w-5 text-green-500 mr-2"
//                           viewBox="0 0 20 20"
//                           fill="currentColor"
//                         >
//                           <path
//                             fillRule="evenodd"
//                             d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
//                             clipRule="evenodd"
//                           />
//                         </svg>
//                         <p className="text-green-700 dark:text-green-400">
//                           Signature is valid!
//                         </p>
//                       </>
//                     ) : (
//                       <>
//                         <svg
//                           xmlns="http://www.w3.org/2000/svg"
//                           className="h-5 w-5 text-red-500 mr-2"
//                           viewBox="0 0 20 20"
//                           fill="currentColor"
//                         >
//                           <path
//                             fillRule="evenodd"
//                             d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
//                             clipRule="evenodd"
//                           />
//                         </svg>
//                         <p className="text-red-700 dark:text-red-400">
//                           Signature is invalid!
//                         </p>
//                       </>
//                     )}
//                   </div>
//                 </div>
//               )}
//             </>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }
