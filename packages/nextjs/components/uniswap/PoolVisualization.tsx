import React, { useEffect, useState } from "react";
import HistoricalPriceChart from "./HistoricalPriceChart";
import PoolReservesChart from "./PoolReservesChart";
import PriceImpactChart from "./PriceImpactChart";
import { SwapEvent, getHistoricalSwaps } from "~~/services/historical-swap-service";

interface TokenInfo {
  address: string;
  symbol: string;
  decimals?: number;
}

interface PoolVisualizationProps {
  token0: TokenInfo;
  token1: TokenInfo;
  reserves: [string, string];
  activeTab: "deposit" | "redeem" | "swap";
  swapAmount?: string;
  swapFromToken: "token0" | "token1";
  isLoading?: boolean;
  poolAddress: string;
}

const PoolVisualization: React.FC<PoolVisualizationProps> = ({
  token0,
  token1,
  reserves,
  activeTab,
  swapAmount,
  swapFromToken,
  isLoading = false,
  poolAddress,
}) => {
  // State for historical swap data
  const [swapEvents, setSwapEvents] = useState<SwapEvent[]>([]);
  const [isLoadingSwapHistory, setIsLoadingSwapHistory] = useState(false);

  // Format reserves for display - convert from raw amounts to humanized amounts
  const formatReserve = (reserve: string, decimals = 18) => {
    if (!reserve) return "0";
    const amount = BigInt(reserve);
    const divisor = BigInt(10) ** BigInt(decimals);
    const integerPart = amount / divisor;
    const decimalPart = amount % divisor;

    // Format with up to 6 decimal places
    const decimalStr = decimalPart.toString().padStart(decimals, "0");
    const truncatedDecimal = decimalStr.substring(0, 6).replace(/0+$/, "");

    return truncatedDecimal ? `${integerPart}.${truncatedDecimal}` : integerPart.toString();
  };

  const humanizedReserve0 = formatReserve(reserves[0], token0.decimals);
  const humanizedReserve1 = formatReserve(reserves[1], token1.decimals);

  // Fetch historical swap data when pool or tab changes
  useEffect(() => {
    const fetchSwapHistory = async () => {
      if (!poolAddress || !token0.symbol || !token1.symbol) return;

      setIsLoadingSwapHistory(true);
      try {
        const events = await getHistoricalSwaps(
          poolAddress,
          token0.symbol,
          token1.symbol,
          token0.decimals || 18,
          token1.decimals || 18,
        );
        setSwapEvents(events);
      } catch (error) {
        console.error("Error fetching swap history:", error);
      } finally {
        setIsLoadingSwapHistory(false);
      }
    };

    fetchSwapHistory();
  }, [poolAddress, token0.symbol, token1.symbol, token0.decimals, token1.decimals]);

  // Define which tabs should show which charts
  const showReservesChart = activeTab === "deposit" || activeTab === "redeem";
  const showPriceImpactChart = activeTab === "swap";
  const showHistoricalPriceChart = true; // We'll show this on all tabs, adjust as needed

  return (
    <div className="bg-base-100 p-6 rounded-xl shadow-md">
      <h3 className="text-xl font-bold mb-4 flex justify-between items-center">
        Pool Visualization
        {isLoading && (
          <div className="flex items-center">
            <span className="loading loading-spinner loading-sm mr-2"></span>
            <span className="text-sm font-normal">Refreshing...</span>
          </div>
        )}
      </h3>

      {showReservesChart && (
        <div className="mb-6">
          <h4 className="text-lg mb-2">Constant Product Curve</h4>
          <p className="text-sm text-base-content/70 mb-4">
            This chart shows the constant product curve (x * y = k) for the current pool, where k ={" "}
            {(parseFloat(humanizedReserve0) * parseFloat(humanizedReserve1)).toFixed(4)}. The current position is marked
            in red.
          </p>
          <PoolReservesChart
            token0Symbol={token0.symbol}
            token1Symbol={token1.symbol}
            reserve0={humanizedReserve0}
            reserve1={humanizedReserve1}
          />
        </div>
      )}

      {showPriceImpactChart && (
        <div className="mb-6">
          <h4 className="text-lg mb-2">Price Impact</h4>
          <p className="text-sm text-base-content/70 mb-4">
            This chart shows the price impact of your swap based on the amount. Larger swaps relative to pool reserves
            result in higher price impact.
          </p>
          <PriceImpactChart
            token0Symbol={token0.symbol}
            token1Symbol={token1.symbol}
            reserve0={humanizedReserve0}
            reserve1={humanizedReserve1}
            swapAmount={swapAmount}
            isSwapFromToken0={swapFromToken === "token0"}
          />
        </div>
      )}

      {showHistoricalPriceChart && (
        <div className="mb-6">
          <h4 className="text-lg mb-2">Historical Swap Prices</h4>
          <p className="text-sm text-base-content/70 mb-4">
            This chart shows the distribution of execution prices from previous swaps in this pool. The current price is
            highlighted in red.
          </p>
          <HistoricalPriceChart
            token0Symbol={token0.symbol}
            token1Symbol={token1.symbol}
            poolAddress={poolAddress}
            swapEvents={swapEvents}
            isLoading={isLoadingSwapHistory}
          />
        </div>
      )}

      <div className="text-sm">
        <h4 className="font-medium mb-1">Current Reserves:</h4>
        <ul className="list-disc list-inside">
          <li>
            {humanizedReserve0} {token0.symbol}
          </li>
          <li>
            {humanizedReserve1} {token1.symbol}
          </li>
        </ul>
        <p className="text-xs mt-2 text-base-content/60">Last updated: {new Date().toLocaleTimeString()}</p>
      </div>
    </div>
  );
};

export default PoolVisualization;
