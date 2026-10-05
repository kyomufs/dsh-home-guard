/**
 * `dsh-home-guard`, host half: mounts the `homeGuard` service (Typert Remote
 * contribution) and the `/home-guard` read-only command. No hardcoded
 * cleanup rules: rules come from plugin config or the runtime rules file.
 *
 * @module dsh-home-guard
 */

import type { Context } from '@deepseek-ai/cordis'
import { resolveConfig } from './config.ts'
import type { Config as ConfigType } from './config.ts'
import { HomeGuardService } from './service.ts'

export { Config, resolveConfig, validateRule, resolveRules } from './config.ts'
export type { Config as ConfigShape, ResolvedConfig, CleanupRule } from './config.ts'
export { HomeGuardService } from './service.ts'
export { TYPERT } from './typert.host.ts'
export { scanStructure, summarizeStructure, STRUCTURE_CATALOG } from './structure.ts'
export type { StructureEntry, EntryClass, EntryOrigin } from './structure.ts'
export { PROTECTED_ENTRIES, homePaths, resolveHomeDir } from './paths.ts'

/** Plugin name: matches the package name, the graph row id, and the bundle id. */
export const name = 'dsh-home-guard'

/** Services this host reads (registry is soft — archive degrades when absent). */
export const inject: string[] = []

/** Dictionary namespace owned by this plugin (command output is English). */
export const NS = 'dsh-home-guard'

/**
 * Plugin body: resolve config, provide the service (cost-meter pattern —
 * plain object + hand-written `typertRemote` binding, no cordis Service
 * subclass), register the command.
 *
 * @param ctx - cordis context.
 * @param raw - raw plugin config (Schemastery-normalized by the Loader).
 */
export async function apply(ctx: Context, raw?: ConfigType): Promise<void> {
  const config = resolveConfig(raw)
  const service = new HomeGuardService(ctx, config)
  // Hand-written non-enumerable binding consumed by the Typert gateway's
  // source-mode discovery (same shape dsh-cost-meter ships). A plain class
  // keeps cordis and the protocol package on the host's own instance.
  Object.defineProperty(service, 'typertRemote', {
    configurable: false,
    enumerable: false,
    writable: false,
    value: Object.freeze({ service, serviceKey: 'homeGuard', namespace: 'homeGuard' }),
  })
  ctx.provide('homeGuard', service)
  ctx.inject(['commands'], (scope) => {
    // rc.2: the commands service is injected at runtime; its surface is not
    // on the cordis Context type, so we use a narrow structural face.
    const commands = (scope as unknown as {
      commands?: {
        register(definition: {
          name: string
          description: string
          handler: (invocation: { rawInput?: string }) => Promise<{ kind: 'success'; text?: string } | { kind: 'error'; text: string }>
        }): unknown
      }
    }).commands
    if (commands === undefined) return
    // rc.2 shape: register(definition) — { name, description, handler(invocation) }.
    commands.register({
      name: 'home-guard',
      description: 'DSH home structure control: map, sessions, cleanup rules',
      async handler(invocation: { rawInput?: string }): Promise<{ kind: 'success'; text?: string } | { kind: 'error'; text: string }> {
        const service = scope.get('homeGuard') as HomeGuardService | undefined
        if (service === undefined) return { kind: 'error', text: 'home-guard: service unavailable' }
        const sub = (invocation.rawInput ?? '').trim()
        try {
          if (sub === 'purge' || sub === 'purge dry') {
            const dry = sub.endsWith('dry')
            const result = await service.purgeArchived(true, dry)
            return result.ok
              ? { kind: 'success', text: `home-guard: ${result.message ?? result.code} (deleted=${result.deleted} matched=${result.matched})` }
              : { kind: 'error', text: `home-guard: ${result.code}: ${result.message ?? ''}` }
          }
          if (sub.startsWith('run ')) {
            const dry = sub.trim().endsWith(' dry')
            const ruleId = sub.slice(4).trim().replace(/ dry$/, '') || 'all'
            const result = await service.runCleanup(ruleId, true, dry)
            return result.ok
              ? { kind: 'success', text: `home-guard: ${result.message ?? result.code} (deleted=${result.deleted} matched=${result.matched})` }
              : { kind: 'error', text: `home-guard: ${result.code}: ${result.message ?? ''}` }
          }
          const status = await service.status()
          const lines: string[] = [
            `dsh-home-guard · ${status.homeDir}`,
            `write=${status.writeEnabled ? 'on' : 'off'} confirm=${status.confirmRequired ? 'required' : 'optional'}`,
            `structure: required=${status.structureSummary.required} plugin=${status.structureSummary.pluginOwned} prunable=${status.structureSummary.prunable} unknown=${status.structureSummary.unknown} missing=${status.structureSummary.missing}`,
            `sessions: ${status.sessions.length} (archived=${status.archivedCount} locked=${status.lockedCount})`,
            `rules: ${status.cleanupRules.length}` +
              (status.cleanupRules.length > 0
                ? ` [${status.cleanupRules.map((r) => `${r.id}${r.enabled ? '' : '(off)'}`).join(', ')}]`
                : ''),
            `purge: ${status.archivedPurge.enabled ? `on every ${status.archivedPurge.intervalMinutes}m, >${status.archivedPurge.olderThanDays}d` : 'off'}` +
              (status.archivedPurge.lastResult !== null ? ` · last: ${status.archivedPurge.lastResult}` : ''),
            `usage: /home-guard (map) · /home-guard purge [dry] · /home-guard run <ruleId|all> [dry]`,
          ]
          const tail = status.auditTail.slice(-5)
          if (tail.length > 0) {
            lines.push('audit (last 5):')
            for (const rec of tail) {
              lines.push(`  ${rec.ts} ${rec.kind} ${rec.outcome}${rec.path !== null ? ` ${rec.path}` : ''}${rec.detail !== undefined ? ` — ${rec.detail}` : ''}`)
            }
          }
          if (status.lastTickError !== null) lines.push(`last tick error: ${status.lastTickError}`)
          return { kind: 'success', text: lines.join('\n') }
        } catch (error) {
          return { kind: 'error', text: `home-guard: ${error instanceof Error ? error.message : String(error)}` }
        }
      },
    })
  })
}

export default apply
