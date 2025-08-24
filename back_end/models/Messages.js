const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true },
  tableSize: { type: String },
  count: { type: Number },
  type: { type: String, enum: ["availability", "queue"], required: true },
  status: { type: String, enum: ["waiting", "sent", "done"], default: "waiting" },
  comment: { type: String },
  position: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now, expires: 86400 }
});

module.exports = mongoose.model("Messages", messageSchema);
