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
});

const SubjectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  icon: { type: String, default: "📘" },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'user' },
  chats: [{
    name: String,
    messages: Array,
    notes: Object,
    flashcards: Array,
    tests: Array
  }],

  files: [{
  id: String,
  name: String,
  content: String,
  type: String,
  size: Number,
    uploadedAt: { type: Date, default: Date.now }
  }]
});

module.exports = mongoose.model('Subject', SubjectSchema);