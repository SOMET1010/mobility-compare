import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { MODE_META, type DemoComparison, type DemoMode } from '@/demo/scenario';
import { IS_BACKEND_CONFIGURED } from '@/config/env';
import { submitContribution } from '@/features/contributions/submit';
import { ModeChip, WARN } from '@/pages/comparateur/ui';

export function ContributeView({
  comparison: cmp,
  fromId,
  toId,
  onBack,
}: {
  comparison: DemoComparison;
  fromId: string;
  toId: string;
  onBack: () => void;
}) {
  const [mode, setMode] = useState<DemoMode>(cmp.options[0]!.mode);
  const [price, setPrice] = useState<string>('');
  const [sending, setSending] = useState(false);

  async function submit() {
    if (IS_BACKEND_CONFIGURED && !price) {
      toast.error('Indiquez le prix réellement payé', {
        description: 'Un relevé sans montant ne peut pas alimenter l’indice de confiance.',
      });
      return;
    }
    setSending(true);
    const result = await submitContribution({
      fromCommune: fromId,
      toCommune: toId,
      mode,
      priceXof: Number(price || 0),
      rushHour: null,
    });
    setSending(false);
    if (result.outcome === 'SAVED') {
      toast.success('Merci ! Relevé transmis', {
        description: `${MODE_META[mode].label} · ${price} FCFA — en file de modération avant publication (aucune donnée personnelle transmise).`,
      });
    } else if (result.outcome === 'ERROR') {
      toast.error('Échec de l’envoi — rien n’a été enregistré', { description: result.message });
      return;
    } else {
      toast('Simulation — rien n’a été enregistré', {
        description: `Dans le produit réel, votre relevé (${MODE_META[mode].label}${
          price ? ` · ${price} FCFA` : ''
        }) ferait monter l’indice de confiance de ce tarif (actuellement 0).`,
      });
    }
    setPrice('');
    onBack();
  }

  return (
    <section aria-label="Contribuer un tarif">
      <button
        type="button"
        onClick={onBack}
        className="mb-4 text-sm font-semibold text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        ← Retour aux résultats
      </button>
      <p className="text-label font-bold uppercase tracking-widest text-muted-foreground">
        Partager un prix payé · {IS_BACKEND_CONFIGURED ? 'relevé réel' : 'simulation'}
      </p>
      <h2 className="mb-1 mt-1 text-xl font-extrabold">
        {cmp.corridor.from} → {cmp.corridor.to}
      </h2>
      {IS_BACKEND_CONFIGURED ? (
        <p className="mb-4 text-note text-muted-foreground">
          Votre relevé du prix <b>réellement payé</b> part en file de modération, puis fait monter
          l’indice de confiance de ce corridor. Anonyme par conception : ni nom, ni téléphone, ni
          position précise — seulement commune de départ, d’arrivée, mode et prix.
        </p>
      ) : (
        <p className="mb-4 text-note text-muted-foreground">
          Illustration du futur fonctionnement collaboratif : les usagers relèvent les prix
          réellement payés, ce qui fait monter l’indice de confiance.{' '}
          <b style={{ color: WARN }}>Aucune donnée n’est enregistrée ici.</b>
        </p>
      )}

      <label className="mb-1.5 block text-label font-bold uppercase tracking-wider text-muted-foreground">
        Mode
      </label>
      <div className="mb-4 grid grid-cols-2 gap-2">
        {cmp.options.map((o) => (
          <button
            key={o.optionId}
            type="button"
            onClick={() => setMode(o.mode)}
            aria-pressed={mode === o.mode}
            className={
              'flex items-center gap-2.5 rounded-xl border bg-card px-3 py-2.5 text-left text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ' +
              (mode === o.mode
                ? 'border-primary ring-1 ring-primary'
                : 'hover:border-foreground/30')
            }
          >
            <ModeChip mode={o.mode} size={30} />
            {MODE_META[o.mode].label}
          </button>
        ))}
      </div>

      <label
        htmlFor="contrib-price"
        className="mb-1.5 block text-label font-bold uppercase tracking-wider text-muted-foreground"
      >
        Prix payé (FCFA)
      </label>
      <input
        id="contrib-price"
        inputMode="numeric"
        value={price}
        onChange={(e) => setPrice(e.target.value.replace(/[^0-9]/g, ''))}
        placeholder="ex. 350"
        className="mb-4 w-full rounded-xl border bg-background px-3.5 py-2.5 text-sm tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />

      <Button className="h-11 w-full" onClick={submit} disabled={sending}>
        {sending ? 'Envoi…' : IS_BACKEND_CONFIGURED ? 'Envoyer mon relevé' : 'Envoyer (simulation)'}
      </Button>
      <p className="mt-2 text-label text-muted-foreground">
        {IS_BACKEND_CONFIGURED
          ? 'Chaque relevé est modéré avant publication (détection d’aberrations, CDC M4). Rien n’est publié brut.'
          : 'Un vrai envoi passerait par une file modérée, avec masquage des données personnelles et recalage de l’indice de confiance.'}
      </p>
    </section>
  );
}
