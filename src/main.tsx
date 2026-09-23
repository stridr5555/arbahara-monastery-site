import React from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { ConvexReactClient } from "convex/react";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { App } from "./App";
import "./site.css";
const normalized =
  window.location.pathname.replace(/\.html$/, "").replace(/\/$/, "") || "/";
const path = normalized === "/index" ? "/" : normalized;
const convexUrl = import.meta.env.VITE_CONVEX_URL;
const app = (
  <React.StrictMode>
    {convexUrl ? (
      <ConvexAuthProvider client={new ConvexReactClient(convexUrl)}>
        <App path={path} />
      </ConvexAuthProvider>
    ) : (
      <App path={path} />
    )}
  </React.StrictMode>
);
const root = document.getElementById("root")!;
if (root.querySelector("main")) hydrateRoot(root, app);
else createRoot(root).render(app);
