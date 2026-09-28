import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import useAuth from "../../hooks/useAuth";
import Config from "@orion/shared/src/config";
import { useGlobalContext } from "./GlobalProvider";
import TopProgressBar from "@orion/shared/src/components/TopProgressBar";

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const [loading, setLoading] = useState(false); 
  const socketRef = useRef(null);
  const reconnectRef = useRef(null);  
  const hideLoaderTimeout = useRef(null);
  const [{ data: auth }] = useAuth();
  const regId = auth?.details?.regId;
  const { dispatch } = useGlobalContext();

  useEffect(() => {
    if (!regId) return;

    const connect = () => {
      const wsUrl = `${Config.socketUrl}?regid=${regId}`; //&accessToken=${auth.accessToken}`;
      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        // console.log("Connected as:", regId);
        setIsConnected(true);
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.payload?.subject === "KANBAN_UPDATE"){
            const tickets = JSON.parse(data.payload.messageJson);
            setLoading(true);
            clearTimeout(hideLoaderTimeout.current);
            tickets.forEach((ticketItem) => {
              handleKanbanUpdate(ticketItem);
            });
            hideLoaderTimeout.current = setTimeout(() => setLoading(false), 800);
          }else {
            setLastMessage(data);
          }

        } catch (err) {
          // console.log("Raw message:", event.data);
        }
      };

      socket.onclose = () => {
        // console.warn("Disconnected. Reconnecting in 2s...");
        setIsConnected(false);
        reconnectRef.current = setTimeout(connect, 2000);
      };

      socket.onerror = (err) => {
        console.error("WebSocket error:", err);
        socket.close();
      };
    };

    connect();

    return () => {
      clearTimeout(reconnectRef.current);
      clearTimeout(hideLoaderTimeout.current);
      socketRef.current?.close();
    };
  }, [regId]);
  
  // Helper: check if the updated ticket passes user’s filters
  const handleKanbanUpdate = (res) => {
    const { action, level, data } = res;
    
    if (!data?.ticket || !data?.ticket.orderId) return;

    // Apply only if ticket belongs to current filtered board/stage
    // const currentBoard = filterState?.boardId;
    // if (payload?.ticket?.boardId !== currentBoard) return;

    dispatch({
      type: "UPDATE_KANBAN_TICKETS",
      payload: {
        actionType: action,
        level: level,
        ...data
      },
    });

  }

  return (
    <>
    <TopProgressBar loading={loading} />
    <SocketContext.Provider value={{ socket: socketRef.current, isConnected, lastMessage }} >
      {children}
    </SocketContext.Provider>
    </>
  );
};

export const useSocket = () => useContext(SocketContext);
