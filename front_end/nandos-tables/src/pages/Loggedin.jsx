import { useEffect, useState } from "react";
import { useSocket } from "../contexts/SocketContext";
import Navbar from "../components/Navbar";
import { motion, AnimatePresence } from "framer-motion";
import "../index.css";

export default function Loggedin() {
  const socket = useSocket();

  const [activeTab, setActiveTab] = useState("availability");
  const tableSizes = ["2", "3", "4", "5", "6", "6+"];
  const [tables, setTables] = useState({});
  const [queue, setQueue] = useState([]);
  const [newQueueSize, setNewQueueSize] = useState("");
  const [commentDrafts, setCommentDrafts] = useState({});
  const [chatDrafts, setChatDrafts] = useState({});
  const [chatMessages, setChatMessages] = useState({});
  const [chatToggles, setChatToggles] = useState({});
  const [chatNotifications, setChatNotifications] = useState({});
  const [loadingTables, setLoadingTables] = useState(true);
  const [showResetModal, setShowResetModal] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [averageWait, setAverageWait] = useState(0);
  const [shouldPlaySound, setShouldPlaySound] = useState(false);
  const [audio] = useState(() => new Audio("/sounds/arpeggio-467.mp3"));
  const [recentlyAddedId, setRecentlyAddedId] = useState(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [socketId, setSocketId] = useState("");


  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!socket) return;
    const handleConnect = () => {
    setSocketId(socket.id);
  };

  socket.on("connect", handleConnect);

  socket.on("connect_error", (err) => {
        if (err.message === "Invalid token" || err.message === "No token provided") {
        setSessionExpired(true);
        }
        });
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

   socket.on("queue-added", (entry) => {
  setQueue((prev) => [...prev, entry]);
  setRecentlyAddedId(entry._id)
  setTimeout(() => setRecentlyAddedId(null), 3000);

  // ✅ Only play if someone else added it
  if (entry.senderId !== socket.id) {
    setShouldPlaySound(true);

    // ✅ Optional vibration
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200]); // buzz - pause - buzz
    }
  }
});

