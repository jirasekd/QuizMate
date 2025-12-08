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

const SubjectSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  icon: {
    type: String,
    default: '📘',
  },
  // Do budoucna sem přijdou pole pro chaty, soubory atd.
  chats: [ChatSchema],
  files: [FileSchema],
});

module.exports = mongoose.model('Subject', SubjectSchema);