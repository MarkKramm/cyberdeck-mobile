import * as SQLite from 'expo-sqlite';

// --- TypeScript Types ---
export type DbDeck = {
    id: number;
    name: string;
    description: string | null;
    color: string | null;
    created_at: string;
    updated_at: string;
};

export type DbCard = {
    id: number;
    deck_id: number;
    card_type: string;
    front: string;
    back: string;
    tags: string | null;
    notes: string | null;
    difficulty: string;
    due_at: string | null;
    interval_days: number;
    review_count: number;
    lapse_count: number;
    created_at: string;
    updated_at: string;
    deck_name?: string;
};

export type DbMistake = {
    id: number;
    title: string;
    explanation: string | null;
    related_card_id: number | null;
    status: string;
    created_at: string;
    updated_at: string;
};

export type DbWin = {
    id: number;
    text: string;
    created_at: string;
};

export type DbReviewLog = {
    id: number;
    card_id: number;
    mode: 'srs' | 're-view';
    rating?: string | null;
    created_at: string;
};

export type CyberDeckBackup = {
    version: number;
    exported_at: string;
    decks: DbDeck[];
    cards: DbCard[];
    mistakes: DbMistake[];
    wins: DbWin[];
    reviewLogs: DbReviewLog[];
};

let dbInstance: SQLite.SQLiteDatabase | null = null;
let initializationPromise: Promise<void> | null = null;

export async function openDatabase(): Promise<SQLite.SQLiteDatabase> {
    if (dbInstance) return dbInstance;

    dbInstance = await SQLite.openDatabaseAsync('cyberdeck.db');

    // Important for ON DELETE CASCADE behavior.
    // Without this, deleting decks/cards may leave orphaned review_logs on some SQLite setups.
    await dbInstance.execAsync('PRAGMA foreign_keys = ON;');

    return dbInstance;
}

export function initializeDatabase(): Promise<void> {
    if (initializationPromise) return initializationPromise;

    initializationPromise = (async () => {
        const db = await openDatabase();

        // 1. Decks Table
        await db.execAsync(`
            CREATE TABLE IF NOT EXISTS decks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT,
                color TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 2. Cards Table
        await db.execAsync(`
            CREATE TABLE IF NOT EXISTS cards (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                deck_id INTEGER NOT NULL,
                card_type TEXT NOT NULL,
                front TEXT NOT NULL,
                back TEXT NOT NULL,
                tags TEXT,
                notes TEXT,
                difficulty TEXT DEFAULT 'new',
                due_at TEXT,
                interval_days INTEGER DEFAULT 0,
                review_count INTEGER DEFAULT 0,
                lapse_count INTEGER DEFAULT 0,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (deck_id) REFERENCES decks(id) ON DELETE CASCADE
            );
        `);

        // 3. Mistakes Table
        await db.execAsync(`
            CREATE TABLE IF NOT EXISTS mistakes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                explanation TEXT,
                related_card_id INTEGER,
                status TEXT DEFAULT 'open',
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (related_card_id) REFERENCES cards(id) ON DELETE SET NULL
            );
        `);

        // 4. Wins Table
        await db.execAsync(`
            CREATE TABLE IF NOT EXISTS wins (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                text TEXT NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 5. Review Logs Table
        await db.execAsync(`
            CREATE TABLE IF NOT EXISTS review_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                card_id INTEGER NOT NULL,
                mode TEXT NOT NULL, -- 'srs' or 're-view'
                rating TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
            );
        `);

        // 6. Lightweight metadata table for future-safe migrations/versioning.
        await db.execAsync(`
            CREATE TABLE IF NOT EXISTS app_metadata (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );
        `);

        await db.runAsync(
            `INSERT OR IGNORE INTO app_metadata (key, value) VALUES ('schema_version', '1');`
        );

        // 7. Performance indexes.
        // IF NOT EXISTS makes these safe to run on every cold start.
        await db.execAsync(`
            CREATE INDEX IF NOT EXISTS idx_cards_due_at        ON cards(due_at);
            CREATE INDEX IF NOT EXISTS idx_cards_deck_id       ON cards(deck_id);
            CREATE INDEX IF NOT EXISTS idx_cards_difficulty    ON cards(difficulty);
            CREATE INDEX IF NOT EXISTS idx_review_logs_card_id ON review_logs(card_id);
            CREATE INDEX IF NOT EXISTS idx_mistakes_card_id    ON mistakes(related_card_id);
        `);

        // --- SEED SELECTION SAFEGUARD ---
        const deckCheck = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM decks;');
        if (deckCheck && deckCheck.count === 0) {
            const now = new Date().toISOString();

            await db.runAsync(
                "INSERT INTO decks (name, description, color, created_at, updated_at) VALUES ('🔴 Red Team & Active Exploitation', 'Deep dive hacking vectors.', '#EF4444', ?, ?);",
                [now, now]
            );
            await db.runAsync(
                "INSERT INTO decks (name, description, color, created_at, updated_at) VALUES ('🔵 Blue Team & Digital Forensics', 'Incident analysis mappings.', '#2563EB', ?, ?);",
                [now, now]
            );
            await db.runAsync(
                "INSERT INTO decks (name, description, color, created_at, updated_at) VALUES ('🌐 Network Perimeter Analysis', 'Routing protocols and traffic rules.', '#10B981', ?, ?);",
                [now, now]
            );
            await db.runAsync(
                "INSERT INTO decks (name, description, color, created_at, updated_at) VALUES ('⚙️ Cloud & Container Security', 'IAM definitions and Docker clusters.', '#8B5CF6', ?, ?);",
                [now, now]
            );
        }
    })();

    return initializationPromise;
}

export async function getReadyDatabase() {
    await initializeDatabase();
    return openDatabase();
}

// --- DUE DATE HELPER ---
// Returns midnight (00:00:00.000) of the day that is `daysFromNow` days from today.
// This means cards always become available at 12am sharp, never mid-day.
// Example: reviewed at 5am on Monday with interval=1 → due at 12am Tuesday, not 5am Tuesday.
function getMidnightDue(daysFromNow: number): string {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + daysFromNow);
    return d.toISOString();
}

