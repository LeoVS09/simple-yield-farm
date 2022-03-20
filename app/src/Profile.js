import React from "react";
import { newContextComponents } from "@drizzle/react-components";

const { AccountData } = newContextComponents;


export const Profile = ({ drizzle, drizzleState }) => {
    return (
        <div>
            <h2>Active Account</h2>
            <AccountData
              drizzle={drizzle}
              drizzleState={drizzleState}
              accountIndex={0}
              units="ether"
              precision={3}
            />
          </div>
    )
}