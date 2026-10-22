# Mobile Game Starter: VPS deployment

Use the [production interview skill](../.agents/skills/mobile-production-setup/SKILL.md) to prepare the host, SSH access, firewall, secrets, and recovery steps. The deployment script does not audit or harden the VPS.

The VPS needs Docker Engine, Compose v2 supporting `up --wait`, SSH access, Bash, tar, and free public ports 80/443. The SSH user must be able to run Docker and write to a dedicated deployment directory. Prepare the host and its SSH known-host entry before deploying. The script uses BatchMode, keeps host-key checking enabled, and does not install host packages.

## First deployment

1. Point a real domain's A/AAAA records at the VPS. Open inbound 80/443 and SSH. If the VPS already runs a reverse proxy, integrate this API into that proxy instead of starting a second service on 80/443.
2. Create a private production env file:

   ```sh
   node tools/manage.mjs --env-file .env.production init
   ```

3. Edit `.env.production`: set GAME_TITLE, BUNDLE_ID, a unique COMPOSE_PROJECT_NAME, API_DOMAIN, TLS_EMAIL, CLIENT_API_URL=`https://API_DOMAIN`, SSH_HOST (hostname/IP/SSH alias), SSH_USER, SSH_PORT and DEPLOY_PATH. Keep LOCAL_BIND_IP=127.0.0.1. Preserve the generated secrets across redeployments; changing POSTGRES_PASSWORD alone does not change an existing database role's password.
4. Provision DEPLOY_PATH once as a directory owned by the deploy user, e.g. `/opt/my-game`. Ensure `ssh user@host` works and host keys are trusted. The deploy runner requires the directory to exist and be writable.
5. Run local `check` and `smoke` against a running development stack. Then deploy:

   ```sh
   node tools/manage.mjs --env-file .env.production deploy
   ```

The runner validates production settings, installs the locked npm dependencies, and compiles TypeScript on your machine. It generates the matching public game config and validates Compose and Godot before uploading the compiled JavaScript backend and configuration over SCP.

On the VPS, it keeps `.env.previous`, pulls pinned images, migrates the database, and waits for PostgreSQL and Nakama to become healthy. Caddy obtains and renews TLS certificates. You do not need Node or npm on the VPS. When upgrading from the legacy Lua module, the script removes that module and keeps PostgreSQL data.

The script does not upload the Godot game or source `.env`, erase volumes, install Docker, or change the firewall. It copies environment files with private permissions, and Compose reads them as data.

After deployment, check `https://YOUR_DOMAIN/healthcheck` from outside the VPS. DNS updates and certificate issuance can take time. Docker health checks show whether the backend is running, but do not verify public HTTPS access. Test the exported Godot app against production before distributing it.

`deploy` leaves the generated client config pointing to production for the next export. Run local `configure` to switch back.

Use an SSH tunnel for the admin console rather than exposing it:

```sh
ssh -N -L 7351:127.0.0.1:7351 user@host
```

Adjust the remote port if LOCAL_CONSOLE_PORT differs. Visit <http://127.0.0.1:7351> and use the production console password.

## Updates and recovery

Keep the same project name, path, and secrets when redeploying so the database and Caddy volumes remain available. Back up PostgreSQL before changing schemas or images. For local backups, use `node tools/manage.mjs backup`. For production, run `docker compose exec -T postgres pg_dump -U nakama -d nakama` from DEPLOY_PATH over SSH and redirect the output to a private local backup. Test restoration on a disposable database before relying on a dump.

Deployment briefly restarts Nakama and is not atomic. If an image pull or startup fails, inspect `docker compose -f compose.yml -f compose.production.yml logs --tail 100`. Fix the issue or redeploy the previous Git revision with the same env. Deployment overwrites code, so keep that Git revision available; `.env.previous` contains only the last settings. A database migration may require restoring a tested backup rather than downgrading an image. Never delete volumes as a troubleshooting shortcut.

Deploy only trusted source code. The script sends the designated host only the server settings from the selected env file. It leaves out mobile keystore passwords, local paths, and client/export settings. It connects to a VPS only after you supply SSH settings and explicitly run `deploy`.

Production SSH_USER must be non-root. The runner uses BatchMode and strict host-key checking. Verify the host key fingerprint through a trusted channel before enrolling it. Docker access gives the deploy user privileges equivalent to root unless you have separately verified a rootless setup. Protect private env files and backups, and check the provider firewall to confirm which ports are public, as described in the interview.
