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

let dbInstance: SQLite.SQLiteDatabase | null = null;
let initializationPromise: Promise<void> | null = null;

export async function openDatabase(): Promise<SQLite.SQLiteDatabase> {
    if (dbInstance) return dbInstance;
    dbInstance = await SQLite.openDatabaseAsync('cyberdeck.db');
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
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
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

        // 5. NEW: Ghost Review Logs Table (Tracks both SRS and Re-View Sessions separately)
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

        // --- SEED SELECTION SAFEGUARD ---
        const deckCheck = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM decks;');
        if (deckCheck && deckCheck.count === 0) {
            const now = new Date().toISOString();
            await db.runAsync("INSERT INTO decks (name, description, color, created_at, updated_at) VALUES ('🔴 Red Team & Active Exploitation', 'Deep dive hacking vectors.', '#EF4444', ?, ?);", [now, now]);
            await db.runAsync("INSERT INTO decks (name, description, color, created_at, updated_at) VALUES ('🔵 Blue Team & Digital Forensics', 'Incident analysis mappings.', '#2563EB', ?, ?);", [now, now]);
            await db.runAsync("INSERT INTO decks (name, description, color, created_at, updated_at) VALUES ('🌐 Network Perimeter Analysis', 'Routing protocols and traffic rules.', '#10B981', ?, ?);", [now, now]);
            await db.runAsync("INSERT INTO decks (name, description, color, created_at, updated_at) VALUES ('⚙️ Cloud & Container Security', 'IAM definitions and Docker clusters.', '#8B5CF6', ?, ?);", [now, now]);
        }
    })();

    return initializationPromise;
}

async function getReadyDatabase() {
    await initializeDatabase();
    return openDatabase();
}

// --- CRUD / FETCH OPERATIONS ---
export async function getAllDecks(): Promise<DbDeck[]> {
    const db = await getReadyDatabase();
    return db.getAllAsync<DbDeck>('SELECT * FROM decks ORDER BY id ASC;');
}

export async function createDeck(name: string, description: string | null, color: string | null): Promise<void> {
    const db = await getReadyDatabase();
    const now = new Date().toISOString();
    await db.runAsync('INSERT INTO decks (name, description, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?);', [name, description, color, now, now]);
}

export async function updateDeck(id: number, name: string, description: string | null): Promise<void> {
    const db = await getReadyDatabase();
    const now = new Date().toISOString();
    await db.runAsync('UPDATE decks SET name = ?, description = ?, updated_at = ? WHERE id = ?;', [name, description, now, id]);
}

export async function deleteDeck(id: number): Promise<void> {
    const db = await getReadyDatabase();
    await db.runAsync('DELETE FROM decks WHERE id = ?;', [id]);
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

export async function saveCard(deckId: number, cardType: string, front: string, back: string, tags: string | null, notes: string | null): Promise<void> {
    const db = await getReadyDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
        'INSERT INTO cards (deck_id, card_type, front, back, tags, notes, difficulty, due_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);',
        [deckId, cardType, front, back, tags, notes, 'new', now, now, now]
    );
}

export async function updateCard(id: number, deckId: number, cardType: string, front: string, back: string, tags: string | null, notes: string | null): Promise<void> {
    const db = await getReadyDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
        'UPDATE cards SET deck_id = ?, card_type = ?, front = ?, back = ?, tags = ?, notes = ?, updated_at = ? WHERE id = ?;',
        [deckId, cardType, front, back, tags, notes, now, id]
    );
}

export async function deleteCard(id: number): Promise<void> {
    const db = await getReadyDatabase();
    await db.runAsync('DELETE FROM cards WHERE id = ?;', [id]);
}

// --- OPTIMIZED QUEUE METHOD (SUPPORTS RE-VIEW OVERRIDE BYRASS) ---
export async function getDueCards(limit: number = 30, deckFilter: string = 'All', isReViewMode: boolean = false): Promise<DbCard[]> {
    const db = await getReadyDatabase();
    const nowStr = new Date().toISOString();

    let query = `
        SELECT c.*, d.name as deck_name 
        FROM cards c 
        JOIN decks d ON c.deck_id = d.id
    `;
    
    const conditions: string[] = [];
    const params: any[] = [];

    // If Re-View is FALSE, strictly apply Spaced Repetition dates constraints
    if (!isReViewMode) {
        conditions.push('(c.due_at IS NULL OR c.due_at <= ?)');
        params.push(nowStr);
    }

    if (deckFilter !== 'All') {
        conditions.push('c.deck_id = ?');
        params.push(parseInt(deckFilter, 10));
    }

    if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
    }

    // Shuffle the queue in Re-View Mode to offer a dynamic "Free Challenge" practice run!
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
export async function logReviewHistory(cardId: number, mode: 'srs' | 're-view', rating: string | null = null): Promise<void> {
    const db = await getReadyDatabase();
    const now = new Date().toISOString();
    await db.runAsync('INSERT INTO review_logs (card_id, mode, rating, created_at) VALUES (?, ?, ?, ?);', [cardId, mode, rating, now]);
}

