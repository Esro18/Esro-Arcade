const fs = require('fs');
const path = './data/players.json';

function load() {
  return JSON.parse(fs.readFileSync(path));
}

function save(data) {
  fs.writeFileSync(path, JSON.stringify(data, null, 2));
}

module.exports = {
  addPoints(userId, amount) {
    const data = load();
    if (!data[userId]) data[userId] = { points: 0 };
    data[userId].points += amount;
    save(data);
  },

  getPoints(userId) {
    const data = load();
    return data[userId] ? data[userId].points : 0;
  },

  getLeaderboard() {
    const data = load();
    const sorted = Object.entries(data)
      .sort((a, b) => b[1].points - a[1].points)
      .slice(0, 10);

    return sorted.map(([id, info], index) => ({
      rank: index + 1,
      id,
      points: info.points
    }));
  }
};
