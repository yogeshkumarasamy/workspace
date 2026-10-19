import { createRoot } from "react-dom/client";
import "./styles/index.css";
import App from "./App";
import { loadAppConfig } from "./runtime";

const container = document.getElementById("app");
if (container) {
  void loadAppConfig().finally(() => {
    createRoot(container).render(<App />);
  });
}
