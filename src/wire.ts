/**
 * Wire layer: Zod schemas for every homeGuard Remote value plus the frozen
 * InvocationDescriptors the Typert loader reads from the `./typert` subpath.
 * No method decorators — plain class methods on the service, descriptors
 * hand-written here (the rc.2 pattern).
 *
 * @module dsh-home-guard/wire
 */

import { z } from 'zod'
import type { InvocationDescriptor, InvocationParameterDescriptor, TypertCodec } from '@deepseek-ai/dsh-typert-protocol'

/**
 * Build a strict codec descriptor entry (rc.2 `strictCodec` pattern, matching
 * the working `dsh-cost-meter` shape): `schema` feeds the old-host path and
 * `create()` the new-host path; `mode: 'strict'` is what the gateway's
 * `requireStrictCodec` checks.
 *
 * @param typeSymbol - remote type symbol (`<package>#<Name>`).
 * @param schema - Zod schema for the payload.
 */
function strictCodec(typeSymbol: string, schema: z.ZodType): TypertCodec {
  return {
    mode: 'strict',
    typeSymbol,
    schema,
    create: () => schema,
  } as unknown as TypertCodec
}

/**
 * Build one InvocationParameterDescriptor (rc.2 shape): `name`/`wire`/`source`
 * are required; `source: 'json'` means the argument travels as JSON.
 *
 * @param name - method parameter name (also the JSON wire key).
 * @param typeSymbol - remote type symbol for the codec.
 * @param schema - Zod schema for the argument.
 */
function param(name: string, typeSymbol: string, schema: z.ZodType): InvocationParameterDescriptor {
  return Object.freeze({ name, wire: name, source: 'json', codec: strictCodec(typeSymbol, schema) })
}

/** Marker classes in the structure map. */
export const EntryClassSchema = z.enum(['required', 'plugin-owned', 'prunable', 'unknown'])

/** Provenance of an entry. */
export const EntryOriginSchema = z.enum(['core', 'user', 'plugin', 'system', 'unknown'])

/** One structure-map row. */
export const StructureEntrySchema = z.object({
  path: z.string(),
  exists: z.boolean(),
  cls: EntryClassSchema,
  origin: EntryOriginSchema,
  owner: z.string().nullable(),
  description: z.string(),
  sizeBytes: z.number().nullable(),
  mtimeMs: z.number().nullable(),
  childCount: z.number().nullable(),
})

/** Structure summary counts. */
export const StructureSummarySchema = z.object({
  required: z.number(),
  pluginOwned: z.number(),
  prunable: z.number(),
  unknown: z.number(),
  missing: z.number(),
})

/** One session row. */
export const SessionRowSchema = z.object({
  id: z.string(),
  uuid: z.string(),
  projectSlug: z.string(),
  title: z.string().nullable(),
  createdAtMs: z.number().nullable(),
  mtimeMs: z.number().nullable(),
  sizeBytes: z.number().nullable(),
  archived: z.boolean(),
  locked: z.boolean(),
  isCurrent: z.boolean(),
})

/** Cleanup rule (mirrors config CleanupRule). */
export const CleanupRuleSchema = z.object({
  id: z.string(),
  paths: z.array(z.string()),
  olderThanDays: z.number().nullable(),
  schedule: z.union([
    z.object({ kind: z.literal('daily'), at: z.string() }),
    z.object({ kind: z.literal('interval'), hours: z.number() }),
  ]),
  enabled: z.boolean(),
  hardDelete: z.boolean(),
})

/** Archived purge policy snapshot. */
export const ArchivedPurgeSnapshotSchema = z.object({
  enabled: z.boolean(),
  olderThanDays: z.number(),
  intervalMinutes: z.number(),
  hardDelete: z.boolean(),
  lastRunMs: z.number(),
  lastResult: z.string().nullable(),
})

/** Rule execution summary. */
export const RuleRunSummarySchema = z.object({
  ruleId: z.string(),
  matched: z.number(),
  deleted: z.number(),
  bytes: z.number(),
  dryRun: z.boolean(),
})

/** Audit record (wire copy). */
export const AuditRecordSchema = z.object({
  ts: z.string(),
  kind: z.enum(['archive', 'unarchive', 'delete', 'purge', 'cleanup', 'trash-prune', 'rules-set', 'tick']),
  ruleId: z.string().nullable(),
  path: z.string().nullable(),
  sessionId: z.string().nullable(),
  matched: z.number(),
  deleted: z.number(),
  bytes: z.number().nullable(),
  outcome: z.enum(['success', 'dry-run', 'refused', 'error']),
  detail: z.string().optional(),
})

