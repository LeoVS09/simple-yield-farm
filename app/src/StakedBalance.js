import React, {useEffect, useState} from "react";

export const StakedBalance = ({ drizzle, drizzleState }) => {
    const {StakingVault} = drizzle.contracts
    const [getCurrentBalanceKey, setKey] = useState(null)

    useEffect(() => {
        setKey(StakingVault.methods.getCurrentBalance.cacheCall())        
    }, [])

    const balance = getCurrentBalanceKey && StakingVault.getCurrentBalanceKey && StakingVault.getCurrentBalanceKey[getCurrentBalanceKey]

    return <p><b>Stacked:</b> {balance && balance.value}</p>

}