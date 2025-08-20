require("dotenv").config();
const express = require("express");
const jwt = require("jsonwebtoken");
const http = require("http");
const cors = require("cors");
const mongoose = require("mongoose");
const socketio = require("socket.io");
const authRoutes = require("./routes/auth");
const Messages = require("./models/Messages");

const app = express();
const server = http.createServer(app);
const io = new socketio.Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

async function initializeDefaultTableAvailability() {
  const defaultTables = [
    { size: "2", count: 28 },
    { size: "3", count: 7 },
    { size: "4", count: 24 },
    { size: "5", count: 3 },
    { size: "6", count: 3 },
    { size: "6+", count: 1 },
  ];

  const userId = "000000000000000000000000"; // dummy/system user

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  for (const { size, count } of defaultTables) {
    const exists = await Messages.findOne({
      tableSize: size,
      type: "availability",
      createdAt: { $gte: oneDayAgo },
    });

    if (!exists) {
      await Messages.create({
        userId,
        tableSize: size,
        count,
        type: "availability",
      });
      console.log(`✅ Initialized table size ${size} with count ${count}`);
    }
  }

  console.log("✅ All default table availabilities initialized");
}

// 🌐 Connect MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(async () => {
  console.log("✅ Connected to MongoDB");
  await initializeDefaultTableAvailability(); // <-- call it here
})
.catch((err) => console.error("❌ MongoDB connection error:", err));


// 🛡️ Authenticate socket with JWT
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

// 🔌 Real-Time Logic
io.on("connection", async (socket) => {
  if (!socket.userId) return console.warn(`⚠️ Missing userId for ${socket.id}`);
  console.log(`✅ Socket connected: ${socket.id}`);

  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // ⏳ Send current availability totals
    const tableCounts = await Messages.aggregate([
      { $match: { type: "availability", createdAt: { $gte: oneDayAgo } } },
      { $group: { _id: "$tableSize", count: { $sum: "$count" } } },
      { $project: { tableSize: "$_id", count: 1, _id: 0 } }
    ]);
    socket.emit("init-tables", tableCounts);

    // 📋 Send waiting queue
    const queue = await Messages.find({
      type: "queue",
      createdAt: { $gte: oneDayAgo },
      status: { $ne: "done" }
    }).sort({ createdAt: 1 });
    socket.emit("init-queue", queue);

  } catch (err) {
    console.error("❌ Init error:", err.message);
  }

  // ➕ ➖ Availability Update
  socket.on("update-table", async ({ tableSize, delta }) => {
    try {
      await Messages.create({
        userId: socket.userId,
        tableSize,
        count: delta,
        type: "availability"
      });
      io.emit("table-updated", { tableSize, delta });
    } catch (err) {
      console.error("❌ Table update error:", err.message);
    }
  });

  // ➕ Add to queue (with optional comment)
  socket.on("add-to-queue", async ({ tableSize, comment }) => {
    try {
      const doc = await Messages.create({
        userId: socket.userId,
        tableSize,
        type: "queue",
        status: "waiting",
        comment: comment || "" // optional
      });
      io.emit("queue-added", doc);
    } catch (err) {
      console.error("❌ Add to queue error:", err.message);
    }
  });

  // ✏️ Update comment after initial add
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

  // ⬆️ Mark as sent
  socket.on("mark-sent", async ({ id }) => {
    try {
      const updated = await Messages.findByIdAndUpdate(id, { status: "sent" }, { new: true });
      if (updated) io.emit("queue-updated", updated);
    } catch (err) {
      console.error("❌ Mark sent error:", err.message);
    }
  });

  // ✅ Mark as done (soft-remove)
  socket.on("mark-done", async ({ id }) => {
    try {
      const updated = await Messages.findByIdAndUpdate(id, { status: "done" }, { new: true });
      if (updated) io.emit("queue-removed", { id });
    } catch (err) {
      console.error("❌ Mark done error:", err.message);
    }
  });

  socket.on("disconnect", () => {
    console.log(`🔴 Disconnected: ${socket.id}`);
  });
});

// 🔁 Express API
app.use(cors());
app.use(express.json());
app.use("/api/auth", authRoutes);
app.get("/", (req, res) => res.send("Backend running ✅"));

// 🚀 Start Server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`🚀 Server listening on ${PORT}`));
