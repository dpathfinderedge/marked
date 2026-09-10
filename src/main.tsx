import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";
import App from "./App";
import { ErrorFallback } from "@/components/ErrorFallback";
import { initSentry } from "@/lib/sentry";
import "./styles/index.css";

initSentry();

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element (#root) not found in index.html.");
}

createRoot(rootElement).render(
  <StrictMode>
    <Sentry.ErrorBoundary
      fallback={({ resetError }) => <ErrorFallback resetError={resetError} />}
    >
      <App />
    </Sentry.ErrorBoundary>
  </StrictMode>,
);
