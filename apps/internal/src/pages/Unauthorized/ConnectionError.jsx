import React from "react";
import { API_ERROR_TYPES } from "@orion/shared";

const ConnectionError = ({
  title = "Cannot reach the application server",
  message,
  errorType,
  onBackToLogin,
  onRetry,
}) => {
  const isCors = errorType === API_ERROR_TYPES.CORS;
  const isNetwork = errorType === API_ERROR_TYPES.NETWORK;

  return (
    <div className="not-found connection-error" role="alert">
      <div className="not-found-content">
        <div className="error-code">
          {isCors ? "Connection Blocked" : "Connection Error"}
        </div>
        <h2 className="error-message">{title}</h2>
        <p className="error-description">{message}</p>
        {isNetwork && (
          <ul className="error-description connection-error__tips">
            <li>The application server may be down or unreachable.</li>
            <li>Check your network or VPN, then try again.</li>
            <li>If this continues, the environment may be offline.</li>
          </ul>
        )}
        {isCors && (
          <ul className="error-description connection-error__tips">
            <li>Confirm the API is running and REACT_APP_PLG_API_BASE_URL is correct.</li>
            <li>Ensure the API allows CORS from {window.location.origin}.</li>
            <li>If you use a VPN or proxy, try disabling it and sign in again.</li>
          </ul>
        )}
        <div className="connection-error__actions">
          {onRetry && (
            <button type="button" className="not-found-content-button" onClick={onRetry}>
              Try again
            </button>
          )}
          {onBackToLogin && (
            <button
              type="button"
              className="not-found-content-button connection-error__secondary"
              onClick={onBackToLogin}
            >
              Back to sign in
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConnectionError;
