# Shared setup interview contract

Read this with the selected repo skill. Paths and commands are relative to the repository root, irrespective of the skill directory.

## Work with the developer

Start with the outcome and ask at most three short questions per round. Offer a recommended option and explain the tradeoff briefly. Reuse prior answers; inspect read-only evidence before asking about installed tools. Do not unload the entire checklist as a questionnaire. Ask one focused follow-up when a prerequisite fails and continue independent preparation.

Use the available user-input tool for questions; otherwise ask plainly. Never ask for secret values, private keys, password screenshots or raw credential files in chat. Ask the developer to set them locally and report readiness. Read values only inside the config/build tools needed for the task; report key names and presence/validation status, never values. Do not print `.env`, resolved Compose config, tokens, keystores, SSH configs containing credentials, or unredacted logs. Review logs locally and redact before sharing.

Keep resumable notes in ignored `.setup/<workflow>.md`: goal, chosen options, non-secret variable names, prerequisites with **verified / user-reported / pending / blocked** status, dated command outcomes, next question and next action. Do not store credentials, tokens, private-key material or sensitive account details. Do not equate a planned setting with verified evidence. A missing external prerequisite blocks only dependent steps.

Existing authorization persists. Setup interviews do not authorize buying cloud resources, changing remote access/firewalls, deploying, deleting data, uploading to a store, or publishing. Prepare concrete settings and commands first; obtain authorization for the specific outstanding action only if the conversation has not already provided it. Do not ask again when it has. Before any lockout-prone action, meet the production skill's recovery conditions even if the action is authorized.

## Choose the correct environment

Use `.env` for local development and independently initialized `.env.production` for production. Never copy development credentials into production. Existing env files are not overwritten or regenerated during an interview. The flat parser accepts literal unquoted KEY=value with no shell expansion; never `source` an env file. No `eval` or `export $(cat ...)`.

`configure` owns `client/config.json`, project title/icon/splash, and `export_presets.cfg`. Configure before opening/exporting in Godot. Public export metadata goes into `.env` and supported mappings; machine SDK/JDK paths go into Godot Editor Settings. Signing secrets travel through the export runner's allowlisted process environment. Private iOS signing keys remain in the macOS Keychain. Store API credentials are not needed to build locally.

Secret passwords containing `$`, backticks or quoted/multiline formats are not supported by this repository's flat parser. Do not silently alter an existing signing key/password or weaken validation: use a reviewed parser change if that case arises. Never regenerate a release signing key for an already published app.

## Finish with evidence

Hand back what works, exact next commands, the selected environment name, and remaining user actions. Distinguish editor run, resource-pack export, device build, device run, store upload and public deployment. A local test does not establish any later gate. Save no secrets in handoff notes.
