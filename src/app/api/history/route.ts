export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

// GET history for all members or specific seat
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const memberId = searchParams.get('memberId');

        const db = await getDb();

        if (memberId) {
            // Get specific member's history
            const history = await db.all(
                `SELECT year, seatLabel FROM seat_assignments WHERE memberId = ? ORDER BY year DESC`,
                [memberId]
            );
            return NextResponse.json(history);
        } else {
            // Get ALL history for tooltips, include seatId so frontend can key by unique seat
            const history = await db.all(`
                SELECT sa.year, sa.seatId, sa.seatLabel, sa.memberId, m.displayName
                FROM seat_assignments sa
                JOIN members m ON sa.memberId = m.id
                ORDER BY sa.year DESC
            `);
            return NextResponse.json(history);
        }
    } catch (error) {
        console.error("Failed to fetch history:", error);
        return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
    }
}
