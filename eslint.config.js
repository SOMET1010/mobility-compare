import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'node_modules'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: { ecmaVersion: 2022, globals: globals.browser },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-restricted-syntax': [
        'error',
        {
          // Invariant CDC : aucune valeur aleatoire dans un calcul affiche.
          selector: "MemberExpression[object.name='Math'][property.name='random']",
          message:
            "Math.random est interdit dans le code applicatif. Toute valeur affichee doit etre calculee ou absente (invariant I1 du plan technique V0).",
        },
      ],
    },
  },
  {
    // Primitives shadcn/ui copiees telles quelles. On ne les modifie pas :
    // toute divergence compliquerait une mise a jour depuis l'amont.
    files: ['src/components/ui/**/*.tsx'],
    rules: { '@typescript-eslint/no-empty-object-type': 'off' },
  },
);
