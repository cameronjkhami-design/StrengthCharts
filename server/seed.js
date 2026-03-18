const crypto = require('crypto');
const { db, initDb } = require('./db');

function hashPin(pin) {
  return crypto.createHash('sha256').update(pin).digest('hex');
}

async function seed() {
  await initDb();
  console.log('Seeding database...');

  // Clear existing data
  await db.executeMultiple('DELETE FROM friendships; DELETE FROM lift_logs; DELETE FROM bodyweight_logs; DELETE FROM users;');

  // Create users
  const users = [
    { username: 'marcus', pin: '1234', display_name: 'Marcus' },
    { username: 'sarah', pin: '1234', display_name: 'Sarah' },
    { username: 'jake', pin: '1234', display_name: 'Jake' },
  ];

  const userIds = [];
  for (const u of users) {
    const result = await db.execute({
      sql: 'INSERT INTO users (username, pin_hash, display_name) VALUES (?, ?, ?)',
      args: [u.username, hashPin(u.pin), u.display_name]
    });
    userIds.push(Number(result.lastInsertRowid));
  }

  // Seed bodyweight logs
  const bwData = [
    { userId: userIds[0], weights: [91, 90.5, 90, 89.8, 90.2, 89.5] },
    { userId: userIds[1], weights: [64, 63.5, 63.2, 63, 62.8, 63] },
    { userId: userIds[2], weights: [81, 80.5, 80.2, 80, 79.8, 80] },
  ];

  for (const { userId, weights } of bwData) {
    for (let i = 0; i < weights.length; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (weights.length - 1 - i) * 7);
      await db.execute({
        sql: 'INSERT INTO bodyweight_logs (user_id, weight_kg, logged_at) VALUES (?, ?, ?)',
        args: [userId, weights[i], date.toISOString()]
      });
    }
  }

  // Seed lift logs
  async function addLifts(userId, exercise, entries) {
    for (let i = 0; i < entries.length; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (entries.length - 1 - i) * 14);
      await db.execute({
        sql: 'INSERT INTO lift_logs (user_id, exercise_name, weight_kg, reps, logged_at, notes) VALUES (?, ?, ?, ?, ?, ?)',
        args: [userId, exercise, entries[i].weight, entries[i].reps, date.toISOString(), entries[i].notes || null]
      });
    }
  }

  // Marcus
  await addLifts(userIds[0], 'Squat', [
    { weight: 120, reps: 5 }, { weight: 125, reps: 5 }, { weight: 130, reps: 3 },
    { weight: 135, reps: 3 }, { weight: 140, reps: 1, notes: 'New PR!' },
  ]);
  await addLifts(userIds[0], 'Bench Press', [
    { weight: 90, reps: 5 }, { weight: 95, reps: 3 }, { weight: 100, reps: 3 },
    { weight: 105, reps: 1 }, { weight: 107.5, reps: 1 },
  ]);
  await addLifts(userIds[0], 'Deadlift', [
    { weight: 160, reps: 5 }, { weight: 170, reps: 3 }, { weight: 180, reps: 1 },
    { weight: 185, reps: 1 }, { weight: 190, reps: 1, notes: 'Grind city' },
  ]);
  await addLifts(userIds[0], 'Overhead Press', [
    { weight: 55, reps: 5 }, { weight: 60, reps: 3 }, { weight: 65, reps: 1 },
  ]);
  await addLifts(userIds[0], 'Barbell Row', [
    { weight: 80, reps: 5 }, { weight: 85, reps: 5 }, { weight: 90, reps: 3 },
  ]);

  // Sarah
  await addLifts(userIds[1], 'Squat', [
    { weight: 60, reps: 5 }, { weight: 65, reps: 5 }, { weight: 70, reps: 3 },
    { weight: 75, reps: 3 }, { weight: 80, reps: 1 },
  ]);
  await addLifts(userIds[1], 'Bench Press', [
    { weight: 35, reps: 5 }, { weight: 37.5, reps: 5 }, { weight: 40, reps: 3 },
    { weight: 42.5, reps: 1 },
  ]);
  await addLifts(userIds[1], 'Deadlift', [
    { weight: 80, reps: 5 }, { weight: 85, reps: 3 }, { weight: 90, reps: 3 },
    { weight: 100, reps: 1, notes: 'First 100kg pull!' },
  ]);
  await addLifts(userIds[1], 'Overhead Press', [
    { weight: 25, reps: 5 }, { weight: 27.5, reps: 3 }, { weight: 30, reps: 1 },
  ]);

  // Jake
  await addLifts(userIds[2], 'Squat', [
    { weight: 70, reps: 5 }, { weight: 75, reps: 5 }, { weight: 80, reps: 3 },
    { weight: 85, reps: 3 },
  ]);
  await addLifts(userIds[2], 'Bench Press', [
    { weight: 55, reps: 5 }, { weight: 60, reps: 5 }, { weight: 65, reps: 3 },
    { weight: 70, reps: 1 },
  ]);
  await addLifts(userIds[2], 'Deadlift', [
    { weight: 100, reps: 5 }, { weight: 110, reps: 3 }, { weight: 120, reps: 1 },
    { weight: 125, reps: 1 },
  ]);
  await addLifts(userIds[2], 'Overhead Press', [
    { weight: 40, reps: 5 }, { weight: 42.5, reps: 3 }, { weight: 45, reps: 1 },
  ]);
  await addLifts(userIds[2], 'Pull-ups', [
    { weight: 80, reps: 8 }, { weight: 80, reps: 10 }, { weight: 85, reps: 6, notes: 'Weighted +5kg' },
  ]);

  // Seed friendships
  const friendPairs = [
    [userIds[0], userIds[1]], [userIds[1], userIds[0]],
    [userIds[0], userIds[2]], [userIds[2], userIds[0]],
    [userIds[1], userIds[2]], [userIds[2], userIds[1]],
  ];
  for (const [a, b] of friendPairs) {
    await db.execute({
      sql: 'INSERT INTO friendships (user_id, friend_id) VALUES (?, ?)',
      args: [a, b]
    });
  }

  console.log('Seeded 3 users with lift, bodyweight, and friendship data.');
  console.log('All users have PIN: 1234');
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
