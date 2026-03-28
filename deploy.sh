#!/bin/bash

# Ensure GEMINI_API_KEY is available in the current shell session
if [ -z "$GEMINI_API_KEY" ]; then
  echo "Error: GEMINI_API_KEY is not set. Please export it before running this script."
  echo "Example: export GEMINI_API_KEY=AIzaSy..."
  exit 1
fi

echo "Deploying Emergency Intake Copilot to Cloud Run..."
gcloud run deploy emergency-intake-copilot \
  --source . \
  --project smiling-sweep-491605-r7 \
  --region us-west1 \
  --allow-unauthenticated \
  --set-env-vars GEMINI_API_KEY="$GEMINI_API_KEY"

echo "Deployment invocation finished."
