import React, { useState, useEffect, useCallback } from "react";
import {
  createPublicClient,
  encodeFunctionData,
  getAddress,
  Hex,
  http,
} from "viem";
import { NexusClient, NexusImplementationAbi } from "@biconomy/abstractjs";
import { supportedChains } from "../utils/chains";

interface SmartAccountUpgraderProps {
  clients: Record<number, NexusClient>;
}

const IMPLEMENTATION_ADDRESSES = {
  NEW: "0x000000aC74357BFEa72BBD0781833631F732cf19",
  OLD: "0x000000008761E87F023f65c49DC9cb1C7EdFEaaf",
};

export default function SmartAccountUpgrader({
  clients,
}: SmartAccountUpgraderProps) {
  const [upgradeStatus, setUpgradeStatus] = useState<Record<number, string>>(
    {}
  );
  const [currentImplementations, setCurrentImplementations] = useState<
    Record<number, string>
  >({});

  const fetchCurrentImplementations = useCallback(async () => {
    const implementations: Record<number, string> = {};
    for (const chain of supportedChains) {
      const client = clients[chain.id];
      if (client && (await client.account.isDeployed())) {
        try {
          const publicClient = createPublicClient({
            chain,
            transport: http(),
          });
          const result = await publicClient.readContract({
            address: client.account.address,
            abi: NexusImplementationAbi,
            functionName: "getImplementation",
            args: [],
          });
          const implementation = result;
          implementations[chain.id] = implementation;
        } catch (error) {
          console.error(
            `Error fetching implementation for chain ${chain.id}:`,
            error
          );
        }
      }
    }
    setCurrentImplementations(implementations);
  }, [clients]); // Add clients as dependency

  useEffect(() => {
    fetchCurrentImplementations();
  }, [fetchCurrentImplementations]); // Update dependency array


  const upgradeImplementation = async (chainId: number) => {
    const client = clients[chainId];
    if (!client) return;

    setUpgradeStatus((prev) => ({ ...prev, [chainId]: "Upgrading..." }));

    try {
      const currentImpl = currentImplementations[chainId];
      const newImpl =
        currentImpl === IMPLEMENTATION_ADDRESSES.NEW
          ? IMPLEMENTATION_ADDRESSES.OLD
          : IMPLEMENTATION_ADDRESSES.NEW;

      const calls = [
        {
          to: client.account.address,
          value: BigInt(0),
          data: encodeFunctionData({
            abi: [
              {
                name: "upgradeToAndCall",
                type: "function",
                stateMutability: "payable",
                inputs: [
                  { type: "address", name: "newImplementation" },
                  { type: "bytes", name: "data" },
                ],
                outputs: [],
              },
            ],
            functionName: "upgradeToAndCall",
            args: [getAddress(newImpl), "0x"],
          }),
        },
      ];

      const hash = await client.sendUserOperation({ calls });
      const receipt = await client.waitForUserOperationReceipt({
        hash: hash as Hex,
      });

      await fetchCurrentImplementations();
      setUpgradeStatus((prev) => ({
        ...prev,
        [chainId]: `Upgraded successfully. TX: ${receipt.receipt.transactionHash}`,
      }));
    } catch (error) {
      console.error(
        `Error upgrading implementation on chain ${chainId}:`,
        error
      );
      setUpgradeStatus((prev) => ({
        ...prev,
        [chainId]: `Upgrade failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      }));
    }
  };

  return (
    <div className="mt-8 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
      <h2 className="text-xl font-bold mb-6 text-gray-800 dark:text-white">
        Upgrade Smart Account Implementation
      </h2>
      <div className="space-y-4">
        {supportedChains.map((chain) => {
          const isDeployed = !!currentImplementations[chain.id];
          return (
            <div
              key={chain.id}
              className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-800 dark:text-white">
                    {chain.name}
                  </h3>
                  {isDeployed && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Current Implementation: {currentImplementations[chain.id]}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => upgradeImplementation(chain.id)}
                  disabled={!isDeployed}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDeployed ? "Upgrade Implementation" : "Not Deployed"}
                </button>
              </div>
              {upgradeStatus[chain.id] && (
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                  {upgradeStatus[chain.id]}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
