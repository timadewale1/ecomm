const JavaScriptObfuscator = require("webpack-obfuscator");

const isProduction = process.env.NODE_ENV === "production";

module.exports = {
  webpack: {
    plugins: [
      // Obfuscation settings applied only in production
      ...(isProduction
        ? [
            new JavaScriptObfuscator({
              rotateStringArray: true,
            }),
          ]
        : []),
    ],
  },
  babel: {
    plugins: [
      // Remove console logs only in production
      ...(isProduction
        ? [
            [
              "transform-remove-console",
              {
                exclude: ["error", "warn"], // Optional: Keep error and warn logs
              },
            ],
          ]
        : []),
    ],
  },
};
