const JavaScriptObfuscator = require("webpack-obfuscator");
const isProduction = process.env.NODE_ENV === "production";

module.exports = {
  webpack: {
    plugins: [
      ...(isProduction
        ? [
            new JavaScriptObfuscator(
              {
                rotateStringArray: true,
              },
              ["**/node_modules/**", "**/*.json", "**/*.config.js"]
            ),
          ]
        : []),
    ],
  },
  babel: {
    plugins: [
      ...(isProduction
        ? [
            [
              "transform-remove-console"
              // {
              //   exclude: ["warn", "error", "log"], 
              // },
            ],
          ]
        : []),
    ],
  },
};
