import { getDb } from '../lib/db';
const db = getDb();
const rows = db.prepare(`
  SELECT p.id, p.name, p.style, p.cash_balance, p.starting_cash, u.email
  FROM portfolios p JOIN users u ON u.id = p.user_id
  WHERE u.email LIKE 't41%@example.com'
  ORDER BY p.created_at
`).all();
for (const r of rows as any[]) {
  console.log(`${r.email} | ${r.style} | cash=$${r.cash_balance.toLocaleString()} | starting=$${r.starting_cash.toLocaleString()}`);
}

// Cleanup leftover test rows from manual API + script tests
const leftover = db.prepare(`
  SELECT u.id AS uid FROM users u WHERE u.email LIKE 't41%@example.com'
`).all() as { uid: string }[];
for (const { uid } of leftover) {
  db.prepare('DELETE FROM portfolios WHERE user_id = ?').run(uid);
  db.prepare('DELETE FROM users WHERE id = ?').run(uid);
}
console.log(`Cleaned ${leftover.length} test users.`);