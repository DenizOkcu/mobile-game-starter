# VPS deployment

Start with the [production interview skill](../.agents/skills/mobile-production-setup/SKILL.md) for host, SSH, firewall, secrets and recovery gates. The script alone does not audit or harden a VPS.

The VPS needs Docker Engine and Compose v2 (`up --wait`), SSH access, tar, and free public ports 80/443. The SSH user must be able to run Docker and write a dedicated deployment directory. Set up the host and SSH known-host entry yourself; the script uses BatchMode and does not disable host-key checking or install host packages.

## First deployment

1. Point a real domain's A/AAAA records at the VPS. Open inbound 80/443 and SSH. If the VPS already runs a reverse proxy, integrate this API into that proxy instead of starting a second service on 80/443.
2. Create a private production env file:

   ```sh
   python3 tools/manage.py --env-file .env.production init
   ```

3. Edit `.env.production`: set GAME_TITLE, BUNDLE_ID, a unique COMPOSE_PROJECT_NAME, API_DOMAIN, TLS_EMAIL, CLIENT_API_URL=`https://API_DOMAIN`, SSH_HOST (hostname/IP/SSH alias), SSH_USER, SSH_PORT and DEPLOY_PATH. Keep LOCAL_BIND_IP=127.0.0.1. Preserve the generated secrets across redeployments; changing POSTGRES_PASSWORD alone does not change an existing database role's password.
4. Provision DEPLOY_PATH once as a directory owned by the deploy user, e.g. `/opt/my-game`. Ensure `ssh user@host` works and host keys are trusted. The deploy runner requires the directory to exist and be writable.
5. Run local `check` and `smoke` against a running development stack. Then deploy:

   ```sh
   python3 tools/manage.py --env-file .env.production deploy
   ```

The runner validates production settings, installs the locked npm dependencies and compiles TypeScript locally, generates the matching public game config, validates Compose and Godot, uploads only the compiled JavaScript backend/config over SCP, keeps `.env.previous`, pulls pinned images, migrates the database, and waits for healthy PostgreSQL/Nakama. Caddy obtains and renews TLS. The VPS needs no Node/npm installation. The script removes the legacy starter Lua module when upgrading to the JavaScript runtime, preserving PostgreSQL data. The script does not upload the Godot game, source `.env`, erase volumes, install Docker, or change a firewall. Environment files are copied as private data and parsed by Compose.

Check `https://YOUR_DOMAIN/healthcheck` externally after deployment; DNS and certificate issuance can take time. The Docker health checks establish backend readiness, not public TLS availability. Run the exported Godot app against production before distributing it. `deploy` leaves the generated client config pointed at production for the next export; run local `configure` to switch back.

Use an SSH tunnel for the admin console rather than exposing it:

```sh
ssh -N -L 7351:127.0.0.1:7351 user@host
```

Adjust the remote port if LOCAL_CONSOLE_PORT differs. Visit <http://127.0.0.1:7351> and use the production console password.

## Updates and recovery

Redeploy with the same project name/path/secrets to retain the database and Caddy volumes. Back up PostgreSQL before schema or image changes. For local backups, use `python3 tools/manage.py backup`. For production, run `docker compose exec -T postgres pg_dump -U nakama -d nakama` from DEPLOY_PATH over SSH and redirect the output to a private local backup. Verify restoring a dump on a disposable database before relying on it.

A deployment is deliberately simple and briefly restarts Nakama. It is not an atomic release system: if pull/startup fails, inspect `docker compose -f compose.yml -f compose.production.yml logs --tail 100`. Correct the issue or redeploy the previous Git revision with the same env. `.env.previous` retains the last settings, but code is overwritten; keep the previous Git revision available. Database migrations may require a tested backup restore rather than an image downgrade. Never delete volumes as a troubleshooting shortcut.

Only deploy from trusted source. The script derives a server-only env subset from the selected file for the designated host; mobile keystore passwords, local paths and client/export settings are not uploaded. It does not connect to any VPS until SSH settings have been supplied and `deploy` is explicitly invoked.

Production SSH_USER must be non-root. The deploy runner uses BatchMode and strict host-key checking; enroll a host key only after verifying its fingerprint through a trusted channel. Docker access for the deploy user is root-equivalent unless a separately verified rootless setup is used. Keep private env files and backups protected, and verify public exposure with provider firewall evidence as described by the interview.
