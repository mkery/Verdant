module.exports = {
  preset: "ts-jest/presets/js-with-babel",
  testPathIgnorePatterns: ["/lib/", "/node_modules/"],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  transform: {
    "^.+\\.jsx?$": require.resolve("babel-jest"),
    "^.+\\.tsx?$": "ts-jest",
    "\\.svg$": "jest-raw-loader",
    "^.+\\.md?$": "markdown-loader-jest",
  },
  transformIgnorePatterns: ["node_modules/(?!(@jupyterlab)/)"],
  setupFiles: ["./lib/jest-shim.js"],
  moduleNameMapper: {
    "\\.(css|less|sass|scss)$": "identity-obj-proxy",
    "\\.(gif|ttf|eot)$": "@jupyterlab/testutils/lib/jest-file-mock.js",
  },
  testTimeout: 10000,
};
