import JavaScriptObfuscator from "webpack-obfuscator";

const isProduction = process.env.NODE_ENV === "production";

// Define the configuration object
const webpackConfig = {
  webpack: {
    plugins: [
      // Apply the obfuscator plugin only in production
      ...(isProduction
        ? [
            new JavaScriptObfuscator(
              {
                rotateStringArray: true, // Obfuscation options
              },
              ["**/node_modules/**", "**/*.json", "**/*.config.js"] // Exclude these
            ),
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
                exclude: ["error", "warn", "log"], // Optional: Keep these
              },
            ],
          ]
        : []),
    ],
  },
};

// Export the configuration as the default export
export default webpackConfig;
