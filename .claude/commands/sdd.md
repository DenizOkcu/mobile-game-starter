---
description: Explore, plan, implement, verify or finish a feature with the lean OpenSpec workflow.
argument-hint: setup | explore <idea> | plan <feature> | implement [change] | verify [change] | finish [change]
---

Read AGENTS.md and .agents/skills/mobile-spec-workflow/SKILL.md and follow its action routing. Run the pinned tooling yourself; do not ask the user to copy terminal commands.

User action and arguments: $ARGUMENTS

If no action is supplied, show the supported actions and current changes without creating or implementing anything. Honor the requested scope: planning is not implementation, verify does not silently repair code, and finish requires completed required work and verification evidence. Do not commit, push, deploy or publish unless separately requested.
