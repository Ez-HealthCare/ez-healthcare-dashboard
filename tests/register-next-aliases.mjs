import { registerHooks } from "node:module";

// Resolve Next's aliases/environment markers only in Node test workers.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "./api/http" && context.parentURL?.endsWith("/lib/clinical-error.ts")) {
      return { url: new URL("../lib/api/http.ts", import.meta.url).href, shortCircuit: true };
    }
    if (specifier === "server-only" || specifier === "client-only") {
      return { url: "data:text/javascript,export {}", shortCircuit: true };
    }
    if (specifier.startsWith("@/")) {
      return {
        url: new URL("../" + specifier.slice(2) + ".ts", import.meta.url).href,
        shortCircuit: true,
      };
    }
    return nextResolve(specifier, context);
  },
});
