// src/types/index.ts
import { NexusClient } from "@biconomy/abstractjs";
import { Chain, Hex } from "viem";

export interface ChainConfig {
  chain: Chain;
  bundlerUrl: string;
  paymasterUrl: string;
}

export interface ClientsMap {
  [chainId: number]: NexusClient;
}

export interface Module {
  address: string;
  name: string;
  description: string;
}

export interface DeploymentStatus {
  chainId: number;
  chainName: string;
  isDeployed: boolean;
  address?: string;
}

export interface SmartSessionClient extends NexusClient {
  usePermission: (params: {
    calls: {
      to: Hex;
      data: Hex;
      value: bigint;
    }[];
  }) => Promise<string>;
}
