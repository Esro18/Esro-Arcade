const cooldowns = new Map();

module.exports = {
  check(userId, gameName, seconds) {
    const key = `${userId}_${gameName}`;
    const now = Date.now();

    if (!cooldowns.has(key)) {
      cooldowns.set(key, now);
      return false;
    }

    const diff = (now - cooldowns.get(key)) / 1000;

    if (diff < seconds) return true;

    cooldowns.set(key, now);
    return false;
  }
};
