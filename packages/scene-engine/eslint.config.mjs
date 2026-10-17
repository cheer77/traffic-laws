import base from "../../tooling/eslint/next.mjs";
const config = [...base, { rules: { "@next/next/no-html-link-for-pages": "off" } }];
export default config;
