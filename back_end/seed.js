
// seed.js
require("dotenv").config();
const mongoose = require("mongoose");
const Messages = require("./models/Messages");

const MONGO_URI = process.env.MONGO_URI;

async function seed() {
  await mongoose.connect(MONGO_URI);

  const tableSizes = ["2", "3", "4", "5", "6", "6+"];
  const userId = new mongoose.Types.ObjectId(); // dummy user for now

  await Promise.all(
    tableSizes.map((size) =>
      Messages.create({
        userId,
        tableSize: size,
        count: 20, // initial count per table size
      })
    )
  );

  console.log("✅ Seeded table availability");
  mongoose.disconnect();
}

seed().catch((err) => {
  console.error("❌ Seed error:", err.message);
});
