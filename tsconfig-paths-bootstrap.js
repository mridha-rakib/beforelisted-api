// tsconfig-paths-bootstrap.js
const tsConfigPaths = require("tsconfig-paths");
const tsConfig = require("./tsconfig.json");

const rootDir = (tsConfig.compilerOptions.rootDir || "./src")
  .replace(/\\/g, "/")
  .replace(/^\.\//, "")
  .replace(/\/+$/, "");

const runtimePaths = Object.fromEntries(
  Object.entries(tsConfig.compilerOptions.paths || {}).map(([alias, values]) => [
    alias,
    values.map((value) => {
      const normalizedValue = String(value)
        .replace(/\\/g, "/")
        .replace(/^\.\//, "");
      const rootDirPrefix = `${rootDir}/`;

      if (normalizedValue.startsWith(rootDirPrefix)) {
        return normalizedValue.slice(rootDirPrefix.length);
      }

      return normalizedValue;
    }),
  ]),
);

const baseUrl = "./dist";
tsConfigPaths.register({
  baseUrl,
  paths: runtimePaths,
});
