export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { LayoutItem, Table, ColumnConfig } from '@/lib/types';

// GET layout for a specific year
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const year = searchParams.get('year');
        if (!year) return NextResponse.json({ error: "Year required" }, { status: 400 });

        const db = await getDb();
        const layout = await db.get('SELECT * FROM layouts WHERE year = ?', year);

        if (!layout) {
            return NextResponse.json({ items: [], tables: [], columns: [] }); // Empty default
        }

        return NextResponse.json({
            items: JSON.parse(layout.items),
            tables: JSON.parse(layout.tables),
            columns: JSON.parse(layout.columns || '[]')
        });
    } catch (error) {
        console.error("Failed to fetch layout:", error);
        return NextResponse.json({ error: "Failed to fetch layout" }, { status: 500 });
    }
}

// POST save layout
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { year, items, tables, columns } = body;

        if (!year) return NextResponse.json({ error: "Year required" }, { status: 400 });

        const db = await getDb();

        // 1. Save complex layout JSON
        await db.run(
            `INSERT OR REPLACE INTO layouts (year, items, tables, columns, updatedAt)
             VALUES (?, ?, ?, ?, ?)`,
            [year, JSON.stringify(items), JSON.stringify(tables), JSON.stringify(columns), Date.now()]
        );

        // 2. Clear old seat assignments for this year to prevent staleness
        await db.run(`DELETE FROM seat_assignments WHERE year = ?`, year);

        // 3. Populate seat_assignments table for optimized history queries
        const assignments = (items as LayoutItem[])
            .filter(item => item.type === 'seat' && item.memberId)
            .map(item => ({
                year,
                seatId: item.id,
                seatLabel: item.label,
                memberId: item.memberId
            }));

        for (const assign of assignments) {
            await db.run(
                `INSERT OR REPLACE INTO seat_assignments (year, seatId, seatLabel, memberId) VALUES (?, ?, ?, ?)`,
                [assign.year, assign.seatId, assign.seatLabel, assign.memberId]
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Failed to save layout:", error);
        return NextResponse.json({ error: "Failed to save layout" }, { status: 500 });
    }
}
