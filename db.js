const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'f1_management.db'));

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS teams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_name TEXT NOT NULL,
    principal TEXT,
    engine_supplier TEXT,
    nationality TEXT,
    total_points INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS drivers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    nationality TEXT,
    car_number INTEGER,
    team_id INTEGER,
    total_points INTEGER DEFAULT 0,
    date_of_birth TEXT,
    FOREIGN KEY (team_id) REFERENCES teams (id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS races (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    round_number INTEGER,
    circuit_name TEXT NOT NULL,
    country TEXT,
    race_date TEXT,
    status TEXT CHECK(status IN ('upcoming', 'completed')) DEFAULT 'upcoming'
  );

  CREATE TABLE IF NOT EXISTS results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    race_id INTEGER,
    driver_id INTEGER,
    team_id INTEGER,
    finishing_position INTEGER,
    points_scored INTEGER,
    fastest_lap BOOLEAN DEFAULT 0,
    FOREIGN KEY (race_id) REFERENCES races (id) ON DELETE CASCADE,
    FOREIGN KEY (driver_id) REFERENCES drivers (id) ON DELETE CASCADE,
    FOREIGN KEY (team_id) REFERENCES teams (id) ON DELETE CASCADE
  );
`);

// Seeding function
function seed() {
  const teamCount = db.prepare('SELECT COUNT(*) as count FROM teams').get().count;
  if (teamCount > 0) return;

  console.log('Seeding database...');

  // Seed Teams
  const teams = [
    ['Red Bull Racing', 'Christian Horner', 'Honda RBPT', 'Austrian', 860],
    ['Mercedes-AMG Petronas', 'Toto Wolff', 'Mercedes', 'German', 409],
    ['Scuderia Ferrari', 'Frédéric Vasseur', 'Ferrari', 'Italian', 406],
    ['McLaren F1 Team', 'Andrea Stella', 'Mercedes', 'British', 302],
    ['Aston Martin', 'Mike Krack', 'Mercedes', 'British', 280]
  ];
  const insertTeam = db.prepare('INSERT INTO teams (team_name, principal, engine_supplier, nationality, total_points) VALUES (?, ?, ?, ?, ?)');
  teams.forEach(t => insertTeam.run(...t));

  // Seed Drivers
  const drivers = [
    ['Max Verstappen', 'Dutch', 1, 1, 575, '1997-09-30'],
    ['Lewis Hamilton', 'British', 44, 2, 234, '1985-01-07'],
    ['Charles Leclerc', 'Monégasque', 16, 3, 206, '1997-10-16'],
    ['Lando Norris', 'British', 4, 4, 205, '1999-11-13'],
    ['Fernando Alonso', 'Spanish', 14, 5, 206, '1981-07-29']
  ];
  const insertDriver = db.prepare('INSERT INTO drivers (full_name, nationality, car_number, team_id, total_points, date_of_birth) VALUES (?, ?, ?, ?, ?, ?)');
  drivers.forEach(d => insertDriver.run(...d));

  // Seed Races
  const races = [
    [1, 'Bahrain International Circuit', 'Bahrain', '2026-03-02', 'completed'],
    [2, 'Jeddah Corniche Circuit', 'Saudi Arabia', '2026-03-09', 'completed'],
    [3, 'Albert Park Circuit', 'Australia', '2026-03-23', 'completed'],
    [4, 'Suzuka International', 'Japan', '2026-04-06', 'completed'],
    [5, 'Shanghai International', 'China', '2026-04-20', 'upcoming']
  ];
  const insertRace = db.prepare('INSERT INTO races (round_number, circuit_name, country, race_date, status) VALUES (?, ?, ?, ?, ?)');
  races.forEach(r => insertRace.run(...r));

  // Seed Results (Sample results for first race)
  const results = [
    [1, 1, 1, 1, 25, 1], // Verstappen win
    [1, 3, 3, 2, 18, 0], // Leclerc P2
    [1, 4, 4, 3, 15, 0], // Norris P3
    [1, 2, 2, 4, 12, 0], // Hamilton P4
    [1, 5, 5, 5, 10, 0]  // Alonso P5
  ];
  const insertResult = db.prepare('INSERT INTO results (race_id, driver_id, team_id, finishing_position, points_scored, fastest_lap) VALUES (?, ?, ?, ?, ?, ?)');
  results.forEach(res => insertResult.run(...res));

  console.log('Seeding complete.');
}

seed();

module.exports = db;
