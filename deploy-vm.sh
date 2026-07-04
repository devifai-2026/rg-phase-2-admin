#!/usr/bin/env bash
# One-command manual deploy of the tenant admin to the VM (/opt/rg-admin),
# where Caddy serves it for every <slug>.admin.devifai.in. Use when you want to
# push admin changes to the VM without waiting on CI.
#
#   ./deploy-vm.sh
#
# Requires gcloud (authed) + the VM name/zone below. Builds with the same env as
# the CI workflow: relative /api (Caddy same-origin proxy) + admin root domain.
set -euo pipefail

VM="${VM:-rg-backend-vm}"
ZONE="${ZONE:-asia-south1-a}"
PROJECT="${PROJECT:-rudraganga}"
ADMIN_ROOT="${VITE_ADMIN_ROOT:-admin.devifai.in}"

cd "$(dirname "$0")"

echo "==> Building admin (VITE_API_BASE='' VITE_ADMIN_ROOT=$ADMIN_ROOT)"
VITE_API_BASE="" VITE_ADMIN_ROOT="$ADMIN_ROOT" npm run build

echo "==> Packing dist"
tar -czf /tmp/rg-admin-dist.tgz -C dist .

echo "==> Uploading to VM"
gcloud compute scp /tmp/rg-admin-dist.tgz "$VM:/tmp/rg-admin-dist.tgz" --zone="$ZONE" --project="$PROJECT"

echo "==> Extracting into /opt/rg-admin"
gcloud compute ssh "$VM" --zone="$ZONE" --project="$PROJECT" --command="
  set -e
  sudo rm -rf /opt/rg-admin-new && sudo mkdir -p /opt/rg-admin-new
  sudo tar -xzf /tmp/rg-admin-dist.tgz -C /opt/rg-admin-new
  sudo rsync -a --delete /opt/rg-admin-new/ /opt/rg-admin/ 2>/dev/null || sudo cp -rT /opt/rg-admin-new /opt/rg-admin
  sudo rm -rf /opt/rg-admin-new /tmp/rg-admin-dist.tgz
  sudo test -f /opt/rg-admin/index.html && echo 'admin deployed OK' || (echo 'index.html missing'; exit 1)
"
rm -f /tmp/rg-admin-dist.tgz
echo "==> Done. Tenant admins live at https://<slug>.admin.$ADMIN_ROOT"
