/** @type {import("eslint").Linter.Config} */
module.exports = {
  root: true,
  extends: ["@repo/eslint-config/index.js"],
  env: {
    browser: true,
    es2020: true,
  },
};
