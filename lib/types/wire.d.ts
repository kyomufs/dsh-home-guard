/**
 * Wire layer: Zod schemas for every homeGuard Remote value plus the frozen
 * InvocationDescriptors the Typert loader reads from the `./typert` subpath.
 * No method decorators — plain class methods on the service, descriptors
 * hand-written here (the rc.2 pattern).
 *
 * @module dsh-home-guard/wire
 */
import { z } from 'zod';
import type { InvocationDescriptor } from '@deepseek-ai/dsh-typert-protocol';
/** Marker classes in the structure map. */
export declare const EntryClassSchema: z.ZodEnum<{
    required: "required";
    "plugin-owned": "plugin-owned";
    prunable: "prunable";
    unknown: "unknown";
}>;
/** Provenance of an entry. */
export declare const EntryOriginSchema: z.ZodEnum<{
    unknown: "unknown";
    core: "core";
    user: "user";
    plugin: "plugin";
    system: "system";
}>;
/** One structure-map row. */
export declare const StructureEntrySchema: z.ZodObject<{
    path: z.ZodString;
    exists: z.ZodBoolean;
    cls: z.ZodEnum<{
        required: "required";
        "plugin-owned": "plugin-owned";
        prunable: "prunable";
        unknown: "unknown";
    }>;
    origin: z.ZodEnum<{
        unknown: "unknown";
        core: "core";
        user: "user";
        plugin: "plugin";
        system: "system";
    }>;
    owner: z.ZodNullable<z.ZodString>;
    description: z.ZodString;
    sizeBytes: z.ZodNullable<z.ZodNumber>;
    mtimeMs: z.ZodNullable<z.ZodNumber>;
    childCount: z.ZodNullable<z.ZodNumber>;
}, z.core.$strip>;
/** Structure summary counts. */
export declare const StructureSummarySchema: z.ZodObject<{
    required: z.ZodNumber;
    pluginOwned: z.ZodNumber;
    prunable: z.ZodNumber;
    unknown: z.ZodNumber;
    missing: z.ZodNumber;
}, z.core.$strip>;
/** One session row. */
export declare const SessionRowSchema: z.ZodObject<{
    id: z.ZodString;
    uuid: z.ZodString;
    projectSlug: z.ZodString;
    title: z.ZodNullable<z.ZodString>;
    createdAtMs: z.ZodNullable<z.ZodNumber>;
    mtimeMs: z.ZodNullable<z.ZodNumber>;
    sizeBytes: z.ZodNullable<z.ZodNumber>;
    archived: z.ZodBoolean;
    locked: z.ZodBoolean;
    isCurrent: z.ZodBoolean;
}, z.core.$strip>;
/** Cleanup rule (mirrors config CleanupRule). */
export declare const CleanupRuleSchema: z.ZodObject<{
    id: z.ZodString;
    paths: z.ZodArray<z.ZodString>;
    olderThanDays: z.ZodNullable<z.ZodNumber>;
    schedule: z.ZodUnion<readonly [z.ZodObject<{
        kind: z.ZodLiteral<"daily">;
        at: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        kind: z.ZodLiteral<"interval">;
        hours: z.ZodNumber;
    }, z.core.$strip>]>;
    enabled: z.ZodBoolean;
    hardDelete: z.ZodBoolean;
}, z.core.$strip>;
/** Archived purge policy snapshot. */
export declare const ArchivedPurgeSnapshotSchema: z.ZodObject<{
    enabled: z.ZodBoolean;
    olderThanDays: z.ZodNumber;
    intervalMinutes: z.ZodNumber;
    hardDelete: z.ZodBoolean;
    lastRunMs: z.ZodNumber;
    lastResult: z.ZodNullable<z.ZodString>;
}, z.core.$strip>;
/** Rule execution summary. */
export declare const RuleRunSummarySchema: z.ZodObject<{
    ruleId: z.ZodString;
    matched: z.ZodNumber;
    deleted: z.ZodNumber;
    bytes: z.ZodNumber;
    dryRun: z.ZodBoolean;
}, z.core.$strip>;
/** Audit record (wire copy). */
export declare const AuditRecordSchema: z.ZodObject<{
    ts: z.ZodString;
    kind: z.ZodEnum<{
        archive: "archive";
        unarchive: "unarchive";
        delete: "delete";
        purge: "purge";
        cleanup: "cleanup";
        "trash-prune": "trash-prune";
        "rules-set": "rules-set";
        tick: "tick";
    }>;
    ruleId: z.ZodNullable<z.ZodString>;
    path: z.ZodNullable<z.ZodString>;
    sessionId: z.ZodNullable<z.ZodString>;
    matched: z.ZodNumber;
    deleted: z.ZodNumber;
    bytes: z.ZodNullable<z.ZodNumber>;
    outcome: z.ZodEnum<{
        success: "success";
        "dry-run": "dry-run";
        refused: "refused";
        error: "error";
    }>;
    detail: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
/** Full status snapshot returned by `homeGuard/status`. */
export declare const HomeGuardStatusSchema: z.ZodObject<{
    homeDir: z.ZodString;
    generatedAt: z.ZodNumber;
    writeEnabled: z.ZodBoolean;
    confirmRequired: z.ZodBoolean;
    structure: z.ZodArray<z.ZodObject<{
        path: z.ZodString;
        exists: z.ZodBoolean;
        cls: z.ZodEnum<{
            required: "required";
            "plugin-owned": "plugin-owned";
            prunable: "prunable";
            unknown: "unknown";
        }>;
        origin: z.ZodEnum<{
            unknown: "unknown";
            core: "core";
            user: "user";
            plugin: "plugin";
            system: "system";
        }>;
        owner: z.ZodNullable<z.ZodString>;
        description: z.ZodString;
        sizeBytes: z.ZodNullable<z.ZodNumber>;
        mtimeMs: z.ZodNullable<z.ZodNumber>;
        childCount: z.ZodNullable<z.ZodNumber>;
    }, z.core.$strip>>;
    structureSummary: z.ZodObject<{
        required: z.ZodNumber;
        pluginOwned: z.ZodNumber;
        prunable: z.ZodNumber;
        unknown: z.ZodNumber;
        missing: z.ZodNumber;
    }, z.core.$strip>;
    sessions: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        uuid: z.ZodString;
        projectSlug: z.ZodString;
        title: z.ZodNullable<z.ZodString>;
        createdAtMs: z.ZodNullable<z.ZodNumber>;
        mtimeMs: z.ZodNullable<z.ZodNumber>;
        sizeBytes: z.ZodNullable<z.ZodNumber>;
        archived: z.ZodBoolean;
        locked: z.ZodBoolean;
        isCurrent: z.ZodBoolean;
    }, z.core.$strip>>;
    archivedCount: z.ZodNumber;
    lockedCount: z.ZodNumber;
    cleanupRules: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        paths: z.ZodArray<z.ZodString>;
        olderThanDays: z.ZodNullable<z.ZodNumber>;
        schedule: z.ZodUnion<readonly [z.ZodObject<{
            kind: z.ZodLiteral<"daily">;
            at: z.ZodString;
        }, z.core.$strip>, z.ZodObject<{
            kind: z.ZodLiteral<"interval">;
            hours: z.ZodNumber;
        }, z.core.$strip>]>;
        enabled: z.ZodBoolean;
        hardDelete: z.ZodBoolean;
    }, z.core.$strip>>;
    archivedPurge: z.ZodObject<{
        enabled: z.ZodBoolean;
        olderThanDays: z.ZodNumber;
        intervalMinutes: z.ZodNumber;
        hardDelete: z.ZodBoolean;
        lastRunMs: z.ZodNumber;
        lastResult: z.ZodNullable<z.ZodString>;
    }, z.core.$strip>;
    ruleRuns: z.ZodArray<z.ZodObject<{
        ruleId: z.ZodString;
        matched: z.ZodNumber;
        deleted: z.ZodNumber;
        bytes: z.ZodNumber;
        dryRun: z.ZodBoolean;
    }, z.core.$strip>>;
    auditTail: z.ZodArray<z.ZodObject<{
        ts: z.ZodString;
        kind: z.ZodEnum<{
            archive: "archive";
            unarchive: "unarchive";
            delete: "delete";
            purge: "purge";
            cleanup: "cleanup";
            "trash-prune": "trash-prune";
            "rules-set": "rules-set";
            tick: "tick";
        }>;
        ruleId: z.ZodNullable<z.ZodString>;
        path: z.ZodNullable<z.ZodString>;
        sessionId: z.ZodNullable<z.ZodString>;
        matched: z.ZodNumber;
        deleted: z.ZodNumber;
        bytes: z.ZodNullable<z.ZodNumber>;
        outcome: z.ZodEnum<{
            success: "success";
            "dry-run": "dry-run";
            refused: "refused";
            error: "error";
        }>;
        detail: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    trashPruned: z.ZodObject<{
        pruned: z.ZodNumber;
        bytes: z.ZodNumber;
    }, z.core.$strip>;
    lastTickError: z.ZodNullable<z.ZodString>;
}, z.core.$strip>;
/** Session listing snapshot. */
export declare const SessionListSchema: z.ZodObject<{
    homeDir: z.ZodString;
    sessions: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        uuid: z.ZodString;
        projectSlug: z.ZodString;
        title: z.ZodNullable<z.ZodString>;
        createdAtMs: z.ZodNullable<z.ZodNumber>;
        mtimeMs: z.ZodNullable<z.ZodNumber>;
        sizeBytes: z.ZodNullable<z.ZodNumber>;
        archived: z.ZodBoolean;
        locked: z.ZodBoolean;
        isCurrent: z.ZodBoolean;
    }, z.core.$strip>>;
    archivedCount: z.ZodNumber;
    lockedCount: z.ZodNumber;
}, z.core.$strip>;
/** Generic destructive-op result. */
export declare const OpResultSchema: z.ZodObject<{
    ok: z.ZodBoolean;
    code: z.ZodString;
    message: z.ZodNullable<z.ZodString>;
    matched: z.ZodNumber;
    deleted: z.ZodNumber;
    bytes: z.ZodNumber;
    details: z.ZodArray<z.ZodString>;
}, z.core.$strip>;
/** Rules-set result. */
export declare const SetRulesResultSchema: z.ZodObject<{
    ok: z.ZodBoolean;
    accepted: z.ZodArray<z.ZodString>;
    rejected: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        reason: z.ZodString;
    }, z.core.$strip>>;
    effective: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        paths: z.ZodArray<z.ZodString>;
        olderThanDays: z.ZodNullable<z.ZodNumber>;
        schedule: z.ZodUnion<readonly [z.ZodObject<{
            kind: z.ZodLiteral<"daily">;
            at: z.ZodString;
        }, z.core.$strip>, z.ZodObject<{
            kind: z.ZodLiteral<"interval">;
            hours: z.ZodNumber;
        }, z.core.$strip>]>;
        enabled: z.ZodBoolean;
        hardDelete: z.ZodBoolean;
    }, z.core.$strip>>;
}, z.core.$strip>;
/** Audit tail result. */
export declare const AuditTailSchema: z.ZodObject<{
    records: z.ZodArray<z.ZodObject<{
        ts: z.ZodString;
        kind: z.ZodEnum<{
            archive: "archive";
            unarchive: "unarchive";
            delete: "delete";
            purge: "purge";
            cleanup: "cleanup";
            "trash-prune": "trash-prune";
            "rules-set": "rules-set";
            tick: "tick";
        }>;
        ruleId: z.ZodNullable<z.ZodString>;
        path: z.ZodNullable<z.ZodString>;
        sessionId: z.ZodNullable<z.ZodString>;
        matched: z.ZodNumber;
        deleted: z.ZodNumber;
        bytes: z.ZodNullable<z.ZodNumber>;
        outcome: z.ZodEnum<{
            success: "success";
            "dry-run": "dry-run";
            refused: "refused";
            error: "error";
        }>;
        detail: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>;
/** Type exports for client/host. */
export type StructureEntryWire = z.infer<typeof StructureEntrySchema>;
export type StructureSummaryWire = z.infer<typeof StructureSummarySchema>;
export type SessionRowWire = z.infer<typeof SessionRowSchema>;
export type CleanupRuleWire = z.infer<typeof CleanupRuleSchema>;
export type ArchivedPurgeSnapshotWire = z.infer<typeof ArchivedPurgeSnapshotSchema>;
export type RuleRunSummaryWire = z.infer<typeof RuleRunSummarySchema>;
export type AuditRecordWire = z.infer<typeof AuditRecordSchema>;
export type HomeGuardStatusWire = z.infer<typeof HomeGuardStatusSchema>;
export type SessionListWire = z.infer<typeof SessionListSchema>;
export type OpResultWire = z.infer<typeof OpResultSchema>;
export type SetRulesResultWire = z.infer<typeof SetRulesResultSchema>;
export type AuditTailWire = z.infer<typeof AuditTailSchema>;
/**
 * Frozen InvocationDescriptors for the `homeGuard` namespace. The Typert
 * loader reads these from the `./typert` subpath export.
 */
export declare const HOME_GUARD_INVOCATIONS: readonly InvocationDescriptor[];
/** Remote namespace name exposed by the host service. */
export declare const HOME_GUARD_NAMESPACE = "homeGuard";
