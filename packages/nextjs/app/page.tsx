"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { NextPage } from "next";
import { useAccount, usePublicClient } from "wagmi";
import { BugAntIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { Address } from "~~/components/scaffold-eth";
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

const Home: NextPage = () => {
  const { address: connectedAddress } = useAccount();
  const publicClient = usePublicClient();
  const [selectedPoolAddress, setSelectedPoolAddress] = useState<string>("");
  const [pools, setPools] = useState<PoolInfo[]>([]);
  const [isLoadingPoolDetails, setIsLoadingPoolDetails] = useState(false);

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

  // Find the selected pool from our pools array
  const selectedPool = pools.find(pool => pool.address === selectedPoolAddress);

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
              <div className="card w-full max-w-md bg-base-100 shadow-xl">
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
