'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { ScryfallCard, SavedDeck } from '@/types/mtg';
import { searchCommanders, getCardImage } from '@/lib/scryfall';

export interface BriefingFormValues {
  commanderName: string;
  partnerName: string;
  decklistText: string;
  notes: string;
}

interface Props {
  onGenerate: (values: BriefingFormValues) => void;
  generating: boolean;
}

function CommanderPicker({
  label,
  value,
  onPick,
  onClear,
}: {
  label: string;
  value: string;
  onPick: (name: string) => void;
  onClear: () => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ScryfallCard[]>([]);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) { setResults([]); setOpen(false); return; }
    debounceRef.current = setTimeout(async () => {
      const cards = await searchCommanders(query);
      setResults(cards.slice(0, 8));
      setOpen(true);
    }, 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  if (value) {
    return (
      <div>
        <label className="block text-xs font-semibold text-gray-400 mb-1">{label}</label>
        <div className="flex items-center gap-2 bg-[#0f0f1a] border border-[#c8a951] rounded px-3 py-2">
          <span className="text-[#e8e0d0] text-sm font-semibold flex-1 truncate">{value}</span>
          <button onClick={onClear} className="text-gray-500 hover:text-red-400 text-sm" title="Clear">✕</button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <label className="block text-xs font-semibold text-gray-400 mb-1">{label}</label>
      <input
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder={`Search ${label.toLowerCase()}…`}
        className="w-full bg-[#0f0f1a] border border-[#9d6b2e] text-[#e8e0d0] px-3 py-2.5 rounded text-sm focus:outline-none focus:border-[#c8a951]"
      />
      {open && results.length > 0 && (
        <div className="absolute z-20 left-0 right-0 mt-1 bg-[#1a1a2e] border border-[#9d6b2e] rounded-lg overflow-hidden shadow-2xl shadow-black max-h-72 overflow-y-auto">
          {results.map(card => (
            <button
              key={card.id}
              onClick={() => { onPick(card.name); setQuery(''); setOpen(false); }}
              className="w-full flex items-center gap-3 px-3 py-2 hover:bg-[#2a2a4a] text-left transition-colors"
            >
              {getCardImage(card, 'small') && (
                <Image src={getCardImage(card, 'small')!} alt="" width={32} height={45} className="rounded w-8 h-auto" />
              )}
              <span className="min-w-0">
                <span className="block text-sm text-[#e8e0d0] truncate">{card.name}</span>
                <span className="block text-xs text-gray-500 truncate">{card.type_line}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function BriefingForm({ onGenerate, generating }: Props) {
  const [commanderName, setCommanderName] = useState('');
  const [partnerName, setPartnerName] = useState('');
  const [decklistText, setDecklistText] = useState('');
  const [notes, setNotes] = useState('');
  const [savedDecks, setSavedDecks] = useState<SavedDeck[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('mtg-decks');
      if (raw) setSavedDecks(JSON.parse(raw) as SavedDeck[]);
    } catch { /* ignore */ }
  }, []);

  const loadFromDeck = (id: string) => {
    const deck = savedDecks.find(d => d.id === id);
    if (!deck) return;
    if (deck.commander) setCommanderName(deck.commander.name);
    const lines = deck.cards.map(dc => `${dc.quantity} ${dc.card.name}`);
    setDecklistText(lines.join('\n'));
  };

  const canGenerate = commanderName.trim().length > 0 && !generating;

  return (
    <div className="bg-[#1a1a2e] border border-[#9d6b2e] rounded-xl p-4 md:p-6">
      <h2 className="text-[#c8a951] font-bold text-lg mb-1">New briefing</h2>
      <p className="text-sm text-gray-400 mb-4">
        Pick a commander, optionally paste a decklist and notes. The assistant analyzes the plan,
        suggests cards by role, and maps out win lines — every card verified against Scryfall.
      </p>

      <div className="grid md:grid-cols-2 gap-4 mb-4">
        <CommanderPicker label="Commander *" value={commanderName} onPick={setCommanderName} onClear={() => setCommanderName('')} />
        <CommanderPicker label="Partner (optional)" value={partnerName} onPick={setPartnerName} onClear={() => setPartnerName('')} />
      </div>

      {savedDecks.length > 0 && (
        <div className="mb-4">
          <label className="block text-xs font-semibold text-gray-400 mb-1">Start from a saved deck</label>
          <select
            onChange={e => { if (e.target.value) loadFromDeck(e.target.value); e.target.value = ''; }}
            className="w-full bg-[#0f0f1a] border border-[#9d6b2e] text-[#e8e0d0] px-3 py-2.5 rounded text-sm focus:outline-none focus:border-[#c8a951]"
            defaultValue=""
          >
            <option value="">Choose a saved deck…</option>
            {savedDecks.map(d => (
              <option key={d.id} value={d.id}>{d.name}{d.commander ? ` — ${d.commander.name}` : ''}</option>
            ))}
          </select>
        </div>
      )}

      <div className="mb-4">
        <label className="block text-xs font-semibold text-gray-400 mb-1">
          Decklist (optional — one card per line)
        </label>
        <textarea
          value={decklistText}
          onChange={e => setDecklistText(e.target.value)}
          rows={6}
          placeholder={'1 Sol Ring\n1 Arcane Signet\n…'}
          className="w-full bg-[#0f0f1a] border border-[#9d6b2e] text-[#e8e0d0] px-3 py-2.5 rounded text-sm font-mono focus:outline-none focus:border-[#c8a951] resize-y"
        />
      </div>

      <div className="mb-5">
        <label className="block text-xs font-semibold text-gray-400 mb-1">
          Notes (optional — budget, power level, themes, combos to avoid)
        </label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={2}
          placeholder="Budget $150, mid power, no infinite combos…"
          className="w-full bg-[#0f0f1a] border border-[#9d6b2e] text-[#e8e0d0] px-3 py-2.5 rounded text-sm focus:outline-none focus:border-[#c8a951] resize-y"
        />
      </div>

      <button
        onClick={() => onGenerate({ commanderName: commanderName.trim(), partnerName: partnerName.trim(), decklistText, notes })}
        disabled={!canGenerate}
        className="w-full md:w-auto bg-[#9d6b2e] hover:bg-[#c8a951] hover:text-[#0f0f1a] disabled:opacity-40 disabled:cursor-not-allowed text-white px-6 py-3 rounded font-bold text-sm transition-colors"
      >
        {generating ? 'Analyzing… this takes ~30–60 seconds' : '✨ Generate briefing'}
      </button>
    </div>
  );
}
