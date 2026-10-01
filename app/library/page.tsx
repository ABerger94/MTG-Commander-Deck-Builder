'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { StarredCard, ScryfallCard } from '@/types/mtg';
import { loadStarred, removeStar } from '@/lib/stars';
import { fetchCardByExactName } from '@/lib/scryfall';
import { CardInspectModal } from '@/components/CardInspectModal';

export default function LibraryPage() {
  const [starred, setStarred] = useState<StarredCard[]>([]);
  const [inspectCard, setInspectCard] = useState<ScryfallCard | null>(null);
  const [inspecting, setInspecting] = useState<string | null>(null);

  useEffect(() => {
    setStarred(loadStarred());
  }, []);

  const handleUnstar = (id: string) => {
    setStarred(removeStar(id));
  };

  const handleInspect = async (s: StarredCard) => {
    setInspecting(s.id);
    // Briefing stars store names only; resolve the full card for the inspector.
    const card = await fetchCardByExactName(s.name);
    setInspecting(null);
    if (card) setInspectCard(card);
  };

  return (
    <div className="min-h-screen bg-[#0f0f1a] text-[#e8e0d0]">
      <header className="bg-[#1a1a2e] border-b border-[#c8a951] px-3 md:px-4 py-2.5 flex flex-wrap items-center gap-2 sticky top-0 z-30">
        <Link href="/" className="text-[#c8a951] font-bold text-base md:text-lg mr-1">⚔ MTG Commander Deck Builder</Link>
        <nav className="flex items-center gap-1 md:gap-2">
          <Link href="/" className="text-gray-400 hover:text-[#c8a951] px-3 py-1.5 rounded text-sm transition-colors">Builder</Link>
          <Link href="/briefing" className="text-gray-400 hover:text-[#c8a951] px-3 py-1.5 rounded text-sm transition-colors">✨ Briefing</Link>
          <span className="text-[#c8a951] px-3 py-1.5 rounded text-sm font-bold bg-[#1e2035] border border-[#9d6b2e]">★ Library</span>
          <Link href="/explore" className="text-gray-400 hover:text-[#c8a951] px-3 py-1.5 rounded text-sm transition-colors">🔍 Explore</Link>
        </nav>
      </header>

      <main className="max-w-5xl mx-auto px-3 md:px-4 py-4 md:py-6">
        <div className="text-center max-w-2xl mx-auto mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-[#c8a951] mb-2">★ Card Library</h1>
          <p className="text-sm text-gray-400">
            Cards you starred from briefings and inspections, saved on this device for offline reference.
          </p>
        </div>

        {starred.length === 0 ? (
          <div className="text-center text-gray-600 py-16">
            <div className="text-5xl mb-4">★</div>
            <p className="text-lg font-semibold text-gray-500">No starred cards yet</p>
            <p className="text-sm mt-2 max-w-sm mx-auto">
              Star cards from a <Link href="/briefing" className="text-[#c8a951] hover:underline">briefing</Link> or
              the <Link href="/explore" className="text-[#c8a951] hover:underline">card explorer</Link> and they'll live here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
            {starred.map(s => (
              <div key={s.id} className="group relative">
                <button
                  onClick={() => handleInspect(s)}
                  className="block w-full rounded-lg overflow-hidden border border-[#2a2a4a] hover:border-[#c8a951] transition-colors"
                  title={s.name}
                >
                  {s.imageSmall ? (
                    <Image src={s.imageSmall} alt={s.name} width={146} height={204} className="w-full h-auto" loading="lazy" />
                  ) : (
                    <div className="w-full aspect-[63/88] bg-[#1a1a2e] flex items-center justify-center text-xs text-gray-600 text-center px-2">
                      {s.name}
                    </div>
                  )}
                </button>
                <button
                  onClick={() => handleUnstar(s.id)}
                  className="absolute top-1 right-1 w-7 h-7 rounded-full bg-black/70 text-amber-300 text-sm opacity-0 group-hover:opacity-100 hover:bg-black transition-opacity"
                  title="Remove from library"
                >
                  ✕
                </button>
                {inspecting === s.id && (
                  <div className="absolute inset-0 bg-black/60 rounded-lg flex items-center justify-center text-xs text-gray-300">
                    Loading…
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {inspectCard && <CardInspectModal card={inspectCard} onClose={() => setInspectCard(null)} />}
    </div>
  );
}