// --- CRUD / FETCH OPERATIONS ---
export async function getAllDecks(): Promise<DbDeck[]> {
    const db = await getReadyDatabase();
    return db.getAllAsync<DbDeck>('SELECT * FROM decks ORDER BY id ASC;');
}

export async function createDeck(name: string, description: string | null, color: string | null): Promise<void> {
    const db = await getReadyDatabase();
    const now = new Date().toISOString();

    await db.runAsync(
        'INSERT INTO decks (name, description, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?);',
        [name, description, color, now, now]
    );
}

export async function updateDeck(id: number, name: string, description: string | null): Promise<void> {
    const db = await getReadyDatabase();
    const now = new Date().toISOString();

    await db.runAsync(
        'UPDATE decks SET name = ?, description = ?, updated_at = ? WHERE id = ?;',
        [name, description, now, id]
    );
}

// updateDeckFull includes color so browse.tsx can call this instead of raw SQL.
export async function updateDeckFull(id: number, name: string, description: string | null, color: string | null): Promise<void> {
    const db = await getReadyDatabase();
    const now = new Date().toISOString();

    await db.runAsync(
        'UPDATE decks SET name = ?, description = ?, color = ?, updated_at = ? WHERE id = ?;',
        [name, description, color, now, id]
    );
}

export async function deleteDeck(id: number): Promise<void> {
    const db = await getReadyDatabase();

    // Wrapped in a transaction so a crash mid-delete can't leave a deck without
    // its cards, or cards without their review_logs.
    await db.withExclusiveTransactionAsync(async () => {
        await db.runAsync(
            `DELETE FROM review_logs 
             WHERE card_id IN (SELECT id FROM cards WHERE deck_id = ?);`,
            [id]
        );

        await db.runAsync('DELETE FROM cards WHERE deck_id = ?;', [id]);
        await db.runAsync('DELETE FROM decks WHERE id = ?;', [id]);
    });
}

export async function getAllCards(): Promise<DbCard[]> {
    const db = await getReadyDatabase();

    return db.getAllAsync<DbCard>(`
        SELECT c.*, d.name as deck_name 
        FROM cards c 
        JOIN decks d ON c.deck_id = d.id 
        ORDER BY c.id DESC;
    `);
}

export async function saveCard(
    deckId: number,
    cardType: string,
    front: string,
    back: string,
    tags: string | null,
    notes: string | null
): Promise<void> {
    const db = await getReadyDatabase();
    const now = new Date().toISOString();

    // New cards are due immediately (midnight today) so they show up in today's queue.
    await db.runAsync(
        'INSERT INTO cards (deck_id, card_type, front, back, tags, notes, difficulty, due_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);',
        [deckId, cardType, front, back, tags, notes, 'new', getMidnightDue(0), now, now]
    );
}

