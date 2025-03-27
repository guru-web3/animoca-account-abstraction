import { useState, useEffect } from "react";
import { useAccountStore } from "../store/accountStore";
import { Hex } from "viem";
import { useSmartAccount } from "./useSmartAccount";
import { decryptData, encryptData } from "@/utils/encryption";

export const useAuth = () => {
  const [privateKey, setPrivateKey] = useState<Hex | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { isAuthenticated, loginWithPassword } = useAccountStore();
  const { initializeClients } = useSmartAccount();

  useEffect(() => {
    setIsLoading(false);
  }, [isAuthenticated]);

  const login = async (password: string) => {
    setIsLoading(true);
    try {
      const key = await loginWithPassword(password);
      if (key) {
        setPrivateKey(key);
        await initializeClients(key);
        return true;
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const createAccount = async (password: string) => {
    setIsLoading(true);
    try {
      const key = await useAccountStore.getState().generateNewAccount(password);
      setPrivateKey(key);
      await initializeClients(key);
      return true;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    useAccountStore.getState().logout();
    setPrivateKey(null);
  };

  const encryptPasskeyWithPrivateKey = (formattedWebAuthnKey: string) => {
    if(!privateKey) {
      return ;
    }
    return encryptData(formattedWebAuthnKey, privateKey as string);
  }

  const decryptPasskeyWithPrivateKey = (encryptData: string) => {
    if(!privateKey) {
      return ;
    }
    return decryptData(encryptData, privateKey as string);
  }

  return {
    isAuthenticated,
    isLoading,
    privateKey,
    encryptPasskeyWithPrivateKey,
    decryptPasskeyWithPrivateKey,
    login,
    createAccount,
    logout,
  };
};
