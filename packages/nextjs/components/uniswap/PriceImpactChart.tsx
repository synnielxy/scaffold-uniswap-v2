import React, { useEffect, useState } from "react";
import {
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Title,
  Tooltip,
} from "chart.js";
import { Line } from "react-chartjs-2";

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

interface PriceImpactChartProps {
  token0Symbol: string;
  token1Symbol: string;
  reserve0: string;
  reserve1: string;
  swapAmount?: string;
  isSwapFromToken0: boolean;
}

const PriceImpactChart: React.FC<PriceImpactChartProps> = ({
  token0Symbol,
  token1Symbol,
  reserve0,
  reserve1,
  swapAmount = "0",
  isSwapFromToken0,
}) => {
  const [chartData, setChartData] = useState({
    labels: [] as string[],
    datasets: [] as any[],
  });

  useEffect(() => {
    if (!reserve0 || !reserve1) return;

    // Parse reserves and swap amount
    const res0 = parseFloat(reserve0);
    const res1 = parseFloat(reserve1);
    const amount = parseFloat(swapAmount || "0");

    if (isNaN(res0) || isNaN(res1) || res0 === 0 || res1 === 0) return;

    // Calculate k (constant product)
    const k = res0 * res1;

    // Generate points for the price impact curve
    const points = 50;
    const labels: string[] = [];
    const priceImpactData: number[] = [];

    // Current price
    const currentPrice = isSwapFromToken0 ? res1 / res0 : res0 / res1;

    // Create a range of swap amounts (0% to 25% of reserve)
    const fromReserve = isSwapFromToken0 ? res0 : res1;
    const maxAmount = fromReserve * 0.25;
    const step = maxAmount / points;

    for (let i = 0; i <= points; i++) {
      const swapAmount = i * step;
      let newPrice;

      if (isSwapFromToken0) {
        // Swap token0 for token1
        const newRes0 = res0 + swapAmount;
        const newRes1 = k / newRes0;
        newPrice = newRes1 / newRes0;
      } else {
        // Swap token1 for token0
        const newRes1 = res1 + swapAmount;
        const newRes0 = k / newRes1;
        newPrice = newRes0 / newRes1;
      }

      // Calculate price impact as percentage
      const priceImpact = ((currentPrice - newPrice) / currentPrice) * 100;

      // Format label as percentage of reserve
      const percentOfReserve = (swapAmount / fromReserve) * 100;
      labels.push(`${percentOfReserve.toFixed(1)}%`);
      priceImpactData.push(priceImpact);
    }

    // Mark the current swap amount on the chart
    let currentSwapIndex = -1;
    if (amount > 0) {
      const percentOfReserve = (amount / fromReserve) * 100;
      currentSwapIndex = Math.round((percentOfReserve / 25) * points);
    }

    const currentSwapData = Array(points + 1).fill(null);
    if (currentSwapIndex >= 0 && currentSwapIndex <= points) {
      currentSwapData[currentSwapIndex] = priceImpactData[currentSwapIndex];
    }

    setChartData({
      labels,
      datasets: [
        {
          label: "Price Impact (%)",
          data: priceImpactData,
          borderColor: "rgba(255, 159, 64, 1)",
          backgroundColor: "rgba(255, 159, 64, 0.2)",
          tension: 0.4,
          pointRadius: 0,
        },
        {
          label: "Your Swap",
          data: currentSwapData,
          borderColor: "rgba(54, 162, 235, 1)",
          backgroundColor: "rgba(54, 162, 235, 1)",
          pointRadius: 6,
          pointHoverRadius: 8,
        },
      ],
    });
  }, [reserve0, reserve1, swapAmount, isSwapFromToken0]);

  const fromToken = isSwapFromToken0 ? token0Symbol : token1Symbol;
  const toToken = isSwapFromToken0 ? token1Symbol : token0Symbol;

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
      },
      title: {
        display: true,
        text: `Price Impact: ${fromToken} → ${toToken}`,
      },
      tooltip: {
        callbacks: {
          label: function (context: any) {
            if (context.dataset.label === "Your Swap" && parseFloat(swapAmount) > 0) {
              return `Your Swap: ${parseFloat(swapAmount).toFixed(4)} ${fromToken} (${context.raw.toFixed(2)}% impact)`;
            }
            return `Price Impact: ${context.raw.toFixed(2)}%`;
          },
          title: function (context: any) {
            return `Swap Amount: ${context[0].label} of ${fromToken} reserve`;
          },
        },
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: `Swap Amount (% of ${fromToken} reserve)`,
        },
      },
      y: {
        title: {
          display: true,
          text: "Price Impact (%)",
        },
        min: 0,
      },
    },
  };

  return (
    <div className="w-full h-64 md:h-80">
      <Line data={chartData} options={options} />
    </div>
  );
};

export default PriceImpactChart;
