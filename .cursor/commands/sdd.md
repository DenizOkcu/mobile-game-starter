---
description: Explore, plan, implement, verify or finish a feature with the lean OpenSpec workflow.
---

Read AGENTS.md and .agents/skills/mobile-spec-workflow/SKILL.md and follow its action routing. Interpret the user's text after /sdd as the action and arguments. Supported actions: setup, explore <idea>, plan <feature>, implement [change], verify [change], finish [change]. Run the pinned tooling yourself; do not ask the user to copy terminal commands.

If no action is supplied, show the supported actions and current changes without creating or implementing anything. Honor the requested scope: planning is not implementation, verify does not silently repair code, and finish requires completed required work and verification evidence. Do not commit, push, deploy or publish unless separately requested.
