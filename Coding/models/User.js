const mongoose = require('mongoose');

// Toto je "šablona" pro uživatele v naší databázi.
// Říká, že každý uživatel musí mít unikátní jméno (username) a heslo (password).
const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,     // Jedinečné jméno uživatele
    unique: true,
  },
  password: {
    type: String,       // Hašované heslo
    required: true,
  },
  avatar: {
    type: String,       // Cesta k obrázku nebo textová zkratka profilu.
    default: '👤'
  }
});

module.exports = mongoose.model('User', UserSchema);