import { useState, useEffect } from "react";
import {
  parseUnits,
  formatUnits,
  Hex,
  Chain,
  isAddress,
  encodeFunctionData,
} from "viem";
import { BaseModule, moduleActivator, NexusClient } from "@biconomy/abstractjs";
import { getChainById, openTransactionExplorer } from "../utils/chains";
import { useERC20Balance } from "@/hooks/useBalanceErc20";
import { useAccountStore } from "@/store/accountStore";
import {
  toPasskeyValidator,
  toWebAuthnKey,
  WebAuthnMode,
} from "@biconomy/passkey";
import Faucet from "./Faucet";
import { SmartSessionClient } from "@/types";
import { WarningIcon } from "./Icons/WarningIcon";
import { SpinnerIcon } from "./Icons/SpinnerIcon";
import SignMessage from "./SignMessage";
import { waitForUserOperationReceipt } from "@/utils/biconomy";
import { useToast } from "@/providers/ToastContex";

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
  const [txLoading, setTxLoading] = useState<boolean>(false);
  const [txHash, setTxHash] = useState<string>("");
  const [recipientError, setRecipientError] = useState<string>("");
  const [amountError, setAmountError] = useState<string>("");
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [availableModules, setAvailableModules] = useState<Module[]>([]);
  const { showToast } = useToast();

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
      setAmountError(
        `Invalid amount format: ${
          typedError.message || JSON.stringify(typedError)
        }`
      );
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
    if (selectedModule.type === "passkey") {
      // Example of extending with session module (would need actual session data)
      let cachedWebAuthnKey = localStorage.getItem(`webAuthnKey_${chainId}`);

      if (!cachedWebAuthnKey) {
        console.error("no webauthn id in local");
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
    }
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
      const clientWithModule =
        (await getClientWithModule()) as SmartSessionClient;

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
      const transactionReceipt = await waitForUserOperationReceipt(
        client,
        hash
      );
      showToast("Sent transaction successfully", "success", 3000, () => {
        openTransactionExplorer(
          transactionReceipt?.receipt.transactionHash || client.account.address,
          chainId || 0
        );
      });
      // wait for receipt to be completed and include that in below state variable
      setTxHash(transactionReceipt?.receipt.transactionHash);
    } catch (error) {
      console.error("Error sending transaction:", error);
      showToast("Error sending transaction", "error");
    } finally {
      setTxLoading(false);
    }
  };

  if (!client) {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-900/20 p-6 rounded-xl shadow-md mt-8">
        <div className="flex items-center">
          <WarningIcon />
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
              <div className="select-container">
                <select
                  className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                  value={selectedModule?.address || ""}
                  onChange={(e) => {
                    const selected = availableModules.find(
                      (m) => m.address === e.target.value
                    );
                    if (selected) setSelectedModule(selected);
                  }}
                >
                  {availableModules.map((module) => (
                    <option key={module.address} value={module.address}>
                      {module.name}
                    </option>
                  ))}
                </select>
              </div>
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
                  <SpinnerIcon className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
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
        <SignMessage chainId={chainId} client={client} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md transition-all hover:shadow-lg">
          <Faucet />
        </div>
      </div>
    </>
  );
}
