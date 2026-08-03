import { defineConfig, globalIgnores } from 'eslint/config';
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';

export default defineConfig([
  ...nextCoreWebVitals,
  {
    files: ['tests/**/*.js', 'public/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: {
        console: 'readonly',
        document: 'readonly',
        firebase: 'readonly',
        FormData: 'readonly',
        global: 'readonly',
        globalThis: 'readonly',
        jest: 'readonly',
        localStorage: 'readonly',
        module: 'readonly',
        process: 'readonly',
        require: 'readonly',
        sessionStorage: 'readonly',
        setTimeout: 'readonly',
        URL: 'readonly',
        window: 'readonly'
      }
    }
  },
  globalIgnores(['.next/**', 'coverage/**', 'node_modules/**', 'public/site.css'])
]);
