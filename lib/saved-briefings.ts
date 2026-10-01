'use client';

import { Briefing, SavedBriefing } from '@/types/mtg';

const KEY = 'mtg-briefings';

function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `briefing-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function loadBriefings(): SavedBriefing[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as SavedBriefing[];
    return Array.isArray(arr) ? arr.sort((a, b) => b.createdAt - a.createdAt) : [];
  } catch {
    return [];
  }
}

export function saveBriefing(briefing: Briefing): SavedBriefing {
  const record: SavedBriefing = {
    id: newId(),
    commanderName: briefing.commanderName,
    createdAt: Date.now(),
    briefing,
  };
  const all = loadBriefings();
  all.unshift(record);
  try {
    localStorage.setItem(KEY, JSON.stringify(all.slice(0, 25)));
  } catch { /* ignore */ }
  return record;
}

export function deleteBriefing(id: string): SavedBriefing[] {
  const all = loadBriefings().filter(b => b.id !== id);
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch { /* ignore */ }
  return all;
}
