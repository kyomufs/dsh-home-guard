/**
 * `dsh-home-guard`, browser half: mounts the `homeGuard` Remote contribution,
 * then registers the Home Guard tab into the Plugins settings section
 * (`settings.plugins.tab`, id `home-guard`). All data arrives through the
 * `remote.homeGuard` namespace; the current session id (for approval
 * routing) is read from the sessions store at call time.
 *
 * Client Context typing uses local structural contracts (`./contract.ts`,
 * R5) — the npm `@deepseek-ai/dsh-client-*` packages are stale, and the DSH
 * loader supplies every runtime value from the core tree.
 *
 * @module dsh-home-guard/client
 */
import type { ClientContextLike } from './contract.ts';
/** Dictionary namespace owned by this plugin. */
export declare const NS = "settings.homeGuard";
/** Plugin name: matches the package name, the graph row id, and the bundle id. */
export declare const name = "dsh-home-guard";
/** Services the console reads; `remote.homeGuard` appears once this plugin mounts its contribution. */
export declare const inject: string[];
/**
 * Browser body: locale registration, stylesheet, Remote contribution mount,
 * and the settings tab registration. Every step is guarded — one failure
 * must never take the whole web boot down (the rc.2 boot aborts the shell
 * when a single entry's `apply` throws).
 *
 * @param ctx - client cordis context (structural face).
 */
export declare function apply(ctx: ClientContextLike): Promise<void>;
export default apply;
