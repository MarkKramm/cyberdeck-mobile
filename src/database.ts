import * as SQLite from 'expo-sqlite';

export type DbCard = {
    id: number;
    question: string;
    answer: string;
    created_at: string;
    review_count: number;
};

export async function openDatabase() {
    const db = await SQLite.openDatabaseAsync('cyberdeck.db');
    return db;
}

export async function initializeDatabase() {
    const db = await openDatabase();

    await db.execAsync(`
    CREATE TABLE IF NOT EXISTS cards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        question TEXT NOT NULL,
        answer TEXT NOT NULL,
        created_at TEXT NOT NULL,
        review_count INTEGER DEFAULT 0
    );
`);

    await addReviewColumn();

    console.log('Database initialized');

    return db;
}

export async function addReviewColumn() {
    const db = await openDatabase();

    try {
        await db.execAsync(`
        ALTER TABLE cards
        ADD COLUMN review_count INTEGER DEFAULT 0;
    `);
    } catch {
        // Column already exists, so we ignore this.
    }
}

export async function saveCard(question: string, answer: string) {
    const db = await openDatabase();
    const now = new Date().toISOString();

    await db.runAsync(
        'INSERT INTO cards (question, answer, created_at, review_count) VALUES (?, ?, ?, ?);',
        [question, answer, now, 0]
    );
}

export async function getAllCards() {
    const db = await openDatabase();

    const result = await db.getAllAsync<DbCard>(
        'SELECT * FROM cards ORDER BY created_at DESC;'
    );

    return result;
}

export async function updateCard(id: number, question: string, answer: string) {
    const db = await openDatabase();

    await db.runAsync(
        'UPDATE cards SET question = ?, answer = ? WHERE id = ?;',
        [question, answer, id]
    );
}

export async function deleteCard(id: number) {
    const db = await openDatabase();

    await db.runAsync('DELETE FROM cards WHERE id = ?;', [id]);
}

export async function getCardCount() {
    const db = await openDatabase();

    const result = await db.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM cards;'
    );

    return result?.count ?? 0;
}

export async function incrementReviewCount(id: number) {
    const db = await openDatabase();

    await db.runAsync(
        `
        UPDATE cards
        SET review_count = COALESCE(review_count, 0) + 1
        WHERE id = ?;
    `,
        [id]
    );
}