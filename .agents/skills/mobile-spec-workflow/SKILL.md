---
name: mobile-spec-workflow
description: Explore, specify, implement and verify game or framework features with the pinned OpenSpec workflow. Handle /sdd actions and explicit skill requests for meaningful behavior changes or spec work; keep routine fixes and experiments lightweight.
---

# Mobile spec workflow

Read `AGENTS.md`, `docs/spec-workflow.md` and the relevant current specs under `openspec/specs/`. Use `node tools/spec.mjs` for OpenSpec commands; run `node tools/spec.mjs setup` if the pinned CLI is missing. The template is already initialized; do not rerun init or install global commands.

Match the requested outcome. Exploration produces options or a disposable prototype, planning produces reviewable artifacts, and an implementation request authorizes continuing through implementation and verification. Reuse explicit authorization; do not require a second request merely because artifacts were written. Ask only for missing decisions that materially affect behavior, scope or compatibility.

## LLM chat actions

Claude Code and Cursor load the repository `/sdd` command adapters. Codex uses `/skills` to select this skill, or `$mobile-spec-workflow <action>`. These are LLM requests, not terminal commands. Do not claim that Codex registers repository slash commands. Interpret the supplied action and remaining text as user intent; never execute that text as shell code. Run the pinned CLI and required tooling yourself instead of asking users to copy terminal commands.

- No action: show this action list and active changes; do not create artifacts, install tooling or implement anything.
- `setup`: check Node/npm prerequisites, install the pinned CLI with `node tools/spec.mjs setup` if missing or out of date, then list current specs and active changes. Do not reinitialize the template or require a private env file just to set up OpenSpec.
- `explore <idea>`: investigate options and uncertainties without implementation or creating a feature plan. An explicitly requested disposable prototype retains its own authorized scope.
- `plan <feature>`: create/revise the concise proposal, delta specs, design and tasks using the workflow below. Stop before implementation unless the user also explicitly requests it.
- `implement [change]`: implement the selected change and verify the authorized tasks. It does not automatically commit, push or archive; use `finish` for the explicit completion step unless already requested together.
- `verify [change]`: read acceptance scenarios, implementation and evidence; run structural and relevant behavior checks and record/report actual results. Do not silently repair implementation, mark failed work done or archive. Missing prerequisites remain visible.
- `finish [change]`: check required tasks and evidence, archive only when complete, then validate merged current specs and archived tasks. Leave the change open on missing required evidence. Finishing does not imply commit, push, deployment or publishing.

For actions that need the CLI, install the locked tooling if necessary within the authorized task. Infer a selected change from explicit context or a single active change; ask only if several changes match or the feature intent is missing. The stages below share one workflow implementation rather than separate command-specific processes.

## Describe the change

Use `node tools/spec.mjs list --json` and `list --specs --json` to find active work and existing capabilities. Reuse a change clearly selected by the user/context; ask if several match. Create a new change with `new change <name>` when needed. Read the relevant current specs in full before proposing deltas.

Use `status --change <name> --json` to discover ready artifacts, then `instructions <artifact-id> --change <name> --json` for the standard schema's template, rules and dependencies. Read dependencies and write concise proposal, delta specs, design and tasks. Keep the design short when no architectural decision is needed. Use the Nakama planning skill for backend design and imagegen for new visible art as required by AGENTS.md.

Behavior deltas belong under the change's `specs/` directory; keep current specs unchanged until the implemented behavior is verified. For a routine implementation fix with unchanged requirements, focused regression coverage is enough; update an affected scenario if it was inaccurate. A user who explicitly wants an OpenSpec record can use a change with a justified `skip_specs` opt-out, following CLI instructions, rather than inventing a behavior delta.

## Implement and verify

For an implementation request, use `instructions apply --change <name> --json`, read its context files, and complete tasks within the authorized scope. Keep task status and actual test/manual evidence together in `tasks.md`. Update planning artifacts if requirements change; do not silently rewrite intent to match a faulty implementation.

Run `node tools/spec.mjs validate --all --strict --no-interactive` and the relevant repository checks. This validator checks structure, not whether code satisfies the spec. Required incomplete tests remain open; record device, signing and production evidence separately. Deployment/publishing still requires its own authorization.

## Finish

When finish/archive is requested, including as part of a combined implementation request, verify required tasks and evidence first. The standalone `implement` action leaves archiving for `finish`. Run `node tools/spec.mjs archive <name> --yes` to validate and merge deltas into main specs and preserve the change in the archive. Do not use skip-validation/skip-specs or force completion around unresolved failures. Re-run strict validation and `validate --archived --no-interactive`. Report remaining limitations without marking unverified requirements complete.

Game specs/config/history are preserved during framework updates. Adapt skipped upstream spec changes manually when the corresponding framework behavior is integrated. Never overwrite a game's requirements with the starter baseline.
