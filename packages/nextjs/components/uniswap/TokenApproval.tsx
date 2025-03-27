import { useState } from "react";

interface TokenApprovalProps {
  tokenAddress: string;
  spenderAddress: string;
}

const TokenApproval = ({ tokenAddress, spenderAddress }: TokenApprovalProps) => {
  const [approvalAmount, setApprovalAmount] = useState<string>("0");
  const [isApproving, setIsApproving] = useState<boolean>(false);

  const handleApprove = async () => {
    try {
      if (!tokenAddress || !spenderAddress) {
        alert("Please enter valid token and spender addresses");
        return;
      }

      setIsApproving(true);
      // In a real implementation, you would call the contract here
      console.log(`Approving ${approvalAmount} tokens for ${spenderAddress}`);

      // Simulate approval delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      setIsApproving(false);
    } catch (error) {
      console.error("Error approving tokens:", error);
      setIsApproving(false);
    }
  };

  // Handle approving max amount (uint256 max value)
  const handleApproveMax = () => {
    setApprovalAmount("115792089237316195423570985008687907853269984665640564039457584007913129639935"); // 2^256 - 1
  };

  return (
    <div className="bg-base-200 p-4 rounded-lg shadow mb-6">
      <h3 className="text-lg font-semibold mb-3">Token Approval</h3>

      <div className="form-control mb-3">
        <label className="label">
          <span className="label-text">Approval Amount</span>
        </label>
        <div className="flex space-x-2">
          <input
            type="text"
            placeholder="Amount to approve"
            className="input input-bordered flex-1"
            value={approvalAmount}
            onChange={e => setApprovalAmount(e.target.value)}
          />
          <button className="btn btn-secondary btn-sm whitespace-nowrap" onClick={handleApproveMax}>
            Approve Max
          </button>
        </div>
      </div>

      <button
        className="btn btn-primary w-full mt-2"
        onClick={handleApprove}
        disabled={!tokenAddress || !spenderAddress || !approvalAmount || isApproving}
      >
        {isApproving ? "Approving..." : "Approve Token"}
      </button>

      <div className="mt-3 text-xs opacity-70">
        <p>Approving tokens allows the Uniswap Router to spend your tokens when swapping.</p>
      </div>
    </div>
  );
};

export default TokenApproval;
