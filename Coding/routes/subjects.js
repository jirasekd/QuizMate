const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth'); // Náš "strážník"
const Subject = require('../models/Subject');

// @route   GET api/subjects
// @desc    Získat všechny předměty přihlášeného uživatele
// @access  Private (chráněno)
router.get('/', auth, async (req, res) => {
  try {
    const subjects = await Subject.find({ user: req.user.id }).sort({ name: 1 });
    res.json(subjects);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Chyba serveru');
  }
});

// @route   POST api/subjects
// @desc    Vytvořit nový předmět
// @access  Private
router.post('/', auth, async (req, res) => {
  const { name, icon } = req.body;

  try {
    const newSubject = new Subject({
      name,
      icon,
      user: req.user.id,
    });

    const subject = await newSubject.save();
    res.json(subject);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Chyba serveru');
  }
});

// @route   PUT api/subjects/:id
// @desc    Aktualizovat předmět (přidat chat, poznámky, atd.)
// @access  Private
router.put('/:id', auth, async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id);

    if (!subject) {
      return res.status(404).json({ msg: 'Předmět nenalezen' });
    }

    // Ověříme, že předmět patří přihlášenému uživateli
    if (subject.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'Neoprávněný přístup' });
    }

    const updatedSubject = await Subject.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
    res.json(updatedSubject);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Chyba serveru');
  }
});

// @route   DELETE api/subjects/:id
// @desc    Smazat předmět
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    await Subject.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Předmět smazán' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Chyba serveru');
  }
});

module.exports = router;