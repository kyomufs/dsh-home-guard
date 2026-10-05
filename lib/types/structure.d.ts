/**
 * The structure map of `~/.dsh`: a static provenance catalog plus a live
 * scanner that classifies every known and unknown top-level entry. Markers:
 * 🟢 required (core/user files), 🔵 plugin-owned, 🟡 prunable, ⚪ unknown.
 *
 * @module dsh-home-guard/structure
 */
/** Classification of a home entry. */
export type EntryClass = 'required' | 'plugin-owned' | 'prunable' | 'unknown';
/** Where an entry comes from. */
export type EntryOrigin = 'core' | 'user' | 'plugin' | 'system' | 'unknown';
/** One row of the structure map. */
export interface StructureEntry {
    /** Home-relative path (forward slashes). */
    path: string;
    /** Whether the entry exists on disk. */
    exists: boolean;
    /** Marker class. */
    cls: EntryClass;
    /** Provenance. */
    origin: EntryOrigin;
    /** Owning component (package/unit name), when known. */
    owner: string | null;
    /** Human-readable description (English). */
    description: string;
    /** Disk size in bytes (null when unknown/unscanned). */
    sizeBytes: number | null;
    /** Last modification time (ms epoch), null when absent. */
    mtimeMs: number | null;
    /** Number of child entries (dirs only), null when unknown. */
    childCount: number | null;
}
/** Static catalog row (no runtime facts). */
export interface CatalogRow {
    path: string;
    cls: EntryClass;
    origin: EntryOrigin;
    owner: string | null;
    description: string;
}
/** Catalog of every entry the plugin knows by provenance. */
export declare const STRUCTURE_CATALOG: readonly CatalogRow[];
/** Scanner options. */
export interface ScanOptions {
    /** Measure directory sizes with `du -sb` (slower, exact disk usage). */
    measureSizes?: boolean;
    /** Cap on children counted per directory. */
    childCountCap?: number;
}
/**
 * Scan the DSH home and build the live structure map. Every catalog entry is
 * reported (with `exists: false` when absent) plus any unknown top-level
 * entries discovered on disk.
 *
 * @param homeRoot - absolute DSH home directory.
 * @param options - scan options.
 */
export declare function scanStructure(homeRoot: string, options?: ScanOptions): Promise<StructureEntry[]>;
/** Summary counts for the status snapshot. */
export interface StructureSummary {
    required: number;
    pluginOwned: number;
    prunable: number;
    unknown: number;
    missing: number;
}
/**
 * Aggregate the map into marker counts.
 *
 * @param entries - live structure rows.
 */
export declare function summarizeStructure(entries: readonly StructureEntry[]): StructureSummary;