export async function updateCard(
    id: number,
    deckId: number,
    cardType: string,
    front: string,
    back: string,
    tags: string | null,
    notes: string | null
): Promise<void> {
    const db = await getReadyDatabase();
    const now = new Date().toISOString();

    await db.runAsync(
        'UPDATE cards SET deck_id = ?, card_type = ?, front = ?, back = ?, tags = ?, notes = ?, updated_at = ? WHERE id = ?;',
        [deckId, cardType, front, back, tags, notes, now, id]
    );
}

export async function deleteCard(id: number): Promise<void> {
    const db = await getReadyDatabase();

    // Wrapped in a transaction. Without this, a crash after the review_logs delete
    // but before the cards delete would leave the card alive with wiped history.
    await db.withExclusiveTransactionAsync(async () => {
        await db.runAsync('DELETE FROM review_logs WHERE card_id = ?;', [id]);
        await db.runAsync(
            'UPDATE mistakes SET related_card_id = NULL, updated_at = ? WHERE related_card_id = ?;',
            [new Date().toISOString(), id]
        );
        await db.runAsync('DELETE FROM cards WHERE id = ?;', [id]);
    });
}

// --- OPTIMIZED QUEUE METHOD (SUPPORTS RE-VIEW OVERRIDE BYPASS) ---
export async function getDueCards(
    limit: number = 30,
    deckFilter: string = 'All',
    isReViewMode: boolean = false
): Promise<DbCard[]> {
    const db = await getReadyDatabase();

    // Compare against midnight today so cards due "today" are always visible
    // regardless of what time you open the app.
    const todayMidnight = getMidnightDue(0);

    let query = `
        SELECT c.*, d.name as deck_name 
        FROM cards c 
        JOIN decks d ON c.deck_id = d.id
    `;

    const conditions: string[] = [];
    const params: any[] = [];

    // If Re-View is false, strictly apply spaced repetition due-date constraints.
    if (!isReViewMode) {
        // DATE() cast on both sides makes this comparison format-safe.
        // getMidnightDue always produces ISO 8601 (YYYY-MM-DDTHH:MM:SS.sssZ), and
        // SQLite string comparison works correctly for that format. The DATE() cast
        // is a safeguard against any card whose due_at was written in a different
        // format (e.g. a very old backup or a third-party import) — without the cast,
        // that card would be silently skipped forever.
        conditions.push('(c.due_at IS NULL OR DATE(c.due_at) <= DATE(?))');
        params.push(todayMidnight);
    }

    if (deckFilter !== 'All') {
        const parsedDeckId = Number.parseInt(deckFilter, 10);
        if (!Number.isNaN(parsedDeckId)) {
            conditions.push('c.deck_id = ?');
            params.push(parsedDeckId);
        }
    }

    if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
    }

    // Shuffle the queue in Re-View Mode to offer a dynamic free practice run.
    if (isReViewMode) {
        query += ' ORDER BY RANDOM()';
    } else {
        query += ' ORDER BY c.due_at ASC';
    }

    query += ' LIMIT ?;';
    params.push(limit);

    return db.getAllAsync<DbCard>(query, params);
}

// --- LOGGING ENGINE EXTENSION ---
export async function logReviewHistory(
    cardId: number,
    mode: 'srs' | 're-view',
    rating: string | null = null
): Promise<void> {
    const db = await getReadyDatabase();
    const now = new Date().toISOString();

    await db.runAsync(
        'INSERT INTO review_logs (card_id, mode, rating, created_at) VALUES (?, ?, ?, ?);',
        [cardId, mode, rating, now]
    );
}

export async function logReViewPractice(cardId: number): Promise<void> {
    await logReviewHistory(cardId, 're-view', null);
}

