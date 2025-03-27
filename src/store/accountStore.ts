// src/store/accountStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { encryptData, decryptData } from '../utils/encryption';
import { Module, DeploymentStatus } from '../types';
import { Hex } from 'viem';

interface AccountState {
  encryptedPrivateKey: string | null;
  isAuthenticated: boolean;
  accountAddress: string | null;
  deployedChains: DeploymentStatus[];
  installedModules: Module[];
  
  generateNewAccount: (password: string) => Promise<Hex>;
  loginWithPassword: (password: string) => Promise<Hex | false>;
  logout: () => void;
  updateDeployedChains: (chains: DeploymentStatus[]) => void;
  updateInstalledModules: (modules: Module[]) => void;
}

export const useAccountStore = create<AccountState>()(
  persist(
    (set, get) => ({
      encryptedPrivateKey: null,
      isAuthenticated: false,
      accountAddress: null,
      deployedChains: [],
      installedModules: [],
      
      generateNewAccount: async (password: string) => {
        const privateKey = generatePrivateKey();
        const encrypted = encryptData(privateKey, password);
        set({ encryptedPrivateKey: encrypted, isAuthenticated: true });
        return privateKey;
      },
      
      loginWithPassword: async (password: string) => {
        const { encryptedPrivateKey } = get();
        if (!encryptedPrivateKey) return false;
        
        try {
          const privateKey = decryptData(encryptedPrivateKey, password) as Hex;
          const account = privateKeyToAccount(privateKey);
          set({ isAuthenticated: true, accountAddress: account.address });
          return privateKey;
        } catch (error) {
          console.error("Decryption failed:", error);
          return false;
        }
      },
      
      logout: () => set({ isAuthenticated: false }),
      
      updateDeployedChains: (chains: DeploymentStatus[]) => set({ deployedChains: chains }),
      
      updateInstalledModules: (modules: Module[]) => set({ installedModules: modules }),
    }),
    {
      name: 'biconomy-account-storage',
      partialize: (state) => ({ 
        encryptedPrivateKey: state.encryptedPrivateKey,
        deployedChains: state.deployedChains,
        installedModules: state.installedModules
      }),
    }
  )
);
