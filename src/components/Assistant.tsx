import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { answer, ASSISTANT_DISCLAIMER, type AssistantReply } from '@/demo/assistant';
import { askAi, isAiConfigured, type AiTurn } from '@/features/assistant/ai';
import { BrandMark } from '@/components/BrandMark';

/**
 * Assistant hybride — panneau de conversation flottant.
 * Les intentions connues (trajet, modes, prix, neutralité…) reçoivent une
 * réponse guidée locale, instantanée et hors-ligne. Le reste part vers l'IA
 * serveur (Edge Function `assistant`, charte intégrée, clé jamais dans le
 * navigateur) quand elle est activée ; sinon la réponse guidée fait le repli.
 */

interface Msg {
  readonly role: 'user' | 'bot';
  readonly text: string;
  readonly actions?: AssistantReply['actions'];
  readonly ai?: boolean;
  readonly pending?: boolean;
}

const WELCOME: Msg = {
  role: 'bot',
  text: 'Bonjour ! Dites-moi un trajet (ex. « Cocody Plateau ») ou posez une question sur les modes, les prix, la neutralité, la météo ou le trafic.',
};

const QUICK: string[] = [
  'Cocody Plateau',
  'C’est quoi un gbaka ?',
  'Le classement est-il neutre ?',
  'Trafic actuel',
];

export function Assistant() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [aiEnabled, setAiEnabled] = useState(() => isAiConfigured());
  const navigate = useNavigate();
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [msgs, open]);

  function send(text: string) {
    const q = text.trim();
    if (!q) return;
    const reply = answer(q);
    setInput('');

    // Intentions connues → réponse guidée, instantanée et hors-ligne.
    if (reply.intent !== 'help' || !aiEnabled) {
      setMsgs((m) => [
        ...m,
        { role: 'user', text: q },
        { role: 'bot', text: reply.text, actions: reply.actions },
      ]);
      return;
    }

    // Question libre → IA serveur ; la réponse guidée reste le repli honnête.
    const history: AiTurn[] = [
      ...msgs
        .filter((m) => !m.pending && m !== WELCOME)
        .map<AiTurn>((m) => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: m.text,
        }))
        .slice(-6),
      { role: 'user', content: q },
    ];
    setMsgs((m) => [
      ...m,
      { role: 'user', text: q },
      { role: 'bot', text: '…', ai: true, pending: true },
    ]);
    void askAi(history).then((r) => {
      if (!r.ok && r.unavailable) setAiEnabled(false);
      setMsgs((m) => {
        const next = m.filter((x) => !x.pending);
        next.push(
          r.ok
            ? { role: 'bot', text: r.reply, ai: true }
            : { role: 'bot', text: reply.text, actions: reply.actions },
        );
        return next;
      });
    });
  }

  return (
    <>
      {/* Bouton flottant */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? 'Fermer l’assistant' : 'Ouvrir l’assistant'}
        title="Assistant"
        className="fixed bottom-4 right-4 z-[1100] grid h-12 w-12 place-items-center rounded-full bg-[#26301C] text-white shadow-xl transition hover:brightness-125 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#26301C] focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <BrandMark className="h-6 w-6 text-[#F3EEDF]" />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Assistant MOBILIS"
          className="fixed bottom-[4.5rem] right-4 z-[1100] flex max-h-[70vh] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border bg-card shadow-2xl"
        >
          {/* En-tête */}
          <div className="flex items-center justify-between bg-[#26301C] px-4 py-3 text-white">
            <span className="flex items-center gap-2 text-sm font-bold">
              <BrandMark className="h-4 w-4 text-[#F3EEDF]" />
              Assistant MOBILIS
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fermer"
              className="grid h-8 w-8 place-items-center rounded-lg text-white/80 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
              >
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
          <p className="border-b bg-muted/50 px-4 py-1.5 text-[10px] leading-snug text-muted-foreground">
            {ASSISTANT_DISCLAIMER}
          </p>

          {/* Messages */}
          <div ref={listRef} className="flex-1 space-y-2.5 overflow-y-auto px-3 py-3">
            {msgs.map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex'}>
                <div
                  className={
                    m.role === 'user'
                      ? 'max-w-[85%] rounded-2xl rounded-br-md bg-[#5C6B2E] px-3.5 py-2 text-sm text-white'
                      : 'max-w-[85%] rounded-2xl rounded-bl-md bg-muted px-3.5 py-2 text-sm'
                  }
                >
                  {m.pending ? (
                    <span className="inline-block animate-pulse tracking-widest">•••</span>
                  ) : (
                    m.text
                  )}
                  {m.ai && !m.pending && (
                    <span className="mt-1.5 block text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                      IA — peut se tromper ; les prix viennent du comparateur
                    </span>
                  )}
                  {m.actions && m.actions.length > 0 && (
                    <span className="mt-2 flex flex-wrap gap-1.5">
                      {m.actions.map((a) => (
                        <button
                          key={a.to}
                          type="button"
                          onClick={() => {
                            setOpen(false);
                            navigate(a.to);
                          }}
                          className="rounded-full bg-[#B9722A] px-3 py-1.5 text-[12px] font-bold text-white transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B9722A]"
                        >
                          {a.label} →
                        </button>
                      ))}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Suggestions */}
          <div className="flex flex-wrap gap-1.5 border-t px-3 pb-2 pt-2">
            {QUICK.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => send(q)}
                className="rounded-full border bg-background px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition hover:border-foreground/30 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Saisie */}
          <form
            className="flex items-center gap-2 border-t px-3 py-2.5"
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Votre question ou trajet…"
              aria-label="Votre message"
              className="min-w-0 flex-1 rounded-xl border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <button
              type="submit"
              aria-label="Envoyer"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#5C6B2E] text-white transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5C6B2E]"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
              </svg>
            </button>
          </form>
        </div>
      )}
    </>
  );
}