// --- SRS RATING ENGINE ---
// Intervals always land on midnight of the target day so the day boundary is
// always 12am, not whatever time you happened to review the card.
//
// Algorithm summary:
//   again → lapse penalty: new interval = max(1, floor(old_interval * 0.2)), due tomorrow
//           This means a 30-day card comes back in 6 days, not 3 like a brand new card.
//           A card with interval 0-4 just comes back tomorrow (min 1 day).
//   hard  → interval + 1 floor to prevent sticking, then * 1.2 multiplier, due in result days
//   good  → * 2.5 multiplier (3 days minimum on first review)
//   easy  → * 4.0 multiplier (7 days minimum on first review)
export async function rateCard(id: number, decision: 'again' | 'hard' | 'good' | 'easy'): Promise<void> {
    const db = await getReadyDatabase();
    const card = await db.getFirstAsync<DbCard>('SELECT * FROM cards WHERE id = ?;', [id]);

    if (!card) return;

    const newDifficulty = decision;
    const shouldIncrementLapse = decision === 'again';

    let nextInterval: number;  // saved to interval_days (the springboard)
    let daysUntilDue: number;  // passed to getMidnightDue (when you actually see it)

    if (decision === 'again') {
        if (card.interval_days > 4) {
            // Lapse penalty: preserve 20% of the old interval as the springboard so
            // the next Good rating multiplies from there instead of restarting at 3.
            // But force it due TOMORROW so a forgotten card is never buried for days.
            nextInterval = Math.max(1, Math.round(card.interval_days * 0.2));
            daysUntilDue = 1;
        } else {
            // Young card — just reset both.
            nextInterval = 1;
            daysUntilDue = 1;
        }
    } else if (decision === 'hard') {
        nextInterval = card.interval_days === 0 ? 1 : Math.max(card.interval_days + 1, Math.round(card.interval_days * 1.2));
        daysUntilDue = nextInterval;
    } else if (decision === 'good') {
        // Use the stored interval_days as the springboard — this is what makes
        // a lapsed card recover to 15 days (6 * 2.5) instead of restarting at 3.
        nextInterval = card.interval_days === 0 ? 3 : Math.max(1, Math.round(card.interval_days * 2.5));
        daysUntilDue = nextInterval;
    } else { // easy
        nextInterval = card.interval_days === 0 ? 7 : Math.max(1, Math.round(card.interval_days * 4.0));
        daysUntilDue = nextInterval;
    }

    const nextDueStr = getMidnightDue(daysUntilDue);
    const tsStr = new Date().toISOString();

    await db.runAsync(
        `UPDATE cards 
         SET difficulty = ?, 
             due_at = ?, 
             interval_days = ?, 
             review_count = review_count + 1,
             lapse_count = lapse_count + ?,
             updated_at = ? 
         WHERE id = ?;`,
        [newDifficulty, nextDueStr, nextInterval, shouldIncrementLapse ? 1 : 0, tsStr, id]
    );

    await logReviewHistory(id, 'srs', decision);
}

// --- RESET / MAINTENANCE HELPERS ---
export async function resetSrsStats(): Promise<void> {
    const db = await getReadyDatabase();
    const now = new Date().toISOString();
    // Reset due_at to midnight today so all cards are immediately reviewable again.
    const todayMidnight = getMidnightDue(0);

    await db.withExclusiveTransactionAsync(async () => {
        await db.runAsync('DELETE FROM review_logs;');
        await db.runAsync(
            `UPDATE cards 
             SET difficulty = 'new',
                 due_at = ?,
                 interval_days = 0,
                 review_count = 0,
                 lapse_count = 0,
                 updated_at = ?;`,
            [todayMidnight, now]
        );
    });
}

export async function resetCardsOnly(): Promise<void> {
    const db = await getReadyDatabase();

    await db.withExclusiveTransactionAsync(async () => {
        await db.runAsync('DELETE FROM review_logs;');
        await db.runAsync('DELETE FROM cards;');
    });
}

export async function resetEverything(): Promise<void> {
    const db = await getReadyDatabase();

    await db.withExclusiveTransactionAsync(async () => {
        await db.runAsync('DELETE FROM review_logs;');
        await db.runAsync('DELETE FROM cards;');
        await db.runAsync('DELETE FROM decks;');
        await db.runAsync('DELETE FROM mistakes;');
        await db.runAsync('DELETE FROM wins;');
    });
}

// --- MISTAKE BANK ENGINE ---
export async function getAllMistakes(): Promise<DbMistake[]> {
    const db = await getReadyDatabase();

    return db.getAllAsync<DbMistake>(`
        SELECT * 
        FROM mistakes 
        ORDER BY 
            CASE status WHEN 'open' THEN 0 ELSE 1 END ASC,
            id DESC;
    `);
}

export async function addMistake(
    title: string,
    explanation: string | null,
    relatedCardId: number | null
): Promise<void> {
    const db = await getReadyDatabase();
    const now = new Date().toISOString();

    await db.runAsync(
        'INSERT INTO mistakes (title, explanation, related_card_id, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?);',
        [title, explanation, relatedCardId, 'open', now, now]
    );
}

export async function updateMistakeStatus(id: number, status: 'open' | 'resolved'): Promise<void> {
    const db = await getReadyDatabase();
    const now = new Date().toISOString();

    await db.runAsync(
        'UPDATE mistakes SET status = ?, updated_at = ? WHERE id = ?;',
        [status, now, id]
    );
}

// updateMistakeContent lets more.tsx edit title/explanation through the
// database layer instead of calling openDatabase() directly.
export async function updateMistakeContent(id: number, title: string, explanation: string | null): Promise<void> {
    const db = await getReadyDatabase();
    const now = new Date().toISOString();

    await db.runAsync(
        'UPDATE mistakes SET title = ?, explanation = ?, updated_at = ? WHERE id = ?;',
        [title, explanation, now, id]
    );
}

