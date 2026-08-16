import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { createQueryClient } from '@/lib/queryClient';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Assistant } from '@/components/Assistant';
import { Toaster } from '@/components/ui/sonner';
import Home from '@/pages/Home';
import DemoPage from '@/pages/DemoPage';
import Partners from '@/pages/Partners';
import Method from '@/pages/Method';
import AccountPage from '@/pages/AccountPage';
import Terms from '@/pages/Terms';
import Observatory from '@/pages/Observatory';
import Moderation from '@/pages/Moderation';

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
            <Route path="/partenaires" element={<Partners />} />
            <Route path="/methode" element={<Method />} />
            <Route path="/compte" element={<AccountPage />} />
            <Route path="/conditions" element={<Terms />} />
            <Route path="/observatoire" element={<Observatory />} />
            <Route path="/moderation" element={<Moderation />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          {/* Un seul point de montage pour l'assistant : présent sur tout le site */}
          <Assistant />
        </BrowserRouter>
        <Toaster />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
