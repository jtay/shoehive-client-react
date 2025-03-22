import React, { useEffect, useRef, useState, useCallback } from 'react';
import ShoehiveContext from './ShoehiveContext';
import ShoehiveClient from './ShoehiveClient';

/**
 * Provider component for Shoehive client
 */
export const ShoehiveProvider = ({ 
  children, 
  serverUrl, 
  autoConnect = true,
  authStrategy = null,
  maxReconnectAttempts = 5,
  reconnectDelay = 1000
}) => {
  const clientRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [playerState, setPlayerState] = useState(null);
  const [lobbyState, setLobbyState] = useState(null);
  const [tableState, setTableState] = useState(null);

  // Initialize the client
  useEffect(() => {
    if (!clientRef.current) {
      clientRef.current = new ShoehiveClient(serverUrl, {
        autoConnect,
        authStrategy,
        maxReconnectAttempts,
        reconnectDelay
      });
      
      // Set up state change handlers
      clientRef.current.onConnectionChange = setIsConnected;
      clientRef.current.onPlayerStateChange = setPlayerState;
      clientRef.current.onLobbyStateChange = setLobbyState;
      clientRef.current.onTableStateChange = setTableState;
      
      clientRef.current.connect();
    }
    
    // Cleanup
    return () => {
      if (clientRef.current) {
        clientRef.current.disconnect();
      }
    };
  }, [serverUrl, autoConnect, authStrategy, maxReconnectAttempts, reconnectDelay]);

  // Provide the client and state
  const value = {
    client: clientRef.current,
    isConnected,
    playerState,
    lobbyState,
    tableState,
    connect: useCallback(() => clientRef.current?.connect(), []),
    disconnect: useCallback(() => clientRef.current?.disconnect(), []),
    sendCommand: useCallback((action, data) => clientRef.current?.sendCommand(action, data), []),
    on: useCallback((event, callback) => clientRef.current?.on(event, callback), []),
    // Convenience methods
    getLobbyState: useCallback(() => clientRef.current?.getLobbyState(), []),
    getPlayerState: useCallback(() => clientRef.current?.getPlayerState(), []),
    getTableState: useCallback(() => clientRef.current?.getTableState(), []),
    createTable: useCallback((gameId, options) => clientRef.current?.createTable(gameId, options), []),
    joinTable: useCallback((tableId) => clientRef.current?.joinTable(tableId), []),
    leaveTable: useCallback(() => clientRef.current?.leaveTable(), []),
    sitAtSeat: useCallback((seatIndex) => clientRef.current?.sitAtSeat(seatIndex), []),
    standFromSeat: useCallback(() => clientRef.current?.standFromSeat(), []),
    sendGameCommand: useCallback((action, data) => clientRef.current?.sendGameCommand(action, data), []),
  };

  return (
    <ShoehiveContext.Provider value={value}>
      {children}
    </ShoehiveContext.Provider>
  );
};

export default ShoehiveProvider; 