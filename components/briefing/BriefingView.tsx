'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Briefing, CardSuggestion, WinLine } from '@/types/mtg';
import { StarButton } from '../StarButton';

const CATEGORY_LABELS: Record<string, string> = {
  ramp: 'Ramp',
  draw: 'Card Draw',
  removal: 'Removal & Interaction',
  wincons: 'Win Conditions',
  synergies: 'Synergies',
  creatures: 'Creatures',
  manaBase: 'Mana Base',
  upgrades: 'Upgrades (cuts)',
  cardsToConsider: 'Cards to Consider',
};

const CATEGORY_ORDER = ['ramp', 'draw', 'removal', 'wincons', 'synergies', 'creatures', 'manaBase', 'upgrades', 'cardsToConsider'] as const;

function VerifiedBadge({ s }: { s: CardSuggestion }) {
  if (s.verified) {
    return (
      <span className="text-[10px] font-bold uppercase tracking-wide text-green-400 border border-green-700 rounded px-1.5 py-0.5" title="Verified against Scryfall">
        ✓ Verified
      </span>
    );
  }
  return (
    <span className="text-[10px] font-bold uppercase tracking-wide text-amber-400 border border-amber-700 rounded px-1.5 py-0.5" title="Could not verify this card name against Scryfall — double-check before buying">
        ⚠ Unverified
      </span>
  );
}

