#!/bin/bash

SERVICE_NAME=app

if docker compose ps --status running --services | grep -qx "${SERVICE_NAME}"; then
  docker compose exec "${SERVICE_NAME}" npx tsc
  exit $?
else
  echo "Container '${SERVICE_NAME}' is not running. Running local tsc instead. Start the container with 'npm start' or run 'npm install' if the host node_modules is stale."
  npx tsc
  exit $?
fi
