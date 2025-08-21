import { useEffect, useState } from "react";
import { useSocket } from "../contexts/SocketContext";
import Navbar from "../components/Navbar";
import "../index.css"; // Caveat Brush font

export default function Loggedin() {
  const socket = useSocket();

  const [activeTab, setActiveTab] = useState("availability");
  const tableSizes = ["2", "3", "4", "5", "6", "6+"];
  const [tables, setTables] = useState({});
  const [queue, setQueue] = useState([]);
  const [newQueueSize, setNewQueueSize] = useState("");
  const [commentDrafts, setCommentDrafts] = useState({});
  const [loadingTables, setLoadingTables] = useState(true);

  useEffect(() => {
    if (!socket) return;

    socket.on("init-tables", (data) => {
      const formatted = {};
      data.forEach(({ tableSize, count }) => {
        formatted[tableSize] = (formatted[tableSize] || 0) + count;
      });
      setTables(formatted);
      setLoadingTables(false);
    });

    socket.on("init-queue", (data) => setQueue(data));
    socket.on("table-updated", ({ tableSize, delta }) => {
      setTables((prev) => ({
        ...prev,
        [tableSize]: Math.max((prev[tableSize] || 0) + delta, 0),
      }));
    });
    socket.on("queue-added", (entry) => setQueue((prev) => [...prev, entry]));
    socket.on("queue-updated", (updated) => {
      setQueue((prev) =>
        prev.map((entry) => (entry._id === updated._id ? updated : entry))
      );
    });
    socket.on("queue-removed", ({ id }) => {
      setQueue((prev) => prev.filter((entry) => entry._id !== id));
    });

    return () => {
      socket.off("init-tables");
      socket.off("init-queue");
      socket.off("table-updated");
      socket.off("queue-added");
      socket.off("queue-updated");
      socket.off("queue-removed");
    };
  }, [socket]);

  const updateTable = (size, delta) => {
    if (!socket) return;
    const current = tables[size] || 0;
    if (current + delta < 0) return;
    socket.emit("update-table", { tableSize: size, delta });
  };

  const addToQueue = () => {
    if (!newQueueSize.trim() || !socket) return;
    socket.emit("add-to-queue", { tableSize: newQueueSize });
    setNewQueueSize("");
  };

  const submitComment = (id, comment) => {
    if (!comment || !socket) return;
    socket.emit("add-comment", { id, comment });
    setCommentDrafts((prev) => {
      const updated = { ...prev };
      delete updated[id];
      return updated;
    });
  };

  const markSendUp = (id) => {
    socket.emit("mark-sent", { id });
  };

  const markDone = (id) => {
    socket.emit("mark-done", { id });
  };

  const SkeletonTile = () => (
    <div className="animate-pulse bg-white/20 rounded-lg p-4 text-center backdrop-blur-lg h-40 flex flex-col items-center justify-center shadow">
      <div className="h-6 bg-white/40 rounded w-2/3 mb-4"></div>
      <div className="h-8 bg-white/50 rounded w-1/2 mb-4"></div>
      <div className="flex gap-4">
        <div className="h-8 w-8 bg-white/30 rounded-full"></div>
        <div className="h-8 w-8 bg-white/30 rounded-full"></div>
      </div>
    </div>
  );

  return (
    <div className="relative min-h-screen font-caveat text-black overflow-hidden fire-gradient">
      <Navbar />

      <div className="pt-24 md:pt-40 max-w-4xl mx-auto px-4">
        {/* Tabs */}
        <div className="flex justify-center mb-8 space-x-4">
          {["availability", "queue"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2 rounded-full transition border 
                ${
                  activeTab === tab
                    ? "bg-orange-500/80 border-black/40 backdrop-blur-lg text-black"
                    : "bg-red/10 border-black/20 backdrop-blur-sm text-black/80"
                }`}
            >
              {tab === "availability" ? "Table Availability" : "Waiting Queue"}
            </button>
          ))}
        </div>

        {/* Availability Grid */}
        {activeTab === "availability" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loadingTables
              ? tableSizes.map((_, i) => <SkeletonTile key={i} />)
              : tableSizes.map((size) => (
                  <div
                    key={size}
                    className="relative bg-white/30 shadow-lg rounded-lg p-4 text-center backdrop-blur-lg"
                  >
                    <h2 className="mb-2 text-lg">Table for {size}</h2>
                    <p className="text-4xl mb-4">{tables[size] ?? 0}</p>
                    <div className="flex justify-center space-x-4">
                      <button
                        onClick={() => updateTable(size, 1)}
                        className="bg-orange-500/60 text-black px-3 py-1 rounded-full hover:bg-orange-600/80 transition"
                      >
                        +
                      </button>
                      <button
                        onClick={() => updateTable(size, -1)}
                        className="bg-blue-500/60 text-black px-3 py-1 rounded-full hover:bg-blue-600/80 transition"
                        disabled={(tables[size] || 0) === 0}
                      >
                        -
                      </button>
                    </div>
                  </div>
                ))}
          </div>
        ) : (
          <>
            {/* Add to Queue Input */}
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-6">
              <input
                type="number"
                min="1"
                placeholder="Enter table size"
                value={newQueueSize}
                onChange={(e) => setNewQueueSize(e.target.value)}
                className="bg-black/40 text-white placeholder-white/70 border border-white/30 backdrop-blur-md px-4 py-2 rounded-full focus:outline-none"
              />
              <button
                onClick={addToQueue}
                className="bg-blue-600/60 text-black px-4 py-2 rounded-full hover:bg-blue-700/80 backdrop-blur-md transition"
                disabled={!newQueueSize.trim()}
              >
                Add to Queue
              </button>
            </div>

            {/* Waiting Queue Cards */}
            <div className="space-y-4">
              {queue.map((entry) => (
                <div
                  key={entry._id}
                  className={`p-4 rounded-lg backdrop-blur-md  ${
                    entry.status === "sent"
                      ? "bg-orange-400/90 text-gray-800"
                      : "bg-black/30"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-white text-xl">
                      Waiting for table of {entry.tableSize}
                    </span>
                    <div className="space-x-2">
                      <button
                        onClick={() => markSendUp(entry._id)}
                        className="bg-yellow-400/70 text-white px-3 py-1 rounded-full hover:bg-yellow-500/80"
                      >
                        Send Up
                      </button>
                      <button
                        onClick={() => markDone(entry._id)}
                        className="bg-gray-600/60 text-white px-3 py-1 rounded-full hover:bg-gray-700/80"
                      >
                        Done
                      </button>
                    </div>
                  </div>

                  {entry.status === "waiting" && !entry.comment && (
                    <div className="flex items-center gap-2 mt-2">
                      <input
                        type="text"
                        value={commentDrafts[entry._id] || ""}
                        onChange={(e) =>
                          setCommentDrafts((prev) => ({
                            ...prev,
                            [entry._id]: e.target.value,
                          }))
                        }
                        placeholder="Add a comment (optional)"
                        className="flex-1 px-3 py-1 rounded-full border border-white/30 text-white bg-white/10 placeholder-white/60 backdrop-blur-sm"
                      />
                      <button
                        onClick={() =>
                          submitComment(entry._id, commentDrafts[entry._id])
                        }
                        className="bg-blue-500/60 text-white px-3 py-1 rounded-full hover:bg-blue-600/80"
                      >
                        Save
                      </button>
                    </div>
                  )}

                  {entry.comment && (
                    <p className="text-sm italic text-white/80 mt-2">
                      📝 {entry.comment}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
