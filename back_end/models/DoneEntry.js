const mongoose = require("mongoose");

const doneEntrySchema = new mongoose.Schema({
  entryId: { type: mongoose.Schema.Types.ObjectId, ref: "Messages" },
  createdAt: { type: Date, required: true },
  doneAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("DoneEntry", doneEntrySchema);
