import { GenericContractsDeclaration } from "~~/utils/scaffold-eth/contract";

/**
 * @example
 * const externalContracts = {
 *   1: {
 *     DAI: {
 *       address: "0x...",
 *       abi: [...],
 *     },
 *   },
 * } as const;
 */
const externalContracts = {
  // Sepolia testnet deployed Uniswap V2 contracts
  11155111: {
    UniswapV2Factory: {
      address: "0xF62c03E08ada871A0bEb309762E260a7a6a880E6",
      abi: [
        {
          inputs: [
            {
              internalType: "address",
              name: "_feeToSetter",
              type: "address",
            },
          ],
          stateMutability: "nonpayable",
          type: "constructor",
        },
        {
          anonymous: false,
          inputs: [
            {
              indexed: true,
              internalType: "address",
              name: "token0",
              type: "address",
            },
            {
              indexed: true,
              internalType: "address",
              name: "token1",
              type: "address",
            },
            {
              indexed: false,
              internalType: "address",
              name: "pair",
              type: "address",
            },
            {
              indexed: false,
              internalType: "uint256",
              name: "",
              type: "uint256",
            },
          ],
          name: "PairCreated",
          type: "event",
        },
        {
          inputs: [
            {
              internalType: "uint256",
              name: "",
              type: "uint256",
            },
          ],
          name: "allPairs",
          outputs: [
            {
              internalType: "address",
              name: "",
              type: "address",
            },
          ],
          stateMutability: "view",
          type: "function",
        },
        {
          inputs: [],
          name: "allPairsLength",
          outputs: [
            {
              internalType: "uint256",
              name: "",
              type: "uint256",
            },
          ],
          stateMutability: "view",
          type: "function",
        },
        {
          inputs: [
            {
              internalType: "address",
              name: "tokenA",
              type: "address",
            },
            {
              internalType: "address",
              name: "tokenB",
              type: "address",
            },
          ],
          name: "createPair",
          outputs: [
            {
              internalType: "address",
              name: "pair",
              type: "address",
            },
          ],
          stateMutability: "nonpayable",
          type: "function",
        },
        {
          inputs: [],
          name: "feeTo",
          outputs: [
            {
              internalType: "address",
              name: "",
              type: "address",
            },
          ],
          stateMutability: "view",
          type: "function",
        },
        {
          inputs: [],
          name: "feeToSetter",
          outputs: [
            {
              internalType: "address",
              name: "",
              type: "address",
            },
          ],
          stateMutability: "view",
          type: "function",
        },
        {
          inputs: [
            {
              internalType: "address",
              name: "tokenA",
              type: "address",
            },
            {
              internalType: "address",
              name: "tokenB",
              type: "address",
            },
          ],
          name: "getPair",
          outputs: [
            {
              internalType: "address",
              name: "pair",
              type: "address",
            },
          ],
          stateMutability: "view",
          type: "function",
        },
        {
          inputs: [
            {
              internalType: "address",
              name: "",
              type: "address",
            },
          ],
          name: "setFeeTo",
          outputs: [],
          stateMutability: "nonpayable",
          type: "function",
        },
        {
          inputs: [
            {
              internalType: "address",
              name: "",
              type: "address",
            },
          ],
          name: "setFeeToSetter",
          outputs: [],
          stateMutability: "nonpayable",
          type: "function",
        },
      ],
    },
    UniswapV2Router02: {
      address: "0xeE567Fe1712Faf6149d80dA1E6934E354124CfE3",
      abi: [
        {
          inputs: [
            {
              internalType: "address",
              name: "_factory",
              type: "address",
            },
            {
              internalType: "address",
              name: "_WETH",
              type: "address",
            },
          ],
          stateMutability: "nonpayable",
          type: "constructor",
        },
        {
          inputs: [],
          name: "WETH",
          outputs: [
            {
              internalType: "address",
              name: "",
              type: "address",
            },
          ],
          stateMutability: "view",
          type: "function",
        },
        {
          inputs: [
            {
              internalType: "address",
              name: "tokenA",
              type: "address",
            },
            {
              internalType: "address",
              name: "tokenB",
              type: "address",
            },
            {
              internalType: "uint256",
              name: "amountADesired",
              type: "uint256",
            },
            {
              internalType: "uint256",
              name: "amountBDesired",
              type: "uint256",
            },
            {
              internalType: "uint256",
              name: "amountAMin",
              type: "uint256",
            },
            {
              internalType: "uint256",
              name: "amountBMin",
              type: "uint256",
            },
            {
              internalType: "address",
              name: "to",
              type: "address",
            },
            {
              internalType: "uint256",
              name: "deadline",
              type: "uint256",
            },
          ],
          name: "addLiquidity",
          outputs: [
            {
              internalType: "uint256",
              name: "amountA",
              type: "uint256",
            },
            {
              internalType: "uint256",
              name: "amountB",
              type: "uint256",
            },
            {
              internalType: "uint256",
              name: "liquidity",
              type: "uint256",
            },
          ],
          stateMutability: "nonpayable",
          type: "function",
        },
        {
          inputs: [],
          name: "factory",
          outputs: [
            {
              internalType: "address",
              name: "",
              type: "address",
            },
          ],
          stateMutability: "view",
          type: "function",
        },
        {
          inputs: [
            {
              internalType: "uint256",
              name: "amountOut",
              type: "uint256",
            },
            {
              internalType: "uint256",
              name: "reserveIn",
              type: "uint256",
            },
            {
              internalType: "uint256",
              name: "reserveOut",
              type: "uint256",
            },
          ],
          name: "getAmountIn",
          outputs: [
            {
              internalType: "uint256",
              name: "amountIn",
              type: "uint256",
            },
          ],
          stateMutability: "pure",
          type: "function",
        },
        {
          inputs: [
            {
              internalType: "uint256",
              name: "amountIn",
              type: "uint256",
            },
            {
              internalType: "uint256",
              name: "reserveIn",
              type: "uint256",
            },
            {
              internalType: "uint256",
              name: "reserveOut",
              type: "uint256",
            },
          ],
          name: "getAmountOut",
          outputs: [
            {
              internalType: "uint256",
              name: "amountOut",
              type: "uint256",
            },
          ],
          stateMutability: "pure",
          type: "function",
        },
        {
          inputs: [
            {
              internalType: "uint256",
              name: "amountOut",
              type: "uint256",
            },
            {
              internalType: "address[]",
              name: "path",
              type: "address[]",
            },
          ],
          name: "getAmountsIn",
          outputs: [
            {
              internalType: "uint256[]",
              name: "amounts",
              type: "uint256[]",
            },
          ],
          stateMutability: "view",
          type: "function",
        },
        {
          inputs: [
            {
              internalType: "uint256",
              name: "amountIn",
              type: "uint256",
            },
            {
              internalType: "address[]",
              name: "path",
              type: "address[]",
            },
          ],
          name: "getAmountsOut",
          outputs: [
            {
              internalType: "uint256[]",
              name: "amounts",
              type: "uint256[]",
            },
          ],
          stateMutability: "view",
          type: "function",
        },
        {
          inputs: [
            {
              internalType: "uint256",
              name: "amountA",
              type: "uint256",
            },
            {
              internalType: "uint256",
              name: "reserveA",
              type: "uint256",
            },
            {
              internalType: "uint256",
              name: "reserveB",
              type: "uint256",
            },
          ],
          name: "quote",
          outputs: [
            {
              internalType: "uint256",
              name: "amountB",
              type: "uint256",
            },
          ],
          stateMutability: "pure",
          type: "function",
        },
        {
          inputs: [
            {
              internalType: "uint256",
              name: "amountOutMin",
              type: "uint256",
            },
            {
              internalType: "address[]",
              name: "path",
              type: "address[]",
            },
            {
              internalType: "address",
              name: "to",
              type: "address",
            },
            {
              internalType: "uint256",
              name: "deadline",
              type: "uint256",
            },
          ],
          name: "swapExactETHForTokens",
          outputs: [
            {
              internalType: "uint256[]",
              name: "amounts",
              type: "uint256[]",
            },
          ],
          stateMutability: "payable",
          type: "function",
        },
        {
          inputs: [
            {
              internalType: "uint256",
              name: "amountIn",
              type: "uint256",
            },
            {
              internalType: "uint256",
              name: "amountOutMin",
              type: "uint256",
            },
            {
              internalType: "address[]",
              name: "path",
              type: "address[]",
            },
            {
              internalType: "address",
              name: "to",
              type: "address",
            },
            {
              internalType: "uint256",
              name: "deadline",
              type: "uint256",
            },
          ],
          name: "swapExactTokensForETH",
          outputs: [
            {
              internalType: "uint256[]",
              name: "amounts",
              type: "uint256[]",
            },
          ],
          stateMutability: "nonpayable",
          type: "function",
        },
        {
          inputs: [
            {
              internalType: "uint256",
              name: "amountIn",
              type: "uint256",
            },
            {
              internalType: "uint256",
              name: "amountOutMin",
              type: "uint256",
            },
            {
              internalType: "address[]",
              name: "path",
              type: "address[]",
            },
            {
              internalType: "address",
              name: "to",
              type: "address",
            },
            {
              internalType: "uint256",
              name: "deadline",
              type: "uint256",
            },
          ],
          name: "swapExactTokensForTokens",
          outputs: [
            {
              internalType: "uint256[]",
              name: "amounts",
              type: "uint256[]",
            },
          ],
          stateMutability: "nonpayable",
          type: "function",
        },
      ],
    },
  },
} as const;

export default externalContracts satisfies GenericContractsDeclaration;
