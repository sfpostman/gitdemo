const express = require('express');
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const PORT = parseInt(process.env.PORT || '3001', 10);

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

function resolveCsvPath() {
  if (process.env.POKEDEX_CSV_PATH) return process.env.POKEDEX_CSV_PATH;
  const nextToIndex = path.join(__dirname, 'pokedex.csv');
  if (fs.existsSync(nextToIndex)) return nextToIndex;
  return path.join(__dirname, '../../../pokedex.csv');
}

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

async function seedDatabase() {
  await waitForMysql(db);

  const [[{ count }]] = await db.query('SELECT COUNT(*) as count FROM pokemon');
  if (count > 0) {
    console.log('Pokemon table already seeded; skipping CSV import.');
    return;
  }

  const csvPath = resolveCsvPath();
  const lines = fs.readFileSync(csvPath, 'utf8').trim().split('\n').slice(1);

  const rows = lines.map(line => {
    const [number, name, type, total, hp, attack, defense, sp_atk, sp_def, speed] = line.split(',');
    return [number, name, type, parseInt(total, 10), parseInt(hp, 10), parseInt(attack, 10), parseInt(defense, 10), parseInt(sp_atk, 10), parseInt(sp_def, 10), parseInt(speed, 10)];
  });

  await db.query(
    'INSERT INTO pokemon (number, name, type, total, hp, attack, defense, sp_atk, sp_def, speed) VALUES ?',
    [rows]
  );
  console.log(`Seeded ${rows.length} Pokemon from CSV.`);
}

app.get('/pokemon', async (req, res) => {
  const { limit = 20, offset = 0 } = req.query;
  const [rows] = await db.query(
    'SELECT * FROM pokemon LIMIT ? OFFSET ?',
    [parseInt(limit, 10), parseInt(offset, 10)]
  );
  const [[{ total }]] = await db.query('SELECT COUNT(*) as total FROM pokemon');
  res.json({ total, limit: parseInt(limit, 10), offset: parseInt(offset, 10), data: rows });
});

app.get('/pokemon/:id', async (req, res) => {
  const [rows] = await db.query('SELECT * FROM pokemon WHERE number = ?', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Pokemon not found' });
  res.json(rows.length === 1 ? rows[0] : rows);
});

app.post('/pokemon', async (req, res) => {
  const { number, name, type, total, hp, attack, defense, sp_atk, sp_def, speed } = req.body;
  if (!number || !name || !type) return res.status(400).json({ error: 'number, name, and type are required' });
  await db.query(
    'INSERT INTO pokemon (number, name, type, total, hp, attack, defense, sp_atk, sp_def, speed) VALUES (?,?,?,?,?,?,?,?,?,?)',
    [number, name, type, total, hp, attack, defense, sp_atk, sp_def, speed]
  );
  const [[created]] = await db.query('SELECT * FROM pokemon WHERE number = ? AND name = ?', [number, name]);
  res.status(201).json(created);
});

app.patch('/pokemon/:id', async (req, res) => {
  const fields = ['name', 'type', 'total', 'hp', 'attack', 'defense', 'sp_atk', 'sp_def', 'speed'];
  const updates = fields.filter(f => req.body[f] !== undefined);
  if (!updates.length) return res.status(400).json({ error: 'No valid fields to update' });
  const sql = `UPDATE pokemon SET ${updates.map(f => `${f} = ?`).join(', ')} WHERE number = ?`;
  const values = [...updates.map(f => req.body[f]), req.params.id];
  const [result] = await db.query(sql, values);
  if (!result.affectedRows) return res.status(404).json({ error: 'Pokemon not found' });
  const [rows] = await db.query('SELECT * FROM pokemon WHERE number = ?', [req.params.id]);
  res.json(rows.length === 1 ? rows[0] : rows);
});

app.delete('/pokemon/:id', async (req, res) => {
  const [result] = await db.query('DELETE FROM pokemon WHERE number = ?', [req.params.id]);
  if (!result.affectedRows) return res.status(404).json({ error: 'Pokemon not found' });
  res.status(204).send();
});

seedDatabase().then(() => {
  app.listen(PORT, () => console.log(`Pokemon service running on port ${PORT}`));
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