function SuggestionCard({ s }: { s: CardSuggestion }) {
  const starId = `briefing-${s.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  return (
    <div className="bg-[#0f0f1a] border border-[#2a2a4a] rounded-lg p-3 flex gap-3 hover:border-[#9d6b2e] transition-colors">
      <div className="flex-shrink-0 w-16 relative">
        {s.imageSmall ? (
          <Image src={s.imageSmall} alt={s.name} width={64} height={89} className="rounded w-16 h-auto" loading="lazy" />
        ) : (
          <div className="w-16 h-[89px] bg-[#1a1a2e] rounded border border-[#2a2a4a] flex items-center justify-center text-[10px] text-gray-600 text-center px-1">
            No image
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-sm font-bold text-[#e8e0d0] leading-tight">{s.name}</div>
            <div className="text-xs text-[#c8a951]">{s.role}</div>
          </div>
          <StarButton cardId={starId} name={s.name} imageSmall={s.imageSmall} imageNormal={s.imageNormal} className="w-7 h-7 flex-shrink-0" />
        </div>
        <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">{s.rationale}</p>
        {s.correctedFrom && (
          <p className="text-[11px] text-gray-500 mt-1">Autocorrected from “{s.correctedFrom}”.</p>
        )}
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <VerifiedBadge s={s} />
          {s.scryfallUsd && <span className="text-xs text-green-400">${s.scryfallUsd}</span>}
          {s.verified && (
            <Link
              href={`/?card=${encodeURIComponent(s.name)}`}
              className="text-[11px] text-[#c8a951] hover:underline"
            >
              Open in builder →
            </Link>
          )}
          {s.scryfallUri && (
            <a href={s.scryfallUri} target="_blank" rel="noreferrer" className="text-[11px] text-gray-500 hover:text-gray-300">
              Scryfall ↗
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function Accordion({ title, subtitle, children, defaultOpen }: { title: string; subtitle?: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div className="bg-[#0f0f1a] border border-[#2a2a4a] rounded-lg overflow-hidden">
      <button onClick={() => setOpen(o => !o)} className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-[#1a1a2e] transition-colors">
        <span className={`text-[#c8a951] transition-transform ${open ? 'rotate-90' : ''}`}>▶</span>
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-bold text-[#e8e0d0]">{title}</span>
          {subtitle && <span className="block text-xs text-gray-500 truncate">{subtitle}</span>}
        </span>
      </button>
      {open && <div className="px-4 pb-4 pt-1 border-t border-[#2a2a4a]">{children}</div>}
    </div>
  );
}

function WinLineView({ w, index }: { w: WinLine; index: number }) {
  return (
    <Accordion title={`${index + 1}. ${w.title}`} subtitle={w.explanation} defaultOpen={index === 0}>
      <p className="text-sm text-gray-300 mb-3 leading-relaxed">{w.explanation}</p>
      <ol className="list-decimal list-inside space-y-1.5 mb-3">
        {w.steps.map((step, i) => (
          <li key={i} className="text-sm text-gray-400 leading-relaxed">{step}</li>
        ))}
      </ol>
      {w.keyCards.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Key cards</div>
          <div className="flex flex-wrap gap-2">
            {w.keyCards.map((kc, i) => (
              <span key={i} className="text-xs bg-[#1a1a2e] border border-[#2a2a4a] rounded px-2 py-1 text-[#e8e0d0]" title={kc.role}>
                {kc.name} <span className="text-gray-500">— {kc.role}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </Accordion>
  );
}

function RatioBars({ ratios }: { ratios: Briefing['deckPlan']['deckRatios'] }) {
  const entries: [string, number][] = [
    ['Creatures', ratios.creatures],
    ['Spells', ratios.spells],
    ['Mana base', ratios.manaBase],
    ['Interaction', ratios.interaction],
    ['Card advantage', ratios.cardAdvantage],
  ];
  const max = Math.max(...entries.map(([, v]) => v), 1);
  return (
    <div className="space-y-2">
      {entries.map(([label, v]) => (
        <div key={label} className="flex items-center gap-3">
          <span className="text-xs text-gray-400 w-28 flex-shrink-0">{label}</span>
          <div className="flex-1 h-2.5 bg-[#0f0f1a] rounded-full overflow-hidden">
            <div className="h-full bg-[#c8a951] rounded-full" style={{ width: `${Math.min(100, (v / max) * 100)}%` }} />
          </div>
          <span className="text-xs text-[#e8e0d0] font-semibold w-10 text-right">{v}%</span>
        </div>
      ))}
    </div>
  );
}

export function BriefingView({ briefing }: { briefing: Briefing }) {
  const { deckPlan, suggestions, winconStrategies } = briefing;
  const activeCategories = CATEGORY_ORDER.filter(cat => (suggestions[cat] ?? []).length > 0);
  const date = new Date(briefing.generatedAt).toLocaleString();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#1a1a2e] border border-[#c8a951] rounded-xl p-4 md:p-6">
        <div className="text-xs text-gray-500 mb-1">AI deck briefing · {date}</div>
        <h2 className="text-[#c8a951] font-bold text-xl md:text-2xl">
          {briefing.commanderName}
          {briefing.partnerName && <span className="text-gray-400 text-lg"> + {briefing.partnerName}</span>}
        </h2>
        {briefing.notes && <p className="text-sm text-gray-400 mt-1">Notes: {briefing.notes}</p>}
        {activeCategories.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {activeCategories.map(cat => (
              <a
                key={cat}
                href={`#briefing-${cat}`}
                className="text-xs bg-[#0f0f1a] border border-[#9d6b2e] text-[#c8a951] rounded-full px-3 py-1.5 hover:bg-[#2a2a4a] transition-colors"
              >
                {CATEGORY_LABELS[cat]} ({suggestions[cat].length})
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Game plan */}
      <section className="bg-[#1a1a2e] border border-[#9d6b2e] rounded-xl p-4 md:p-6">
        <h3 className="text-[#c8a951] font-bold text-lg mb-3">Game plan</h3>
        <p className="text-sm md:text-base text-[#e8e0d0] leading-relaxed mb-5">{deckPlan.primaryGamePlan}</p>

        <h4 className="text-sm font-bold text-gray-300 uppercase tracking-wide mb-2">Mechanical pillars</h4>
        <div className="space-y-2 mb-5">
          {deckPlan.mechanicalPillars.map((p, i) => (
            <Accordion key={i} title={p.name} subtitle={p.explanation}>
              <p className="text-sm text-gray-300 leading-relaxed mb-2">{p.explanation}</p>
              {p.expansionCards.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {p.expansionCards.map((c, j) => (
                    <span key={j} className="text-xs bg-[#1a1a2e] border border-[#2a2a4a] rounded px-2 py-1 text-gray-300">{c}</span>
                  ))}
                </div>
              )}
            </Accordion>
          ))}
        </div>

        {deckPlan.themesToAvoid.length > 0 && (
          <>
            <h4 className="text-sm font-bold text-gray-300 uppercase tracking-wide mb-2">Themes to avoid</h4>
            <div className="flex flex-wrap gap-2 mb-5">
              {deckPlan.themesToAvoid.map((t, i) => (
                <span key={i} className="text-xs bg-red-950/50 border border-red-900 text-red-300 rounded px-2.5 py-1">{t}</span>
              ))}
            </div>
          </>
        )}

        <h4 className="text-sm font-bold text-gray-300 uppercase tracking-wide mb-2">Target deck ratios</h4>
        <RatioBars ratios={deckPlan.deckRatios} />
      </section>

      {/* Suggestions by category */}
      {activeCategories.map(cat => (
        <section key={cat} id={`briefing-${cat}`} className="scroll-mt-4">
          <h3 className="text-[#c8a951] font-bold text-lg mb-3">
            {CATEGORY_LABELS[cat]} <span className="text-gray-500 text-sm font-normal">({suggestions[cat].length})</span>
          </h3>
          <div className="grid md:grid-cols-2 gap-3">
            {suggestions[cat].map((s, i) => (
              <SuggestionCard key={`${s.name}-${i}`} s={s} />
            ))}
          </div>
        </section>
      ))}

      {/* Win lines */}
      {winconStrategies.length > 0 && (
        <section>
          <h3 className="text-[#c8a951] font-bold text-lg mb-3">Win lines</h3>
          <div className="space-y-2">
            {winconStrategies.map((w, i) => (
              <WinLineView key={i} w={w} index={i} />
            ))}
          </div>
        </section>
      )}

      {/* Cautions */}
      {briefing.considerationsAndCautions && (
        <section className="bg-[#1a1a2e] border border-[#9d6b2e] rounded-xl p-4 md:p-6">
          <h3 className="text-[#c8a951] font-bold text-lg mb-2">Considerations & cautions</h3>
          <p className="text-sm text-gray-300 leading-relaxed">{briefing.considerationsAndCautions}</p>
        </section>
      )}
    </div>
  );
}
