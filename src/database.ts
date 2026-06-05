import * as SQLite from 'expo-sqlite';

export type DbCard = {
    id: number;
    category: string;
    question: string;
    answer: string;
    created_at: string;
    review_count: number;
};

const DEFAULT_CATEGORY = 'Uncategorized';

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

        await db.execAsync(`
      CREATE TABLE IF NOT EXISTS cards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category TEXT DEFAULT '${DEFAULT_CATEGORY}',
        question TEXT NOT NULL,
        answer TEXT NOT NULL,
        created_at TEXT NOT NULL,
        review_count INTEGER DEFAULT 0
      );
    `);

        try {
            await db.execAsync(`
        ALTER TABLE cards
        ADD COLUMN category TEXT DEFAULT '${DEFAULT_CATEGORY}';
      `);
        } catch { }

        try {
            await db.execAsync(`
        ALTER TABLE cards
        ADD COLUMN review_count INTEGER DEFAULT 0;
      `);
        } catch { }

        await db.runAsync(
            `
        UPDATE cards
        SET category = ?
        WHERE category IS NULL OR TRIM(category) = '' OR category = 'General';
      `,
            [DEFAULT_CATEGORY]
        );

        console.log('Database initialized');
    })();

    return initializationPromise;
}

async function getReadyDatabase() {
    await initializeDatabase();
    return await openDatabase();
}

function normalizeCategory(category: string) {
    const cleanCategory = category.trim();

    if (!cleanCategory || cleanCategory === 'General') {
        return DEFAULT_CATEGORY;
    }

    return cleanCategory;
}

export async function saveCard(category: string, question: string, answer: string) {
    const db = await getReadyDatabase();
    const now = new Date().toISOString();

    await db.runAsync(
        'INSERT INTO cards (category, question, answer, created_at, review_count) VALUES (?, ?, ?, ?, ?);',
        [normalizeCategory(category), question, answer, now, 0]
    );
}

export async function getAllCards() {
    const db = await getReadyDatabase();

    return await db.getAllAsync<DbCard>(
        `
      SELECT
        id,
        COALESCE(category, ?) as category,
        question,
        answer,
        created_at,
        COALESCE(review_count, 0) as review_count
      FROM cards
      ORDER BY created_at DESC;
    `,
        [DEFAULT_CATEGORY]
    );
}

export async function getCardsByCategory(category: string) {
    const db = await getReadyDatabase();

    if (category === 'All') {
        return getAllCards();
    }

    return await db.getAllAsync<DbCard>(
        `
      SELECT
        id,
        COALESCE(category, ?) as category,
        question,
        answer,
        created_at,
        COALESCE(review_count, 0) as review_count
      FROM cards
      WHERE COALESCE(category, ?) = ?
      ORDER BY created_at DESC;
    `,
        [DEFAULT_CATEGORY, DEFAULT_CATEGORY, category]
    );
}

export async function getCategories() {
    const db = await getReadyDatabase();

    const rows = await db.getAllAsync<{ category: string }>(
        `
      SELECT DISTINCT COALESCE(category, ?) as category
      FROM cards
      ORDER BY category ASC;
    `,
        [DEFAULT_CATEGORY]
    );

    const categories = rows.map((row) => row.category);

    if (categories.length <= 1) {
        return categories;
    }

    return ['All', ...categories];
}

export async function updateCard(
    id: number,
    category: string,
    question: string,
    answer: string
) {
    const db = await getReadyDatabase();

    await db.runAsync(
        'UPDATE cards SET category = ?, question = ?, answer = ? WHERE id = ?;',
        [normalizeCategory(category), question, answer, id]
    );
}

export async function deleteCard(id: number) {
    const db = await getReadyDatabase();

    await db.runAsync('DELETE FROM cards WHERE id = ?;', [id]);
}

export async function getCardCount() {
    const db = await getReadyDatabase();

    const result = await db.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM cards;'
    );

    return result?.count ?? 0;
}

export async function getTotalReviews() {
    const db = await getReadyDatabase();

    const result = await db.getFirstAsync<{ total: number }>(
        'SELECT SUM(COALESCE(review_count, 0)) as total FROM cards;'
    );

    return result?.total ?? 0;
}

export async function incrementReviewCount(id: number) {
    const db = await getReadyDatabase();

    await db.runAsync(
        `
      UPDATE cards
      SET review_count = COALESCE(review_count, 0) + 1
      WHERE id = ?;
    `,
        [id]
    );
}