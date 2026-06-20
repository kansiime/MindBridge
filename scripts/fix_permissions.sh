#!/bin/bash
# Run this ONCE from your local terminal to fix Firebase service account permissions
# Requires: gcloud CLI installed + logged in as project owner
#
# Run: bash scripts/fix_permissions.sh

PROJECT_ID="mindbridge-noel"
SA_EMAIL="firebase-adminsdk-fbsvc@mindbridge-noel.iam.gserviceaccount.com"

echo "Enabling APIs on $PROJECT_ID..."
gcloud services enable \
  cloudfunctions.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  run.googleapis.com \
  --project $PROJECT_ID

echo "Granting roles to $SA_EMAIL..."
for ROLE in \
  "roles/cloudfunctions.admin" \
  "roles/iam.serviceAccountUser" \
  "roles/storage.admin" \
  "roles/artifactregistry.admin" \
  "roles/secretmanager.admin" \
  "roles/serviceusage.serviceUsageAdmin" \
  "roles/firebase.admin" \
  "roles/cloudbuild.builds.editor" \
  "roles/run.admin"
do
  echo "  → $ROLE"
  gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SA_EMAIL" \
    --role="$ROLE" --quiet
done

echo "All done! Now push to main to deploy."
