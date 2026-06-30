import Database from 'better-sqlite3';
import * as path from 'path';

const dbPath = path.join(process.cwd(), 'data', 'paperportfolio.db');
const db = new Database(dbPath);
const cols = db.prepare('PRAGMA table_info(users)').all() as { name: string }[];
const has = cols.some((c) => c.name === 'walkthrough_completed_at');
console.log('users.walkthrough_completed_at column present:', has);
const users = db.prepare('SELECT id, email, walkthrough_completed_at FROM users LIMIT 3').all();
console.log('first 3 users:', users);
db.close();
