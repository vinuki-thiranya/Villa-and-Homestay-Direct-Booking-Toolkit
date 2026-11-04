# Project skills

Design skills required by spec §12 ("Install the frontend-design and UI UX Pro Max skills") and CLAUDE.md rule 10.
They are vendored at pinned commits so every contributor and every Claude Code session on this repo uses the same version.

| Skill | Source | Commit | License | Notes |
|---|---|---|---|---|
| `frontend-design` | [anthropics/skills](https://github.com/anthropics/skills/tree/main/skills/frontend-design) | `ca45fc4` | Apache-2.0 (`frontend-design/LICENSE.txt`) | Unmodified. |
| `ui-ux-pro-max` | [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) | `dd9a1b4` | MIT (`ui-ux-pro-max/LICENSE`) | Unmodified, except the upstream `scripts/tests/` folder was left out. Scripts are Python standard library only and make no network calls (reviewed before vendoring). |

## Using UI UX Pro Max from this repo

Its SKILL.md refers to `${CLAUDE_PLUGIN_ROOT}/.claude/skills/...` (plugin install). Installed at project level, run it from the repo root:

```bash
python .claude/skills/ui-ux-pro-max/scripts/search.py "boutique villa direct booking hospitality" --design-system -p "StayDirect LK"
python .claude/skills/ui-ux-pro-max/scripts/search.py "form validation error" --domain ux
python .claude/skills/ui-ux-pro-max/scripts/search.py "image optimization" --stack nextjs
```

Persisted design systems go to `design-system/` at the repo root (`--persist --output-dir .`).

## Updating

Re-download the skill folder at a newer commit, review `SKILL.md` and `scripts/` again, replace the folder, and update the table above.
