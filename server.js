const express = require('express');
const cors = require('cors');
const db = require('./db');
const path = require('path');

const app = express();
const PORT = 3026;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- DASHBOARD API ---
app.get('/api/stats', (req, res) => {
  try {
    const totalDrivers = db.prepare('SELECT COUNT(*) as count FROM drivers').get().count;
    const totalTeams = db.prepare('SELECT COUNT(*) as count FROM teams').get().count;
    const totalRaces = db.prepare('SELECT COUNT(*) as count FROM races').get().count;
    const totalResults = db.prepare('SELECT COUNT(*) as count FROM results').get().count;

    res.json({ totalDrivers, totalTeams, totalRaces, totalResults });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- TEAMS API ---
app.get('/api/teams', (req, res) => {
  const teams = db.prepare('SELECT * FROM teams').all();
  res.json(teams);
});

app.post('/api/teams', (req, res) => {
  const { team_name, principal, engine_supplier, nationality, total_points } = req.body;
  const info = db.prepare('INSERT INTO teams (team_name, principal, engine_supplier, nationality, total_points) VALUES (?, ?, ?, ?, ?)')
                .run(team_name, principal, engine_supplier, nationality, total_points || 0);
  res.json({ id: info.lastInsertRowid });
});

app.put('/api/teams/:id', (req, res) => {
  const { team_name, principal, engine_supplier, nationality, total_points } = req.body;
  db.prepare('UPDATE teams SET team_name = ?, principal = ?, engine_supplier = ?, nationality = ?, total_points = ? WHERE id = ?')
    .run(team_name, principal, engine_supplier, nationality, total_points, req.params.id);
  res.json({ updated: true });
});

app.delete('/api/teams/:id', (req, res) => {
  db.prepare('DELETE FROM teams WHERE id = ?').run(req.params.id);
  res.json({ deleted: true });
});

// --- DRIVERS API ---
app.get('/api/drivers', (req, res) => {
  const drivers = db.prepare(`
    SELECT drivers.*, teams.team_name 
    FROM drivers 
    LEFT JOIN teams ON drivers.team_id = teams.id
  `).all();
  res.json(drivers);
});

app.post('/api/drivers', (req, res) => {
  const { full_name, nationality, car_number, team_id, total_points, date_of_birth } = req.body;
  const info = db.prepare('INSERT INTO drivers (full_name, nationality, car_number, team_id, total_points, date_of_birth) VALUES (?, ?, ?, ?, ?, ?)')
                .run(full_name, nationality, car_number, team_id, total_points || 0, date_of_birth);
  res.json({ id: info.lastInsertRowid });
});

app.put('/api/drivers/:id', (req, res) => {
  const { full_name, nationality, car_number, team_id, total_points, date_of_birth } = req.body;
  db.prepare('UPDATE drivers SET full_name = ?, nationality = ?, car_number = ?, team_id = ?, total_points = ?, date_of_birth = ? WHERE id = ?')
    .run(full_name, nationality, car_number, team_id, total_points, date_of_birth, req.params.id);
  res.json({ updated: true });
});

app.delete('/api/drivers/:id', (req, res) => {
  db.prepare('DELETE FROM drivers WHERE id = ?').run(req.params.id);
  res.json({ deleted: true });
});

// --- RACES API ---
app.get('/api/races', (req, res) => {
  const races = db.prepare('SELECT * FROM races ORDER BY round_number').all();
  res.json(races);
});

app.post('/api/races', (req, res) => {
  const { round_number, circuit_name, country, race_date, status } = req.body;
  const info = db.prepare('INSERT INTO races (round_number, circuit_name, country, race_date, status) VALUES (?, ?, ?, ?, ?)')
                .run(round_number, circuit_name, country, race_date, status || 'upcoming');
  res.json({ id: info.lastInsertRowid });
});

app.put('/api/races/:id', (req, res) => {
  const { round_number, circuit_name, country, race_date, status } = req.body;
  db.prepare('UPDATE races SET round_number = ?, circuit_name = ?, country = ?, race_date = ?, status = ? WHERE id = ?')
    .run(round_number, circuit_name, country, race_date, status, req.params.id);
  res.json({ updated: true });
});

app.delete('/api/races/:id', (req, res) => {
  db.prepare('DELETE FROM races WHERE id = ?').run(req.params.id);
  res.json({ deleted: true });
});

// --- RESULTS API ---
app.get('/api/results', (req, res) => {
  const results = db.prepare(`
    SELECT results.*, races.circuit_name, drivers.full_name as driver_name, teams.team_name 
    FROM results 
    JOIN races ON results.race_id = races.id
    JOIN drivers ON results.driver_id = drivers.id
    JOIN teams ON results.team_id = teams.id
    ORDER BY races.round_number, results.finishing_position
  `).all();
  res.json(results);
});

app.get('/api/standings', (req, res) => {
  const standings = db.prepare(`
    SELECT drivers.full_name, teams.team_name, SUM(results.points_scored) as points
    FROM results
    JOIN drivers ON results.driver_id = drivers.id
    JOIN teams ON results.team_id = teams.id
    GROUP BY drivers.id
    ORDER BY points DESC
  `).all();
  res.json(standings);
});

app.post('/api/results', (req, res) => {
  const { race_id, driver_id, team_id, finishing_position, points_scored, fastest_lap } = req.body;
  const info = db.prepare('INSERT INTO results (race_id, driver_id, team_id, finishing_position, points_scored, fastest_lap) VALUES (?, ?, ?, ?, ?, ?)')
                .run(race_id, driver_id, team_id, finishing_position, points_scored, fastest_lap ? 1 : 0);
  res.json({ id: info.lastInsertRowid });
});

app.put('/api/results/:id', (req, res) => {
  const { race_id, driver_id, team_id, finishing_position, points_scored, fastest_lap } = req.body;
  db.prepare('UPDATE results SET race_id = ?, driver_id = ?, team_id = ?, finishing_position = ?, points_scored = ?, fastest_lap = ? WHERE id = ?')
    .run(race_id, driver_id, team_id, finishing_position, points_scored, fastest_lap ? 1 : 0, req.params.id);
  res.json({ updated: true });
});

app.delete('/api/results/:id', (req, res) => {
  db.prepare('DELETE FROM results WHERE id = ?').run(req.params.id);
  res.json({ deleted: true });
});

// --- DATABASE EXPLORER API ---
app.get('/api/db/tables', (req, res) => {
  try {
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();
    res.json(tables.map(t => t.name));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/db/table/:name', (req, res) => {
  try {
    const tableName = req.params.name;
    if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
      return res.status(400).json({ error: 'Invalid table name' });
    }
    const data = db.prepare(`SELECT * FROM ${tableName}`).all();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- START SERVER ---
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
