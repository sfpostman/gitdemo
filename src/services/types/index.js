const express = require('express');
const mysql = require('mysql2/promise');

const PORT = parseInt(process.env.PORT || '3002', 10);

const app = express();
app.use(express.json());

function mysqlConfig() {
  return {
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT || '3306', 10),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'pokedex',
  };
}

const db = mysql.createPool(mysqlConfig());

async function waitForMysql(pool, { retries = 30, delayMs = 2000 } = {}) {
  for (let i = 0; i < retries; i++) {
    try {
      await pool.query('SELECT 1');
      return;
    } catch (e) {
      console.warn(`MySQL not ready (${i + 1}/${retries}): ${e.message}`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw new Error('MySQL unreachable after retries');
}

app.get('/types', async (req, res) => {
  const [rows] = await db.query('SELECT DISTINCT type FROM pokemon ORDER BY type');
  const types = [...new Set(
    rows.flatMap(r => r.type.split('/'))
  )].sort();
  res.json({ total: types.length, data: types });
});

app.get('/types/:type/pokemon', async (req, res) => {
  const type = req.params.type;
  const { limit = 20, offset = 0 } = req.query;
  const [rows] = await db.query(
    'SELECT * FROM pokemon WHERE type = ? OR type LIKE ? OR type LIKE ? OR type LIKE ? LIMIT ? OFFSET ?',
    [type, `${type}/%`, `%/${type}`, `%/${type}/%`, parseInt(limit, 10), parseInt(offset, 10)]
  );
  const [[{ total }]] = await db.query(
    'SELECT COUNT(*) as total FROM pokemon WHERE type = ? OR type LIKE ? OR type LIKE ? OR type LIKE ?',
    [type, `${type}/%`, `%/${type}`, `%/${type}/%`]
  );
  if (!total) return res.status(404).json({ error: `No Pokemon found for type: ${type}` });
  res.json({ type, total, limit: parseInt(limit, 10), offset: parseInt(offset, 10), data: rows });
});

waitForMysql(db).then(() => {
  app.listen(PORT, () => console.log(`Types service running on port ${PORT}`));
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
