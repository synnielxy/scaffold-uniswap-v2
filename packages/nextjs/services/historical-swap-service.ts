// Define swap event interface
export interface SwapEvent {
  timestamp: number;
  price: number;
  amountIn: string;
  amountOut: string;
  sender: string;
  token0In: boolean; // true if token0 was input, false if token1 was input
}

// Cache for mock swap events to maintain consistency during a session
const mockSwapCache: Record<string, SwapEvent[]> = {};

// Function to generate mock swap events for a pool
export const getHistoricalSwaps = async (
  poolAddress: string,
  token0Symbol: string,
  token1Symbol: string,
  token0Decimals: number = 18,
  token1Decimals: number = 18,
): Promise<SwapEvent[]> => {
  // In a real implementation, this would fetch data from TheGraph or similar
  // For this demo, we'll generate mock data

  // Use cached data if available
  if (mockSwapCache[poolAddress]) {
    return mockSwapCache[poolAddress];
  }

  // Simulate API latency
  await new Promise(resolve => setTimeout(resolve, 500));

  const events = generateMockSwapEvents(token0Symbol, token1Symbol);
  mockSwapCache[poolAddress] = events;

  return events;
};

// Function to generate realistic mock swap data
const generateMockSwapEvents = (token0Symbol: string, token1Symbol: string): SwapEvent[] => {
  // Current timestamp
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;

  // Set base price based on token symbols to make it somewhat realistic
  // This is just for demonstration - in a real app we'd use actual prices
  let basePrice = 0.5;

  // Adjust base price based on token symbols for more realistic mock data
  if (token0Symbol.includes("ETH") && token1Symbol.includes("USDC")) {
    basePrice = 3000;
  } else if (token0Symbol.includes("BTC") && token1Symbol.includes("ETH")) {
    basePrice = 16;
  } else if (token0Symbol.includes("USDC") && token1Symbol.includes("DAI")) {
    basePrice = 1.001;
  }

  const events: SwapEvent[] = [];

  // Create mock wallets for variety
  const wallets = [
    "0x1234567890123456789012345678901234567890",
    "0x2345678901234567890123456789012345678901",
    "0x3456789012345678901234567890123456789012",
    "0x4567890123456789012345678901234567890123",
  ];

  // Generate 100 mock events over the past month with some price volatility
  const eventsCount = 100;

  // Add some volatility over time for more realistic price movements
  let currentPrice = basePrice;
  let trend = 0; // Current price trend

  for (let i = 0; i < eventsCount; i++) {
    // Time progression - more recent events are more likely
    const dayOffset = Math.floor(Math.pow(Math.random(), 2) * 30); // Skew toward recent days
    const timestamp = now - dayOffset * oneDay - Math.floor(Math.random() * oneDay);

    // Update price trend (with some mean reversion)
    trend = trend * 0.95 + (Math.random() - 0.5) * 0.1;
    // Add randomness and trend to price
    const priceChange = Math.random() * 0.02 - 0.01 + trend;
    currentPrice = Math.max(currentPrice * (1 + priceChange), 0.00001);

    // Randomize swap direction
    const token0In = Math.random() > 0.5;

    // Random amounts - larger pools have larger swaps
    const swapSize = Math.random() * Math.random() * 100; // Skew toward smaller swaps

    let amountIn: string;
    let amountOut: string;
    let price: number;

    if (token0In) {
      // Swapping token0 for token1
      amountIn = swapSize.toFixed(4);
      amountOut = (swapSize * currentPrice).toFixed(4);
      price = currentPrice;
    } else {
      // Swapping token1 for token0
      amountIn = (swapSize * currentPrice).toFixed(4);
      amountOut = swapSize.toFixed(4);
      price = 1 / currentPrice;
    }

    events.push({
      timestamp,
      price,
      amountIn,
      amountOut,
      sender: wallets[Math.floor(Math.random() * wallets.length)],
      token0In,
    });
  }

  // Sort by timestamp
  return events.sort((a, b) => a.timestamp - b.timestamp);
};

// Function to get current price from swap events
export const getCurrentPriceFromSwaps = (events: SwapEvent[]): number => {
  if (!events || events.length === 0) return 0;

  // Get last few swaps and average their price for stability
  const recentSwaps = events.slice(-5);
  const sum = recentSwaps.reduce((acc, event) => acc + event.price, 0);
  return sum / recentSwaps.length;
};
