const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const auth = require('../middleware/auth');

router.put('/username', auth, async (req, res) => {
  const { newUsername } = req.body;

  if (!newUsername) {
    return res.status(400).json({ msg: 'Chybí nové username' });
  }

  const existing = await User.findOne({ username: newUsername });
  if (existing) {
    return res.status(400).json({ msg: 'Username už existuje' });
  }

  const user = await User.findById(req.user.id);
  if (!user) {
    return res.status(404).json({ msg: 'Uživatel nenalezen' });
  }
  user.username = newUsername;
  await user.save();

  res.json({ username: user.username });
});

router.put('/password', auth, async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    return res.status(400).json({ msg: 'Chybí hesla' });
  }

  const user = await User.findById(req.user.id);
  if (!user) {
    return res.status(404).json({ msg: 'Uživatel nenalezen' });
  }

  const isMatch = await bcrypt.compare(oldPassword, user.password);
  if (!isMatch) {
    return res.status(400).json({ msg: 'Staré heslo je špatně' });
  }

  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(newPassword, salt);
  await user.save();

  res.json({ msg: 'Heslo změněno' });
});

router.put('/avatar', auth, async (req, res) => {
  const { avatar } = req.body;

  if (!avatar) {
    return res.status(400).json({ msg: 'Chybí avatar' });
  }

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'Uživatel nenalezen' });
    }
    user.avatar = avatar;
    await user.save();
    res.json({ avatar: user.avatar });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Chyba serveru');
  }
});

module.exports = router;