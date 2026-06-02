import { NextResponse } from 'next/server';
import { saveFeedback } from '@engine/data/database.js';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sessionId, rating, turnId } = body;

    if (!sessionId || !rating || !['up', 'down'].includes(rating)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const feedback = await saveFeedback(sessionId, rating, turnId);
    return NextResponse.json({ ok: true, id: feedback.id }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to save feedback' }, { status: 500 });
  }
}
