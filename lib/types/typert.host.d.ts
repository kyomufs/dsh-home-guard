/**
 * Frozen Typert manifest for the `dsh-home-guard` host contribution.
 * Shape matches the working `dsh-cost-meter` manifest (package/face/schemas/
 * invocations/model); the loader reads this from the `./typert` subpath export.
 *
 * @module dsh-home-guard/typert.host
 */
/**
 * TYPERT manifest: face `host`, all `homeGuard` invocations, empty schema
 * model (the namespace is invocation-only — same shape cost-meter ships).
 */
export declare const TYPERT: {
    package: string;
    face: "host";
    schemas: never[];
    invocations: readonly import("@deepseek-ai/dsh-typert-protocol").InvocationDescriptor[];
    model: {
        services: never[];
        events: never[];
        objects: never[];
    };
};
export default TYPERT;
