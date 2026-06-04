import * as SQLite from 'expo-sqlite';

export type DbCard = {
  id: number;
  category: string;
  question: string;
  answer: string;
  created_at: string;
  review_count: number;
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

    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS cards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category TEXT DEFAULT 'General',
        question TEXT NOT NULL,
        answer TEXT NOT NULL,
        created_at TEXT NOT NULL,
        review_count INTEGER DEFAULT 0
      );
    `);

    try {
      await db.execAsync(`
        ALTER TABLE cards
        ADD COLUMN category TEXT DEFAULT 'General';
      `);
    } catch {}

    try {
      await db.execAsync(`
        ALTER TABLE cards
        ADD COLUMN review_count INTEGER DEFAULT 0;
      `);
    } catch {}

    console.log('Database initialized');
  })();

  return initializationPromise;
}

async function getReadyDatabase() {
  await initializeDatabase();
  return await openDatabase();
}

export async function saveCard(category: string, question: string, answer: string) {
  const db = await getReadyDatabase();
  const now = new Date().toISOString();

  await db.runAsync(
    'INSERT INTO cards (category, question, answer, created_at, review_count) VALUES (?, ?, ?, ?, ?);',
    [category || 'General', question, answer, now, 0]
  );
}

export async function getAllCards() {
  const db = await getReadyDatabase();

  return await db.getAllAsync<DbCard>(`
    SELECT
      id,
      COALESCE(category, 'General') as category,
      question,
      answer,
      created_at,
      COALESCE(review_count, 0) as review_count
    FROM cards
    ORDER BY created_at DESC;
  `);
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
    [category || 'General', question, answer, id]
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