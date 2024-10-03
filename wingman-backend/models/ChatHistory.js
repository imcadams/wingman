const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  role: String,
  content: String
}, { _id: false });

const chatHistorySchema = new mongoose.Schema({
  userId: { type: String, required: true },
  messages: [messageSchema]
});

module.exports = mongoose.model('ChatHistory', chatHistorySchema);
