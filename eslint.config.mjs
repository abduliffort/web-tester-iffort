import { defineConfig, globalIgnores } from 'eslint/config'
// The fix is to add '.js' to the end of this import path
import nextVitals from 'eslint-config-next/core-web-vitals.js'
 
const eslintConfig = defineConfig([
  ...nextVitals,
  {
    rules: {
      'react/no-unescaped-entities': 'off',
      '@next/next/no-page-custom-font': 'off',
    },
  },
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
  ]),
])
 
export default eslintConfig