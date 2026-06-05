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

let initializationPromise: Promise<void> | null = null;

export async function openDatabase() {
    return await SQLite.openDatabaseAsync('cyberdeck.db');
}

export async function initializeDatabase() {
    if (initializationPromise) {
        return initializationPromise;
    }

    initializationPromise = (async () => {
        const db = await openDatabase();

        // 1. Create Decks Table
        await db.execAsync(`
            CREATE TABLE IF NOT EXISTS decks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                description TEXT,
                color TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
        `);

        // 2. Create Cards Table
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
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY(deck_id) REFERENCES decks(id) ON DELETE CASCADE
            );
        `);

        // 3. Create Reviews History Table
        await db.execAsync(`
            CREATE TABLE IF NOT EXISTS reviews (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                card_id INTEGER NOT NULL,
                rating TEXT NOT NULL,
                reviewed_at TEXT NOT NULL,
                next_due_at TEXT,
                FOREIGN KEY(card_id) REFERENCES cards(id) ON DELETE CASCADE
            );
        `);

        // 4. Create Mistakes Bank Table
        await db.execAsync(`
            CREATE TABLE IF NOT EXISTS mistakes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                explanation TEXT,
                related_card_id INTEGER,
                status TEXT DEFAULT 'open',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
        `);

        // 5. Create Win Log Table
        await db.execAsync(`
            CREATE TABLE IF NOT EXISTS wins (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                text TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
        `);

        // 6. Create Settings Table
        await db.execAsync(`
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT
            );
        `);

        await seedDefaultDecks(db);
        console.log('CyberDeck Schema V1.0 initialized cleanly.');
    })();

    return initializationPromise;
}

async function getReadyDatabase() {
    await initializeDatabase();
    return await openDatabase();
}

async function seedDefaultDecks(db: SQLite.SQLiteDatabase) {
    const now = new Date().toISOString();
    const starterDecks = [
        { name: 'Linux Survival', desc: 'Remember basic terminal commands and paths', color: '#3B82F6' },
        { name: 'Networking Basics', desc: 'Remember DNS, IP, ports, TCP/UDP, HTTP', color: '#10B981' },
        { name: 'Security Language', desc: 'Remember risk, threat, vulnerability, controls', color: '#EF4444' },
        { name: 'Web Basics', desc: 'Remember request/response, cookies, sessions', color: '#F59E0B' },
        { name: 'SOC Foundations', desc: 'Remember log fields and investigation questions', color: '#8B5CF6' },
        { name: 'Windows Basics', desc: 'Remember Event Viewer, services, users/groups', color: '#EC4899' }
    ];

    for (const deck of starterDecks) {
        try {
            await db.runAsync(
                `INSERT OR IGNORE INTO decks (name, description, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?);`,
                [deck.name, deck.desc, deck.color, now, now]
            );
        } catch (e) {
            console.error(`Error seeding deck: ${deck.name}`, e);
        }
    }
}

// DECK CRUD
export async function getAllDecks() {
    const db = await getReadyDatabase();
    return await db.getAllAsync<DbDeck>('SELECT * FROM decks ORDER BY name ASC;');
}

export async function createDeck(name: string, description: string = '', color: string = '#2563EB') {
    const db = await getReadyDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
        'INSERT INTO decks (name, description, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?);',
        [name.trim(), description.trim(), color, now, now]
    );
}

// CARD CRUD
export async function saveCard(deckId: number, cardType: string, front: string, back: string, tags: string = '', notes: string = '') {
    const db = await getReadyDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
        `INSERT INTO cards (deck_id, card_type, front, back, tags, notes, difficulty, due_at, interval_days, review_count, lapse_count, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 'new', ?, 0, 0, 0, ?, ?);`,
        [deckId, cardType, front.trim(), back.trim(), tags.trim(), notes.trim(), now, now, now]
    );
}

export async function updateCard(id: number, deckId: number, cardType: string, front: string, back: string, tags: string, notes: string) {
    const db = await getReadyDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
        `UPDATE cards SET deck_id = ?, card_type = ?, front = ?, back = ?, tags = ?, notes = ?, updated_at = ? WHERE id = ?;`,
        [deckId, cardType, front.trim(), back.trim(), tags.trim(), notes.trim(), now, id]
    );
}

export async function deleteCard(id: number) {
    const db = await getReadyDatabase();
    await db.runAsync('DELETE FROM cards WHERE id = ?;', [id]);
}

export async function getAllCards() {
    const db = await getReadyDatabase();
    return await db.getAllAsync<DbCard>(
        'SELECT c.*, d.name AS deck_name FROM cards c JOIN decks d ON d.id = c.deck_id ORDER BY c.created_at DESC;'
    );
}

// REVIEW SYSTEM OPERATIONS
export async function getDueCards(limit: number = 30, deckIdFilter: string = 'All') {
    const db = await getReadyDatabase();
    const nowStr = new Date().toISOString();

    let sql = `
        SELECT c.*, d.name AS deck_name 
        FROM cards c
        JOIN decks d ON d.id = c.deck_id
        WHERE (c.due_at IS NULL OR c.due_at <= ?)
    `;
    const params: any[] = [nowStr];

    if (deckIdFilter !== 'All') {
        sql += ' AND c.deck_id = ?';
        params.push(parseInt(deckIdFilter, 10));
    }

    sql += ' ORDER BY c.due_at ASC, c.created_at ASC LIMIT ?;';
    params.push(limit);

    return await db.getAllAsync<DbCard>(sql, params);
}

export function calculateNextReview(currentInterval: number, rating: string) {
    let interval = 0;
    let daysToAdd = 0;
    let lapseAdd = 0;
    let difficulty = 'good';
    const now = new Date();

    if (rating === 'Again') {
        interval = 0;
        daysToAdd = 0; 
        lapseAdd = 1;
        difficulty = 'again';
    } else if (rating === 'Hard') {
        interval = Math.max(1, Math.floor(currentInterval * 1.2));
        daysToAdd = 1;
        lapseAdd = 0;
        difficulty = 'hard';
    } else if (rating === 'Good') {
        interval = currentInterval === 0 ? 3 : Math.ceil(currentInterval * 2.0);
        daysToAdd = interval;
        lapseAdd = 0;
        difficulty = 'good';
    } else if (rating === 'Easy') {
        interval = currentInterval === 0 ? 7 : Math.ceil(currentInterval * 2.5);
        daysToAdd = interval;
        lapseAdd = 0;
        difficulty = 'easy';
    }

    const targetDate = new Date(now.getTime());
    if (daysToAdd === 0) {
        targetDate.setMinutes(targetDate.getMinutes() + 5);
    } else {
        targetDate.setDate(targetDate.getDate() + daysToAdd);
    }

    return {
        interval_days: interval,
        due_at: targetDate.toISOString(),
        lapseAdd,
        difficulty
    };
}

export async function rateCard(cardId: number, currentInterval: number, rating: string) {
    const db = await getReadyDatabase();
    const nowStr = new Date().toISOString();
    const schedule = calculateNextReview(currentInterval, rating);

    await db.runAsync(
        `UPDATE cards 
         SET difficulty = ?, 
             due_at = ?, 
             interval_days = ?, 
             review_count = review_count + 1, 
             lapse_count = lapse_count + ?, 
             updated_at = ?
         WHERE id = ?;`,
        [schedule.difficulty, schedule.due_at, schedule.interval_days, schedule.lapseAdd, nowStr, cardId]
    );

    await db.runAsync(
        `INSERT INTO reviews (card_id, rating, reviewed_at, next_due_at) VALUES (?, ?, ?, ?);`,
        [cardId, rating, nowStr, schedule.due_at]
    );
}

// MISTAKE BANK OPERATIONS
export async function getAllMistakes() {
    const db = await getReadyDatabase();
    return await db.getAllAsync<DbMistake>('SELECT * FROM mistakes ORDER BY created_at DESC;');
}

export async function addMistake(title: string, explanation: string = '', relatedCardId: number | null = null) {
    const db = await getReadyDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
        'INSERT INTO mistakes (title, explanation, related_card_id, status, created_at, updated_at) VALUES (?, ?, ?, "open", ?, ?);',
        [title.trim(), explanation.trim(), relatedCardId, now, now]
    );
}

export async function updateMistakeStatus(id: number, status: 'open' | 'resolved') {
    const db = await getReadyDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
        'UPDATE mistakes SET status = ?, updated_at = ? WHERE id = ?;',
        [status, now, id]
    );
}

export async function deleteMistake(id: number) {
    const db = await getReadyDatabase();
    await db.runAsync('DELETE FROM mistakes WHERE id = ?;', [id]);
}

// WIN LOG OPERATIONS
export async function getAllWins() {
    const db = await getReadyDatabase();
    return await db.getAllAsync<DbWin>('SELECT * FROM wins ORDER BY created_at DESC;');
}

export async function addWin(text: string) {
    const db = await getReadyDatabase();
    const now = new Date().toISOString();
    await db.runAsync('INSERT INTO wins (text, created_at) VALUES (?, ?);', [text.trim(), now]);
}

export async function deleteWin(id: number) {
    const db = await getReadyDatabase();
    await db.runAsync('DELETE FROM wins WHERE id = ?;', [id]);
}

// SETTINGS KEY-VALUE ACCESSORS
export async function getSetting(key: string) {
    const db = await getReadyDatabase();
    const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?;', [key]);
    return row?.value ?? null;
}

export async function updateSetting(key: string, value: string) {
    const db = await getReadyDatabase();
    await db.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?);', [key, value]);
}

// COUNTER UTILITIES
export async function getCardCount() {
    const db = await getReadyDatabase();
    // INNER JOIN with decks ensures we ONLY count cards whose parent decks actively exist
    const result = await db.getFirstAsync<{ count: number }>(
        'SELECT COUNT(c.id) as count FROM cards c JOIN decks d ON c.deck_id = d.id;'
    );
    return result?.count ?? 0;
}

export async function getTotalReviews() {
    const db = await getReadyDatabase();
    const result = await db.getFirstAsync<{ total: number }>('SELECT COUNT(*) as total FROM reviews;');
    return result?.total ?? 0;
}

export async function getHomeSummaryStats() {
    const db = await getReadyDatabase();
    const nowStr = new Date().toISOString();

    // Calculate due cards only for decks that exist right now
    const dueResult = await db.getFirstAsync<{ count: number }>(
        'SELECT COUNT(c.id) as count FROM cards c JOIN decks d ON c.deck_id = d.id WHERE (c.due_at IS NULL OR c.due_at <= ?);', 
        [nowStr]
    );

    // Calculate new cards only for decks that exist right now
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
    const reviews = await db.getAllAsync('SELECT * FROM reviews;');
    const mistakes = await db.getAllAsync('SELECT * FROM mistakes;');
    const wins = await db.getAllAsync('SELECT * FROM wins;');
    return { version: 1, exported_at: new Date().toISOString(), decks, cards, reviews, mistakes, wins };
}