// frontend/src/context/SocketContext.jsx
import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

// Create the context
const SocketContext = createContext();

// Custom hook so any component can easily access the socket
export const useSocket = () => {
  return useContext(SocketContext);
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Connect to your Node.js backend
    // IMPORTANT: Make sure this matches your backend port (usually 5000)
    const newSocket = io('http://localhost:5000', {
      transports: ['polling', 'websocket'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    newSocket.on('connect', () => {
      console.log('✅ Socket.io connected:', newSocket.id);
    });

    newSocket.on('disconnect', () => {
      console.log('❌ Socket.io disconnected');
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ Socket.io connection error:', error);
    });
    
    setSocket(newSocket);

    // Clean up the connection when the user leaves the app
    return () => newSocket.close();
  }, []);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};