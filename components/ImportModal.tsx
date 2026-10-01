'use client';

import { useState } from 'react';
import { ScryfallCard, DeckCard } from '@/types/mtg';
import { fetchCardByExactName } from '@/lib/scryfall';

export interface ParsedEntry {
  name: string;
  quantity: number;
}

export interface ImportOutcome {
  commander: ScryfallCard | null;
  cards: ScryfallCard[];
  skipped: { name: string; reason: string }[];
}

/** Parse a plain-text decklist. Supports "1 Sol Ring", "1x Sol Ring", "Sol Ring", and "Commander: Name". */
export function parseDeckList(text: string): { commanderName: string | null; entries: ParsedEntry[] } {
  let commanderName: string | null = null;
  const entries: ParsedEntry[] = [];

  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || line.startsWith('//')) continue;

    const commanderMatch = line.match(/^commander\s*:\s*(.+)$/i);
    if (commanderMatch) {
      commanderName = commanderMatch[1].trim();
      continue;
    }

    // Strip trailing set/collector info like " (C21) 123" or " [C21]"
    const cleaned = line.replace(/\s+[\(\[].*?[\)\]]\s*\d*\s*$/, '').trim();
    const match = cleaned.match(/^(?:(\d+)\s*[xX]?\s+)?(.+?)$/);
    if (!match) continue;
    const name = (match[2] ?? '').trim();
    if (!name) continue;
    const quantity = Math.max(1, parseInt(match[1] ?? '1', 10) || 1);
    entries.push({ name, quantity });
  }

  return { commanderName, entries };
}

/** Build a plain-text decklist suitable for copy/paste or download. */
export function buildDeckListText(commander: ScryfallCard | null, cards: DeckCard[]): string {
  const lines: string[] = [];
  if (commander) lines.push(`Commander: ${commander.name}`);
  const sorted = [...cards].sort((a, b) => a.card.name.localeCompare(b.card.name));
  for (const dc of sorted) {
    lines.push(`${dc.quantity} ${dc.card.name}`);
  }
  return lines.join('\n');
}

interface Props {
  open: boolean;
  onClose: () => void;
  onImport: (outcome: ImportOutcome) => Promise<ImportOutcome>;
  exportCommander: ScryfallCard | null;
  exportCards: DeckCard[];
  deckName: string;
}

type Tab = 'import' | 'moxfield' | 'export';

const TAB_LABELS: Record<Tab, string> = { import: 'Import', moxfield: 'Moxfield', export: 'Export' };

