const mongoose = require("mongoose");

const waitingQueueSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    tableSize: { type: String, required: true },
    status: {
      type: String,
      enum: ["waiting", "sent"],
      default: "waiting",
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 60*60*24, // TTL - 24 hours
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("WaitingQueue", waitingQueueSchema);