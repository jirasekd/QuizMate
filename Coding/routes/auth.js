const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// === REGISTRACE ===
// Cesta: POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    // 1. Získáme data z požadavku (z frontendu)
    const { username, password, avatar } = req.body;

    // 2. Zkontrolujeme, jestli uživatel už neexistuje
    let user = await User.findOne({ username });
    if (user) {
      return res.status(400).json({ msg: 'Uživatel s tímto jménem již existuje.' });
    }

    // 3. Vytvoříme nového uživatele podle našeho modelu
    user = new User({ username, password, avatar });

    // 4. Zašifrujeme heslo
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    // 5. Uložíme uživatele do databáze
    await user.save();

    // 6. Pošleme zpět úspěšnou odpověď
    res.status(201).json({ msg: 'Uživatel úspěšně zaregistrován.' });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Chyba serveru');
  }
});

// === PŘIHLÁŠENÍ ===
// Cesta: POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    // 1. Získáme data z požadavku
    const { username, password } = req.body;

    // 2. Najdeme uživatele v databázi
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ msg: 'Neplatné přihlašovací údaje.' });
    }

    // 3. Porovnáme zadané heslo s tím zašifrovaným v databázi
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Neplatné přihlašovací údaje.' });
    }

    // 4. Pokud vše sedí, vytvoříme "propustku" (JWT token)
    const payload = {
      user: {
        id: user.id, // Uložíme ID uživatele do tokenu
      },
    };

    jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '5h' }, (err, token) => {
      if (err) throw err;
      // 5. Pošleme token zpět frontendu
      res.json({
        token,
        // Přidáme i data o uživateli, aby je frontend mohl zobrazit
        user: { username: user.username, avatar: user.avatar }
      });
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Chyba serveru');
  }
});

module.exports = router;