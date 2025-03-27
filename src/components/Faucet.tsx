export default function Faucet() {
  return (
    <div className="col-span-1 md:col-span-2 bg-blue-50 dark:bg-blue-900/20 p-6 rounded-xl shadow-sm">
      <div className="flex items-center mb-4">
        <div className="bg-yellow-100 dark:bg-yellow-900/50 p-3 rounded-full mr-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6 text-yellow-600 dark:text-yellow-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
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
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5 ml-2"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
          />
        </svg>
      </a>
    </div>
  );
}
