import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { createQueryClient } from '@/lib/queryClient';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Toaster } from '@/components/ui/sonner';
import Home from '@/pages/Home';
import DemoPage from '@/pages/DemoPage';

const queryClient = createQueryClient();

/**
 * Shell applicatif.
 *   /       accueil honnête — dit l'état réel du système (aucun métier prouvé)
 *   /demo   mode Démonstration — parcours complet à données 100 % fictives
 *
 * La démonstration ne fabrique aucune donnée dans le domaine : elle alimente
 * les moteurs réels (tarification, classement) avec des valeurs explicitement
 * marquées SIMULATION.
 */
export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/demo" element={<DemoPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
        <Toaster />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
