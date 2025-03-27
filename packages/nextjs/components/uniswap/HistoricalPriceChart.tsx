import React, { useEffect, useState } from "react";
import { BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, Title, Tooltip } from "chart.js";
import { Bar } from "react-chartjs-2";

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface SwapEvent {
  timestamp: number;
  price: number;
  amountIn: string;
  amountOut: string;
}

interface HistoricalPriceChartProps {
  token0Symbol: string;
  token1Symbol: string;
  poolAddress: string;
  swapEvents?: SwapEvent[];
  isLoading?: boolean;
}

const HistoricalPriceChart: React.FC<HistoricalPriceChartProps> = ({
  token0Symbol,
  token1Symbol,
  // poolAddress is not currently used in the component logic
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  poolAddress,
  swapEvents = [],
  isLoading = false,
}) => {
  const [chartData, setChartData] = useState({
    labels: [] as string[],
    datasets: [] as any[],
  });

  useEffect(() => {
    // If no swap events, generate mock data for demonstration
    // In a real app, you would fetch these from an indexer like TheGraph
    const events = swapEvents.length > 0 ? swapEvents : generateMockSwapEvents();

    // Extract prices from swap events
    const prices = events.map(event => event.price);

    // Calculate price range for histogram bins
    const minPrice = Math.min(...prices) * 0.95;
    const maxPrice = Math.max(...prices) * 1.05;
    const range = maxPrice - minPrice;

    // Create histogram bins (12 bins)
    const binCount = 12;
    const binSize = range / binCount;
    const bins = Array(binCount).fill(0);
    const binLabels = Array(binCount)
      .fill(0)
      .map((_, i) => {
        const binMin = minPrice + i * binSize;
        return binMin.toFixed(4);
      });

    // Fill histogram bins with counts
    prices.forEach(price => {
      const binIndex = Math.min(Math.floor((price - minPrice) / binSize), binCount - 1);
      if (binIndex >= 0 && binIndex < binCount) {
        bins[binIndex]++;
      }
    });

    // Calculate current price from latest swap (or use middle value if no swaps)
    const currentPrice = events.length > 0 ? events[events.length - 1].price : (minPrice + maxPrice) / 2;

    // Create data for current price marker
    const currentPriceBin = Math.min(Math.floor((currentPrice - minPrice) / binSize), binCount - 1);

    const currentPriceData = Array(binCount).fill(null);
    if (currentPriceBin >= 0 && currentPriceBin < binCount) {
      currentPriceData[currentPriceBin] = Math.max(...bins) * 1.1; // Slightly taller than highest bin
    }

    // Set chart data
    setChartData({
      labels: binLabels,
      datasets: [
        {
          label: "Swap Count",
          data: bins,
          backgroundColor: "rgba(53, 162, 235, 0.5)",
          borderWidth: 1,
        },
        {
          label: "Current Price",
          data: currentPriceData,
          backgroundColor: "rgba(255, 99, 132, 0.8)",
          borderColor: "rgba(255, 99, 132, 1)",
          borderWidth: 2,
          barPercentage: 0.2,
        },
      ],
    });
  }, [swapEvents, token0Symbol, token1Symbol]);

  // Generate mock swap events for demonstration
  const generateMockSwapEvents = (): SwapEvent[] => {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    // Base price and some randomness around it
    const basePrice = 1.5;
    const events: SwapEvent[] = [];

    // Generate 50 mock events over the past week
    for (let i = 0; i < 50; i++) {
      // Price with normal-ish distribution around basePrice
      const randomOffset = (Math.random() + Math.random() + Math.random() - 1.5) * 0.3;
      const price = basePrice + randomOffset;

      // Random timestamp within past week
      const timestamp = now - Math.floor(Math.random() * 7 * oneDay);

      // Random amounts
      const amountIn = (10 + Math.random() * 90).toFixed(2);
      const amountOut = (price * parseFloat(amountIn)).toFixed(2);

      events.push({
        timestamp,
        price,
        amountIn,
        amountOut,
      });
    }

    // Sort by timestamp
    return events.sort((a, b) => a.timestamp - b.timestamp);
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
      },
      title: {
        display: true,
        text: `${token0Symbol}/${token1Symbol} Swap Price Distribution`,
      },
      tooltip: {
        callbacks: {
          label: function (context: any) {
            if (context.dataset.label === "Current Price") {
              return `Current Price: ${parseFloat(context.label).toFixed(4)} ${token1Symbol}/${token0Symbol}`;
            }
            return `Swaps: ${context.raw}`;
          },
          title: function (context: any) {
            const label = context[0].label;
            const nextBin = parseFloat(label) + (parseFloat(chartData.labels[1] as string) - parseFloat(label));
            return `Price Range: ${label} - ${nextBin.toFixed(4)} ${token1Symbol}/${token0Symbol}`;
          },
        },
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: `Price (${token1Symbol}/${token0Symbol})`,
        },
      },
      y: {
        title: {
          display: true,
          text: "Number of Swaps",
        },
        beginAtZero: true,
      },
    },
  };

  return (
    <div className="w-full h-64 md:h-80">
      {isLoading ? (
        <div className="h-full flex justify-center items-center">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      ) : (
        <Bar data={chartData} options={options} />
      )}
    </div>
  );
};

export default HistoricalPriceChart;
