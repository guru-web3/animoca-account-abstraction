import { useEffect, useState } from "react";
import type { Address, Chain } from "viem";
import { createPublicClient, erc20Abi, http } from "viem";
import type { MultichainToken } from "@biconomy/abstractjs";
import { watchBlockNumber } from "viem/actions";

interface UseERC20BalanceProps {
  address?: Address;
  tokenAddress: Address;
  chain: Chain;
}

export type BalancePayload = {
  balance: bigint | undefined;
  isLoading: boolean;
  error: Error | null;
  chain: Chain;
  symbol: string;
  decimals: number;
};

export function useERC20Balance({
  address,
  chain,
  tokenAddress,
}: UseERC20BalanceProps) {
  const [balance, setBalance] = useState<bigint | undefined>();
  const [error, setError] = useState<Error | null>(null);
  const [symbol, setSymbol] = useState<string>("UNK");
  const [decimals, setDecimals] = useState<number>(18);
  const [blockNumber, setBlockNumber] = useState<bigint | undefined>();

  useEffect(() => {
    const publicClient = createPublicClient({
      chain,
      transport: http(),
    });

    const unwatch = watchBlockNumber(publicClient, {
      onBlockNumber: (blockNumber) => {
        setBlockNumber(blockNumber);
      },
    });

    // Cleanup function to unsubscribe
    return () => unwatch();
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    async function fetchBalance() {
      if (!address || !tokenAddress) {
        setBalance(undefined);
        return;
      }

      try {
        const publicClient = createPublicClient({
          chain,
          transport: http(),
        });

        const [rawBalance, symbol, decimals] = await Promise.all([
          publicClient.readContract({
            address: tokenAddress,
            abi: erc20Abi,
            functionName: "balanceOf",
            args: [address],
          }),
          publicClient.readContract({
            address: tokenAddress,
            abi: erc20Abi,
            functionName: "symbol",
          }),
          publicClient.readContract({
            address: tokenAddress,
            abi: erc20Abi,
            functionName: "decimals",
          }),
        ]);

        // const symbol = await mcTokenAddress.deploymentOn(chain.id).symbol()

        setSymbol(symbol);
        setBalance(rawBalance);
        setDecimals(decimals);
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error("Failed to fetch balance")
        );
        setBalance(undefined);
      }
    }

    fetchBalance();
  }, [address, tokenAddress, blockNumber, chain]);

  return {
    balance,
    isLoading: balance === undefined,
    error,
    chain,
    symbol,
    decimals,
  };
}
