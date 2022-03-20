import React from "react";
import { DrizzleContext } from "@drizzle/react-plugin";
import {StakedBalance} from './StakedBalance'
import {Profile} from './Profile'
import {StakeButton} from './StakeButton'
import "./App.css";

const App = () => (
  <DrizzleContext.Consumer>
    {({ drizzle, drizzleState, initialized }) => {
      if (!initialized) {
        return "Trying to login and load blockchain data..."
      }

      return (
        <div>
          <Profile {...{drizzle, drizzleState}} />
          <StakedBalance {...{drizzle, drizzleState}}  />
          <StakeButton {...{drizzle, drizzleState}} />
        </div>
      )
    }}
  </DrizzleContext.Consumer>
);

export default App;
