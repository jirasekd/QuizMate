const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
  // 1. Extrakce tokenu z vlastní HTTP hlavičky 'x-auth-token'
  const token = req.header('x-auth-token');

  // 2. Kontrola přítomnosti tokenu (pokud chybí, přístup bude odepřen)
  if (!token) {
    return res.status(401).json({ msg: 'Chybí token, autorizace zamítnuta.' });
  }

  // 3. Pokus o verifikaci tokenu pomocí tajného klíče ze souboru .env
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 4. Pokud je validní, uložíme dekódovaná data do uživatele (ID) do objektu požadavku
    req.user = decoded.user;

    // 5. Volání funkce next() předá řízení routeru
    next();
  } catch (err) {
    res.status(401).json({ msg: 'Token je neplatný.' });
  }
};