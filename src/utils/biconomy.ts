import { NexusClient } from "@biconomy/abstractjs";
import { Hex } from "viem";

export const waitForUserOperationReceipt = async (
  nexusClient: NexusClient,
  userOpHash: Hex
) => {
  const receipt = await nexusClient?.waitForUserOperationReceipt({
    hash: userOpHash,
  });
  return receipt;
};
