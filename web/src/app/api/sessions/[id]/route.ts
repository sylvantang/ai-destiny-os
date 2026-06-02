import { NextResponse } from 'next/server';
import { getSession, getSessionTurns, deleteSession } from '@engine/data/database.js';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = getSession(id);
    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

    const turns = getSessionTurns(id);
    return NextResponse.json({
      id: session.id,
      userId: session.userId,
      birthInfo: JSON.parse(session.birthInfo),
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      turns: turns.map((t) => ({
        id: t.id,
        role: t.role,
        content: t.content,
        topic: t.topic,
        timestamp: t.timestamp,
      })),
    });
  } catch {
    return NextResponse.json({ error: 'Failed to get session' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = getSession(id);
    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    deleteSession(id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Failed to delete session' }, { status: 500 });
  }
}
