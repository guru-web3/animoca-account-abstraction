import { FaucetCircleIcon } from "./Icons/FaucetCircle";
import { FaucetIcon } from "./Icons/FaucetIcon";

export default function Faucet() {
  return (
    <div className="col-span-1 md:col-span-2 bg-blue-50 dark:bg-blue-900/20 p-6 rounded-xl shadow-sm">
      <div className="flex items-center mb-4">
        <div className="bg-yellow-100 dark:bg-yellow-900/50 p-3 rounded-full mr-4">
         <FaucetIcon className="h-6 w-6 text-yellow-600 dark:text-yellow-300" />
        </div>
        <h3 className="text-lg font-bold text-gray-800 dark:text-white">
          Need USDC for testing?
        </h3>
      </div>
      <p className="text-gray-600 dark:text-gray-300 mb-4">
        Get USDC from the Base Sepolia faucet to test transactions.
      </p>
      <a
        href="https://faucet.circle.com/"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
      >
        Visit USDC Faucet
        <FaucetCircleIcon className="h-5 w-5 ml-2" />
      </a>
    </div>
  );
}
