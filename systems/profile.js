const points = require('./points');

module.exports = {
  getProfile(user) {
    const p = points.getPoints(user.id);

    return {
      name: user.username,
      id: user.id,
      points: p,
      level: Math.floor(p / 100),
      nextLevel: 100 - (p % 100)
    };
  }
};