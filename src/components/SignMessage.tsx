// src/components/SignMessage.tsx
import { useState } from "react";
import { createPublicClient, http } from "viem";
import { NexusClient } from "@biconomy/abstractjs";
import { getChainById } from "../utils/chains";
import { SpinnerIcon } from "./Icons/SpinnerIcon";
import { useToast } from "@/providers/ToastContex";

interface SignMessageProps {
  client: NexusClient | null;
  chainId: number;
}

export default function SignMessage({ client, chainId }: SignMessageProps) {
  const [message, setMessage] = useState<string>("");
  const [signature, setSignature] = useState<string>("");
  const [signLoading, setSignLoading] = useState<boolean>(false);
  const chainConfig = getChainById(chainId);
  const { showToast } = useToast();

  const handleSignMessage = async () => {
    if (!client || !message) return;

    setSignLoading(true);
    try {
      // Get client with appropriate module
      const clientWithModule = client as NexusClient;

      if (!clientWithModule) {
        showToast(`client is required for signing message}`, "error");
        return;
      }
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
      showToast("Sign Message Successfully", "success");
    } catch (error) {
      showToast(`Error signing message ${(error as Error).message || JSON.stringify(error)}`, "error");
    } finally {
      setSignLoading(false);
    }
  };

  return (
    <>
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md transition-all hover:shadow-lg">
        <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">
          Sign & Verify Message
        </h3>

        <div className="space-y-4">
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
                <SpinnerIcon className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
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
            </>
          )}
        </div>
      </div>
    </>
  );
}
