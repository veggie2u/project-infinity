import expoConfig from 'eslint-config-expo/flat.js'
import prettierConfig from 'eslint-config-prettier'

// Note: doesn't spread the root eslint.config.mjs — eslint-config-expo already
// registers its own eslint-plugin-import instance under the "import" key, and
// flat config forbids two different plugin objects sharing the same key across
// configs that apply to the same files. This just layers our one extra rule
// (import/no-cycle) on top of Expo's config instead, relying on the plugin
// Expo's config already registered.
export default [
  {
    ignores: [
      '**/dist/**',
      '**/.expo/**',
      '**/node_modules/**',
      '**/.turbo/**',
      '**/uniwind-types.d.ts',
      '**/expo-env.d.ts',
      '**/ios/**',
      '**/android/**',
    ],
  },
  ...expoConfig,
  {
    rules: {
      'import/no-cycle': 'error',
    },
  },
  prettierConfig,
]