export async function rateCard(id: number, decision: 'again' | 'hard' | 'good' | 'easy'): Promise<void> {
    const db = await getReadyDatabase();
    const now = new Date();
    
    const card = await db.getFirstAsync<DbCard>('SELECT * FROM cards WHERE id = ?;', [id]);
    if (!card) return;

    let nextInterval = card.interval_days;
    let newDifficulty = decision;

    if (decision === 'again') {
        nextInterval = 0;
    } else if (decision === 'hard') {
        nextInterval = card.interval_days === 0 ? 1 : Math.round(card.interval_days * 1.2);
    } else if (decision === 'good') {
        nextInterval = card.interval_days === 0 ? 3 : Math.round(card.interval_days * 2.5);
    } else if (decision === 'easy') {
        nextInterval = card.interval_days === 0 ? 7 : Math.round(card.interval_days * 4.0);
    }

    now.setDate(now.getDate() + nextInterval);
    const nextDueStr = now.toISOString();
    const tsStr = new Date().toISOString();

    await db.runAsync(
        'UPDATE cards SET difficulty = ?, due_at = ?, interval_days = ?, review_count = review_count + 1, updated_at = ? WHERE id = ?;',
        [newDifficulty, nextDueStr, nextInterval, tsStr, id]
    );

    // Save history point into our brand new analytics logging structure
    await logReviewHistory(id, 'srs', decision);
}

// --- MISTAKE BANK ENGINE ---
export async function getAllMistakes(): Promise<DbMistake[]> {
    const db = await getReadyDatabase();
    return db.getAllAsync<DbMistake>('SELECT * FROM mistakes ORDER BY status DESC, id DESC;');
}

export async function addMistake(title: string, explanation: string | null, relatedCardId: number | null): Promise<void> {
    const db = await getReadyDatabase();
    const now = new Date().toISOString();
    await db.runAsync('INSERT INTO mistakes (title, explanation, related_card_id, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?);', [title, explanation, relatedCardId, 'open', now, now]);
}

export async function updateMistakeStatus(id: number, status: 'open' | 'resolved'): Promise<void> {
    const db = await getReadyDatabase();
    const now = new Date().toISOString();
    await db.runAsync('UPDATE mistakes SET status = ?, updated_at = ? WHERE id = ?;', [status, now, id]);
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
    await db.runAsync('INSERT INTO wins (text, created_at) VALUES (?, ?);', [text, now]);
}

export async function deleteWin(id: number): Promise<void> {
    const db = await getReadyDatabase();
    await db.runAsync('DELETE FROM wins WHERE id = ?;', [id]);
}

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
    const nowStr = new Date().toISOString();

    const dueResult = await db.getFirstAsync<{ count: number }> (
        'SELECT COUNT(c.id) as count FROM cards c JOIN decks d ON c.deck_id = d.id WHERE (c.due_at IS NULL OR c.due_at <= ?);', 
        [nowStr]
    );

    const newResult = await db.getFirstAsync<{ count: number }>(
        "SELECT COUNT(c.id) as count FROM cards c JOIN decks d ON c.deck_id = d.id WHERE c.difficulty = 'new';"
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

export async function exportDatabaseToBackupObject() {
    const db = await getReadyDatabase();
    const decks = await db.getAllAsync('SELECT * FROM decks;');
    const cards = await db.getAllAsync('SELECT * FROM cards;');
    const mistakes = await db.getAllAsync('SELECT * FROM mistakes;');
    const wins = await db.getAllAsync('SELECT * FROM wins;');
    const reviewLogs = await db.getAllAsync('SELECT * FROM review_logs;');

    return { version: 1, decks, cards, mistakes, wins, reviewLogs };
}