/** Full status snapshot returned by `homeGuard/status`. */
export const HomeGuardStatusSchema = z.object({
  homeDir: z.string(),
  generatedAt: z.number(),
  writeEnabled: z.boolean(),
  confirmRequired: z.boolean(),
  structure: z.array(StructureEntrySchema),
  structureSummary: StructureSummarySchema,
  sessions: z.array(SessionRowSchema),
  archivedCount: z.number(),
  lockedCount: z.number(),
  cleanupRules: z.array(CleanupRuleSchema),
  archivedPurge: ArchivedPurgeSnapshotSchema,
  ruleRuns: z.array(RuleRunSummarySchema),
  auditTail: z.array(AuditRecordSchema),
  trashPruned: z.object({ pruned: z.number(), bytes: z.number() }),
  lastTickError: z.string().nullable(),
})

/** Session listing snapshot. */
export const SessionListSchema = z.object({
  homeDir: z.string(),
  sessions: z.array(SessionRowSchema),
  archivedCount: z.number(),
  lockedCount: z.number(),
})

/** Generic destructive-op result. */
export const OpResultSchema = z.object({
  ok: z.boolean(),
  code: z.string(),
  message: z.string().nullable(),
  matched: z.number(),
  deleted: z.number(),
  bytes: z.number(),
  details: z.array(z.string()),
})

/** Rules-set result. */
export const SetRulesResultSchema = z.object({
  ok: z.boolean(),
  accepted: z.array(z.string()),
  rejected: z.array(z.object({ id: z.string(), reason: z.string() })),
  effective: z.array(CleanupRuleSchema),
})

/** Audit tail result. */
export const AuditTailSchema = z.object({
  records: z.array(AuditRecordSchema),
})

/** Type exports for client/host. */
export type StructureEntryWire = z.infer<typeof StructureEntrySchema>
export type StructureSummaryWire = z.infer<typeof StructureSummarySchema>
export type SessionRowWire = z.infer<typeof SessionRowSchema>
export type CleanupRuleWire = z.infer<typeof CleanupRuleSchema>
export type ArchivedPurgeSnapshotWire = z.infer<typeof ArchivedPurgeSnapshotSchema>
export type RuleRunSummaryWire = z.infer<typeof RuleRunSummarySchema>
export type AuditRecordWire = z.infer<typeof AuditRecordSchema>
export type HomeGuardStatusWire = z.infer<typeof HomeGuardStatusSchema>
export type SessionListWire = z.infer<typeof SessionListSchema>
export type OpResultWire = z.infer<typeof OpResultSchema>
export type SetRulesResultWire = z.infer<typeof SetRulesResultSchema>
export type AuditTailWire = z.infer<typeof AuditTailSchema>

/** Package name (shared by manifest, descriptors, and client mount). */
const PKG = 'dsh-home-guard'

/**
 * Frozen InvocationDescriptors for the `homeGuard` namespace. The Typert
 * loader reads these from the `./typert` subpath export.
 */
