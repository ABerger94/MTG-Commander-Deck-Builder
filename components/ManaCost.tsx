'use client';

const COLOR_STYLES: Record<string, string> = {
  W: 'bg-amber-50 text-amber-900 ring-1 ring-amber-300',
  U: 'bg-blue-500 text-white ring-1 ring-blue-300',
  B: 'bg-gray-900 text-gray-300 ring-1 ring-gray-600',
  R: 'bg-red-600 text-white ring-1 ring-red-400',
  G: 'bg-green-700 text-white ring-1 ring-green-500',
};

interface Props {
  cost: string;
  size?: 'xs' | 'sm' | 'md';
}

export function ManaCost({ cost, size = 'sm' }: Props) {
  const symbols = cost.match(/\{[^}]+\}/g) ?? [];
  const dim = size === 'xs' ? 'w-4 h-4 text-[9px]' : size === 'sm' ? 'w-5 h-5 text-[10px]' : 'w-7 h-7 text-sm';

  return (
    <div className="flex flex-wrap gap-0.5 items-center">
      {symbols.map((sym, i) => {
        const inner = sym.slice(1, -1);
        const style = COLOR_STYLES[inner] ?? 'bg-gray-500 text-white ring-1 ring-gray-400';
        const label = inner.includes('/') ? inner.split('/')[0] : inner.length > 2 ? '∞' : inner;
        return (
          <span key={i} className={`${dim} ${style} rounded-full flex items-center justify-center font-bold flex-shrink-0`}>
            {label}
          </span>
        );
      })}
    </div>
  );
}
