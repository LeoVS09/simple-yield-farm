import React from "react";
import { DrizzleContext } from "@drizzle/react-plugin";
import MyComponent from "./MyComponent";
import "./App.css";

const App = () => (
  <DrizzleContext.Consumer>
    {({ drizzle, drizzleState, initialized }) => {
      if (!initialized) {
        return "Trying to login and load blockchain data..."
      }

      return (
        <MyComponent drizzle={drizzle} drizzleState={drizzleState} />
      )
    }}
  </DrizzleContext.Consumer>
);

export default App;
