# animoca-account-abstraction

This repository demonstrates an advanced account abstraction implementation based on ERC-4337. The solution uses deterministic deployment via CREATE2 and a robust upgrade mechanism to provide a consistent, chain-agnostic smart wallet experience.

---

## How ERC-4337 Enables This

ERC-4337 (Account Abstraction) lays the groundwork for smart accounts that overcome the limitations of traditional externally owned accounts (EOAs). Biconomy’s implementation brings several key benefits:

- **Smart Wallet Creation:**  
  Your existing EOA (for example, a MetaMask account) can be used to generate a smart wallet with enhanced features such as gasless transactions and meta-transactions—all without the need to migrate to a new address.

- **Consistent Identity:**  
  By deploying the wallet through a deterministic factory method, the same initialization parameters yield an identical wallet address across multiple EVM-compatible chains. This ensures that even if the wallet is not yet deployed on a chain, its address can still be computed and used reliably.

- **Modular Infrastructure:**  
  With the inclusion of bundlers and paymasters, the system guarantees that the wallet’s address remains accessible and functional for transactions across different chains, enabling a truly chain-agnostic user experience.

---

## Address Resolving Strategy

### Explanation

Biconomy’s Smart Account leverages deterministic deployment (via CREATE2) along with ERC-4337’s account abstraction framework. This combination guarantees that if you start with the same owner and configuration, the smart wallet address remains consistent on every EVM chain.

### Details: Deterministic Deployment with CREATE2
ref: https://github.com/bcnmy/scw-contracts/blob/d3a2ee85f03d9517e3bd224842cc7a58eaf0f6ac/src/Create2Factory.ts#L13
The deployment process uses the CREATE2 opcode, which pre-computes the address where a contract will be deployed based on:

- **The Factory’s Address**  
- **The Contract’s Bytecode**  
- **A Chosen Salt Value**  
- **Initialization Parameters** (such as the owner’s EOA)

Using the same parameters across chains, the factory computes the same wallet address every time. This predictability is crucial for seamless cross-chain interactions—it minimizes the risk of user error and simplifies asset management.

---

## Why It Matters

### User Experience

Having a single, consistent wallet address across chains means users avoid the risk of mistakenly sending funds to an incorrect address when switching networks.

### Interoperability

Developers can build dApps that interact with the same wallet on multiple chains, streamlining cross-chain operations and reducing overall complexity.

### Security & Flexibility

Smart wallets can integrate advanced security features—such as multi-signature setups or social recovery mechanisms—while maintaining a stable identity. This balance of enhanced functionality with state preservation significantly improves both security and user convenience.

---

## Upgrade Flow
ref: https://github.com/bcnmy/nexus/blob/b537e0069ef1a4f5874515ce7d2b53e9ac3efb17/contracts/Nexus.sol#L318

Upgrading a smart account is designed to be seamless and secure. When an upgrade is initiated, only the underlying logic (implementation contract) is changed, while the wallet’s address remains constant and all persistent state is preserved.
<img width="1342" alt="Screenshot 2025-03-27 at 8 31 44 PM" src="https://github.com/user-attachments/assets/790444d4-bf6f-4483-b4b3-9838793bfc57" />

### Internal Function Call – `upgradeToAndCall`

The upgrade process is executed by invoking the `upgradeToAndCall` function. This function performs the following steps:

1. **Validation:**  
   It verifies that the new implementation address is valid—that is, non-zero and containing deployed contract code.

2. **Initialization Call:**  
   Once the pointer to the implementation is updated, the function immediately calls an initialization routine (if provided) on the new implementation. This ensures that any new state variables or configuration changes are properly set up.

### Proxy Pattern Ensures Address Stability

Since the smart account is deployed as a proxy, only the pointer to the implementation is changed during the upgrade process. This means:

- **No Address Change:**  
  The smart account’s address remains the same, ensuring that all previous interactions (such as transfers and user operations) continue without interruption.

- **State Preservation:**  
  The proxy’s storage—including balances, nonce values, and other persistent data—remains intact, even as the underlying logic is updated.

---

This documentation provides an overview of how deterministic deployment and ERC-4337-based account abstraction work together to offer a consistent, secure, and upgradable smart wallet experience across different chains.

For additional details or to explore the implementation further, please refer to the modules and contracts in this repository.
