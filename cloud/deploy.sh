#!/usr/bin/env bash
# Care360 cloud layer — build and deploy via AWS SAM
# Prerequisites: aws-cli configured, sam-cli installed
# Usage:
#   NOTIFICATION_EMAIL=x@example.com NOTIFICATION_PHONE=+642100000 ./deploy.sh

set -euo pipefail

STACK_NAME="${STACK_NAME:-care360-cloud}"
REGION="${AWS_DEFAULT_REGION:-ap-southeast-2}"
EMAIL="${NOTIFICATION_EMAIL:?Set NOTIFICATION_EMAIL}"
PHONE="${NOTIFICATION_PHONE:-}"

echo "==> Building Lambda package..."
sam build --template template.yaml

echo "==> Deploying stack '$STACK_NAME' to $REGION..."
sam deploy \
  --stack-name "$STACK_NAME" \
  --region     "$REGION" \
  --capabilities CAPABILITY_IAM \
  --resolve-s3 \
  --no-confirm-changeset \
  --parameter-overrides \
    "NotificationEmail=${EMAIL}" \
    "NotificationPhone=${PHONE}"

echo "==> Deploy complete. Stack outputs:"
aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --region     "$REGION" \
  --query "Stacks[0].Outputs" \
  --output table
