# dsh-home-guard

Structure control for the DSH home directory (`~/.dsh`): a provenance map
that tells you where every file comes from, a session viewer with
archive/delete, scheduled cleanup rules, and timer-based purge of archived
sessions.

## What it does

| Section | Capability |
| --- | --- |
| **Structure map** | Scans the home tree and classifies every entry: 🟢 required (core/user), 🔵 plugin-owned, 🟡 prunable, ⚪ unknown. Sizes via `du -sb`, owner + description for known entries. |
| **Sessions** | Lists all sessions (archived included on toggle) with project, title, size, timestamps, archived/locked/current badges. Archive/unarchive through the core workspace registry; delete is trash-first (a `hardDelete` opt-in removes directly). |
| **Cleanup rules** | User-defined glob rules with `olderThanDays` and a schedule (daily at `HH:MM` local time, or every N hours). Runtime rules persist to `storages/dsh-home-guard/rules.json` and override plugin-config rules by id. Every run is denylist-checked and audited; dry-run collects without deleting. |
| **Archived purge** | Timer-driven purge of archived sessions older than `olderThanDays` (default 30), interval configurable (default 60 min). Trash retention prunes plugin trash after `trashRetentionDays` (default 7). |
| **Command** | `/home-guard` prints the map + session/rule summary; `/home-guard purge [dry]` and `/home-guard run <ruleId|all> [dry]` trigger the same guarded operations. |

## Safety model

- **Denylist hardcoded**: `sessions/`, `attachments/`, `.credentials.yaml`,
  `profiles/`, `skills/`, `AGENTS.md`, `.git`, `dsh-usage/`, `state/`, and
  every `storages/*` unit except this plugin's own `storages/dsh-home-guard/`.
  Cleanup rules cannot match or recurse into protected paths; a second
  runtime check refuses them even if a rule slips past config validation.
- **Delete guards**: uuid shape check, directory resolution by scan (never
  by string concatenation), refusal of the current session, refusal of
  sessions whose `session.lock` is younger than 5 minutes, and an explicit
  `confirmed` flag on every destructive RPC.
- **Trash-first**: deletes move the session dir (or cleanup matches) into
  `~/.dsh/trash/dsh-home-guard/<epoch>-<uuid>/` unless `hardDelete` is set.
- **Audit**: every archive/unarchive/delete/purge/cleanup/rules-set/trash-prune
  appends a JSONL record to `storages/dsh-home-guard/audit.log`; the tab and
  command show the tail.
- **Registry read-only for archive state**: archive/unarchive call the core
  `workspaceRegistry` API; the plugin never hand-edits `workspace.json`.

## Install

```sh
dsh plugin --profile web add "github:kyomufs/dsh-home-guard"
```

Then restart the DSH GUI (the plugin registers a `home-guard` entry in
Settings → Plugins).

## Configuration

Plugin config (all optional; defaults shown):

```yaml
dsh-home-guard:
  homeDir: ""            # empty = $DSH_HOME or ~/.dsh
  writeEnabled: true     # master switch for destructive RPCs
  confirmRequired: true  # destructive RPCs demand confirmed=true
  tickMs: 60000          # cleanup/purge runner cadence (min 15000)
  trashRetentionDays: 7  # plugin-trash retention
  archivedPurge:
    enabled: false
    olderThanDays: 30
    intervalMinutes: 60
    hardDelete: false
  cleanupRules:
    - id: logs-old
      paths: ["logs/**/*.log"]
      olderThanDays: 14
      schedule: { kind: daily, at: "04:30" }
      enabled: true
      hardDelete: false
    - id: projcache
      paths: ["session_projcache*"]
      olderThanDays: 14
      schedule: { kind: interval, hours: 24 }
      enabled: true
      hardDelete: false
```

Runtime rules (managed from the tab or `/home-guard`) live in
`storages/dsh-home-guard/rules.json` and override config rules by id. The
plugin never writes `cordis.patch.yml`.

## Remote methods

`homeGuard` namespace (see `src/wire.ts` for the frozen descriptors):
`status`, `listSessions`, `archiveSession`, `unarchiveSession`,
`deleteSession`, `purgeArchived`, `runCleanup`, `setRules`, `getAudit`.

## Development

```sh
pnpm install
pnpm run check   # typecheck + unit tests + build
```

The build externalizes `@deepseek-ai/*` + `react` (loader-provided) and
bundles zod + `@deepseek-ai/schemastery` into the host face (the Loader
validates `exports.Config` against the schema).

## License

MIT
