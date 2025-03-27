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

interface PoolReservesChartProps {
  token0Symbol: string;
  token1Symbol: string;
  reserve0: string;
  reserve1: string;
}

const PoolReservesChart: React.FC<PoolReservesChartProps> = ({ token0Symbol, token1Symbol, reserve0, reserve1 }) => {
  const [chartData, setChartData] = useState({
    labels: [] as string[],
    datasets: [] as any[],
  });

  useEffect(() => {
    if (!reserve0 || !reserve1) return;

    // Parse reserves
    const res0 = parseFloat(reserve0);
    const res1 = parseFloat(reserve1);

    if (isNaN(res0) || isNaN(res1) || res0 === 0 || res1 === 0) return;

    // Calculate k (constant product)
    const k = res0 * res1;

    // Generate points for the curve
    const points = 100;
    const labels: string[] = [];
    const curveData: number[] = [];

    // Create a range of token0 quantities (from 10% to 200% of current reserve)
    const minX = res0 * 0.1;
    const maxX = res0 * 2;
    const step = (maxX - minX) / points;

    for (let i = 0; i <= points; i++) {
      const x = minX + i * step;
      const y = k / x; // Constant product formula: x * y = k

      labels.push(x.toFixed(2));
      curveData.push(y);
    }

    // Mark the current operating point
    const currentPointIndex = Math.floor((res0 - minX) / step);
    const currentPointData = Array(points + 1).fill(null);
    if (currentPointIndex >= 0 && currentPointIndex <= points) {
      currentPointData[currentPointIndex] = res1;
    }

    setChartData({
      labels,
      datasets: [
        {
          label: "Reserve Curve",
          data: curveData,
          borderColor: "rgba(75, 192, 192, 1)",
          backgroundColor: "rgba(75, 192, 192, 0.2)",
          tension: 0.4,
          pointRadius: 0,
        },
        {
          label: "Current Position",
          data: currentPointData,
          borderColor: "rgba(255, 99, 132, 1)",
          backgroundColor: "rgba(255, 99, 132, 1)",
          pointRadius: 6,
          pointHoverRadius: 8,
        },
      ],
    });
  }, [reserve0, reserve1]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
      },
      title: {
        display: true,
        text: `${token0Symbol}/${token1Symbol} Reserves Curve`,
      },
      tooltip: {
        callbacks: {
          label: function (context: any) {
            if (context.dataset.label === "Current Position") {
              return `Current Position: (${parseFloat(reserve0).toFixed(2)} ${token0Symbol}, ${parseFloat(reserve1).toFixed(2)} ${token1Symbol})`;
            }
            return `${token1Symbol}: ${context.raw.toFixed(2)}`;
          },
          title: function (context: any) {
            return `${token0Symbol}: ${context[0].label}`;
          },
        },
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: token0Symbol,
        },
      },
      y: {
        title: {
          display: true,
          text: token1Symbol,
        },
      },
    },
  };

  return (
    <div className="w-full h-64 md:h-80">
      <Line data={chartData} options={options} />
    </div>
  );
};

export default PoolReservesChart;
