import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

// Polyfill Buffer for browser-only Solana/Arcium dependencies.
import { Buffer } from "buffer";
import process from "process";
window.Buffer = Buffer;
window.process = process;
globalThis.Buffer = Buffer;
globalThis.process = process;

const root = createRoot(document.getElementById("root"));

import("./App.jsx").then(({ default: App }) => {
  root.render(
    <StrictMode>
      <App />
    </StrictMode>
  );
});
