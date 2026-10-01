import { NextRequest, NextResponse } from 'next/server';

/**
 * Moxfield deck import proxy.
 * GET /api/moxfield?url=<moxfield deck url>
 * Returns { name, commander, cards: [{ name, quantity }] }.
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')?.trim() ?? '';
  const match = url.match(/moxfield\.com\/decks\/([A-Za-z0-9_-]+)/);
  if (!match) {
    return NextResponse.json(
      { error: 'bad_request', message: 'Paste a Moxfield deck URL, e.g. https://www.moxfield.com/decks/abc123' },
      { status: 400 }
    );
  }
  const deckId = match[1];
  try {
    const res = await fetch(`https://api2.moxfield.com/v2/decks/all/${deckId}`, {
      headers: { 'User-Agent': 'MTG-Commander-Deck-Builder/1.0' },
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: 'not_found', message: 'Could not fetch that Moxfield deck. Is it public?' },
        { status: res.status === 404 ? 404 : 502 }
      );
    }
    const data = await res.json();
    const mainboard = data.mainboard ?? {};
    const cards = Object.values(mainboard).map((entry: unknown) => {
      const e = entry as { card?: { name?: string }; quantity?: number };
      return { name: e.card?.name ?? '', quantity: e.quantity ?? 1 };
    }).filter(c => c.name);
    const commanders = data.commanders ?? {};
    const commanderEntry = Object.values(commanders)[0] as { card?: { name?: string } } | undefined;
    return NextResponse.json({
      name: data.name ?? 'Moxfield import',
      commander: commanderEntry?.card?.name ?? null,
      cards,
    });
  } catch {
    return NextResponse.json(
      { error: 'fetch_failed', message: 'Failed to reach Moxfield. Try again in a moment.' },
      { status: 502 }
    );
  }
}
