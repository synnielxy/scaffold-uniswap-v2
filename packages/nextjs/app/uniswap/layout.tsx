import { ReactNode } from "react";
import { getMetadata } from "~~/utils/scaffold-eth/getMetadata";

export const metadata = getMetadata({
  title: "Uniswap V2 Interface",
  description: "Connect to deployed Uniswap contracts on testnets with Scaffold-ETH 2",
});

const UniswapLayout = ({ children }: { children: ReactNode }) => {
  return <>{children}</>;
};

export default UniswapLayout;
