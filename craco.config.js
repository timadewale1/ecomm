const JavaScriptObfuscator = await import('webpack-obfuscator'); // Dynamic import

const isProduction = process.env.NODE_ENV === "production";

const config = {
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
              "transform-remove-console",
              {
                exclude: ["error", "warn", "log"],
              },
            ],
          ]
        : []),
    ],
  },
};

export default config;
