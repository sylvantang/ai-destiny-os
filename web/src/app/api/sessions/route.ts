import { NextResponse } from 'next/server';
import { createSession, listSessions } from '@engine/data/database.js';
import type { BirthInfo } from '@engine/core/astro/types.js';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const birth: BirthInfo = {
      year: body.year,
      month: body.month,
      day: body.day,
      hour: body.hour,
      minute: body.minute ?? 0,
      longitude: body.longitude ?? 116.4,
      isDST: body.isDST ?? false,
      gender: body.gender ?? '男',
    };

    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const userId = body.userId ?? `user_${birth.year}${birth.month}${birth.day}`;
    const session = await createSession(sessionId, userId, birth);

    return NextResponse.json({
      sessionId: session.id,
      userId: session.userId,
      createdAt: session.createdAt,
    }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    const sessions = await listSessions();
    return NextResponse.json(
      sessions.map((s) => ({
        id: s.id,
        userId: s.userId,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      })),
    );
  } catch {
    return NextResponse.json({ error: 'Failed to list sessions' }, { status: 500 });
  }
}
