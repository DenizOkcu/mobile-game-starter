# Spec-driven feature work

After the first local run, start with the [SDD walkthrough](spec-workflow.html). This document is the detailed CLI, ownership, and maintainer reference.

Use the LLM chat as the interface. Claude Code and Cursor discover the repository's thin `/sdd` command adapters; all actions share `.agents/skills/mobile-spec-workflow/SKILL.md`.

| Chat command | Outcome |
| --- | --- |
| `/sdd setup` | Check prerequisites, install the pinned CLI if needed, list specs and active changes |
| `/sdd explore <idea>` | Investigate options without implementation or creating a feature plan |
| `/sdd plan <feature>` | Write concise proposal, scenario deltas, design and tasks; stop before implementation |
| `/sdd implement [change]` | Implement authorized tasks and record relevant verification |
| `/sdd verify [change]` | Compare behavior to acceptance scenarios, run checks and report evidence without automatic repairs |
| `/sdd finish [change]` | Archive only after required tasks and verification pass; revalidate the merged specs |

Send commands to your coding assistant, not to a terminal. A change name is optional when selected by the conversation; ambiguous selections require clarification. A bare `/sdd` shows actions and active changes without starting work. Start a new chat/reload command discovery if a newly cloned repository's command is missing.

**Codex:** OpenSpec's Codex integration is skill-based. Use `/skills` to select `mobile-spec-workflow` and send an action, or use `$mobile-spec-workflow plan <feature>`. The repository adapters do not register `/sdd` in Codex's native slash menu. We do not install deprecated personal custom prompts. See [OpenSpec's integration matrix](https://github.com/Fission-AI/OpenSpec/blob/main/docs/supported-tools.md) and [OpenAI's custom-prompt guidance](https://learn.chatgpt.com/docs/custom-prompts).

The template is already initialized. The LLM checks Node.js 22.13+ or a newer LTS (24+), uses `node tools/spec.mjs setup` when tooling is missing, and runs the CLI internally. Users need no global OpenSpec install or terminal SDD routine. OpenSpec **1.15.0** is locked under `tools/openspec/`; lifecycle scripts, telemetry and update checks are disabled. Ordinary spec commands work offline after installation; setup needs npm access or its cache. `check` installs locked tooling and validates specs and archived task completion.

A plan request stops at a plan. An implementation request authorizes the necessary artifacts and implementation without asking for the same permission again. Purchases, production deployments and store publishing retain their authorization boundaries.

## One feature through every command

The walkthrough uses **rename the beacon**, a proposed example rather than an existing starter feature. Display a short name above the existing beacon button, save it on this device across restarts, and leave the account and once-only tutorial reward unchanged.

| LLM request | Expected result |
| --- | --- |
| `/sdd setup` | Prepare tooling and list current work; do not create the feature or edit the game |
| `/sdd explore Let players rename the beacon. Compare device-local and account-synced names. Recommend the smallest version; do not implement yet.` | Compare options; this example chooses device-local persistence without a new server field or RPC |
| `/sdd plan Let the player rename the beacon using a text field and Save button. Default to "My beacon". Trim whitespace, accept 1–24 characters, and show a validation message without changing the saved name for invalid input. Persist on this device across restarts and leave rewards/accounts unchanged. Use change name rename-beacon.` | Create proposal, delta specs, design and tasks under `openspec/changes/rename-beacon/`; stop before game-code changes |
| `/sdd implement rename-beacon` | Implement the selected scope and record relevant verification; leave archive for finish |
| `/sdd verify rename-beacon` | Report evidence for default/trimmed/invalid names, restart persistence, mobile controls and unchanged reward behavior; retain missing required checks |
| `/sdd finish rename-beacon` | Merge verified behavior into current specs and archive the change, or leave it open when required evidence is missing |

In Codex, replace `/sdd` with `$mobile-spec-workflow` and keep the action and arguments. Nothing in this guide creates the example feature automatically.

## Keep the workflow small

- **Explore** uncertain game mechanics before writing detailed requirements. Sketch alternatives or build an explicitly disposable prototype; record the chosen behavior when it is useful.
- **Specify** meaningful behavior changes with a short proposal, scenario deltas, design and tasks using the standard `spec-driven` schema. Keep simple designs to a few lines. Link existing architecture and setup guidance instead of copying it.
- **Implement** the authorized tasks with the existing Godot, Nakama and artwork skills. Put actual verification results beside their tasks in `tasks.md`.
- **Finish** after required checks pass: archive the change, merge its deltas into current specs, and validate again. Leave incomplete required work open; optional follow-ups can be documented separately.

Routine fixes with unchanged requirements need focused regression coverage, not a new document set. Correct an inaccurate existing scenario when needed. If an explicit OpenSpec record is requested for a change with no behavior delta, use the CLI's documented `skip_specs` opt-out with a reason. Do not invent requirements to satisfy the format. An active change can be revised as understanding improves; record product decisions rather than silently changing the agreed outcome.

## Files and ownership

| Path | Purpose | Framework update behavior |
| --- | --- | --- |
| `openspec/specs/<capability>/spec.md` | Current intended behavior, inherited and then adapted by each game | Preserved; review upstream changes manually |
| `openspec/changes/<name>/` | Proposed behavior, technical decisions, tasks and evidence | Preserved |
| `openspec/changes/archive/` | Completed change history for this repository | Preserved |
| `openspec/config.yaml` | Project context and artifact rules | Preserved; adapt to the game |
| `.claude/commands/sdd.md`, `.cursor/commands/sdd.md` | LLM slash-command adapters for the shared skill | Receives reviewed framework updates |
| `.agents/skills/mobile-spec-workflow/` and this guide | Shared agent workflow | Receives reviewed framework updates |
| `tools/openspec/` and `tools/spec.mjs` | Pinned development CLI and wrapper | Receives reviewed framework updates |

The template ships four concise baseline capabilities: accounts, player state, mobile lifecycle and framework updates. These describe inherited contracts; they do not claim physical-device certification. New games start with no active or archived example changes. When gameplay replaces the starter tutorial, update its player-state requirements as part of that feature.

Keep specs in Git and free of credentials, production player data and private setup notes. Mobile export templates exclude the entire `openspec/` tree; tooling and skills are also excluded. The updater reports skipped upstream specs so the assistant can adapt a game's requirements when it integrates the corresponding behavior change. A framework baseline advance alone does not mean those specs were reconciled.

## Internal CLI reference for agents and maintainers

The LLM runs these commands internally; users invoke `/sdd` or the Codex skill. Agents should use the pinned wrapper for every command:

```sh
node tools/spec.mjs new change rename-beacon
node tools/spec.mjs status --change rename-beacon --json
node tools/spec.mjs instructions proposal --change rename-beacon --json
```

Write the artifact requested by the standard schema, then use `status` and `instructions` for subsequent ready artifacts. For beacon naming, the proposal defines the device-local scope; specs cover default names, trimming, invalid input and restart persistence; design identifies local storage and native controls; tasks identify implementation and verification while preserving tutorial/account behavior. This is an example, not a feature included in the starter.

```sh
node tools/spec.mjs instructions apply --change rename-beacon --json
node tools/spec.mjs validate --all --strict --no-interactive
node tools/manage.mjs check
# For backend/auth/deployment changes, also run up and smoke as AGENTS.md requires.
```

Structural validation does not prove behavior. Reconcile each changed requirement with a test result or recorded manual observation. Device runs, signed builds and production checks must be identified separately; a headless pass cannot satisfy a required physical-device task. Validation failures and unavailable required checks keep the change unfinished.

When implementation, required verification and review within the requested scope are complete:

```sh
node tools/spec.mjs archive rename-beacon --yes
node tools/spec.mjs validate --all --strict --no-interactive
node tools/spec.mjs validate --archived --no-interactive
```

The archive command merges delta requirements and moves change history. Read the updated current specs and confirm the merge reflects the intended behavior. Do not use skip-validation or skip-specs switches to bypass failures. Archiving is local bookkeeping and does not deploy, publish, commit or push.

## Maintainer updates

Change the exact OpenSpec version in `tools/openspec/package.json`, regenerate its lockfile with lifecycle scripts disabled, and review upstream release notes and schema/instruction changes. Then run setup, the spec lifecycle tests, strict validation and the full repository check. Revisit the lean skill against the new CLI contracts. Do not install a floating latest version or regenerate unrelated agent integrations/global preferences.

Upstream references: [OpenSpec concepts](https://github.com/Fission-AI/OpenSpec/blob/main/docs/concepts.md), [CLI](https://github.com/Fission-AI/OpenSpec/blob/main/docs/cli.md), and [project configuration](https://github.com/Fission-AI/OpenSpec/blob/main/docs/customization.md). The installed pinned package is the authority for the commands and schema used here.
