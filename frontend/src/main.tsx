import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { installAuthListener } from "./store/useAuthStore";
import "./styles.css";

// Bootstrap the Supabase auth listener once, before React mounts. The auth
// store flips `bootstrapped` to true once the initial session restore
// finishes — App.tsx waits on that flag before deciding which version of
// the home page to render, so a returning signed-in visitor never flashes
// the anonymous version. In stub mode (no Supabase env vars) this returns
// immediately and flips the flag synchronously.
void installAuthListener();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
