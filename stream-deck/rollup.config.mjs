import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "@rollup/plugin-typescript";

/** @type {import("rollup").RollupOptions} */
export default {
  input: "src/plugin.ts",
  output: {
    file: "com.semaphore.streamdeck.sdPlugin/bin/plugin.js",
    format: "cjs",
    sourcemap: false,
    exports: "auto",
  },
  plugins: [
    nodeResolve({
      preferBuiltins: true,
      exportConditions: ["node"],
    }),
    commonjs(),
    typescript({
      tsconfig: "./tsconfig.json",
      noEmitOnError: true,
    }),
  ],
  // Node.js built-ins: excluded from bundle, resolved at runtime
  external: ["net", "os", "path", "process"],
};
