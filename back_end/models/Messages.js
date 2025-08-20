// models/Messages.js
const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true },
  tableSize: String,
  count: Number,
  type: { type: String, enum: ["availability", "queue"], required: true },
  status: { type: String, enum: ["waiting", "sent", "done"], default: "waiting" },
  comment: String, // <-- NEW
  createdAt: { type: Date, default: Date.now, expires: 86400 } // TTL of 1 day
});

module.exports = mongoose.model("Messages", messageSchema);
