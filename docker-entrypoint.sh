#!/bin/sh
set -e

echo "Injecting runtime environment variables..."

# Print current environment for debugging
echo "REACT_APP_PLG_API_BASE_URL=${REACT_APP_PLG_API_BASE_URL}"
echo "REACT_APP_SOCKET_URL=${REACT_APP_SOCKET_URL}"
echo "REACT_APP_ORION_AI_INSIGHTS_URL=${REACT_APP_ORION_AI_INSIGHTS_URL}"

# Generate env-config.js dynamically
cat <<EOF > /usr/share/nginx/html/env-config.js
window._env_ = {
  "REACT_APP_MODE": "${REACT_APP_MODE}",
  "REACT_APP_PLG_API_BASE_URL": "${REACT_APP_PLG_API_BASE_URL}",
  "REACT_APP_SOCKET_URL": "${REACT_APP_SOCKET_URL}",
  "REACT_APP_BRANDING_GUIDELINES_URL": "${REACT_APP_BRANDING_GUIDELINES_URL}",
  "REACT_APP_ORION_AI_INSIGHTS_URL": "${REACT_APP_ORION_AI_INSIGHTS_URL}"
};
EOF

echo "env-config.js generated successfully."

# Start Nginx
nginx -g "daemon off;"
