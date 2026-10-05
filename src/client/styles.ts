/**
 * Scoped styles for the Home Guard tab. Everything is namespaced under
 * `.hg-root` so the plugin cannot leak styles into the host shell.
 *
 * @module dsh-home-guard/client/styles
 */

const CSS = `
.hg-root {
  --hg-fg: #e6e6e6;
  --hg-muted: #9a9a9a;
  --hg-line: #2c2c2c;
  --hg-bg: #161616;
  --hg-card: #1d1d1d;
  --hg-accent: #6ea8fe;
  --hg-green: #3fb950;
  --hg-blue: #58a6ff;
  --hg-yellow: #d29922;
  --hg-grey: #8b949e;
  --hg-red: #f85149;
  color: var(--hg-fg);
  font-size: 13px;
  line-height: 1.45;
}
.hg-root * { box-sizing: border-box; }
.hg-tabs { display: flex; gap: 8px; margin-bottom: 12px; }
.hg-tab {
  background: var(--hg-card);
  border: 1px solid var(--hg-line);
  border-radius: 6px;
  color: var(--hg-fg);
  cursor: pointer;
  padding: 6px 12px;
}
.hg-tab[aria-selected='true'] { border-color: var(--hg-accent); color: var(--hg-accent); }
.hg-card {
  background: var(--hg-card);
  border: 1px solid var(--hg-line);
  border-radius: 8px;
  margin-bottom: 12px;
  padding: 12px;
}
.hg-card h3 { margin: 0 0 8px; font-size: 13px; }
.hg-meta { color: var(--hg-muted); font-size: 12px; margin-bottom: 8px; }
.hg-table { border-collapse: collapse; width: 100%; }
.hg-table th, .hg-table td {
  border-bottom: 1px solid var(--hg-line);
  padding: 4px 8px;
  text-align: left;
  vertical-align: top;
}
.hg-table th { color: var(--hg-muted); font-weight: 600; }
.hg-table td.num { text-align: right; font-variant-numeric: tabular-nums; }
.hg-dot-required { color: var(--hg-green); }
.hg-dot-plugin { color: var(--hg-blue); }
.hg-dot-prunable { color: var(--hg-yellow); }
.hg-dot-unknown { color: var(--hg-grey); }
.hg-path { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
.hg-badge {
  border: 1px solid var(--hg-line);
  border-radius: 4px;
  display: inline-block;
  font-size: 11px;
  margin-right: 4px;
  padding: 1px 6px;
}
.hg-badge-archived { border-color: var(--hg-yellow); color: var(--hg-yellow); }
.hg-badge-locked { border-color: var(--hg-red); color: var(--hg-red); }
.hg-badge-current { border-color: var(--hg-green); color: var(--hg-green); }
.hg-badge-hard { border-color: var(--hg-red); color: var(--hg-red); }
.hg-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
.hg-btn {
  background: var(--hg-bg);
  border: 1px solid var(--hg-line);
  border-radius: 6px;
  color: var(--hg-fg);
  cursor: pointer;
  padding: 4px 10px;
}
.hg-btn:hover { border-color: var(--hg-accent); color: var(--hg-accent); }
.hg-btn-danger { border-color: var(--hg-red); color: var(--hg-red); }
.hg-btn[disabled] { cursor: not-allowed; opacity: 0.5; }
.hg-input, .hg-select, .hg-textarea {
  background: var(--hg-bg);
  border: 1px solid var(--hg-line);
  border-radius: 6px;
  color: var(--hg-fg);
  font-family: inherit;
  padding: 4px 8px;
}
.hg-textarea { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; min-height: 80px; width: 100%; }
.hg-field { display: flex; flex-direction: column; gap: 2px; margin-bottom: 8px; }
.hg-field label { color: var(--hg-muted); font-size: 12px; }
.hg-row { display: flex; gap: 8px; align-items: flex-end; flex-wrap: wrap; }
.hg-error { color: var(--hg-red); margin-top: 8px; white-space: pre-wrap; }
.hg-ok { color: var(--hg-green); margin-top: 8px; white-space: pre-wrap; }
.hg-muted { color: var(--hg-muted); }
.hg-scroll { max-height: 420px; overflow: auto; }
`

let injected = false

/**
 * Inject the scoped stylesheet once per document.
 */
export function installHomeGuardStyles(): void {
  if (injected) return
  if (typeof document === 'undefined') return
  const id = 'dsh-home-guard-styles'
  if (document.getElementById(id) !== null) {
    injected = true
    return
  }
  const el = document.createElement('style')
  el.id = id
  el.textContent = CSS
  document.head.appendChild(el)
  injected = true
}
