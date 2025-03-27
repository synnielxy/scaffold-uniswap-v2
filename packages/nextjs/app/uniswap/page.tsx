"use client";

import type { NextPage } from "next";
import UniswapInterface from "~~/components/uniswap/UniswapInterface";

const UniswapPage: NextPage = () => {
  return (
    <div className="flex items-center flex-col flex-grow pt-10">
      <div className="px-5 w-full md:max-w-5xl">
        <h1 className="text-center mb-8">
          <span className="block text-2xl mb-2">Welcome to</span>
          <span className="block text-4xl font-bold">Uniswap V2 Testnet Interface</span>
        </h1>
        <p className="text-center text-lg">
          This interface allows you to interact with deployed Uniswap V2 contracts on Sepolia testnet.
        </p>

        <div className="mt-8 mb-16">
          <UniswapInterface />
        </div>
      </div>
    </div>
  );
};

export default UniswapPage;
