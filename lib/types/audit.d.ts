/**
 * Append-only JSONL audit log for every destructive or scheduled action.
 * Lines are append-only; the reader parses tolerantly and skips bad lines.
 *
 * @module dsh-home-guard/audit
 */
/** One audit record. */
export interface AuditRecord {
    /** ISO timestamp. */
    ts: string;
    /** Action kind. */
    kind: 'archive' | 'unarchive' | 'delete' | 'purge' | 'cleanup' | 'trash-prune' | 'rules-set' | 'tick';
    /** Rule id (cleanup actions). */
    ruleId: string | null;
    /** Target path (home-relative), when applicable. */
    path: string | null;
    /** Session id (registry form), when applicable. */
    sessionId: string | null;
    /** Number of matched entries. */
    matched: number;
    /** Number of entries actually deleted/moved. */
    deleted: number;
    /** Bytes affected (best effort). */
    bytes: number | null;
    /** Outcome: success, dry-run, refused, error. */
    outcome: 'success' | 'dry-run' | 'refused' | 'error';
    /** Optional detail (error message, refusal reason). */
    detail?: string;
}
/**
 * Append one record to the audit log (creating the parent directory).
 * Never throws: audit failures are swallowed so cleanup cannot be blocked
 * by its own logging.
 *
 * @param auditFile - absolute path of the JSONL file.
 * @param record - the record to append.
 */
export declare function appendAudit(auditFile: string, record: AuditRecord): Promise<void>;
/**
 * Read the last `limit` audit records, newest last. Malformed lines are
 * skipped; a missing file yields `[]`.
 *
 * @param auditFile - absolute path of the JSONL file.
 * @param limit - max records to return.
 */
export declare function readAuditTail(auditFile: string, limit: number): Promise<AuditRecord[]>;
