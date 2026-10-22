---
name: mobile-production-setup
description: Interview and guide secure VPS preparation and SSH-key deployment of this starter's Nakama stack, including DigitalOcean Docker Droplets, firewall evidence, isolated production secrets, TLS, backups and recovery gates. Use for first deployment or production readiness, not local-only setup.
---

# Secure production setup interview

Read `AGENTS.md`, `docs/setup/interview-contract.md`, `docs/setup/security-variables.md`, and `docs/deployment.md`. Track redacted evidence in `.setup/production.md`. This workflow prepares actual readiness; it never infers authorization for paid provisioning or remote changes from a general request for advice.

## Round 1 — scope the host

Ask up to three questions: new VPS or existing server; provider/region/budget and intended exposure; domain/DNS ownership and who controls SSH/recovery. DigitalOcean's **Docker 1-Click Marketplace image** is a supported convenient starting point, not a requirement. Verify its current supported OS and included Docker/Compose versions rather than assuming a catalog snapshot is current. Have the user choose a reviewed plan with room for Nakama + PostgreSQL and backups; do not invent a fixed universally sufficient size.

For an existing host, inspect operating system, running services/ports, existing proxy, Docker versions/networks, storage and current SSH policy before proposing changes. Do not overwrite existing firewall/SSH/proxy configuration or restart unrelated services. If 80/443 is already used, design an integration with the existing ingress; this repo's standalone Caddy cannot simply bind those ports too. **Gate:** the current deploy runner always includes compose.production.yml and starts Caddy. On a shared-ingress host, do not run that command until a reviewed per-game Compose/runner adaptation uses the existing proxy, or choose a separate dedicated host. A verbal plan to integrate the proxy does not make the current command safe.

Prepare a concrete host/region/cost/storage/firewall plan before any authorized purchase. Provider dashboard steps need no API token in the repo. If automation is explicitly requested, use a scoped token set locally; never request it in chat.

## Round 2 — establish SSH keys and recovery first

Ask whether a dedicated production key already exists and whether the developer has provider-console recovery access. Generate a new passphrase-protected Ed25519 key only if needed, at an agreed new path; never overwrite an existing key. Guide passphrase entry in the developer's terminal, load the key in an agent, and upload **only the public .pub key** during Droplet creation. Keep private keys off the VPS, out of chat and outside the repo.

Bootstrap root access may be necessary on a new image. Create a dedicated non-root deploy account, with restricted file ownership for DEPLOY_PATH and correct ~/.ssh/authorized_keys permissions. The existing deployment script requires that account to run Docker without an interactive sudo prompt. Docker-group access is root-equivalent; explain and record acceptance, use it only for this trusted deploy account, and do not claim the account is sandboxed. Rootless Docker is an alternative requiring deliberate host configuration and verification.

Create a host-specific SSH alias in the developer's local config when useful: HostName, User, Port, IdentityFile, IdentitiesOnly yes, ForwardAgent no, StrictHostKeyChecking yes. Do not enable agent forwarding or disable host-key checking. Obtain the host fingerprint through the trusted provider console or another trusted channel; ssh-keyscan alone does not authenticate it. Enroll the verified host key, load the private key into the local agent, then verify a second independent login using the deploy identity with BatchMode.

Before disabling root/password/keyboard-interactive SSH access or tightening SSH sources, require all of: working non-root key login in a second session, retained current session, tested sudo/recovery path, known provider console, and a concrete rollback command. Validate proposed sshd syntax with `sshd -t` and effective settings with `sshd -T` (including Match context where applicable); inspect Include precedence. Reload only after those gates. Never disconnect the only working session. If a gate fails, stop that change and preserve access.

## Round 3 — host/network boundary

Prepare rules with actual SSH_PORT and trusted administrator source CIDRs. Recommended inbound exposure: SSH from those sources, TCP 80/443 publicly for HTTPS/certificate issuance; deny other unsolicited ingress. Cover both IPv4 and IPv6 when enabled and keep A/AAAA records consistent. Preserve necessary outbound DNS, HTTPS/image pulls, OS updates and time sync. Apply changes only within existing authorization after reviewing the exact rules.

Use a provider/cloud firewall as well as suitable host controls. Docker-published ports can bypass UFW, so “UFW enabled” is not proof. Verify actual Compose bindings and scan/check from an external network: PostgreSQL 5432 must not be published; API 7350 and console 7351 (or selected ports) must be loopback only; Docker daemon must not be remotely exposed. Do not expose gRPC/admin endpoints or the Docker socket. Never disable Docker's firewall management as a shortcut.

Verify supported OS security updates, reboot strategy, available disk/RAM, service restart policy, and host clock. Fail2ban/monitoring can be added for the actual exposure; they do not replace keys and network restrictions. Agree on a backup schedule, protected off-host destination, retention, responsible owner and a tested restore on a disposable database before treating real player data as protected. Droplet snapshots alone are not evidence of a consistent PostgreSQL restore.

## Round 4 — production env and application boundary

Create `.env.production` with an independent `init` only if absent; never copy `.env` or regenerate live credentials. Use the full key matrix in `docs/setup/security-variables.md`. Verify all seven values are distinct, random and different from development without printing them. DEPLOY_PATH must be a private directory owned by the deploy account (normally mode 0700). File modes should be private locally and remotely; include .env.previous and transfer artifacts in this review. Do not change a database password without its database-role migration plan.

Set unique project/path, pinned images, INFO/WARN logging, real API_DOMAIN/TLS_EMAIL, HTTPS CLIENT_API_URL, LOCAL_BIND_IP=127.0.0.1, and the tested non-root SSH_USER/SSH_HOST/SSH_PORT. Prepare a writable dedicated DEPLOY_PATH. Distinguish the public client server key from the secret runtime/admin keys. Audit RPC registration for developer-only/reset/admin/economy backdoors; no client feature flag can authorize them. Preserve current data and schema during upgrades.

Review release identity, Git revision, local tests, env validity, DNS, available ports, SSH identity, network evidence, backup/restore evidence and expected downtime in a redacted deployment plan. Do not mark a gate verified merely because the user selected a recommended option. The deploy script validates only a subset of these checks; the interview's host/security evidence is still required.

## Round 5 — deploy and verify

After prerequisites are satisfied and the exact deployment is authorized (reuse prior authorization), run local `check`/`smoke` with development config, then:

```sh
python3 tools/manage.py --env-file .env.production deploy
```

No Node/npm is needed on the VPS; only the compiled runtime/config and a server-only env subset are uploaded. Android signing credentials and workstation paths must remain local. Do not run `smoke` against production without agreement on disposable accounts. Verify service health, valid public HTTPS and redirect, no unexpected public ports, client guest/login/state flows on a deliberately chosen account, and tunnel-only console access. Recheck firewall bindings after deployment, not just before.

If deployment fails, keep the previous env/revision/backup, inspect redacted logs, and repair or redeploy the reviewed prior revision. Database migrations may prevent simple image downgrade; do not blindly revert or erase volumes. TLS health and a running container are separate gates. Finish with verified endpoints, remaining checks, backup/update owner and exact recovery notes. Never call an unverified host “secure.”

Authoritative references to consult for the chosen host: [Docker Droplet image](https://docs.digitalocean.com/products/marketplace/catalog/docker/), [SSH keys](https://docs.digitalocean.com/products/droplets/how-to/add-ssh-keys/), [Cloud Firewall rules](https://docs.digitalocean.com/products/networking/firewalls/how-to/configure-rules/), [Docker firewall behavior](https://docs.docker.com/engine/network/packet-filtering-firewalls/).
