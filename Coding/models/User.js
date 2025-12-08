const mongoose = require('mongoose');

// Toto je "šablona" pro uživatele v naší databázi.
// Říká, že každý uživatel musí mít unikátní jméno (username) a heslo (password).
const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  avatar: {
    type: String,
    default: '👤'
  }
});

module.exports = mongoose.model('User', UserSchema);