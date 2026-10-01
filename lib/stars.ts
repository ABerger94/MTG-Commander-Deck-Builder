'use client';

import { StarredCard } from '@/types/mtg';

const KEY = 'mtg-starred';

export function loadStarred(): StarredCard[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as StarredCard[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function persist(starred: StarredCard[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(starred));
  } catch { /* ignore */ }
}

export function isStarred(cardId: string): boolean {
  return loadStarred().some(s => s.id === cardId);
}

/** Toggle a star; returns the new starred state. */
export function toggleStar(card: { id: string; name: string; imageSmall?: string | null; imageNormal?: string | null }): boolean {
  const starred = loadStarred();
  const idx = starred.findIndex(s => s.id === card.id);
  if (idx >= 0) {
    starred.splice(idx, 1);
    persist(starred);
    return false;
  }
  starred.unshift({
    id: card.id,
    name: card.name,
    imageSmall: card.imageSmall ?? null,
    imageNormal: card.imageNormal ?? null,
    starredAt: Date.now(),
  });
  persist(starred);
  return true;
}

export function removeStar(cardId: string): StarredCard[] {
  const starred = loadStarred().filter(s => s.id !== cardId);
  persist(starred);
  return starred;
}
