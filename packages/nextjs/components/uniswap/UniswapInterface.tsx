import { useEffect, useState } from "react";
import TokenApproval from "./TokenApproval";
import { useAccount } from "wagmi";
import { useTargetNetwork } from "~~/hooks/scaffold-eth";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth/useScaffoldReadContract";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth/useScaffoldWriteContract";

const UniswapInterface = () => {
  const { address, isConnected } = useAccount();
  const { targetNetwork } = useTargetNetwork();
  const [wethAddress, setWethAddress] = useState<string>("");
  const [factoryAddress, setFactoryAddress] = useState<string>("");
  const [tokenA, setTokenA] = useState<string>("");
  const [tokenB, setTokenB] = useState<string>("");
  const [pairAddress, setPairAddress] = useState<string>("");
  const [amountIn, setAmountIn] = useState<string>("0");
  const [amountOutMin, setAmountOutMin] = useState<string>("0");
  const [deadline, setDeadline] = useState<string>((Math.floor(Date.now() / 1000) + 60 * 20).toString()); // 20 minutes from now
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [routerAddress, setRouterAddress] = useState<string>("0xeE567Fe1712Faf6149d80dA1E6934E354124CfE3"); // Sepolia router

  // Read WETH address from UniswapV2Router02
  const { data: wethAddressData } = useScaffoldReadContract({
    contractName: "UniswapV2Router02",
    functionName: "WETH",
    chainId: 11155111,
  });

  // Read Factory address from UniswapV2Router02
  const { data: factoryAddressData } = useScaffoldReadContract({
    contractName: "UniswapV2Router02",
    functionName: "factory",
    chainId: 11155111,
  });

  // Get pair address from UniswapV2Factory
  const { data: pairAddressData } = useScaffoldReadContract({
    contractName: "UniswapV2Factory",
    functionName: "getPair",
    args: [tokenA, tokenB],
    chainId: 11155111,
  });

  // Setup contract write function for swap
  const { writeContractAsync, isMining } = useScaffoldWriteContract("UniswapV2Router02");

  // Update state when contract data is available
  useEffect(() => {
    if (wethAddressData) {
      setWethAddress(wethAddressData);
    }
    if (factoryAddressData) {
      setFactoryAddress(factoryAddressData);
    }
    if (pairAddressData) {
      setPairAddress(pairAddressData);
    }
  }, [wethAddressData, factoryAddressData, pairAddressData]);

  // Update deadline every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setDeadline((Math.floor(Date.now() / 1000) + 60 * 20).toString()); // 20 minutes from now
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleSwap = async () => {
    try {
      if (!address || !isConnected) {
        alert("Please connect your wallet");
        return;
      }

      if (!tokenA || !tokenB) {
        alert("Please enter valid token addresses");
        return;
      }

      await writeContractAsync({
        functionName: "swapExactTokensForTokens",
        args: [BigInt(amountIn), BigInt(amountOutMin), [tokenA, tokenB], address, BigInt(deadline)],
      });
    } catch (error) {
      console.error("Error swapping tokens:", error);
    }
  };

  return (
    <div className="bg-base-100 p-6 rounded-xl shadow-lg max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-center">Uniswap V2 Interface (Sepolia Testnet)</h2>

      <div className="mb-4">
        <div className="stats bg-primary text-primary-content shadow mb-4 w-full">
          <div className="stat">
            <div className="stat-title">WETH Address</div>
            <div className="stat-value text-xs md:text-sm">{wethAddress || "Loading..."}</div>
          </div>
        </div>

        <div className="stats bg-primary text-primary-content shadow mb-4 w-full">
          <div className="stat">
            <div className="stat-title">Factory Address</div>
            <div className="stat-value text-xs md:text-sm">{factoryAddress || "Loading..."}</div>
          </div>
        </div>

        <div className="stats bg-primary text-primary-content shadow mb-4 w-full">
          <div className="stat">
            <div className="stat-title">Router Address</div>
            <div className="stat-value text-xs md:text-sm">{routerAddress || "Not set"}</div>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <div className="form-control mb-4">
          <label className="label">
            <span className="label-text">Token A Address</span>
          </label>
          <input
            type="text"
            placeholder="Token A Address (e.g. WETH)"
            className="input input-bordered"
            value={tokenA}
            onChange={e => setTokenA(e.target.value)}
          />
        </div>

        {tokenA && <TokenApproval tokenAddress={tokenA} spenderAddress={routerAddress} />}

        <div className="form-control mb-4">
          <label className="label">
            <span className="label-text">Token B Address</span>
          </label>
          <input
            type="text"
            placeholder="Token B Address"
            className="input input-bordered"
            value={tokenB}
            onChange={e => setTokenB(e.target.value)}
          />
        </div>

        {tokenA && tokenB && (
          <div className="stats bg-secondary text-secondary-content shadow mb-4 w-full">
            <div className="stat">
              <div className="stat-title">Pair Address</div>
              <div className="stat-value text-xs md:text-sm">{pairAddress || "Not Found"}</div>
            </div>
          </div>
        )}
      </div>

      <div className="divider">Swap Tokens</div>

      <div className="form-control mb-4">
        <label className="label">
          <span className="label-text">Amount In</span>
        </label>
        <input
          type="number"
          placeholder="Amount of Token A"
          className="input input-bordered"
          value={amountIn}
          onChange={e => setAmountIn(e.target.value)}
        />
      </div>

      <div className="form-control mb-4">
        <label className="label">
          <span className="label-text">Minimum Amount Out</span>
        </label>
        <input
          type="number"
          placeholder="Minimum amount of Token B"
          className="input input-bordered"
          value={amountOutMin}
          onChange={e => setAmountOutMin(e.target.value)}
        />
      </div>

      <button
        className="btn btn-primary w-full"
        onClick={handleSwap}
        disabled={!tokenA || !tokenB || !amountIn || !amountOutMin || isMining}
      >
        {isMining ? "Swapping..." : "Swap Tokens"}
      </button>

      <div className="mt-6 text-sm opacity-70">
        <p>Note: Before swapping, ensure you have:</p>
        <ol className="list-decimal list-inside mt-2">
          <li>Approved the router contract to spend your tokens</li>
          <li>Sufficient token balance</li>
          <li>The pair exists on Uniswap</li>
        </ol>
        <p className="mt-2">Using Sepolia testnet Uniswap contracts:</p>
        <ul className="list-disc list-inside mt-1">
          <li>
            Router: {targetNetwork.id === 11155111 ? "0xeE567Fe1712Faf6149d80dA1E6934E354124CfE3" : "Not on Sepolia"}
          </li>
          <li>
            Factory: {targetNetwork.id === 11155111 ? "0xF62c03E08ada871A0bEb309762E260a7a6a880E6" : "Not on Sepolia"}
          </li>
        </ul>
      </div>
    </div>
  );
};

export default UniswapInterface;
