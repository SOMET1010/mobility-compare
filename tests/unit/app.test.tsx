import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '@/App';

/**
 * Test de rendu du shell. Complementaire du smoke Playwright : celui-ci
 * s'execute partout, sans navigateur a telecharger.
 */
describe('shell applicatif', () => {
  it('affiche le nom de produit et le perimetre', () => {
    render(<App />);
    expect(screen.getByTestId('product-name')).toBeInTheDocument();
    expect(screen.getByText(/Abidjan/)).toBeInTheDocument();
  });

  it("signale honnetement l'absence de backend configure", () => {
    render(<App />);
    expect(screen.getByText('Backend non configure')).toBeInTheDocument();
  });

  it("n'affiche jamais un nom de travail interne a l'usager", () => {
    const { container } = render(<App />);
    expect(container.textContent).not.toMatch(/MobilityCompare|mobility[_-]compare/i);
  });
});
