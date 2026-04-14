import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';

let db: Database | null = null;

export async function getDb() {
    if (db) return db;

    db = await open({
        filename: './seating.db',
        driver: sqlite3.Database
    });

    await db.exec(`
        CREATE TABLE IF NOT EXISTS members (
            id TEXT PRIMARY KEY,
            firstName TEXT,
            lastName TEXT,
            displayName TEXT,
            roomId TEXT,
            createdAt INTEGER
        );

        CREATE TABLE IF NOT EXISTS layouts (
            year INTEGER PRIMARY KEY,
            items TEXT, -- JSON
            tables TEXT, -- JSON
            columns TEXT, -- JSON
            updatedAt INTEGER
        );
    `);

    // Migrate seat_assignments to use seatId (unique) as primary key.
    // Old schema used (year, seatLabel) which caused history to bleed across
    // all seats sharing the same label (e.g. "COL1 - S1" for every row).
    const cols = await db.all(`PRAGMA table_info(seat_assignments)`);
    const hasSeatId = cols.some((c: any) => c.name === 'seatId');

    if (!hasSeatId) {
        // Drop the old table (it had wrong data anyway) and recreate with seatId
        await db.exec(`
            DROP TABLE IF EXISTS seat_assignments;
            CREATE TABLE seat_assignments (
                year INTEGER,
                seatId TEXT,
                seatLabel TEXT,
                memberId TEXT,
                PRIMARY KEY (year, seatId),
                FOREIGN KEY (memberId) REFERENCES members(id)
            );
        `);
    } else {
        // Table already has the right schema, ensure it exists
        await db.exec(`
            CREATE TABLE IF NOT EXISTS seat_assignments (
                year INTEGER,
                seatId TEXT,
                seatLabel TEXT,
                memberId TEXT,
                PRIMARY KEY (year, seatId),
                FOREIGN KEY (memberId) REFERENCES members(id)
            );
        `);
    }

    return db;
}
