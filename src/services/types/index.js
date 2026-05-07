const express = require('express');
const mysql = require('mysql2/promise');

const app = express();
app.use(express.json());

const db = mysql.createPool({
  host: 'localhost',
  user: 'root',
  database: 'pokedex',
});

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
    [type, `${type}/%`, `%/${type}`, `%/${type}/%`, parseInt(limit), parseInt(offset)]
  );
  const [[{ total }]] = await db.query(
    'SELECT COUNT(*) as total FROM pokemon WHERE type = ? OR type LIKE ? OR type LIKE ? OR type LIKE ?',
    [type, `${type}/%`, `%/${type}`, `%/${type}/%`]
  );
  if (!total) return res.status(404).json({ error: `No Pokemon found for type: ${type}` });
  res.json({ type, total, limit: parseInt(limit), offset: parseInt(offset), data: rows });
});

app.listen(3002, () => console.log('Types service running on port 3002'));
