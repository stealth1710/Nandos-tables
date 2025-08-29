require("dotenv").config();
const express = require("express");
const jwt = require("jsonwebtoken");
const http = require("http");
const cors = require("cors");
const mongoose = require("mongoose");
const socketio = require("socket.io");

const authRoutes = require("./routes/auth");
const Messages = require("./models/Messages");
const ChatMessage = require("./models/ChatMessage");
const DoneEntry = require("./models/DoneEntry");

const app = express();
const server = http.createServer(app);
const io = new socketio.Server(server, {
  cors: {
    origin: ["http://localhost:5173", "https://nandos-o2.netlify.app"],
    methods: ["GET", "POST"],
  },
});

// MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// JWT Socket Auth
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  const secret = process.env.JWT_SECRET;

  if (!token) return next(new Error("No token provided"));
  try {
    const decoded = jwt.verify(token, secret);
    socket.userId = decoded.id;
    next();
  } catch (err) {
    console.error("❌ Invalid JWT:", err.message);
    return next(new Error("Invalid token"));
  }
});

// Emit average wait time
async function emitAverageWaitTime() {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0); // sets time to 00:00:00

  const doneEntries = await DoneEntry.find({ doneAt: { $gte: startOfToday } });

  let totalWaitMs = 0;
  doneEntries.forEach((entry) => {
    totalWaitMs += new Date(entry.doneAt) - new Date(entry.createdAt);
  });

  const avgWaitMs = doneEntries.length ? totalWaitMs / doneEntries.length : 0;
  io.emit("average-wait-time", avgWaitMs);
}

// Socket Events
io.on("connection", async (socket) => {
  console.log(`✅ Connected: ${socket.id}`);
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  try {
    const tableCounts = await Messages.aggregate([
      { $match: { type: "availability", createdAt: { $gte: oneDayAgo } } },
      { $group: { _id: "$tableSize", count: { $sum: "$count" } } },
      { $project: { tableSize: "$_id", count: 1, _id: 0 } },
    ]);
    socket.emit("init-tables", tableCounts);

    const queue = await Messages.find({
      type: "queue",
      createdAt: { $gte: oneDayAgo },
      status: { $ne: "done" },
    }).sort({ position: 1, createdAt: 1 }); // 🔥 sort by position
    socket.emit("init-queue", queue);

    const generalChat = await ChatMessage.find({ tableId: null }).sort({ createdAt: 1 });
    socket.emit("init-general-chat", generalChat);

    const tableChats = await ChatMessage.find({ tableId: { $ne: null } }).sort({ createdAt: 1 });
    tableChats.forEach((msg) => {
      socket.emit("chat-message", { ...msg._doc, tableId: msg.tableId });
    });

    await emitAverageWaitTime();
  } catch (err) {
    console.error("❌ Init error:", err.message);
  }

  socket.on("reset-availability", async () => {
    const defaultTables = [
      { size: "2", count: 28 },
      { size: "3", count: 7 },
      { size: "4", count: 24 },
      { size: "5", count: 3 },
      { size: "6", count: 3 },
      { size: "6+", count: 1 },
    ];

    const userId = "000000000000000000000000";

    try {
      await Messages.deleteMany({ type: "availability" });

      for (const { size, count } of defaultTables) {
        await Messages.create({
          userId,
          tableSize: size,
          count,
          type: "availability",
        });
      }

      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const tableCounts = await Messages.aggregate([
        { $match: { type: "availability", createdAt: { $gte: oneDayAgo } } },
        { $group: { _id: "$tableSize", count: { $sum: "$count" } } },
        { $project: { tableSize: "$_id", count: 1, _id: 0 } },
      ]);

      io.emit("init-tables", tableCounts);
      console.log("✅ Tables reset and broadcasted");
    } catch (err) {
      console.error("❌ Reset error:", err.message);
    }
  });

  socket.on("update-table", async ({ tableSize, delta }) => {
    try {
      await Messages.create({
        userId: socket.userId,
        tableSize,
        count: delta,
        type: "availability",
      });
      io.emit("table-updated", { tableSize, delta });
    } catch (err) {
      console.error("❌ Update table error:", err.message);
    }
  });

  socket.on("add-to-queue", async ({ tableSize, comment }) => {
  try {
    const last = await Messages.findOne({ type: "queue" }).sort({ position: -1 });
    const doc = await Messages.create({
      userId: socket.userId,
      tableSize,
      type: "queue",
      status: "waiting",
      comment: comment || "",
      position: last ? last.position + 1 : 0,
    });

    // Send `senderId` along with the queue entry
    io.emit("queue-added", { ...doc.toObject(), senderId: socket.id });
  } catch (err) {
    console.error("❌ Add to queue error:", err.message);
  }
});

  socket.on("reorder-queue", async (newOrderIds) => {
    try {
      for (let i = 0; i < newOrderIds.length; i++) {
        await Messages.findByIdAndUpdate(newOrderIds[i], { position: i });
      }

      const reordered = await Messages.find({
        type: "queue",
        status: { $ne: "done" },
      }).sort({ position: 1 });
      io.emit("init-queue", reordered);
    } catch (err) {
      console.error("❌ Reorder error:", err.message);
    }
  });

  socket.on("add-comment", async ({ id, comment }) => {
    try {
      const updated = await Messages.findByIdAndUpdate(
        id,
        { comment: comment || "" },
        { new: true }
      );
      if (updated) io.emit("queue-updated", updated);
    } catch (err) {
      console.error("❌ Comment update error:", err.message);
    }
  });

  socket.on("mark-sent", async ({ id }) => {
    try {
      const updated = await Messages.findByIdAndUpdate(id, { status: "sent" }, { new: true });
      if (updated) io.emit("queue-updated", updated);
    } catch (err) {
      console.error("❌ Mark sent error:", err.message);
    }
  });

  socket.on("mark-done", async ({ id }) => {
    try {
      const updated = await Messages.findByIdAndUpdate(id, { status: "done" }, { new: true });
      if (updated) {
        await DoneEntry.create({
          entryId: updated._id,
          createdAt: updated.createdAt,
          doneAt: new Date(),
        });

        io.emit("queue-removed", { id, createdAt: updated.createdAt });
        await emitAverageWaitTime();
      }
    } catch (err) {
      console.error("❌ Mark done error:", err.message);
    }
  });

  socket.on("send-chat-message", async ({ tableId, message }) => {
    try {
      const chat = await ChatMessage.create({
        userId: socket.userId,
        tableId: tableId || null,
        message,
      });
      const messageToSend = {
      ...chat._doc,
      tableId,
      senderId: socket.id,
      } // ✅ attach socket id

      if (tableId) {
        io.emit("chat-message", messageToSend);
      } else {
        io.emit("general-chat-message", messageToSend);
      }
    } catch (err) {
      console.error("❌ Chat error:", err.message);
    }
  });

  socket.on("disconnect", () => {
    console.log(`🔌 Disconnected: ${socket.id}`);
  });
});

// API Routes
app.use(
  cors({
    origin: ["http://localhost:5173", "https://nandos-o2.netlify.app"],
    credentials: true,
  })
);
app.use(express.json());
app.use("/api/auth", authRoutes);
app.get("/", (req, res) => res.send("Backend running ✅"));

// Start Server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
