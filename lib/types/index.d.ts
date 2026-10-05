/**
 * `dsh-home-guard`, host half: mounts the `homeGuard` service (Typert Remote
 * contribution) and the `/home-guard` read-only command. No hardcoded
 * cleanup rules: rules come from plugin config or the runtime rules file.
 *
 * @module dsh-home-guard
 */
import type { Context } from '@deepseek-ai/cordis';
import type { Config as ConfigType } from './config.ts';
export { Config, resolveConfig, validateRule, resolveRules } from './config.ts';
export type { Config as ConfigShape, ResolvedConfig, CleanupRule } from './config.ts';
export { HomeGuardService } from './service.ts';
export { TYPERT } from './typert.host.ts';
export { scanStructure, summarizeStructure, STRUCTURE_CATALOG } from './structure.ts';
export type { StructureEntry, EntryClass, EntryOrigin } from './structure.ts';
export { PROTECTED_ENTRIES, homePaths, resolveHomeDir } from './paths.ts';
/** Plugin name: matches the package name, the graph row id, and the bundle id. */
export declare const name = "dsh-home-guard";
/** Services this host reads (registry is soft — archive degrades when absent). */
export declare const inject: string[];
/** Dictionary namespace owned by this plugin (command output is English). */
export declare const NS = "dsh-home-guard";
/**
 * Plugin body: resolve config, provide the service (cost-meter pattern —
 * plain object + hand-written `typertRemote` binding, no cordis Service
 * subclass), register the command.
 *
 * @param ctx - cordis context.
 * @param raw - raw plugin config (Schemastery-normalized by the Loader).
 */
export declare function apply(ctx: Context, raw?: ConfigType): Promise<void>;
export default apply;