socket.on("queue-updated", (updated) => {
  setQueue((prev) =>
    prev.map((entry) => (entry._id === updated._id ? updated : entry))
  );
});
    socket.on("queue-removed", ({ id }) => {
      setQueue((prev) => prev.filter((entry) => entry._id !== id));
    });

    socket.on("chat-message", ({ tableId, message,senderId }) => {
      setChatMessages((prev) => ({
        ...prev,
        [tableId]: [...(prev[tableId] || []), { message,senderId }],
      }));
      setChatNotifications((prev) => {
        if (!chatToggles[tableId]) {
          return { ...prev, [tableId]: true };
        }
        return prev;
      });
    });

    socket.on("average-wait-time", (ms) => setAverageWait(ms));

    return () => {
      socket.off("connect", handleConnect);
      socket.off("connect_error");
      socket.off("init-tables");
      socket.off("init-queue");
      socket.off("table-updated");
      socket.off("queue-added");
      socket.off("queue-updated");
      socket.off("queue-removed");
      socket.off("chat-message");
      socket.off("average-wait-time");
    };
  }, [socket, chatToggles]);

  useEffect(() => {
  if (shouldPlaySound) {
    audio.loop = true;
    audio.play().catch((err) => {
      console.warn("Audio play failed:", err);
    });

    const stopSound = () => {
      audio.pause();
      audio.currentTime = 0;
      setShouldPlaySound(false);
    };

    const interactionEvents = ["click", "touchstart", "keydown"];
    interactionEvents.forEach((event) =>
      window.addEventListener(event, stopSound)
    );

    return () => {
      interactionEvents.forEach((event) =>
        window.removeEventListener(event, stopSound)
      );
    };
  }
}, [shouldPlaySound]);

  if (sessionExpired) {
      return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white text-lg font-semibold">
      ⚠️ Session expired. Please log in again.
      </div>
      );
      }


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

  const sendChatMessage = (tableId, message) => {
    if (!message || !socket) return;
    socket.emit("send-chat-message", { tableId, message });
    setChatDrafts((prev) => {
      const updated = { ...prev };
      delete updated[tableId];
      return updated;
    });
  };

  const markSendUp = (id) => socket.emit("mark-sent", { id });
  const markDone = (id) => socket.emit("mark-done", { id });

  const confirmResetTables = () => {
    socket.emit("reset-availability");
    setLoadingTables(true);
    setShowResetModal(false);
  };

  const formatDuration = (ms) => {
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="relative min-h-screen font-caveat text-black overflow-hidden fire-gradient">
      <Navbar />

      {/* Reset Button */}
      {activeTab === "availability" && (
        <div className="absolute right-4 top-24 md:top-32 z-10">
          <button
            onClick={() => setShowResetModal(true)}
            className="bg-red-600 text-white px-4 py-2 rounded-full hover:bg-red-700 transition backdrop-blur shadow"
          >
            Reset to Default
          </button>
        </div>
      )}

      {/* Reset Modal */}
      <AnimatePresence>
        {showResetModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center backdrop-blur"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-white text-black p-6 rounded-xl max-w-sm w-full text-center shadow-xl"
            >
              <h2 className="text-xl font-semibold mb-4">Reset Table Availability?</h2>
              <p className="mb-6 text-sm text-gray-700">
                This will overwrite the current availability with default values.
              </p>
              <div className="flex justify-center gap-4">
                <button
                  onClick={confirmResetTables}
                  className="bg-red-600 text-white px-4 py-2 rounded-full hover:bg-red-700 transition"
                >
                  Yes, Reset
                </button>
                <button
                  onClick={() => setShowResetModal(false)}
                  className="bg-gray-300 px-4 py-2 rounded-full hover:bg-gray-400 transition"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tab Switcher */}
      <div className="pt-32 max-w-4xl mx-auto px-4 relative font-caveat">
  <div className="flex justify-center mb-8 space-x-4 ">
    {["availability", "queue"].map((tab) => (
      <button
        key={tab}
        onClick={() => setActiveTab(tab)}
        className={`px-6 py-2 rounded-full transition border  ${
          activeTab === tab
            ? "bg-orange-600 border-black backdrop-blur-lg text-white"
            : "bg-red/10 border-black backdrop-blur-sm text-black/80"
        }`}
      >
        {tab === "availability" ? "Table Availability" : "Waiting Queue"}
      </button>
    ))}
  </div>

  {activeTab === "queue" && (
    <div className="bg-black/30 shadow-lg rounded-lg mb-6 text-center text-black/90">
      Average Wait Time Today: {formatDuration(averageWait)}
    </div>
  )}

  {activeTab === "availability" && (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {loadingTables
        ? Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="bg-black/30 animate-pulse p-4 rounded-lg backdrop-blur-md"
            >
              <div className="flex flex-col items-center space-y-2" >
                <div className="h-5 bg-white/30 rounded w-1/2 "></div>
                <div className="h-12 bg-white/20 rounded w-3/4"></div>
              </div>
              
              <div className="flex space-x-4  justify-center">
                <div className="h-8 w-8 bg-white/30 rounded-full "></div>
                <div className="h-8 w-8 bg-white/30 rounded-full"></div>
              </div>
            </div>
          ))
        : tableSizes.map((size) => (
            <div
              key={size}
              className="relative bg-black/30 shadow-lg rounded-lg p-4 text-center backdrop-blur-lg"
            >
              <h2 className="mb-2 text-lg">Table for {size}</h2>
              <p className="text-4xl mb-4">{tables[size] ?? 0}</p>
              <div className="flex justify-center space-x-4">
                <button
                  onClick={() => updateTable(size, 1)}
                  className="bg-green-600/80 text-black px-3 py-1 rounded-full hover:bg-green-600/100 transition "
                >
                  +
                </button>
                <button
                  onClick={() => updateTable(size, -1)}
                  className="bg-red-500/80 text-black px-3 py-1 rounded-full hover:bg-red-500/100 transition"
                  disabled={(tables[size] || 0) === 0}
                >
                  -
                </button>
              </div>
            </div>
          ))}
    </div>
  )}




        {/* Waiting Queue */}
        {activeTab === "queue" && (
          <>
                    <div className="flex flex-col sm:flex-row justify-center items-stretch sm:items-center gap-3 sm:gap-4 mb-6 w-full px-4 sm:px-0">
          <input
            type="number"
            min="1"
            placeholder="Enter table size"
            value={newQueueSize}
            onChange={(e) => setNewQueueSize(e.target.value)}
            className="flex-1 sm:w-64 bg-black/40 text-white placeholder-white/70 border border-white/30 backdrop-blur-md px-4 py-2 rounded-full focus:outline-none text-base sm:text-lg"
          />
          <button
            onClick={addToQueue}
            className="w-full sm:w-auto bg-blue-600/60 text-black px-4 py-2 rounded-full hover:bg-blue-700/80 backdrop-blur-md transition text-base sm:text-lg"
          >
            Add to Queue
          </button>
        </div>


            <div className="space-y-6">
  {queue.map((entry) => (
          <div
        key={entry._id}
        className={`p-4 rounded-lg backdrop-blur-md transition-all duration-500 ease-in-out ${
          entry.status === "sent"
            ? "bg-orange-700/70"
            : "bg-black/30"
        } ${recentlyAddedId === entry._id ? "ring-4 ring-yellow-400 " : ""}`}
      >
     <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-4">
  <span className="font-medium text-black text-lg md:text-xl flex items-center gap-2">
    Waiting for table of
    <span className="bg-white/80 text-black px-3 py-1 rounded-lg shadow-sm text-base md:text-lg">
      {entry.tableSize}
    </span>
  </span>

  <div className="flex flex-wrap justify-start sm:justify-end gap-2 mt-1 sm:mt-0">
    <button
      onClick={() =>
        setChatToggles((prev) => {
          const show = !prev[entry._id];
          if (show) {
            setChatNotifications((n) => ({
              ...n,
              [entry._id]: false,
            }));
          }
          return { ...prev, [entry._id]: show };
        })
      }
      className="relative min-w-[80px] bg-green-400/60 text-black px-3 py-1 rounded-full hover:bg-green-500/80 text-sm md:text-base"
    >
      {chatToggles[entry._id] ? "Hide Chat" : "Show Chat"}
      
      {chatNotifications[entry._id] && !chatToggles[entry._id] && (
        <span className="absolute top-0 left-0 w-2.5 h-2.5 bg-orange-500 rounded-full border border-white animate-ping"></span>
      )}
    </button>

    <button
      onClick={() => markSendUp(entry._id)}
      className="min-w-[80px] bg-yellow-400/70 text-black px-3 py-1 rounded-full hover:bg-yellow-500/80 text-sm md:text-base"
    >
      Send Up
    </button>

    <button
      onClick={() => markDone(entry._id)}
      className="min-w-[80px] bg-red-500/80 text-black px-3 py-1 rounded-full hover:bg-red-700/80 text-sm md:text-base"
    >
      Bump
    </button>
  </div>
</div>


      <p className="text-black/70 text-sm mt-1">
        Waiting time: {formatDuration( new Date().getTime() - new Date(entry.createdAt).getTime())}
      </p>

      {/* Comment */}
      {entry.status === "waiting" && !entry.comment && (
        <div className="flex items-center gap-2 mt-2 bg-blue-200/20 p-2 rounded-lg">
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
            className="flex-1 px-3 py-1 rounded-full border border-white/30 text-white bg-white/10 placeholder-white/60 backdrop-blur-sm text-sm md:text-base"
          />
          <button
            onClick={() =>
              submitComment(entry._id, commentDrafts[entry._id])
            }
            className="bg-blue-500/60 text-black px-2 md:px-3 py-1 rounded-full hover:bg-blue-600/80 text-sm md:text-base"
          >
            Save
          </button>
        </div>
      )}

      {entry.comment && (
        <div className="bg-blue-100/80 text-black text-sm italic px-3 py-2 rounded-lg mt-2 shadow-inner">
          📝 {entry.comment}
        </div>
      )}

      {/* Chat */}
      <AnimatePresence mode="wait"></AnimatePresence>
      {chatToggles[entry._id] && (
        <div className="mt-2 space-y-2 bg-green-200/20 p-2 rounded-lg">
          {/* Quick Messages */}
          <div className="flex flex-wrap gap-2 mb-2">
            {["With High chair", "High table", "With Buggy","Yes","No"].map(
              (msg, i) => (
                <button
                  key={i}
                  onClick={() => sendChatMessage(entry._id, msg)}
                  className="bg-green-300 text-black px-3 py-2 rounded-2xl rounded-bl-none max-w-[75%] text-xs sm:text-sm md:text-base"
                >
                  {msg}
                </button>
              )
            )}
          </div>

          <div className="flex">
            <input
              type="text"
              placeholder="Send a message"
              value={chatDrafts[entry._id] || ""}
              onChange={(e) =>
                setChatDrafts((prev) => ({
                  ...prev,
                  [entry._id]: e.target.value,
                }))
              }
              className="flex-1 px-3 py-1 rounded-full border text-white bg-white/10 placeholder-white/60 backdrop-blur-sm text-sm md:text-base"
            />
            <button
              onClick={() =>
                sendChatMessage(entry._id, chatDrafts[entry._id])
              }
              className="ml-2 px-3 py-1 rounded-full bg-green-500 text-black text-sm md:text-base"
            >
              Send
            </button>
          </div>

          <div className="max-h-24 overflow-y-auto text-sm space-y-2 pr-1">
            {(chatMessages[entry._id] || []).map((msg, i) => (
              <div
  key={i}
  className={`flex ${
    msg.senderId === socketId ? "justify-end" : "justify-start"
  }`}
>
  <div
    className={`px-3 py-2 rounded-2xl max-w-[75%] text-sm md:text-base ${
      msg.senderId === socketId
        ? "bg-green-400 text-black rounded-br-none"
        : "bg-blue-300 text-black rounded-bl-none"
    }`}
  >
    {msg.message}
  </div>
</div>

            ))}
          </div>
        </div>
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
