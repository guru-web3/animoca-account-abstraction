import { useState, useEffect } from "react";
import { useAccountStore } from "../store/accountStore";
import { Hex } from "viem";
import { useSmartAccount } from "./useSmartAccount";

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

  return {
    isAuthenticated,
    isLoading,
    privateKey,
    login,
    createAccount,
    logout,
  };
};
