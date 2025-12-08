const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
  // 1. Získáme token z hlavičky požadavku
  const token = req.header('x-auth-token');

  // 2. Zkontrolujeme, jestli token vůbec existuje
  if (!token) {
    return res.status(401).json({ msg: 'Chybí token, autorizace zamítnuta.' });
  }

  // 3. Ověříme platnost tokenu
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 4. Pokud je platný, uložíme data o uživateli do požadavku pro další použití
    req.user = decoded.user;
    next(); // A pustíme požadavek dál
  } catch (err) {
    res.status(401).json({ msg: 'Token je neplatný.' });
  }
};