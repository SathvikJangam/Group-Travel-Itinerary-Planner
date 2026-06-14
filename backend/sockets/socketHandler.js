export const handleSockets = (io) => {
  io.on("connection", (socket) => {
    console.log(`🔌 User connected: ${socket.id}`);

    socket.on("join-trip", (tripId) => {
      socket.join(tripId);
      console.log(`👤 User joined trip room: ${tripId}`);
    });

    socket.on("edit-itinerary", (data) => {
      const { tripId, updatedItinerary } = data;
      
      socket.to(tripId).emit("itinerary-broadcast", updatedItinerary);
    });

    socket.on("new-expense-added", (data) => {
      const { tripId, message } = data;
      socket.to(tripId).emit("notification", { message });
    });

    socket.on("disconnect", () => {
      console.log("❌ User disconnected");
    });
  });
};