export function ImportModal({ open, onClose, onImport, exportCommander, exportCards, deckName }: Props) {
  const [tab, setTab] = useState<Tab>('import');
  const [text, setText] = useState('');
  const [moxfieldUrl, setMoxfieldUrl] = useState('');
  const [firstIsCommander, setFirstIsCommander] = useState(true);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState('');
  const [outcome, setOutcome] = useState<ImportOutcome | null>(null);
  const [moxfieldError, setMoxfieldError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  const exportText = buildDeckListText(exportCommander, exportCards);

  const handleImport = async () => {
    await runImport(text);
  };

  const runImport = async (sourceText: string) => {
    const { commanderName, entries } = parseDeckList(sourceText);
    if (entries.length === 0 && !commanderName) return;

    setImporting(true);
    setOutcome(null);

    const skipped: { name: string; reason: string }[] = [];
    let commander: ScryfallCard | null = null;

    // Resolve commander: explicit "Commander:" line wins, otherwise the
    // first entry when the toggle is on.
    let commanderEntryName: string | null = commanderName;
    let cardEntries = entries;
    if (!commanderEntryName && firstIsCommander && entries.length > 0) {
      commanderEntryName = entries[0].name;
      cardEntries = entries.slice(1);
    }

    if (commanderEntryName) {
      setProgress(`Looking up commander: ${commanderEntryName}…`);
      commander = await fetchCardByExactName(commanderEntryName);
      if (!commander) skipped.push({ name: commanderEntryName, reason: 'Commander not found' });
    }

    // Merge duplicate names, preserving quantities
    const merged = new Map<string, number>();
    for (const e of cardEntries) {
      const key = e.name.toLowerCase();
      merged.set(key, (merged.get(key) ?? 0) + e.quantity);
    }

    const cards: ScryfallCard[] = [];
    let i = 0;
    const total = merged.size;
    for (const [key, qty] of Array.from(merged.entries())) {
      i += 1;
      const original = cardEntries.find(e => e.name.toLowerCase() === key)?.name ?? key;
      setProgress(`Looking up ${i}/${total}: ${original}…`);
      const card = await fetchCardByExactName(original);
      if (!card) {
        skipped.push({ name: original, reason: 'Not found' });
        continue;
      }
      for (let q = 0; q < qty; q++) cards.push(card);
    }

    const initialOutcome = { commander, cards, skipped };
    // Let the page apply deck rules; it returns the post-validation outcome
    // so the summary reports what was actually added.
    const finalOutcome = await onImport(initialOutcome);
    setOutcome(finalOutcome);
    setImporting(false);
    setProgress('');
  };

  const handleMoxfieldImport = async () => {
    if (!moxfieldUrl.trim() || importing) return;
    setImporting(true);
    setOutcome(null);
    setMoxfieldError(null);
    try {
      setProgress('Fetching deck from Moxfield…');
      const res = await fetch(`/api/moxfield?url=${encodeURIComponent(moxfieldUrl.trim())}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Moxfield fetch failed.');
      const lines: string[] = [];
      if (data.commander) lines.push(`Commander: ${data.commander}`);
      for (const c of (data.cards ?? []) as { name: string; quantity: number }[]) {
        lines.push(`${c.quantity} ${c.name}`);
      }
      if (lines.length === 0) throw new Error('That Moxfield deck came back empty.');
      setProgress(`Found "${data.name ?? 'deck'}" — resolving cards…`);
      await runImport(lines.join('\n'));
    } catch (err) {
      setMoxfieldError(err instanceof Error ? err.message : 'Moxfield import failed.');
      setImporting(false);
      setProgress('');
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(exportText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = exportText;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* ignore */ }
      document.body.removeChild(ta);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([exportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${deckName || 'commander-deck'}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const close = () => {
    setOutcome(null);
    setProgress('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={close}>
      <div
        className="w-full max-w-lg max-h-[85vh] flex flex-col bg-[#1a1a2e] border border-[#9d6b2e] rounded-xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Tabs */}
        <div className="flex border-b border-[#9d6b2e]">
          {(Object.keys(TAB_LABELS) as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setOutcome(null); setMoxfieldError(null); }}
              className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                tab === t ? 'bg-[#c8a951] text-[#0f0f1a]' : 'text-[#c8a951] hover:bg-[#1e2035]'
              }`}
            >
              {TAB_LABELS[t]}
            </button>
          ))}
          <button onClick={close} className="px-4 text-gray-500 hover:text-gray-300 text-xl leading-none">×</button>
        </div>

        {tab === 'import' ? (
          <div className="p-4 flex flex-col gap-3 overflow-y-auto">
            <p className="text-xs text-gray-400">
              Paste a decklist — one card per line, like <span className="font-mono">1 Sol Ring</span>.
              A <span className="font-mono">Commander: Name</span> line sets the commander.
            </p>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder={'Commander: Atraxa, Praetors\' Voice\n1 Sol Ring\n1 Arcane Signet\n35 Island'}
              rows={10}
              className="w-full bg-[#0f0f1a] border border-[#9d6b2e] rounded p-3 text-sm text-[#e8e0d0] font-mono focus:outline-none focus:border-[#c8a951]"
            />
            <label className="flex items-center gap-2 text-xs text-gray-400">
              <input
                type="checkbox"
                checked={firstIsCommander}
                onChange={e => setFirstIsCommander(e.target.checked)}
                className="accent-[#c8a951]"
              />
              Treat the first card as the commander (unless a Commander: line is present)
            </label>

            {outcome && (
              <div className="text-xs bg-[#0f0f1a] border border-[#2a2a4a] rounded p-3">
                <p className="text-green-400 font-semibold mb-1">
                  Added {outcome.commander ? 1 : 0} commander + {outcome.cards.length} card{outcome.cards.length === 1 ? '' : 's'}
                </p>
                {outcome.skipped.length > 0 && (
                  <div className="mt-1">
                    <p className="text-amber-400 font-semibold">Skipped ({outcome.skipped.length}):</p>
                    <ul className="text-gray-400 mt-1 space-y-0.5">
                      {outcome.skipped.map((s, idx) => (
                        <li key={idx}>{s.name} — {s.reason}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <p className="text-gray-500 mt-2">Cards that break singleton, color identity, or ban rules were left out by the deck validator.</p>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleImport}
                disabled={importing || !text.trim()}
                className="flex-1 bg-[#9d6b2e] hover:bg-[#c8a951] hover:text-[#0f0f1a] text-white px-4 py-2.5 rounded font-semibold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {importing ? 'Importing…' : 'Import Deck'}
              </button>
              {outcome && (
                <button
                  onClick={close}
                  className="bg-[#1e2035] hover:bg-[#2a2a4a] text-[#c8a951] border border-[#9d6b2e] px-4 py-2.5 rounded text-sm transition-colors"
                >
                  Done
                </button>
              )}
            </div>
            {importing && progress && <p className="text-xs text-gray-500">{progress}</p>}
          </div>
        ) : tab === 'moxfield' ? (
          <div className="p-4 flex flex-col gap-3 overflow-y-auto">
            <p className="text-xs text-gray-400">
              Paste a public Moxfield deck URL and the whole list — commander included — comes in through the same validator.
            </p>
            <input
              type="url"
              value={moxfieldUrl}
              onChange={e => setMoxfieldUrl(e.target.value)}
              placeholder="https://www.moxfield.com/decks/…"
              className="w-full bg-[#0f0f1a] border border-[#9d6b2e] rounded p-3 text-sm text-[#e8e0d0] focus:outline-none focus:border-[#c8a951]"
            />
            {moxfieldError && (
              <p className="text-xs text-red-400 bg-red-950/30 border border-red-900 rounded p-2">{moxfieldError}</p>
            )}
            {outcome && (
              <div className="text-xs bg-[#0f0f1a] border border-[#2a2a4a] rounded p-3">
                <p className="text-green-400 font-semibold mb-1">
                  Added {outcome.commander ? 1 : 0} commander + {outcome.cards.length} card{outcome.cards.length === 1 ? '' : 's'}
                </p>
                {outcome.skipped.length > 0 && (
                  <div className="mt-1">
                    <p className="text-amber-400 font-semibold">Skipped ({outcome.skipped.length}):</p>
                    <ul className="text-gray-400 mt-1 space-y-0.5">
                      {outcome.skipped.map((s, idx) => (
                        <li key={idx}>{s.name} — {s.reason}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleMoxfieldImport}
                disabled={importing || !moxfieldUrl.trim()}
                className="flex-1 bg-[#9d6b2e] hover:bg-[#c8a951] hover:text-[#0f0f1a] text-white px-4 py-2.5 rounded font-semibold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {importing ? 'Importing…' : 'Import from Moxfield'}
              </button>
              {outcome && (
                <button
                  onClick={close}
                  className="bg-[#1e2035] hover:bg-[#2a2a4a] text-[#c8a951] border border-[#9d6b2e] px-4 py-2.5 rounded text-sm transition-colors"
                >
                  Done
                </button>
              )}
            </div>
            {importing && progress && <p className="text-xs text-gray-500">{progress}</p>}
          </div>
        ) : (
          <div className="p-4 flex flex-col gap-3 overflow-y-auto">
            <textarea
              readOnly
              value={exportText}
              rows={12}
              className="w-full bg-[#0f0f1a] border border-[#2a2a4a] rounded p-3 text-sm text-[#e8e0d0] font-mono focus:outline-none"
            />
            <div className="flex gap-2">
              <button
                onClick={handleCopy}
                className="flex-1 bg-[#9d6b2e] hover:bg-[#c8a951] hover:text-[#0f0f1a] text-white px-4 py-2.5 rounded font-semibold text-sm transition-colors"
              >
                {copied ? 'Copied!' : 'Copy to Clipboard'}
              </button>
              <button
                onClick={handleDownload}
                className="bg-[#1e2035] hover:bg-[#2a2a4a] text-[#c8a951] border border-[#9d6b2e] px-4 py-2.5 rounded text-sm transition-colors"
              >
                Download .txt
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
