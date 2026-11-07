import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "./index.css";

let saved = null;
try { saved = localStorage.getItem("flipfile-theme"); } catch { /* storage blocked */ }
// Light is the default. Dark only opens if the visitor chose it earlier with the toggle.
document.documentElement.dataset.theme = saved === "dark" ? "dark" : "light";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);