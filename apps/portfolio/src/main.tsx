import { createRoot } from "react-dom/client";
import "./styles/index.css";
import App from "./App";

const container = document.getElementById("app");
if (container) {
  createRoot(container).render(<App />);
}
