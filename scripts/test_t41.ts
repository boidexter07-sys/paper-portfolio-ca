// T41 validation smoke test.
// Runs the server-side validator + the DB helpers against the dev DB.
// Verifies:
//   1. Signup with no starting_cash -> default $100K
//   2. Signup with $50K -> $50K cash + starting_cash
//   3. Signup with $1M -> $1M cash + starting_cash
//   4. Signup with $49,999 -> REJECTED
//   5. Signup with $1,000,001 -> REJECTED
//   6. Signup with $100,005 -> REJECTED
//   7. createAdditionalPortfolio happy path ($250K)
//   8. listPortfolios shows new starting_cash

import { validateStartingCash } from '../lib/constants';
import { getDb, uuid } from '../lib/db';
import { createInitialPortfolio, createAdditionalPortfolio, listPortfolios } from '../lib/portfolio';
import { hashPassword } from '../lib/auth';

const results: Array<{ name: string; pass: boolean; detail?: string }> = [];
function check(name: string, cond: boolean, detail?: string) {
  results.push({ name, pass: cond, detail });
}

// 1) validator happy/sad path
check('validate: 100000 ok', validateStartingCash(100000).ok === true);
check('validate: 50000 ok', validateStartingCash(50000).ok === true);
check('validate: 1000000 ok', validateStartingCash(1000000).ok === true);
check('validate: 49999 rejected', validateStartingCash(49999).ok === false);
check('validate: 1000001 rejected', validateStartingCash(1000001).ok === false);
check('validate: 100005 rejected (not step)', validateStartingCash(100005).ok === false);
check('validate: 0 rejected', validateStartingCash(0).ok === false);
check('validate: -1 rejected', validateStartingCash(-1).ok === false);
check('validate: NaN rejected', validateStartingCash(NaN).ok === false);
check('validate: "abc" rejected', validateStartingCash('abc').ok === false);
check('validate: 75000 rejected (not step)', validateStartingCash(75000).ok === false);

// 2) DB exercise
const db = getDb();
const testEmail = `t41-test-${Date.now()}@example.com`;
const passwordHash = hashPassword('testpass1234');
const userId = uuid();
db.prepare(
  'INSERT INTO users (id, email, password_hash, investing_style, created_at) VALUES (?, ?, ?, ?, ?)'
).run(userId, testEmail, passwordHash, 'balanced', Date.now());

// 1) default
const r1 = createInitialPortfolio(userId, { style: 'balanced' });
check('createInitialPortfolio default = 100000', r1.starting_cash === 100000);

// idempotent: re-run returns same
const r1b = createInitialPortfolio(userId, { style: 'balanced' });
check('createInitialPortfolio idempotent', r1b.id === r1.id);

// 3) DB-level: cash_balance == starting_cash on creation
const dbRow = db.prepare('SELECT cash_balance, starting_cash FROM portfolios WHERE id = ?').get(r1.id) as { cash_balance: number; starting_cash: number };
check('default row: cash_balance == starting_cash == 100000', dbRow.cash_balance === 100000 && dbRow.starting_cash === 100000);

// 4) explicit 50000
const r2 = createAdditionalPortfolio(userId, { style: 'growth', startingCash: 50000 });
check('createAdditionalPortfolio 50K ok', r2.ok === true && r2.starting_cash === 50000);

// 5) explicit 1M
const r3 = createAdditionalPortfolio(userId, { style: 'value', startingCash: 1000000 });
check('createAdditionalPortfolio 1M ok', r3.ok === true && r3.starting_cash === 1000000);

// 6) rejections
const r4 = createAdditionalPortfolio(userId, { startingCash: 49999 });
check('createAdditionalPortfolio 49999 rejected', r4.ok === false);

const r5 = createAdditionalPortfolio(userId, { startingCash: 1000001 });
check('createAdditionalPortfolio 1000001 rejected', r5.ok === false);

const r6 = createAdditionalPortfolio(userId, { startingCash: 100005 });
check('createAdditionalPortfolio 100005 rejected (not step)', r6.ok === false);

const r7 = createAdditionalPortfolio(userId, { startingCash: 0 });
check('createAdditionalPortfolio 0 rejected', r7.ok === false);

// 7) listPortfolios includes starting_cash
const list = listPortfolios(userId);
check('listPortfolios has 3 entries', list.length === 3);
check('listPortfolios[0].starting_cash == 100000', list[0].starting_cash === 100000);
check('listPortfolios[1].starting_cash == 50000', list[1].starting_cash === 50000);
check('listPortfolios[2].starting_cash == 1000000', list[2].starting_cash === 1000000);

// 8) starting_cash is independent of cash_balance
db.prepare('UPDATE portfolios SET cash_balance = 50000 WHERE id = ?').run(r1.id);
const afterTrade = db.prepare('SELECT cash_balance, starting_cash FROM portfolios WHERE id = ?').get(r1.id) as { cash_balance: number; starting_cash: number };
check('starting_cash preserved after cash_balance change', afterTrade.cash_balance === 50000 && afterTrade.starting_cash === 100000);

// Cleanup
db.prepare('DELETE FROM portfolios WHERE user_id = ?').run(userId);
db.prepare('DELETE FROM users WHERE id = ?').run(userId);

// Print results
let pass = 0, fail = 0;
for (const r of results) {
  const mark = r.pass ? 'PASS' : 'FAIL';
  console.log(`${mark}  ${r.name}${r.detail ? ' — ' + r.detail : ''}`);
  r.pass ? pass++ : fail++;
}
console.log(`\n${pass}/${pass + fail} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);