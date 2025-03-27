// src/types/index.ts
import { NexusClient } from "@biconomy/abstractjs";
import { Chain } from "viem";

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
