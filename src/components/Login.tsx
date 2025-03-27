// src/components/Login.tsx
import { useState } from 'react';
import { useAccountStore } from '../store/accountStore';
import { useAuth } from '@/hooks/useAuth';

export default function Login() {
  const [password, setPassword] = useState('Test@1234');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isNewAccount, setIsNewAccount] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { encryptedPrivateKey } = useAccountStore();
  const { login, createAccount } = useAuth();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      if (isNewAccount) {
        if (password !== confirmPassword) {
          setError('Passwords do not match');
          return;
        }
        
        await createAccount(password);
      } else {
        if (!encryptedPrivateKey) {
          setError('No account found. Please create a new one.');
          setIsNewAccount(true);
          return;
        }
        
        const result = await login(password);
        if (!result) {
          setError('Invalid password');
        }
      }
    } catch (err) {
      setError('An error occurred: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="max-w-md mx-auto mt-10 p-8 bg-white rounded-xl shadow-lg dark:bg-gray-800 transition-all">
      <h2 className="text-2xl font-bold mb-6 text-center text-gray-800 dark:text-white">
        {isNewAccount ? 'Create New Account' : 'Login to Your Account'}
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
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </span>
          ) : (
            isNewAccount ? 'Create Account' : 'Login'
          )}
        </button>
      </form>
      
      <div className="mt-6 text-center">
        <p className="text-gray-600 dark:text-gray-400">
          {isNewAccount ? 'Already have an account?' : 'Need to create an account?'}
        </p>
        <button
          className="mt-2 text-blue-600 hover:text-blue-800 font-medium dark:text-blue-400 dark:hover:text-blue-300"
          onClick={() => setIsNewAccount(!isNewAccount)}
        >
          {isNewAccount ? 'Login Instead' : 'Create New Account'}
        </button>
      </div>
    </div>
  );
}
