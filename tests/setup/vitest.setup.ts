import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Sans `globals: true`, Testing Library n'enregistre pas son nettoyage
// automatique : les rendus s'accumuleraient d'un test a l'autre.
afterEach(() => cleanup());
