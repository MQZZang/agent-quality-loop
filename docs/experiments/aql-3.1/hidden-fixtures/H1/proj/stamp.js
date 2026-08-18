function stampTitle(title, date = new Date()) {
  const iso = date.toISOString().slice(0, 10);
  return `[${iso}] ${title}`;
}

module.exports = { stampTitle };