export async function deleteMistake(id: number): Promise<void> {
    const db = await getReadyDatabase();

    await db.runAsync('DELETE FROM mistakes WHERE id = ?;', [id]);
}

// --- WIN LOG LOGIC ENGINE ---
export async function getAllWins(): Promise<DbWin[]> {
    const db = await getReadyDatabase();

    return db.getAllAsync<DbWin>('SELECT * FROM wins ORDER BY id DESC;');
}

export async function addWin(text: string): Promise<void> {
    const db = await getReadyDatabase();
    const now = new Date().toISOString();

    await db.runAsync(
        'INSERT INTO wins (text, created_at) VALUES (?, ?);',
        [text, now]
    );
}

export async function deleteWin(id: number): Promise<void> {
    const db = await getReadyDatabase();

    await db.runAsync('DELETE FROM wins WHERE id = ?;', [id]);
}

// updateWin lets more.tsx edit win text through the database layer instead
// of calling openDatabase() directly with raw SQL.
// Note: the wins table has no updated_at column — that is intentional.
export async function updateWin(id: number, text: string): Promise<void> {
    const db = await getReadyDatabase();

    await db.runAsync(
        'UPDATE wins SET text = ? WHERE id = ?;',
        [text, id]
    );
}

// --- STATS ---
export async function getCardCount(): Promise<number> {
    const db = await getReadyDatabase();
    const result = await db.getFirstAsync<{ total: number }>('SELECT COUNT(*) as total FROM cards;');

    return result?.total ?? 0;
}

export async function getTotalReviews(): Promise<number> {
    const db = await getReadyDatabase();
    const result = await db.getFirstAsync<{ total: number }>('SELECT COUNT(*) as total FROM review_logs;');

    return result?.total ?? 0;
}

export async function getHomeSummaryStats() {
    const db = await getReadyDatabase();
    // Use midnight today so the home screen due count matches what getDueCards returns.
    const todayMidnight = getMidnightDue(0);

    const dueResult = await db.getFirstAsync<{ count: number }>(
        `SELECT COUNT(c.id) as count 
         FROM cards c 
         JOIN decks d ON c.deck_id = d.id 
         WHERE (c.due_at IS NULL OR c.due_at <= ?);`,
        [todayMidnight]
    );

    const newResult = await db.getFirstAsync<{ count: number }>(
        `SELECT COUNT(c.id) as count 
         FROM cards c 
         JOIN decks d ON c.deck_id = d.id 
         WHERE c.difficulty = 'new';`
    );

    const totalCards = await getCardCount();
    const totalReviews = await getTotalReviews();

    return {
        dueCount: dueResult?.count ?? 0,
        newCount: newResult?.count ?? 0,
        totalCards,
        totalReviews
    };
}

// --- DECK DUE BREAKDOWN ---
// Returns per-deck due counts using the same midnight cutoff as getHomeSummaryStats
// so the home screen "Due Now" number and the deck breakdown list always agree.
export async function getDeckDueBreakdown(): Promise<{ id: number; name: string; color: string | null; dueCount: number }[]> {
    const db = await getReadyDatabase();
    const todayMidnight = getMidnightDue(0);

    return db.getAllAsync<{ id: number; name: string; color: string | null; dueCount: number }>(
        `SELECT d.id, d.name, d.color, COUNT(c.id) as dueCount
         FROM decks d
         JOIN cards c ON c.deck_id = d.id
         WHERE (c.due_at IS NULL OR c.due_at <= ?)
         GROUP BY d.id
         HAVING COUNT(c.id) > 0
         ORDER BY dueCount DESC;`,
        [todayMidnight]
    );
}

// --- BACKUP EXPORT ---
export async function exportDatabaseToBackupObject(): Promise<CyberDeckBackup> {
    const db = await getReadyDatabase();

    const decks = await db.getAllAsync<DbDeck>('SELECT * FROM decks;');
    const cards = await db.getAllAsync<DbCard>('SELECT * FROM cards;');
    const mistakes = await db.getAllAsync<DbMistake>('SELECT * FROM mistakes;');
    const wins = await db.getAllAsync<DbWin>('SELECT * FROM wins;');
    const reviewLogs = await db.getAllAsync<DbReviewLog>('SELECT * FROM review_logs;');

    return {
        version: 1,
        exported_at: new Date().toISOString(),
        decks,
        cards,
        mistakes,
        wins,
        reviewLogs
    };
}
