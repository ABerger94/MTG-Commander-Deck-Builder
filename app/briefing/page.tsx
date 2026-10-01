'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Briefing, SavedBriefing } from '@/types/mtg';
import { BriefingForm, BriefingFormValues } from '@/components/briefing/BriefingForm';
import { BriefingView } from '@/components/briefing/BriefingView';
import { loadBriefings, saveBriefing, deleteBriefing } from '@/lib/saved-briefings';

const GENERATING_STEPS = [
  'Resolving commander on Scryfall…',
  'Analyzing the game plan…',
  'Drafting card suggestions…',
  'Mapping win lines…',
  'Verifying every card against Scryfall…',
];

export default function BriefingPage() {
  const [generating, setGenerating] = useState(false);
  const [genStep, setGenStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [missingKey, setMissingKey] = useState(false);
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [saved, setSaved] = useState<SavedBriefing[]>([]);

  useEffect(() => {
    setSaved(loadBriefings());
  }, []);

  useEffect(() => {
    if (!generating) return;
    setGenStep(0);
    const timers = GENERATING_STEPS.map((_, i) =>
      setTimeout(() => setGenStep(i), i * 9000)
    );
    return () => timers.forEach(clearTimeout);
  }, [generating]);

  const handleGenerate = async (values: BriefingFormValues) => {
    setGenerating(true);
    setError(null);
    setMissingKey(false);
    setBriefing(null);
    try {
      const res = await fetch('/api/briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === 'missing_key') setMissingKey(true);
        throw new Error(data.message ?? 'Briefing generation failed.');
      }
      const record = saveBriefing(data.briefing as Briefing);
      setSaved(loadBriefings());
      setBriefing(record.briefing);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Briefing generation failed.');
    } finally {
      setGenerating(false);
    }
  };

  const openSaved = (record: SavedBriefing) => {
    setBriefing(record.briefing);
    setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (id: string) => {
    if (!confirm('Delete this saved briefing?')) return;
    setSaved(deleteBriefing(id));
  };

  return (
    <div className="min-h-screen bg-[#0f0f1a] text-[#e8e0d0]">
      <header className="bg-[#1a1a2e] border-b border-[#c8a951] px-3 md:px-4 py-2.5 flex flex-wrap items-center gap-2 sticky top-0 z-30">
        <Link href="/" className="text-[#c8a951] font-bold text-base md:text-lg mr-1">⚔ MTG Commander Deck Builder</Link>
        <nav className="flex items-center gap-1 md:gap-2">
          <Link href="/" className="text-gray-400 hover:text-[#c8a951] px-3 py-1.5 rounded text-sm transition-colors">Builder</Link>
          <span className="text-[#c8a951] px-3 py-1.5 rounded text-sm font-bold bg-[#1e2035] border border-[#9d6b2e]">✨ Briefing</span>
          <Link href="/library" className="text-gray-400 hover:text-[#c8a951] px-3 py-1.5 rounded text-sm transition-colors">★ Library</Link>
          <Link href="/explore" className="text-gray-400 hover:text-[#c8a951] px-3 py-1.5 rounded text-sm transition-colors">🔍 Explore</Link>
        </nav>
      </header>

      <main className="max-w-5xl mx-auto px-3 md:px-4 py-4 md:py-6 space-y-6">
        {briefing ? (
          <>
            <button
              onClick={() => setBriefing(null)}
              className="text-sm text-[#c8a951] hover:underline"
            >
              ← Back to briefing form
            </button>
            <BriefingView briefing={briefing} />
          </>
        ) : (
          <>
            <div className="text-center max-w-2xl mx-auto pt-2">
              <h1 className="text-2xl md:text-3xl font-bold text-[#c8a951] mb-2">✨ AI Deck Briefing</h1>
              <p className="text-sm text-gray-400">
                The assistant's signature move: a full strategic workup for any commander —
                game plan, mechanical pillars, cards by role, and executable win lines.
              </p>
            </div>

            {missingKey && (
              <div className="bg-amber-950/40 border border-amber-700 rounded-xl p-4 text-sm text-amber-200">
                <p className="font-bold mb-1">Setup needed: free Gemini API key</p>
                <p>
                  Briefings run on Google's Gemini (free tier works). Get a key at{' '}
                  <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" className="underline">aistudio.google.com/apikey</a>,
                  then add it as the <span className="font-mono">GEMINI_API_KEY</span> environment variable on the deployment and redeploy.
                </p>
              </div>
            )}
            {error && !missingKey && (
              <div className="bg-red-950/40 border border-red-800 rounded-xl p-4 text-sm text-red-300">
                {error}
              </div>
            )}

            <BriefingForm onGenerate={handleGenerate} generating={generating} />

            {generating && (
              <div className="bg-[#1a1a2e] border border-[#9d6b2e] rounded-xl p-6 text-center">
                <div className="text-[#c8a951] font-semibold mb-2">Brewing your briefing…</div>
                <div className="text-sm text-gray-400">{GENERATING_STEPS[Math.min(genStep, GENERATING_STEPS.length - 1)]}</div>
                <div className="mt-4 h-2 bg-[#0f0f1a] rounded-full overflow-hidden max-w-md mx-auto">
                  <div
                    className="h-full bg-[#c8a951] rounded-full transition-all duration-1000"
                    style={{ width: `${Math.min(95, ((genStep + 1) / GENERATING_STEPS.length) * 100)}%` }}
                  />
                </div>
              </div>
            )}

            {saved.length > 0 && (
              <section>
                <h2 className="text-[#c8a951] font-bold text-lg mb-3">Saved briefings</h2>
                <div className="grid md:grid-cols-2 gap-3">
                  {saved.map(record => (
                    <div key={record.id} className="bg-[#1a1a2e] border border-[#2a2a4a] rounded-lg p-4 flex items-center gap-3">
                      <button onClick={() => openSaved(record)} className="flex-1 text-left min-w-0">
                        <div className="font-bold text-[#e8e0d0] truncate">{record.commanderName}</div>
                        <div className="text-xs text-gray-500">{new Date(record.createdAt).toLocaleString()}</div>
                      </button>
                      <button
                        onClick={() => handleDelete(record.id)}
                        className="text-xs text-gray-500 hover:text-red-400 px-2 py-1"
                        title="Delete briefing"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
