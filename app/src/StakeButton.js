import React, {useEffect, useState} from "react";

export const StakeButton = ({ drizzle, drizzleState }) => {
    const {StakingVault} = drizzle.contracts
    const [stackId, setStakeId] = useState(null)

    const stake = () => {
        setStakeId(StakingVault.methods.deposit.cacheSend({
            from: drizzleState.accounts[0],
            value: 10 * 1000000000 * 1000000000
        }))
    }

    return (
        <p>
            <button onClick={() => stake()}>Stake</button>
            {stackId && <Transaction {...{stackId, drizzleState}} />}
        </p>
    )
}

const Transaction = ({stackId, drizzleState}) => {
    const {transactions, transactionStack} = drizzleState
    const txHash = stackId && transactionStack[stackId]
    if(!txHash) {
        return null
    }

    return `Transaction status: ${transactions[txHash] ? transactions[txHash].status : "Sending to blockchain..."}`;
}