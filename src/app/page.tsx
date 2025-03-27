"use client";

import { useState, useEffect } from "react";
import { useAccountStore } from "../store/accountStore";
import { useClientStore } from "@/store/clientStore";
import Login from "../components/Login";
import ModuleCards from "../components/ModuleCards";
import TransactionCards from "../components/TransactionCards";
import DeploymentManager from "../components/DeploymentManager";
import { baseSepolia } from "viem/chains";
import { supportedChains } from "../utils/chains";
import { Hex } from "viem";

export default function Home() {
  const { isAuthenticated, logout } = useAccountStore();
  const { clients, loading: clientsLoading } = useClientStore();
  const [activeChainId, setActiveChainId] = useState<number>(baseSepolia.id);
  const [activeTab, setActiveTab] = useState<
    "modules" | "transactions" | "deployment"
  >("modules");
  const [mounted, setMounted] = useState(false);
  const [activeChain, setActiveChain] = useState(supportedChains[0]);
  const [accountAddress, setAccountAddress] = useState<Hex | null>(null);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Get the client for the active chain
  const activeClient = clients?.[activeChainId] || null;

  // Check if at least one module is installed
  const { installedModules } = useAccountStore();
  const hasModules = installedModules.length > 0;

  useEffect(() => {
    if (activeClient?.account) {
      setAccountAddress(activeClient?.account.address)
    }
  }, [activeClient]);

  if (!isAuthenticated) {
    return <Login />;
  }

  const copyAddressToClipboard = () => {
    accountAddress && navigator.clipboard.writeText(accountAddress as string);
  }

  return (
    <>
      {/* Header moved from layout to page */}
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-0">
              Biconomy AA Demo
            </h1>

            {mounted && isAuthenticated && accountAddress && (
              <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
                <div className="flex items-center">
                  <span className="text-sm text-gray-500 dark:text-gray-400 mr-2">
                    Chain:
                  </span>
                  <select
                    className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                    value={activeChain.id}
                    onChange={(e) => {
                      const selected = supportedChains.find(
                        (chain) => chain.id === Number(e.target.value)
                      );
                      if (selected) {
                        setActiveChain(selected);
                        setActiveChainId(selected.id);
                      }
                    }}
                  >
                    {supportedChains.map((chain) => (
                      <option key={chain.id} value={chain.id}>
                        {chain.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                  <span className="text-xs text-gray-500 dark:text-gray-400 mr-2">
                    Address:
                  </span>
                  <span className="text-sm font-mono text-gray-800 dark:text-gray-200 truncate max-w-[120px] sm:max-w-[180px]">
                    {accountAddress}
                  </span>
                  <button
                    onClick={copyAddressToClipboard}
                    className="ml-2 text-gray-500 hover:text-gray-700"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                  </button>
                </div>

                <button
                  onClick={logout}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {clientsLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <div className="flex space-x-4 border-b border-gray-200 dark:border-gray-700">
                <button
                  className={`py-2 px-4 focus:outline-none ${
                    activeTab === "modules"
                      ? "border-b-2 border-blue-500 font-medium text-blue-600 dark:text-blue-400"
                      : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                  }`}
                  onClick={() => setActiveTab("modules")}
                >
                  Modules
                </button>
                <button
                  className={`py-2 px-4 focus:outline-none ${
                    activeTab === "transactions"
                      ? "border-b-2 border-blue-500 font-medium text-blue-600 dark:text-blue-400"
                      : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                  }`}
                  onClick={() => setActiveTab("transactions")}
                >
                  Transactions
                </button>
                <button
                  className={`py-2 px-4 focus:outline-none ${
                    activeTab === "deployment"
                      ? "border-b-2 border-blue-500 font-medium text-blue-600 dark:text-blue-400"
                      : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                  }`}
                  onClick={() => setActiveTab("deployment")}
                >
                  Deployment
                </button>
              </div>
            </div>

            {activeTab === "modules" && <ModuleCards client={activeClient} />}

            {activeTab === "transactions" &&
              (hasModules ? (
                <TransactionCards
                  client={activeClient}
                  chainId={activeChainId}
                  address = {accountAddress}
                />
              ) : (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                  <p className="text-yellow-800 dark:text-yellow-200">
                    Please install at least one module before performing
                    transactions.
                  </p>
                </div>
              ))}

            {activeTab === "deployment" && clients && (
              <DeploymentManager clients={clients} />
            )}
          </>
        )}
      </div>
    </>
  );
}
