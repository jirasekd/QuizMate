const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ChatSchema = new Schema({
  // Použijeme Mongoose ID, ale na frontendu ho budeme mapovat na `id`
  name: { type: String, required: true },
  messages: { type: Array, default: [] },
  notes: { type: Object, default: null },
  flashcards: { type: Array, default: null },
  tests: { type: Array, default: null },

});

const FileSchema = new Schema({
  name: { type: String, required: true },
  content: { type: String, required: true },
  type: { type: String },
  size: { type: Number },
  uploadedAt: { type: Date, default: Date.now }
});

const SubjectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  icon: { type: String, default: "📘" },  // Emoji reprezentující předmět.
  
  // Reference na ID vlastníka (propojení s kolekcí User).
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'user' },
  
  chats: [{                 
    name: String,           // Název předmětu (např. "Matematika").
    messages: Array,        // Pole objektů obsahující historii zpráv
    notes: Object,          // Pole vygenerovaných výpisků.
    flashcards: Array,      // Pole objektů se sadami kartiček (otázka/odpověď).
    tests: Array            // Pole vygenerovaných testů s klíčem správných odpovědí.
  }],
  files: [FileSchema] 
});

module.exports = mongoose.model('Subject', SubjectSchema);