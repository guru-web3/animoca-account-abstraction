// src/components/Login.tsx
import { useEffect, useState } from "react";
import { useAccountStore } from "../store/accountStore";
import { useAuth } from "@/hooks/useAuth";
import { SpinnerIcon } from "./Icons/SpinnerIcon";
import { useToast } from "@/providers/ToastContex";

export default function Login() {
  const { showToast } = useToast();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isNewAccount, setIsNewAccount] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { encryptedPrivateKey } = useAccountStore();
  const { login, createAccount } = useAuth();

  useEffect(() => {
    if (encryptedPrivateKey) {
      setIsNewAccount(false);
    } else {
      setIsNewAccount(true);
    }
  }, [encryptedPrivateKey]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      if (isNewAccount) {
        if (password !== confirmPassword) {
          setError("Passwords do not match");
          return;
        }

        await createAccount(password);

        showToast(`Account created successfully`, "success");
      } else {
        if (!encryptedPrivateKey) {
          setError("No account found. Please create a new one.");
          setIsNewAccount(true);
          return;
        }

        const result = await login(password);
        if (!result) {
          return setError("Invalid password");
        }
        showToast(`Login successful`, "success");
      }
    } catch (error) {
      showToast(
        `An error occurred: ${
          (error as Error).message || JSON.stringify(error)
        }`,
        "error"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-8 bg-white rounded-xl shadow-lg dark:bg-gray-800 transition-all">
      <h2 className="text-2xl font-bold mb-6 text-center text-gray-800 dark:text-white">
        {isNewAccount ? "Create New Account" : "Login to Your Account"}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            required
          />
        </div>

        {isNewAccount && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              required
            />
          </div>
        )}

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 dark:bg-red-900/30">
            <p className="text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <span className="flex items-center justify-center">
              <SpinnerIcon className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
              Processing...
            </span>
          ) : isNewAccount ? (
            "Create Account"
          ) : (
            "Login"
          )}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-gray-600 dark:text-gray-400">
          {isNewAccount
            ? "Already have an account?"
            : "Need to create an account?"}
        </p>
        <button
          className="mt-2 text-blue-600 hover:text-blue-800 font-medium dark:text-blue-400 dark:hover:text-blue-300"
          onClick={() => setIsNewAccount(!isNewAccount)}
        >
          {isNewAccount ? "Login Instead" : "Create New Account"}
        </button>
      </div>
    </div>
  );
}
