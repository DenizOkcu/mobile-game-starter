# Mobile Game Starter: Shared setup interview rules

Read this alongside the setup skill you are using. All paths and commands are relative to the repository root, including those in skill directories.

## Work with the developer

Start with the developer's goal and ask at most three short questions at a time. Recommend an option and briefly explain its tradeoff. Reuse earlier answers and check installed tools before asking about them. Work through the checklist a few steps at a time. When a prerequisite fails, ask one focused follow-up and continue any preparation that does not depend on it.

Use the available user-input tool for questions, or ask in chat if no tool is available. Never ask for secret values, private keys, password screenshots, or raw credential files in chat. Help the developer set them locally and ask whether they are ready. Read values only through the configuration or build tools needed for the task. Report key names and whether they are present and valid, never their values. Do not print `.env`, resolved Compose config, tokens, keystores, SSH configs containing credentials, or unredacted logs. Review logs locally and redact them before sharing.

Keep notes in ignored `.setup/<workflow>.md` so the developer can resume later. Record the goal, chosen options, non-secret variable names, and prerequisites with **verified / user-reported / pending / blocked** status. Include dated command results, the next question, and the next action. Leave out credentials, tokens, private-key material, and sensitive account details. A planned setting is not a verified result. If an external prerequisite is missing, pause only the steps that depend on it.

Permission already given still applies. Starting a setup interview does not authorize buying cloud resources, changing remote access or firewalls, deploying, deleting data, uploading to a store, or publishing. Prepare the settings and commands first. Ask permission for a specific action only if the conversation has not already authorized it. Before an action that could lock the developer out, meet the production skill's recovery conditions even when the action is authorized.

## Choose the correct environment

Use `.env` for local development. Initialize `.env.production` independently so production gets separate credentials. Never copy development credentials into production or overwrite or regenerate existing env files during an interview. The flat parser accepts literal unquoted KEY=value without shell expansion. Never `source` an env file, use `eval`, or run `export $(cat ...)`.

`configure` generates `client/config.json`, the project title, icon and splash settings, and `export_presets.cfg`. Run it before opening or exporting in Godot. Put public export metadata in `.env` using the supported mappings, and SDK/JDK paths in Godot Editor Settings. The export runner passes only allowlisted signing secrets to the exporter process. Keep private iOS signing keys in the macOS Keychain. Local builds do not need store API credentials.

The flat parser does not support secret passwords containing `$`, backticks, quotes, or multiple lines. If an existing signing key or password needs one of these formats, make a reviewed parser change. Do not silently change the credential or weaken validation. Never regenerate a release signing key for an already published app.

## Finish with evidence

Report what works, the exact next commands, the selected environment, and what the developer still needs to do. Report editor runs, resource-pack exports, device builds, device runs, store uploads, and public deployments separately. A local test does not verify any of the later steps. Keep secrets out of the handoff notes.
