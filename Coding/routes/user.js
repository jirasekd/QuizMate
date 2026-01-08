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

  const isMatch = await bcrypt.compare(oldPassword, user.password);
  if (!isMatch) {
    return res.status(400).json({ msg: 'Staré heslo je špatně' });
  }

  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(newPassword, salt);
  await user.save();

  res.json({ msg: 'Heslo změněno' });
});