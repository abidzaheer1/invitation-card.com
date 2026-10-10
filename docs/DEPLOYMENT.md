# Deploying to a Hostinger VPS

The whole stack (web, API, PostgreSQL, HTTPS proxy) runs on one VPS with Docker Compose. GitHub Actions builds the Docker images and pushes them to GitHub Container Registry, then the server pulls and restarts them. The server never compiles anything, which is what makes a 4 GB KVM 1 workable.

## 1. Buy and prepare the VPS

1. Order a **KVM 1** VPS (or larger) from Hostinger and choose **Ubuntu 24.04** as the OS. Check the renewal price before choosing a long term.
2. Note the server's IP address.
3. Point your domain at it: create **A records** for `invitation-card.com` and `www.invitation-card.com` pointing to the IP. Wait for DNS to update before the first deploy, because Caddy needs it to get the HTTPS certificate.
4. SSH in as root and run the one-time setup script (it installs Docker, a firewall, fail2ban, automatic security updates and 2 GB of swap):

   ```bash
   ssh root@YOUR_SERVER_IP
   curl -fsSL https://raw.githubusercontent.com/abidzaheer1/invitation-card.com/main/deploy/server-setup.sh -o server-setup.sh
   bash server-setup.sh
   ```

   If the repository is private, copy the file from your computer instead: `scp deploy/server-setup.sh root@YOUR_SERVER_IP:`.

## 2. Create the server environment file

```bash
nano /opt/invitation-card/.env
```

Copy the contents of `deploy/.env.example` and set real values. Generate secrets on the server:

```bash
openssl rand -hex 24   # POSTGRES_PASSWORD
openssl rand -hex 48   # JWT_SECRET
```

## 3. Let GitHub deploy for you

Create a dedicated deploy key on your computer:

```bash
ssh-keygen -t ed25519 -f invitation_deploy -N ""
```

- Append `invitation_deploy.pub` to `/root/.ssh/authorized_keys` on the server.
- In the GitHub repo go to **Settings > Secrets and variables > Actions** and add these **secrets**:

  | Secret | Value |
  |---|---|
  | `SERVER_HOST` | the server IP |
  | `SERVER_USER` | `root` |
  | `SERVER_SSH_KEY` | the full contents of the private file `invitation_deploy` |

- On the **Variables** tab add `DEPLOY_ENABLED` = `true`.

Then push to `main`. The workflow typechecks and builds, pushes the images, uploads the compose files and restarts the stack. Database migrations run automatically when the API container starts.

Until `DEPLOY_ENABLED` is set, pushes only run the typecheck and build, so nothing fails while there is no server yet.

## 4. Backups (do this before real users arrive)

```bash
cp deploy/backup.sh /opt/invitation-card/backup.sh   # or scp it
chmod +x /opt/invitation-card/backup.sh
crontab -e
# add:  0 3 * * * /opt/invitation-card/backup.sh >> /var/log/invitation-backup.log 2>&1
```

Hostinger's weekly backup is not enough on its own, and a backup on the same disk does not protect you if the server is lost. Regularly copy `/opt/invitation-card/backups` somewhere else.

## 5. Watching resources and when to upgrade

```bash
docker stats --no-stream   # per-container memory and CPU
free -h                    # server memory and swap
df -h /                    # disk
```

Upgrade to KVM 2 (from the Hostinger panel) when you see any of these regularly:

- memory above about 80%, or the swap in constant use
- CPU high for long stretches, or pages slowing down on busy days
- disk above about 70%

After upgrading, raise the `mem_limit` values in `deploy/docker-compose.yml` and the Postgres settings (`shared_buffers` and friends) to use the extra RAM.

## Rollback

Every deploy is tagged with the commit SHA. To go back to an earlier version, on the server:

```bash
cd /opt/invitation-card
IMAGE_TAG=<older-commit-sha> docker compose up -d
```

## Later additions

- **Per-invitation subdomains** (`anna-omar.invitation-card.com`) need a wildcard DNS record and a wildcard certificate, which uses a DNS challenge in Caddy.
- **Uploads** (photos and 3D models) live in the `uploads` Docker volume, served by the API with long caching. Back the volume up along with the database; raise the quotas per plan when payments arrive.
- **Google sign-in**: set `GOOGLE_CLIENT_ID` in the server `.env` (see `deploy/.env.example`).
- **Payments** will use Stripe, since card processing cannot reasonably be self-hosted.
