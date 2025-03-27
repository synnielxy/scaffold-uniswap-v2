import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { Contract } from "ethers";

/**
 * Deploys Uniswap V2 Factory and Router contracts using the deployer account
 *
 * @param hre HardhatRuntimeEnvironment object.
 */
const deployUniswap: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  /*
    On localhost, the deployer account is the one that comes with Hardhat, which is already funded.

    When deploying to live networks (e.g `yarn deploy --network sepolia`), the deployer account
    should have sufficient balance to pay for the gas fees for contract creation.

    You can generate a random account with `yarn generate` or `yarn account:import` to import your
    existing PK which will fill DEPLOYER_PRIVATE_KEY_ENCRYPTED in the .env file (then used on hardhat.config.ts)

    You can run the `yarn account` command to check your balance in every network.
  */
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  // Deploy the Factory first
  const factory = await deploy("UniswapV2Factory", {
    from: deployer,
    // Contract constructor arguments
    args: [deployer], // Set the fee-to address as the deployer
    log: true,
    autoMine: true,
  });

  // Get the deployed factory contract address
  const factoryAddress = factory.address;

  // Deploy the Router with the factory address
  // We're using address(0) for WETH as shown in your reference script
  await deploy("UniswapV2Router02", {
    from: deployer,
    // Contract constructor arguments
    args: [factoryAddress, "0x0000000000000000000000000000000000000000"], // Factory address and address(0) for WETH
    log: true,
    autoMine: true,
  });

  // Get the deployed contracts to interact with them after deploying.
  const factoryContract = await hre.ethers.getContract<Contract>("UniswapV2Factory", deployer);
  const routerContract = await hre.ethers.getContract<Contract>("UniswapV2Router02", deployer);

  console.log("🏭 UniswapV2Factory deployed at:", factoryContract.address);
  console.log("🔄 UniswapV2Router02 deployed at:", routerContract.address);
};

export default deployUniswap;

// Tags are useful if you have multiple deploy files and only want to run one of them.
// e.g. yarn deploy --tags Uniswap
deployUniswap.tags = ["Uniswap"];
