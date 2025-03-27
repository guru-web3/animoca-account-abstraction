import { useCallback, useEffect, useState } from "react";
import { useAccountStore } from "../store/accountStore";
import { ClientsMap, DeploymentStatus } from "../types";
import { supportedChains } from "../utils/chains";
import { zeroAddress } from "viem";
import SmartAccountUpgrader from "./SmartAccountUpgrade";

interface DeploymentManagerProps {
  clients: ClientsMap;
}

export default function DeploymentManager({ clients }: DeploymentManagerProps) {
  const { deployedChains, updateDeployedChains } = useAccountStore();
  const [selectedChains, setSelectedChains] = useState<number[]>([]);
  const [deployLoading, setDeployLoading] = useState<boolean>(false);
  const [deploymentStatus, setDeploymentStatus] = useState<string>("");

  const toggleChainSelection = (chainId: number) => {
    setSelectedChains((prev) =>
      prev.includes(chainId)
        ? prev.filter((id) => id !== chainId)
        : [...prev, chainId]
    );
  };

  const deployAccounts = async () => {
    if (selectedChains.length === 0) {
      setDeploymentStatus("Please select at least one chain");
      return;
    }

    setDeployLoading(true);
    setDeploymentStatus("Deploying accounts...");

    for (const chainId of selectedChains) {
      const client = clients[chainId];
      if (!client) {
        console.error(`No client found for chain ID ${chainId}`);
        continue;
      }

      try {
        // Check if already deployed
        const isDeployed = await client.account.isDeployed();
        if (isDeployed) {
          console.log(`Account already deployed on chain ${chainId}`);
          return;
        }

        // Deploy the account with a zero-address transaction
        const tx = await client.sendUserOperation({
          calls: [
            {
              to: zeroAddress,
              value: BigInt(0),
              data: "0x",
            },
          ],
        });

        // Wait for transaction receipt
        const receipt = await client.waitForUserOperationReceipt({ hash: tx });

        console.log(
          `Account deployed on chain ${chainId}. Transaction hash: ${receipt.receipt.transactionHash}`
        );

        // Update deployment status
        const updatedDeployedChains = [...deployedChains];
        const index = updatedDeployedChains.findIndex(
          (c) => c.chainId === chainId
        );
        if (index >= 0) {
          updatedDeployedChains[index] = {
            ...updatedDeployedChains[index],
            isDeployed: true,
            address: await client.account.getAddress(),
          };
        } else {
          updatedDeployedChains.push({
            chainId,
            chainName:
              supportedChains.find((c) => c.id === chainId)?.name ||
              `Chain ${chainId}`,
            isDeployed: true,
            address: await client.account.getAddress(),
          });
        }
        updateDeployedChains(updatedDeployedChains);
      } catch (error) {
        console.error(`Error deploying on chain ${chainId}:`, error);
      }
    }

    setDeploymentStatus("Deployment completed");
    setDeployLoading(false);
  };

  const fetchInit = useCallback(async () => {
    try {
      const deploymentPromises = supportedChains.map(async (chain) => {
        const client = clients[chain.id];
        if (!client) return null;

        try {
          // Check if already deployed
          const isDeployed = await client.account.isDeployed();
          if (isDeployed) {
            return {
              chainId: chain.id,
              chainName:
                supportedChains.find((c) => c.id === chain.id)?.name ||
                `Chain ${chain.id}`,
              isDeployed: isDeployed,
              address: await client.account.getAddress(),
            };
          }
          return {
            chainId: chain.id,
            chainName:
              supportedChains.find((c) => c.id === chain.id)?.name ||
              `Chain ${chain.id}`,
            isDeployed: isDeployed || false,
            address: await client.account.getAddress(),
          };
        } catch (error) {
          console.error(`Error deploying on chain ${chain.id}:`, error);
          return {
            chainId: chain.id,
            chainName:
              supportedChains.find((c) => c.id === chain.id)?.name ||
              `Chain ${chain.id}`,
            isDeployed: false,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      });

      const results = await Promise.all(deploymentPromises);
      const validResults = results.filter(Boolean) as DeploymentStatus[];

      // Update deployed chains in store
      const updatedDeployedChains = [...deployedChains];

      for (const result of validResults) {
        const index = updatedDeployedChains.findIndex(
          (c) => c.chainId === result.chainId
        );
        if (index >= 0) {
          updatedDeployedChains[index] = result;
        } else {
          updatedDeployedChains.push(result);
        }
      }

      updateDeployedChains(updatedDeployedChains);
      setDeploymentStatus("Deployment completed");

      // Clear selection
      setSelectedChains([]);
    } catch (error) {
      console.error("Error in deployment process:", error);
      setDeploymentStatus(
        `Deployment failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    } finally {
      setDeployLoading(false);
    }
  }, [clients, deployedChains, updateDeployedChains]); // Add all dependencies

  useEffect(() => {
    fetchInit();
  }, [clients]);

  return (
    <div className="mt-8">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
        <h2 className="text-xl font-bold mb-6 text-gray-800 dark:text-white">
          Deploy Smart Accounts
        </h2>

        <div className="mb-6">
          <h3 className="text-lg font-medium mb-3 text-gray-700 dark:text-gray-300">
            Select Chains
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {supportedChains.map((chain) => {
              const isDeployed = deployedChains.some(
                (c) => c.chainId === chain.id && c.isDeployed
              );

              return (
                <div
                  key={chain.id}
                  className={`p-4 rounded-lg border ${
                    isDeployed
                      ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800"
                      : selectedChains.includes(chain.id)
                      ? "bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800"
                      : "bg-gray-50 border-gray-200 dark:bg-gray-700 dark:border-gray-600"
                  }`}
                >
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id={`chain-${chain.id}`}
                      checked={selectedChains.includes(chain.id)}
                      onChange={() => toggleChainSelection(chain.id)}
                      disabled={isDeployed}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label
                      htmlFor={`chain-${chain.id}`}
                      className="ml-2 block text-sm text-gray-700 dark:text-gray-300"
                    >
                      {chain.name}
                    </label>

                    {isDeployed && (
                      <span className="ml-auto inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        Deployed
                      </span>
                    )}
                  </div>

                  {isDeployed && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {
                          deployedChains.find((c) => c.chainId === chain.id)
                            ?.address
                        }
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <button
            onClick={deployAccounts}
            disabled={deployLoading || selectedChains.length === 0}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {deployLoading ? (
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
                Deploying...
              </span>
            ) : (
              "Deploy Selected Accounts"
            )}
          </button>

          {deploymentStatus && (
            <p
              className={`text-sm ${
                deploymentStatus.includes("failed")
                  ? "text-red-600 dark:text-red-400"
                  : deploymentStatus.includes("completed")
                  ? "text-green-600 dark:text-green-400"
                  : "text-gray-600 dark:text-gray-400"
              }`}
            >
              {deploymentStatus}
            </p>
          )}
        </div>
      </div>

      <SmartAccountUpgrader clients={clients} />
    </div>
  );
}
