#!/usr/bin/env bash
# One-time setup for a fresh Ubuntu 24.04 VPS (Hostinger KVM 1 or larger).
# Run as root:  bash server-setup.sh
set -euo pipefail

if [[ $EUID -ne 0 ]]; then
  echo "Run this script as root." >&2
  exit 1
fi

echo "==> Updating packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y
apt-get install -y ca-certificates curl ufw fail2ban unattended-upgrades

echo "==> Adding 2 GB swap (safety net on a 4 GB server)"
if ! swapon --show | grep -q '/swapfile'; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi
sysctl -w vm.swappiness=10 >/dev/null
grep -q 'vm.swappiness' /etc/sysctl.conf || echo 'vm.swappiness=10' >> /etc/sysctl.conf

echo "==> Installing Docker"
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi
systemctl enable --now docker

echo "==> Configuring firewall (SSH, HTTP, HTTPS only)"
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo "==> Enabling automatic security updates and fail2ban"
dpkg-reconfigure -f noninteractive unattended-upgrades
systemctl enable --now fail2ban

echo "==> Creating app directory"
mkdir -p /opt/invitation-card /opt/invitation-card/backups

cat <<'EOF'

Server is ready. Next steps:
  1. Create /opt/invitation-card/.env from deploy/.env.example
     (set DOMAIN, POSTGRES_PASSWORD, JWT_SECRET).
  2. Add the GitHub secrets and variable described in docs/DEPLOYMENT.md.
  3. Push to main and the CI/CD workflow will deploy.
EOF
