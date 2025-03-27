"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { NextPage } from "next";
import { parseUnits } from "viem";
import { useAccount, usePublicClient, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { BugAntIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { Address } from "~~/components/scaffold-eth";
import PoolVisualization from "~~/components/uniswap/PoolVisualization";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";

// Known token address mapping (address -> symbol, decimals)
const KNOWN_TOKENS: Record<string, { symbol: string; decimals: number }> = {
  // Add any known tokens here (lowercase addresses)
  "0x51fce89b9f6d4c530698f181167043e1bb4abf89": { symbol: "TOKEN1", decimals: 18 },
  "0xb16f35c0ae2912430dac15764477e179d9b9ebea": { symbol: "TOKEN2", decimals: 18 },
};

interface TokenInfo {
  address: string;
  symbol: string;
  decimals?: number;
  balance?: string;
  approved?: boolean;
}

interface PoolInfo {
  address: string;
  token0: TokenInfo;
  token1: TokenInfo;
  reserves: [string, string];
}

// Define tab options for pool actions
type ActionTab = "deposit" | "redeem" | "swap";

const Home: NextPage = () => {
  const { address: connectedAddress } = useAccount();
  const publicClient = usePublicClient();
  const [selectedPoolAddress, setSelectedPoolAddress] = useState<string>("");
  const [pools, setPools] = useState<PoolInfo[]>([]);
  const [isLoadingPoolDetails, setIsLoadingPoolDetails] = useState(false);
  // New state variables for UI interaction
  const [activeTab, setActiveTab] = useState<ActionTab>("deposit");
  const [token0Amount, setToken0Amount] = useState<string>("");
  const [token1Amount, setToken1Amount] = useState<string>("");
  const [slippageTolerance, setSlippageTolerance] = useState<string>("0.5");
  const [lpTokenAmount, setLpTokenAmount] = useState<string>("");
  const [swapFromToken, setSwapFromToken] = useState<"token0" | "token1">("token0");
  const [deadline, setDeadline] = useState<string>((Math.floor(Date.now() / 1000) + 60 * 20).toString()); // 20 minutes
  const [routerAddress, setRouterAddress] = useState<string>("0xeE567Fe1712Faf6149d80dA1E6934E354124CfE3"); // Sepolia router

  // Find the selected pool from our pools array
  const selectedPool = pools.find(pool => pool.address === selectedPoolAddress);

  // Contract write hooks for token approvals and interactions
  const { writeContract: writeApprove, isPending: isApproveWritePending, data: approveTxHash } = useWriteContract();
  const {
    writeContract: writeAddLiquidity,
    isPending: isAddLiquidityWritePending,
    data: addLiquidityTxHash,
  } = useWriteContract();
  const {
    writeContract: writeRemoveLiquidity,
    isPending: isRemoveLiquidityWritePending,
    data: removeLiquidityTxHash,
  } = useWriteContract();
  const { writeContract: writeSwap, isPending: isSwapWritePending, data: swapTxHash } = useWriteContract();

  // Track which token was last approved
  const [lastApprovedToken, setLastApprovedToken] = useState<"token0" | "token1" | null>(null);

  // Track transaction confirmations
  const { isLoading: isConfirmingApproval, isSuccess: isApprovalSuccessful } = useWaitForTransactionReceipt({
    hash: approveTxHash,
  });
  const { isLoading: isConfirmingAddLiquidity, isSuccess: isAddLiquiditySuccessful } = useWaitForTransactionReceipt({
    hash: addLiquidityTxHash,
  });
  const { isLoading: isConfirmingRemoveLiquidity, isSuccess: isRemoveLiquiditySuccessful } =
    useWaitForTransactionReceipt({
      hash: removeLiquidityTxHash,
    });
  const { isLoading: isConfirmingSwap, isSuccess: isSwapSuccessful } = useWaitForTransactionReceipt({
    hash: swapTxHash,
  });

  // Add a state to track when we need to refresh pool details
  const [shouldRefreshPool, setShouldRefreshPool] = useState(false);

  // Track successful transactions to trigger pool refresh
  useEffect(() => {
    if (isApprovalSuccessful || isAddLiquiditySuccessful || isRemoveLiquiditySuccessful || isSwapSuccessful) {
      console.log("Transaction confirmed - refreshing pool details");
      setShouldRefreshPool(true);

      // Clear input fields after successful transactions
      if (isAddLiquiditySuccessful) {
        setToken0Amount("");
        setToken1Amount("");
      } else if (isRemoveLiquiditySuccessful) {
        setLpTokenAmount("");
      } else if (isSwapSuccessful) {
        if (swapFromToken === "token0") {
          setToken0Amount("");
        } else {
          setToken1Amount("");
        }
      }
    }
  }, [isApprovalSuccessful, isAddLiquiditySuccessful, isRemoveLiquiditySuccessful, isSwapSuccessful, swapFromToken]);

  // Refresh pool details when needed
  useEffect(() => {
    const refreshPoolDetails = async () => {
      if (!shouldRefreshPool || !selectedPoolAddress || !publicClient) return;

      console.log("Refreshing pool details for:", selectedPoolAddress);
      setIsLoadingPoolDetails(true);

      try {
        // The ABI for the functions we need to call on the pair contract
        const pairAbi = [
          {
            inputs: [],
            name: "getReserves",
            outputs: [
              { internalType: "uint112", name: "reserve0", type: "uint112" },
              { internalType: "uint112", name: "reserve1", type: "uint112" },
              { internalType: "uint32", name: "blockTimestampLast", type: "uint32" },
            ],
            stateMutability: "view",
            type: "function",
          },
        ] as const;

        // Read reserves
        const reserves = (await publicClient.readContract({
          address: selectedPoolAddress as `0x${string}`,
          abi: pairAbi,
          functionName: "getReserves",
        })) as [bigint, bigint, number];

        // Update the pool information with new reserves
        setPools(prevPools =>
          prevPools.map(pool =>
            pool.address === selectedPoolAddress
              ? {
                  ...pool,
                  reserves: [reserves[0].toString(), reserves[1].toString()] as [string, string],
                }
              : pool,
          ),
        );

        // Reset refresh flag
        setShouldRefreshPool(false);
      } catch (error) {
        console.error("Error refreshing pool details:", error);
      } finally {
        setIsLoadingPoolDetails(false);
      }
    };

    refreshPoolDetails();
  }, [shouldRefreshPool, selectedPoolAddress, publicClient]);

  // Add a periodic refresh for pool details
  useEffect(() => {
    if (!selectedPoolAddress || !publicClient) return;

    // Set up periodic refresh (every 15 seconds)
    const refreshIntervalId = setInterval(() => {
      setShouldRefreshPool(true);
    }, 15000);

    // Clean up interval on unmount or when selected pool changes
    return () => {
      clearInterval(refreshIntervalId);
    };
  }, [selectedPoolAddress, publicClient]);

  // Derived loading states
  const isApprovingToken0 = (isApproveWritePending || isConfirmingApproval) && lastApprovedToken === "token0";
  const isApprovingToken1 = (isApproveWritePending || isConfirmingApproval) && lastApprovedToken === "token1";
  const isAddingLiquidity = isAddLiquidityWritePending || isConfirmingAddLiquidity;
  const isRemovingLiquidity = isRemoveLiquidityWritePending || isConfirmingRemoveLiquidity;
  const isSwapping = isSwapWritePending || isConfirmingSwap;

  // Get pool count from factory
  const { data: allPairsLength } = useScaffoldReadContract({
    contractName: "UniswapV2Factory",
    functionName: "allPairsLength",
  });

  // Get pools at fixed indices - we'll support up to 5 pools for this demo
  const { data: pool0 } = useScaffoldReadContract({
    contractName: "UniswapV2Factory",
    functionName: "allPairs",
    args: [BigInt(0)],
    query: {
      enabled: allPairsLength !== undefined && allPairsLength > 0,
    },
  });

  const { data: pool1 } = useScaffoldReadContract({
    contractName: "UniswapV2Factory",
    functionName: "allPairs",
    args: [BigInt(1)],
    query: {
      enabled: allPairsLength !== undefined && allPairsLength > 1,
    },
  });

  const { data: pool2 } = useScaffoldReadContract({
    contractName: "UniswapV2Factory",
    functionName: "allPairs",
    args: [BigInt(2)],
    query: {
      enabled: allPairsLength !== undefined && allPairsLength > 2,
    },
  });

  const { data: pool3 } = useScaffoldReadContract({
    contractName: "UniswapV2Factory",
    functionName: "allPairs",
    args: [BigInt(3)],
    query: {
      enabled: allPairsLength !== undefined && allPairsLength > 3,
    },
  });

  const { data: pool4 } = useScaffoldReadContract({
    contractName: "UniswapV2Factory",
    functionName: "allPairs",
    args: [BigInt(4)],
    query: {
      enabled: allPairsLength !== undefined && allPairsLength > 4,
    },
  });

  // Fetch pool addresses
  useEffect(() => {
    const poolAddresses: string[] = [];
    if (pool0) poolAddresses.push(pool0 as string);
    if (pool1) poolAddresses.push(pool1 as string);
    if (pool2) poolAddresses.push(pool2 as string);
    if (pool3) poolAddresses.push(pool3 as string);
    if (pool4) poolAddresses.push(pool4 as string);

    if (poolAddresses.length > 0) {
      // Initialize pools with basic info - we'll fetch details when selected
      const initialPools = poolAddresses.map((address, index) => ({
        address,
        token0: {
          address: "0x0000000000000000000000000000000000000000",
          symbol: `Token0-${index}`,
        },
        token1: {
          address: "0x0000000000000000000000000000000000000000",
          symbol: `Token1-${index}`,
        },
        reserves: ["0", "0"] as [string, string],
      }));

      setPools(initialPools);

      if (!selectedPoolAddress && initialPools.length > 0) {
        setSelectedPoolAddress(initialPools[0].address);
      }
    }
  }, [pool0, pool1, pool2, pool3, pool4, selectedPoolAddress]);

  // Update the selected pool with real data when it changes
  useEffect(() => {
    const fetchPoolDetails = async () => {
      if (!selectedPoolAddress || !publicClient) return;

      setIsLoadingPoolDetails(true);

      try {
        // The ABI for the functions we need to call on the pair contract
        const pairAbi = [
          {
            inputs: [],
            name: "token0",
            outputs: [{ internalType: "address", name: "", type: "address" }],
            stateMutability: "view",
            type: "function",
          },
          {
            inputs: [],
            name: "token1",
            outputs: [{ internalType: "address", name: "", type: "address" }],
            stateMutability: "view",
            type: "function",
          },
          {
            inputs: [],
            name: "getReserves",
            outputs: [
              { internalType: "uint112", name: "reserve0", type: "uint112" },
              { internalType: "uint112", name: "reserve1", type: "uint112" },
              { internalType: "uint32", name: "blockTimestampLast", type: "uint32" },
            ],
            stateMutability: "view",
            type: "function",
          },
        ] as const;

        // The ABI for ERC20 token functions
        const erc20Abi = [
          {
            inputs: [],
            name: "symbol",
            outputs: [{ internalType: "string", name: "", type: "string" }],
            stateMutability: "view",
            type: "function",
          },
          {
            inputs: [],
            name: "decimals",
            outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
            stateMutability: "view",
            type: "function",
          },
        ] as const;

        // Read token addresses from the pair contract
        const token0 = (await publicClient.readContract({
          address: selectedPoolAddress as `0x${string}`,
          abi: pairAbi,
          functionName: "token0",
        })) as `0x${string}`;

        const token1 = (await publicClient.readContract({
          address: selectedPoolAddress as `0x${string}`,
          abi: pairAbi,
          functionName: "token1",
        })) as `0x${string}`;

        // Read reserves
        const reserves = (await publicClient.readContract({
          address: selectedPoolAddress as `0x${string}`,
          abi: pairAbi,
          functionName: "getReserves",
        })) as [bigint, bigint, number];

        // Get token details
        let token0Symbol = "Unknown";
        let token0Decimals = 18;
        let token1Symbol = "Unknown";
        let token1Decimals = 18;

        // Check if an address is a known token
        const checkKnownToken = (address: string) => {
          const lowerAddress = address.toLowerCase();
          return KNOWN_TOKENS[lowerAddress];
        };

        // Check if address is a contract
        const isContract = async (address: string) => {
          try {
            console.log(`Checking if address is contract: ${address}`);
            const code = await publicClient.getBytecode({ address: address as `0x${string}` });
            console.log(
              `Bytecode for ${address}:`,
              code ? `${code.substring(0, 10)}... (${code.length} bytes)` : "empty",
            );
            const isContractResult = code && code !== "0x";
            console.log(`Is ${address} a contract:`, isContractResult);

            // Get chain ID to confirm which network we're connected to
            const chainId = await publicClient.getChainId();
            console.log(`Current chain ID: ${chainId}`);

            return isContractResult;
          } catch (error) {
            console.log("Error checking if address is contract:", error);
            return false;
          }
        };

        try {
          // Check if token0 is in known tokens map
          const knownToken0 = checkKnownToken(token0);
          if (knownToken0) {
            token0Symbol = knownToken0.symbol;
            token0Decimals = knownToken0.decimals;
            console.log("Using known token0:", token0Symbol);
          }
          // Otherwise try to fetch from contract
          else if (await isContract(token0)) {
            try {
              token0Symbol = (await publicClient.readContract({
                address: token0,
                abi: erc20Abi,
                functionName: "symbol",
              })) as string;
              console.log("token0Symbol", token0Symbol);
            } catch (error) {
              console.log("Error reading token0 symbol:", error);
              // Try bytes32 symbol (some older tokens use bytes32 instead of string)
              try {
                const bytes32Abi = [
                  {
                    inputs: [],
                    name: "symbol",
                    outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
                    stateMutability: "view",
                    type: "function",
                  },
                ] as const;

                const symbolBytes = await publicClient.readContract({
                  address: token0,
                  abi: bytes32Abi,
                  functionName: "symbol",
                });

                // Convert bytes32 to string
                token0Symbol = parseBytes32String(symbolBytes as `0x${string}`);
                console.log("token0Symbol2", token0Symbol);
              } catch (innerError) {
                // If both attempts fail, use address as symbol
                token0Symbol = `${token0.substring(0, 6)}...${token0.substring(token0.length - 4)}`;
              }
            }

            try {
              token0Decimals = (await publicClient.readContract({
                address: token0,
                abi: erc20Abi,
                functionName: "decimals",
              })) as number;
            } catch (error) {
              console.log("Error reading token0 decimals:", error);
              token0Decimals = 18; // Default to 18 decimals
            }
          } else {
            // Not a contract, use address formatting
            token0Symbol = `${token0.substring(0, 6)}...${token0.substring(token0.length - 4)}`;
          }
        } catch (error) {
          console.log("Error reading token0 details:", error);
          token0Symbol = `${token0.substring(0, 6)}...${token0.substring(token0.length - 4)}`;
        }

        try {
          // Check if token1 is in known tokens map
          const knownToken1 = checkKnownToken(token1);
          if (knownToken1) {
            token1Symbol = knownToken1.symbol;
            token1Decimals = knownToken1.decimals;
            console.log("Using known token1:", token1Symbol);
          }
          // Otherwise try to fetch from contract
          else if (await isContract(token1)) {
            try {
              token1Symbol = (await publicClient.readContract({
                address: token1,
                abi: erc20Abi,
                functionName: "symbol",
              })) as string;
            } catch (error) {
              console.log("Error reading token1 symbol:", error);
              // Try bytes32 symbol (some older tokens use bytes32 instead of string)
              try {
                const bytes32Abi = [
                  {
                    inputs: [],
                    name: "symbol",
                    outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
                    stateMutability: "view",
                    type: "function",
                  },
                ] as const;

                const symbolBytes = await publicClient.readContract({
                  address: token1,
                  abi: bytes32Abi,
                  functionName: "symbol",
                });

                // Convert bytes32 to string
                token1Symbol = parseBytes32String(symbolBytes as `0x${string}`);
              } catch (innerError) {
                // If both attempts fail, use address as symbol
                token1Symbol = `${token1.substring(0, 6)}...${token1.substring(token1.length - 4)}`;
              }
            }

            try {
              token1Decimals = (await publicClient.readContract({
                address: token1,
                abi: erc20Abi,
                functionName: "decimals",
              })) as number;
            } catch (error) {
              console.log("Error reading token1 decimals:", error);
              token1Decimals = 18; // Default to 18 decimals
            }
          } else {
            // Not a contract, use address formatting
            token1Symbol = `${token1.substring(0, 6)}...${token1.substring(token1.length - 4)}`;
          }
        } catch (error) {
          console.log("Error reading token1 details:", error);
          token1Symbol = `${token1.substring(0, 6)}...${token1.substring(token1.length - 4)}`;
        }

        // Helper function to parse bytes32 into string (for older token contracts)
        function parseBytes32String(bytes32: `0x${string}`): string {
          // Remove the 0x prefix
          const hex = bytes32.substring(2);
          // Convert hex to ASCII and trim trailing zeros
          let result = "";
          for (let i = 0; i < hex.length; i += 2) {
            const code = parseInt(hex.substring(i, i + 2), 16);
            if (code === 0) break; // Stop at null terminator
            result += String.fromCharCode(code);
          }
          return result;
        }

        // Update the pool information
        setPools(prevPools =>
          prevPools.map(pool =>
            pool.address === selectedPoolAddress
              ? {
                  ...pool,
                  token0: {
                    address: token0,
                    symbol: token0Symbol,
                    decimals: token0Decimals,
                  },
                  token1: {
                    address: token1,
                    symbol: token1Symbol,
                    decimals: token1Decimals,
                  },
                  reserves: [reserves[0].toString(), reserves[1].toString()] as [string, string],
                }
              : pool,
          ),
        );
      } catch (error) {
        console.error("Error fetching pool details:", error);
      } finally {
        setIsLoadingPoolDetails(false);
      }
    };

    if (selectedPoolAddress) {
      fetchPoolDetails();
    }
  }, [selectedPoolAddress, publicClient]);

  // Update deadline every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setDeadline((Math.floor(Date.now() / 1000) + 60 * 20).toString()); // 20 minutes from now
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // ERC20 approve ABI
  const erc20ApproveAbi = [
    {
      constant: false,
      inputs: [
        { name: "spender", type: "address" },
        { name: "value", type: "uint256" },
      ],
      name: "approve",
      outputs: [{ name: "", type: "bool" }],
      payable: false,
      stateMutability: "nonpayable",
      type: "function",
    },
  ] as const;

  // Router ABIs
  const routerAddLiquidityAbi = [
    {
      inputs: [
        { name: "tokenA", type: "address" },
        { name: "tokenB", type: "address" },
        { name: "amountADesired", type: "uint256" },
        { name: "amountBDesired", type: "uint256" },
        { name: "amountAMin", type: "uint256" },
        { name: "amountBMin", type: "uint256" },
        { name: "to", type: "address" },
        { name: "deadline", type: "uint256" },
      ],
      name: "addLiquidity",
      outputs: [
        { name: "amountA", type: "uint256" },
        { name: "amountB", type: "uint256" },
        { name: "liquidity", type: "uint256" },
      ],
      stateMutability: "nonpayable",
      type: "function",
    },
  ] as const;

  const routerRemoveLiquidityAbi = [
    {
      inputs: [
        { name: "tokenA", type: "address" },
        { name: "tokenB", type: "address" },
        { name: "liquidity", type: "uint256" },
        { name: "amountAMin", type: "uint256" },
        { name: "amountBMin", type: "uint256" },
        { name: "to", type: "address" },
        { name: "deadline", type: "uint256" },
      ],
      name: "removeLiquidity",
      outputs: [
        { name: "amountA", type: "uint256" },
        { name: "amountB", type: "uint256" },
      ],
      stateMutability: "nonpayable",
      type: "function",
    },
  ] as const;

  const routerSwapAbi = [
    {
      inputs: [
        { name: "amountIn", type: "uint256" },
        { name: "amountOutMin", type: "uint256" },
        { name: "path", type: "address[]" },
        { name: "to", type: "address" },
        { name: "deadline", type: "uint256" },
      ],
      name: "swapExactTokensForTokens",
      outputs: [{ name: "amounts", type: "uint256[]" }],
      stateMutability: "nonpayable",
      type: "function",
    },
  ] as const;

  // Handle approve token
  const handleApproveToken = async (tokenType: "token0" | "token1") => {
    try {
      if (!connectedAddress || !selectedPool) {
        alert("Please connect your wallet and select a pool");
        return;
      }

      const tokenAddress = tokenType === "token0" ? selectedPool.token0.address : selectedPool.token1.address;
      const amount = tokenType === "token0" ? token0Amount : token1Amount;
      const decimals = tokenType === "token0" ? selectedPool.token0.decimals || 18 : selectedPool.token1.decimals || 18;

      if (!amount || Number(amount) <= 0) {
        alert("Please enter a valid amount");
        return;
      }

      // Unlimited approval amount (2^256 - 1)
      const maxApproval = "115792089237316195423570985008687907853269984665640564039457584007913129639935";

      // Set which token we're approving for loading state
      setLastApprovedToken(tokenType);

      writeApprove({
        address: tokenAddress as `0x${string}`,
        abi: erc20ApproveAbi,
        functionName: "approve",
        args: [routerAddress as `0x${string}`, BigInt(maxApproval)],
      });
    } catch (error) {
      console.error(`Error approving ${tokenType}:`, error);
      alert(`Error approving token: ${(error as Error).message}`);
      setLastApprovedToken(null);
    }
  };

  // Handle deposit (add liquidity)
  const handleDeposit = async () => {
    try {
      if (!connectedAddress || !selectedPool) {
        alert("Please connect your wallet and select a pool");
        return;
      }

      if (!token0Amount || !token1Amount || Number(token0Amount) <= 0 || Number(token1Amount) <= 0) {
        alert("Please enter valid amounts for both tokens");
        return;
      }

      const decimals0 = selectedPool.token0.decimals || 18;
      const decimals1 = selectedPool.token1.decimals || 18;

      // Calculate amounts with proper decimal points
      const amountA = parseUnits(token0Amount, decimals0);
      const amountB = parseUnits(token1Amount, decimals1);

      // Calculate minimum amounts based on slippage tolerance
      const slippagePercent = parseFloat(slippageTolerance) / 100;
      const amountAMin = (amountA * BigInt(Math.floor((1 - slippagePercent) * 1000))) / BigInt(1000);
      const amountBMin = (amountB * BigInt(Math.floor((1 - slippagePercent) * 1000))) / BigInt(1000);

      writeAddLiquidity({
        address: routerAddress as `0x${string}`,
        abi: routerAddLiquidityAbi,
        functionName: "addLiquidity",
        args: [
          selectedPool.token0.address as `0x${string}`,
          selectedPool.token1.address as `0x${string}`,
          amountA,
          amountB,
          amountAMin,
          amountBMin,
          connectedAddress as `0x${string}`,
          BigInt(deadline),
        ],
      });
    } catch (error) {
      console.error("Error adding liquidity:", error);
      alert(`Error adding liquidity: ${(error as Error).message}`);
    }
  };

  // Handle redeem (remove liquidity)
  const handleRedeem = async () => {
    try {
      if (!connectedAddress || !selectedPool) {
        alert("Please connect your wallet and select a pool");
        return;
      }

      if (!lpTokenAmount || Number(lpTokenAmount) <= 0) {
        alert("Please enter a valid LP token amount to redeem");
        return;
      }

      // For simplicity, we're setting minimum amounts to 0, meaning any amount of tokens is acceptable
      // In a production app, you would calculate these based on user's slippage preference
      writeRemoveLiquidity({
        address: routerAddress as `0x${string}`,
        abi: routerRemoveLiquidityAbi,
        functionName: "removeLiquidity",
        args: [
          selectedPool.token0.address as `0x${string}`,
          selectedPool.token1.address as `0x${string}`,
          parseUnits(lpTokenAmount, 18), // LP tokens typically have 18 decimals
          BigInt(0), // amountAMin - minimum amount of token0 to receive
          BigInt(0), // amountBMin - minimum amount of token1 to receive
          connectedAddress as `0x${string}`,
          BigInt(deadline),
        ],
      });
    } catch (error) {
      console.error("Error removing liquidity:", error);
      alert(`Error removing liquidity: ${(error as Error).message}`);
    }
  };

  // Handle swap
  const handleSwap = async () => {
    try {
      if (!connectedAddress || !selectedPool) {
        alert("Please connect your wallet and select a pool");
        return;
      }

      const amount = swapFromToken === "token0" ? token0Amount : token1Amount;
      if (!amount || Number(amount) <= 0) {
        alert("Please enter a valid amount to swap");
        return;
      }

      const fromTokenAddress = swapFromToken === "token0" ? selectedPool.token0.address : selectedPool.token1.address;

      const toTokenAddress = swapFromToken === "token0" ? selectedPool.token1.address : selectedPool.token0.address;

      const fromTokenDecimals =
        swapFromToken === "token0" ? selectedPool.token0.decimals || 18 : selectedPool.token1.decimals || 18;

      // Calculate swap amount with proper decimal points
      const amountIn = parseUnits(amount, fromTokenDecimals);

      // For simplicity, we're setting minimum output to 0, meaning any amount out is acceptable
      // In a production app, you would calculate this based on user's slippage preference
      const amountOutMin = BigInt(0);

      writeSwap({
        address: routerAddress as `0x${string}`,
        abi: routerSwapAbi,
        functionName: "swapExactTokensForTokens",
        args: [
          amountIn,
          amountOutMin,
          [fromTokenAddress as `0x${string}`, toTokenAddress as `0x${string}`],
          connectedAddress as `0x${string}`,
          BigInt(deadline),
        ],
      });
    } catch (error) {
      console.error("Error swapping tokens:", error);
      alert(`Error swapping tokens: ${(error as Error).message}`);
    }
  };

  // Format token name/symbol for display
  const formatTokenName = (token: TokenInfo) => {
    return token.symbol ? `${token.symbol} (${token.address.substring(0, 6)}...)` : token.address;
  };

  // Format token amount with decimals
  const formatTokenAmount = (amount: string, decimals = 18) => {
    try {
      const amountBigInt = BigInt(amount);
      const divisor = BigInt(10) ** BigInt(decimals);
      const integerPart = amountBigInt / divisor;

      // Get the decimal part with proper trailing zeros
      const decimalPartRaw = amountBigInt % divisor;
      const decimalPartStr = decimalPartRaw.toString().padStart(decimals, "0");

      // Trim trailing zeros, but keep at least 2 decimal places
      const trimmedDecimalPart = decimalPartStr.replace(/0+$/, "").padEnd(2, "0");

      return `${integerPart}.${trimmedDecimalPart}`;
    } catch (e) {
      return amount;
    }
  };

  return (
    <>
      <div className="flex items-center flex-col flex-grow pt-10">
        <div className="px-5">
          <h1 className="text-center">
            <span className="block text-2xl mb-2">Welcome to</span>
            <span className="block text-4xl font-bold">Scaffold-ETH 2 - Web3 App</span>
          </h1>
          <div className="flex justify-center items-center space-x-2 flex-col">
            <p className="my-2 font-medium">Connected Address:</p>
            <Address address={connectedAddress} />
          </div>
        </div>

        {/* Pool Selection UI */}
        <div className="flex-grow bg-base-300 w-full mt-16 px-8 py-12">
          <div className="flex flex-col items-center">
            <h2 className="text-2xl font-bold mb-6">Liquidity Pool Selection</h2>

            <div className="form-control w-full max-w-xs mb-6">
              <label className="label">
                <span className="label-text">Select a Pool</span>
              </label>
              <select
                className="select select-bordered w-full max-w-xs"
                value={selectedPoolAddress}
                onChange={e => setSelectedPoolAddress(e.target.value)}
                disabled={isLoadingPoolDetails}
              >
                <option disabled value="">
                  Select a pool
                </option>
                {pools.map((pool, index) => {
                  const poolName = `Pool ${index + 1}: ${pool.token0.symbol}-${pool.token1.symbol}`;
                  return (
                    <option key={index} value={pool.address}>
                      {poolName}
                    </option>
                  );
                })}
              </select>
            </div>

            {selectedPool && (
              <div className="card w-full max-w-md bg-base-100 shadow-xl mb-8">
                <div className="card-body">
                  <h2 className="card-title flex justify-between">
                    Pool Details
                    {isLoadingPoolDetails && <span className="loading loading-spinner loading-md"></span>}
                  </h2>
                  <div className="overflow-x-auto">
                    <table className="table w-full">
                      <tbody>
                        <tr>
                          <td className="font-bold">Pool Address:</td>
                          <td className="break-all">
                            <Address address={selectedPool.address} />
                          </td>
                        </tr>
                        <tr>
                          <td className="font-bold">Token0:</td>
                          <td className="break-all">
                            {formatTokenName(selectedPool.token0)}
                            <div className="text-xs mt-1">
                              <Address address={selectedPool.token0.address} />
                            </div>
                          </td>
                        </tr>
                        <tr>
                          <td className="font-bold">Token1:</td>
                          <td className="break-all">
                            {formatTokenName(selectedPool.token1)}
                            <div className="text-xs mt-1">
                              <Address address={selectedPool.token1.address} />
                            </div>
                          </td>
                        </tr>
                        <tr>
                          <td className="font-bold">Reserves:</td>
                          <td>
                            <div>
                              {formatTokenName(selectedPool.token0)}:{" "}
                              {formatTokenAmount(selectedPool.reserves[0], selectedPool.token0.decimals)}
                            </div>
                            <div>
                              {formatTokenName(selectedPool.token1)}:{" "}
                              {formatTokenAmount(selectedPool.reserves[1], selectedPool.token1.decimals)}
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Add Pool Visualization before Pool Actions */}
            {selectedPool && (
              <div className="card w-full max-w-md bg-base-100 shadow-xl mb-8">
                <div className="card-body">
                  <PoolVisualization
                    token0={selectedPool.token0}
                    token1={selectedPool.token1}
                    reserves={selectedPool.reserves}
                    activeTab={activeTab}
                    swapAmount={swapFromToken === "token0" ? token0Amount : token1Amount}
                    swapFromToken={swapFromToken}
                    isLoading={isLoadingPoolDetails}
                    poolAddress={selectedPool.address}
                  />
                </div>
              </div>
            )}

            {/* Pool Actions UI */}
            {selectedPool && (
              <div className="card w-full max-w-md bg-base-100 shadow-xl">
                <div className="card-body">
                  <h2 className="card-title">Pool Actions</h2>

                  {/* Tabs */}
                  <div className="tabs tabs-boxed mb-4">
                    <a
                      className={`tab ${activeTab === "deposit" ? "tab-active" : ""}`}
                      onClick={() => setActiveTab("deposit")}
                    >
                      Deposit
                    </a>
                    <a
                      className={`tab ${activeTab === "redeem" ? "tab-active" : ""}`}
                      onClick={() => setActiveTab("redeem")}
                    >
                      Redeem
                    </a>
                    <a
                      className={`tab ${activeTab === "swap" ? "tab-active" : ""}`}
                      onClick={() => setActiveTab("swap")}
                    >
                      Swap
                    </a>
                  </div>

                  {/* Deposit UI */}
                  {activeTab === "deposit" && (
                    <div>
                      <div className="form-control mb-3">
                        <label className="label">
                          <span className="label-text">{selectedPool.token0.symbol} Amount</span>
                        </label>
                        <div className="flex space-x-2">
                          <input
                            type="text"
                            placeholder={`Amount of ${selectedPool.token0.symbol}`}
                            className="input input-bordered flex-1"
                            value={token0Amount}
                            onChange={e => setToken0Amount(e.target.value)}
                          />
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleApproveToken("token0")}
                            disabled={!token0Amount || isApprovingToken0}
                          >
                            {isApprovingToken0 ? "Approving..." : "Approve"}
                          </button>
                        </div>
                      </div>

                      <div className="form-control mb-3">
                        <label className="label">
                          <span className="label-text">{selectedPool.token1.symbol} Amount</span>
                        </label>
                        <div className="flex space-x-2">
                          <input
                            type="text"
                            placeholder={`Amount of ${selectedPool.token1.symbol}`}
                            className="input input-bordered flex-1"
                            value={token1Amount}
                            onChange={e => setToken1Amount(e.target.value)}
                          />
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleApproveToken("token1")}
                            disabled={!token1Amount || isApprovingToken1}
                          >
                            {isApprovingToken1 ? "Approving..." : "Approve"}
                          </button>
                        </div>
                      </div>

                      <div className="form-control mb-4">
                        <label className="label">
                          <span className="label-text">Slippage Tolerance (%)</span>
                        </label>
                        <input
                          type="number"
                          placeholder="Slippage tolerance"
                          className="input input-bordered"
                          value={slippageTolerance}
                          onChange={e => setSlippageTolerance(e.target.value)}
                          min="0.1"
                          max="10"
                          step="0.1"
                        />
                      </div>

                      <button
                        className="btn btn-primary w-full"
                        onClick={handleDeposit}
                        disabled={!token0Amount || !token1Amount || isAddingLiquidity}
                      >
                        {isAddingLiquidity ? "Adding Liquidity..." : "Add Liquidity"}
                      </button>
                    </div>
                  )}

                  {/* Redeem UI */}
                  {activeTab === "redeem" && (
                    <div>
                      <div className="form-control mb-4">
                        <label className="label">
                          <span className="label-text">LP Token Amount</span>
                        </label>
                        <input
                          type="text"
                          placeholder="Amount of LP tokens to redeem"
                          className="input input-bordered"
                          value={lpTokenAmount}
                          onChange={e => setLpTokenAmount(e.target.value)}
                        />
                      </div>

                      <button
                        className="btn btn-primary w-full"
                        onClick={handleRedeem}
                        disabled={!lpTokenAmount || isRemovingLiquidity}
                      >
                        {isRemovingLiquidity ? "Removing Liquidity..." : "Remove Liquidity"}
                      </button>
                    </div>
                  )}

                  {/* Swap UI */}
                  {activeTab === "swap" && (
                    <div>
                      <div className="form-control mb-3">
                        <label className="label">
                          <span className="label-text">Swap Direction</span>
                        </label>
                        <select
                          className="select select-bordered w-full"
                          value={swapFromToken}
                          onChange={e => setSwapFromToken(e.target.value as "token0" | "token1")}
                        >
                          <option value="token0">
                            {selectedPool.token0.symbol} → {selectedPool.token1.symbol}
                          </option>
                          <option value="token1">
                            {selectedPool.token1.symbol} → {selectedPool.token0.symbol}
                          </option>
                        </select>
                      </div>

                      <div className="form-control mb-4">
                        <label className="label">
                          <span className="label-text">
                            {swapFromToken === "token0" ? selectedPool.token0.symbol : selectedPool.token1.symbol}{" "}
                            Amount
                          </span>
                        </label>
                        <div className="flex space-x-2">
                          <input
                            type="text"
                            placeholder={`Amount to swap`}
                            className="input input-bordered flex-1"
                            value={swapFromToken === "token0" ? token0Amount : token1Amount}
                            onChange={e =>
                              swapFromToken === "token0"
                                ? setToken0Amount(e.target.value)
                                : setToken1Amount(e.target.value)
                            }
                          />
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleApproveToken(swapFromToken)}
                            disabled={
                              !(swapFromToken === "token0" ? token0Amount : token1Amount) ||
                              (swapFromToken === "token0" ? isApprovingToken0 : isApprovingToken1)
                            }
                          >
                            {(swapFromToken === "token0" ? isApprovingToken0 : isApprovingToken1)
                              ? "Approving..."
                              : "Approve"}
                          </button>
                        </div>
                      </div>

                      <button
                        className="btn btn-primary w-full"
                        onClick={handleSwap}
                        disabled={!(swapFromToken === "token0" ? token0Amount : token1Amount) || isSwapping}
                      >
                        {isSwapping ? "Swapping..." : "Swap Tokens"}
                      </button>
                    </div>
                  )}

                  <div className="mt-4 text-sm opacity-70">
                    <p>Note: Before interacting with the pool, ensure you have:</p>
                    <ol className="list-decimal list-inside mt-2">
                      <li>Approved the contracts to spend your tokens</li>
                      <li>Sufficient token balance for the operation</li>
                      <li>Confirmed the transaction details</li>
                    </ol>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex-grow bg-base-300 w-full px-8 py-12">
          <div className="flex justify-center items-center gap-12 flex-col md:flex-row">
            <div className="flex flex-col bg-base-100 px-10 py-10 text-center items-center max-w-xs rounded-3xl">
              <BugAntIcon className="h-8 w-8 fill-secondary" />
              <p>
                Tinker with your smart contract using the{" "}
                <Link href="/debug" passHref className="link">
                  Debug Contracts
                </Link>{" "}
                tab.
              </p>
            </div>
            <div className="flex flex-col bg-base-100 px-10 py-10 text-center items-center max-w-xs rounded-3xl">
              <MagnifyingGlassIcon className="h-8 w-8 fill-secondary" />
              <p>
                Explore your local transactions with the{" "}
                <Link href="/blockexplorer" passHref className="link">
                  Block Explorer
                </Link>{" "}
                tab.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;
