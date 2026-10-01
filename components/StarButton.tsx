'use client';

import { useState } from 'react';
import { toggleStar, isStarred } from '@/lib/stars';

interface Props {
  cardId: string;
  name: string;
  imageSmall?: string | null;
  imageNormal?: string | null;
  className?: string;
}

/** Star/unstar toggle for the card library. */
export function StarButton({ cardId, name, imageSmall, imageNormal, className }: Props) {
  const [starred, setStarred] = useState<boolean>(() => {
    try { return isStarred(cardId); } catch { return false; }
  });

  const onToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      setStarred(toggleStar({ id: cardId, name, imageSmall, imageNormal }));
    } catch { /* ignore */ }
  };

  return (
    <button
      onClick={onToggle}
      title={starred ? 'Remove from library' : 'Star this card (save to library)'}
      className={`flex items-center justify-center w-8 h-8 rounded-full border transition-colors ${
        starred
          ? 'bg-[#c8a951] border-[#c8a951] text-[#0f0f1a]'
          : 'bg-[#0f0f1a]/70 border-[#9d6b2e] text-[#c8a951] hover:bg-[#2a2a4a]'
      } ${className ?? ''}`}
    >
      <span className="text-base leading-none">{starred ? '★' : '☆'}</span>
    </button>
  );
}
