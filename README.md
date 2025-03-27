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

# Biconomy Account Abstraction (AA) Demo

## Overview
The Biconomy AA Demo is a comprehensive application that showcases account abstraction features on various blockchain networks. This demo allows users to manage passkeys, interact with smart accounts, and perform transactions across multiple chains.

# Features

##Register
- Create a new password and confirm password
- Behind the scenes private key will be encrypted by password and `K1_Validator` account will be created
<img width="504" alt="Screenshot 2025-03-27 at 9 47 17 PM" src="https://github.com/user-attachments/assets/2b96a5cb-90ba-4f1b-979a-709f57b72b1f" />

## Login
- Enter the saveed password and Login
- when you refresh, logout and login - private key will be decrypted by password and `K1_Validator` account will be retained
<img width="483" alt="Screenshot 2025-03-27 at 9 46 56 PM" src="https://github.com/user-attachments/assets/789e2b19-8a04-47a4-951d-0feabebd2e11" />


### 1. Passkey Management
- Create new passkeys
- Use existing passkeys
- Install/Uninstall Passkey Module

### 2. Smart Session Module
- Install/Uninstall Smart Session Module for temporary session keys

### 3. Multi-Chain Support
- Bypass Lazy deployment which will happen during first userop/installation of validator and Deploy smart accounts on multiple chains (Base Sepolia, Ethereum Sepolia, Arbitrum Sepolia)
- View deployment status for each chain
- Switch between different chains

### 4. Send User Op, transaction and Sign transaction
- Send UserOp (User Operations)
- Install Multi Chain
- Upgrade AA (Account Abstraction)

### 6. Smart Account Implementation Upgrade
- View current implementation address
- Upgrade/Switch implementation

## Usage Guide

### Passkey Management
1. Click on Install validator to install passkey default name: `${address}_${chain}`
3. Use "Login with passkey" if you already have one

### Installing Modules
1. Navigate to the "Modules" tab
2. For Passkey Module:
   - Click "Install Module" to add passkey authentication
   - Click "Uninstall Module" to remove it
3. For Smart Session Module:
   - Click "Install Module" to enable temporary session keys
   - Click "Uninstall Module" to remove it
<img width="1328" alt="Screenshot 2025-03-27 at 9 46 00 PM" src="https://github.com/user-attachments/assets/01a7c4d4-8371-4244-bc84-21215ef48d86" />

### Deploying Smart Accounts
1. Go to the "Deployment" tab
2. Select the chains you want to deploy on
3. Click "Deploy Selected Accounts"
4. Wait for the deployment process to complete
<img width="1327" alt="Screenshot 2025-03-27 at 9 46 13 PM" src="https://github.com/user-attachments/assets/6c503419-e095-4e92-bc4c-f619b2b42e4d" />

### Performing Transactions
1. Navigate to the "Transactions" tab (not shown in the provided images)
2. Select the appropriate module for validation
3. Enter transaction details and confirm
<img width="1324" alt="Screenshot 2025-03-27 at 9 46 29 PM" src="https://github.com/user-attachments/assets/490c0f18-1fa6-430e-9459-65a7ad8621ee" />


### Upgrading Smart Account Implementation
1. In the "Deployment" tab, find the "Upgrade/Change Smart Account Implementation" section
2. For each deployed chain, you can see the current implementation address
3. Click "Upgrade/Switch Implementation" to change to a different implementation version
<img width="1260" alt="Screenshot 2025-03-27 at 9 46 39 PM" src="https://github.com/user-attachments/assets/c79b9111-9e57-4088-a9e5-abb1cbff6270" />

