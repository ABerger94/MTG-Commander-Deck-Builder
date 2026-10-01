import { NextRequest, NextResponse } from 'next/server';
import {
  BriefingRequest,
  callGeminiBriefing,
  buildBriefingPrompt,
  resolveBriefingInput,
  verifyAndEnrichBriefing,
} from '@/lib/briefing';

// Briefing generation + Scryfall grounding can take a while; allow the max.
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error: 'missing_key',
        message:
          'The AI briefing needs a free Gemini API key. Add GEMINI_API_KEY to the deployment environment variables (get one at https://aistudio.google.com/apikey), then redeploy.',
      },
      { status: 503 }
    );
  }

  let body: BriefingRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'bad_request', message: 'Invalid JSON body.' }, { status: 400 });
  }

  if (!body.commanderName?.trim()) {
    return NextResponse.json(
      { error: 'bad_request', message: 'commanderName is required.' },
      { status: 400 }
    );
  }

  try {
    const resolved = await resolveBriefingInput(body);
    const prompt = buildBriefingPrompt(resolved, body.notes);
    const raw = await callGeminiBriefing(apiKey, prompt);
    const briefing = await verifyAndEnrichBriefing(raw, resolved, body);
    return NextResponse.json({ briefing });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Briefing generation failed.';
    const status = /could not find a card/i.test(message) ? 404 : 500;
    return NextResponse.json({ error: 'briefing_failed', message }, { status });
  }
}

// Health check: is the briefing backend configured?
export async function GET() {
  return NextResponse.json({ configured: !!process.env.GEMINI_API_KEY });
}
