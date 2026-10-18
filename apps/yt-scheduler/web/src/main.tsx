import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import { initApi } from "./api";
import { App } from "./App";

void initApi().then(() => {
  ReactDOM.createRoot(document.getElementById("root")!).render(<React.StrictMode><App /></React.StrictMode>);
});