export const HOME_GUARD_INVOCATIONS: readonly InvocationDescriptor[] = Object.freeze([
  Object.freeze({
    id: `${PKG}#homeGuard/status`,
    service: 'homeGuard',
    namespace: 'homeGuard',
    method: 'status',
    invocation: Object.freeze({ kind: 'direct' }),
    parameters: Object.freeze([]),
    result: strictCodec(`${PKG}#HomeGuardStatus`, HomeGuardStatusSchema),
    sourceLocation: Object.freeze({ file: 'src/wire.ts', line: 1, column: 1 }),
  } satisfies InvocationDescriptor),
  Object.freeze({
    id: `${PKG}#homeGuard/listSessions`,
    service: 'homeGuard',
    namespace: 'homeGuard',
    method: 'listSessions',
    invocation: Object.freeze({ kind: 'direct' }),
    parameters: Object.freeze([param('includeArchived', `${PKG}#IncludeArchived`, z.boolean())]),
    result: strictCodec(`${PKG}#SessionList`, SessionListSchema),
    sourceLocation: Object.freeze({ file: 'src/wire.ts', line: 1, column: 1 }),
  } satisfies InvocationDescriptor),
  Object.freeze({
    id: `${PKG}#homeGuard/archiveSession`,
    service: 'homeGuard',
    namespace: 'homeGuard',
    method: 'archiveSession',
    invocation: Object.freeze({ kind: 'direct' }),
    parameters: Object.freeze([
      param('id', `${PKG}#SessionId`, z.string()),
      param('confirmed', `${PKG}#Confirmed`, z.boolean()),
    ]),
    result: strictCodec(`${PKG}#OpResult`, OpResultSchema),
    sourceLocation: Object.freeze({ file: 'src/wire.ts', line: 1, column: 1 }),
  } satisfies InvocationDescriptor),
  Object.freeze({
    id: `${PKG}#homeGuard/unarchiveSession`,
    service: 'homeGuard',
    namespace: 'homeGuard',
    method: 'unarchiveSession',
    invocation: Object.freeze({ kind: 'direct' }),
    parameters: Object.freeze([param('id', `${PKG}#SessionId`, z.string())]),
    result: strictCodec(`${PKG}#OpResult`, OpResultSchema),
    sourceLocation: Object.freeze({ file: 'src/wire.ts', line: 1, column: 1 }),
  } satisfies InvocationDescriptor),
  Object.freeze({
    id: `${PKG}#homeGuard/deleteSession`,
    service: 'homeGuard',
    namespace: 'homeGuard',
    method: 'deleteSession',
    invocation: Object.freeze({ kind: 'direct' }),
    parameters: Object.freeze([
      param('id', `${PKG}#SessionId`, z.string()),
      param('confirmed', `${PKG}#Confirmed`, z.boolean()),
      param('currentSessionId', `${PKG}#CurrentSessionId`, z.string()),
      param('hardDelete', `${PKG}#HardDelete`, z.boolean()),
    ]),
    result: strictCodec(`${PKG}#OpResult`, OpResultSchema),
    sourceLocation: Object.freeze({ file: 'src/wire.ts', line: 1, column: 1 }),
  } satisfies InvocationDescriptor),
  Object.freeze({
    id: `${PKG}#homeGuard/purgeArchived`,
    service: 'homeGuard',
    namespace: 'homeGuard',
    method: 'purgeArchived',
    invocation: Object.freeze({ kind: 'direct' }),
    parameters: Object.freeze([
      param('confirmed', `${PKG}#Confirmed`, z.boolean()),
      param('dryRun', `${PKG}#DryRun`, z.boolean()),
    ]),
    result: strictCodec(`${PKG}#OpResult`, OpResultSchema),
    sourceLocation: Object.freeze({ file: 'src/wire.ts', line: 1, column: 1 }),
  } satisfies InvocationDescriptor),
  Object.freeze({
    id: `${PKG}#homeGuard/runCleanup`,
    service: 'homeGuard',
    namespace: 'homeGuard',
    method: 'runCleanup',
    invocation: Object.freeze({ kind: 'direct' }),
    parameters: Object.freeze([
      param('ruleId', `${PKG}#RuleId`, z.string()),
      param('confirmed', `${PKG}#Confirmed`, z.boolean()),
      param('dryRun', `${PKG}#DryRun`, z.boolean()),
    ]),
    result: strictCodec(`${PKG}#OpResult`, OpResultSchema),
    sourceLocation: Object.freeze({ file: 'src/wire.ts', line: 1, column: 1 }),
  } satisfies InvocationDescriptor),
  Object.freeze({
    id: `${PKG}#homeGuard/setRules`,
    service: 'homeGuard',
    namespace: 'homeGuard',
    method: 'setRules',
    invocation: Object.freeze({ kind: 'direct' }),
    parameters: Object.freeze([
      param('rulesJson', `${PKG}#RulesJson`, z.string()),
      param('confirmed', `${PKG}#Confirmed`, z.boolean()),
    ]),
    result: strictCodec(`${PKG}#SetRulesResult`, SetRulesResultSchema),
    sourceLocation: Object.freeze({ file: 'src/wire.ts', line: 1, column: 1 }),
  } satisfies InvocationDescriptor),
  Object.freeze({
    id: `${PKG}#homeGuard/getAudit`,
    service: 'homeGuard',
    namespace: 'homeGuard',
    method: 'getAudit',
    invocation: Object.freeze({ kind: 'direct' }),
    parameters: Object.freeze([param('limit', `${PKG}#Limit`, z.number())]),
    result: strictCodec(`${PKG}#AuditTail`, AuditTailSchema),
    sourceLocation: Object.freeze({ file: 'src/wire.ts', line: 1, column: 1 }),
  } satisfies InvocationDescriptor),
  Object.freeze({
    id: `${PKG}#homeGuard/runTick`,
    service: 'homeGuard',
    namespace: 'homeGuard',
    method: 'runTick',
    invocation: Object.freeze({ kind: 'direct' }),
    parameters: Object.freeze([param('confirmed', `${PKG}#Confirmed`, z.boolean())]),
    result: strictCodec(`${PKG}#OpResult`, OpResultSchema),
    sourceLocation: Object.freeze({ file: 'src/wire.ts', line: 1, column: 1 }),
  } satisfies InvocationDescriptor),
])

/** Remote namespace name exposed by the host service. */
export const HOME_GUARD_NAMESPACE = 'homeGuard'
