import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ShoehiveContext from './ShoehiveContext';
import ShoehiveClient from '../client/ShoehiveClient';
import { CONNECTION_STATES } from '../utils/constants';
// Import constants from shoehive
import { CLIENT_MESSAGE_TYPES, PLAYER_EVENTS, EVENTS } from 'shoehive';

/**
 * Provider component for Shoehive client
 */
const ShoehiveProvider = ({
  children,
  serverUrl,
  autoConnect = true,
  authStrategy = null,
  maxReconnectAttempts = 5,
  reconnectDelay = 1000
}) => {
  const [client, setClient] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState(CONNECTION_STATES.DISCONNECTED);
  const [playerState, setPlayerState] = useState(null);
  const [lobbyState, setLobbyState] = useState(null);
  const [tableState, setTableState] = useState(null);

  // Initialize client
  useEffect(() => {
    const newClient = new ShoehiveClient(serverUrl, {
      autoReconnect: true,
      maxReconnectAttempts,
      reconnectDelay,
      authStrategy
    });
    
    setClient(newClient);
    
    return () => {
      newClient.disconnect();
    };
  }, [serverUrl, maxReconnectAttempts, reconnectDelay, authStrategy]);

  // Set up event listeners when client is created
  useEffect(() => {
    if (!client) return;
    
    // Connection events
    const connectedHandler = () => {
      setIsConnected(true);
      setConnectionState(CONNECTION_STATES.CONNECTED);
    };
    
    const disconnectedHandler = () => {
      setIsConnected(false);
      setConnectionState(CONNECTION_STATES.DISCONNECTED);
    };
    
    // State update events
    const playerStateHandler = (state) => {
      setPlayerState(state);
    };
    
    const lobbyStateHandler = (state) => {
      setLobbyState(state);
    };
    
    const tableStateHandler = (state) => {
      setTableState(state);
    };
    
    // Register handlers using constants
    client.on(EVENTS.CONNECTED, connectedHandler);
    client.on(EVENTS.DISCONNECTED, disconnectedHandler);
    client.on(CLIENT_MESSAGE_TYPES.PLAYER_STATE, playerStateHandler);
    client.on(CLIENT_MESSAGE_TYPES.LOBBY_STATE, lobbyStateHandler);
    client.on(CLIENT_MESSAGE_TYPES.TABLE_STATE, tableStateHandler);
    
    // Auto connect if enabled
    if (autoConnect) {
      setConnectionState(CONNECTION_STATES.CONNECTING);
      client.connect();
    }
    
    // Cleanup
    return () => {
      client.on(EVENTS.CONNECTED, connectedHandler);
      client.on(EVENTS.DISCONNECTED, disconnectedHandler);
      client.on(CLIENT_MESSAGE_TYPES.PLAYER_STATE, playerStateHandler);
      client.on(CLIENT_MESSAGE_TYPES.LOBBY_STATE, lobbyStateHandler);
      client.on(CLIENT_MESSAGE_TYPES.TABLE_STATE, tableStateHandler);
    };
  }, [client, autoConnect]);

  // Method to connect manually
  const connect = useCallback(() => {
    if (!client) return false;
    setConnectionState(CONNECTION_STATES.CONNECTING);
    return client.connect();
  }, [client]);
  
  // Method to disconnect manually
  const disconnect = useCallback(() => {
    if (!client) return;
    client.disconnect();
  }, [client]);
  
  // Method to send commands
  const sendCommand = useCallback((action, data = {}) => {
    if (!client) return false;
    return client.sendCommand(action, data);
  }, [client]);
  
  // Method to listen for events
  const on = useCallback((event, callback) => {
    if (!client) return () => {};
    return client.on(event, callback);
  }, [client]);
  
  // Player methods
  const getPlayerState = useCallback(() => {
    if (!client) return false;
    return client.getPlayerState();
  }, [client]);
  
  // Lobby methods
  const getLobbyState = useCallback(() => {
    if (!client) return false;
    return client.getLobbyState();
  }, [client]);
  
  const createTable = useCallback((gameId, options = {}) => {
    if (!client) return false;
    return client.createTable(gameId, options);
  }, [client]);
  
  const joinTable = useCallback((tableId) => {
    if (!client) return false;
    return client.joinTable(tableId);
  }, [client]);
  
  // Table methods
  const getTableState = useCallback(() => {
    if (!client) return false;
    return client.getTableState();
  }, [client]);
  
  const leaveTable = useCallback(() => {
    if (!client) return false;
    return client.leaveTable();
  }, [client]);
  
  const sitAtSeat = useCallback((seatIndex) => {
    if (!client) return false;
    return client.sitAtSeat(seatIndex);
  }, [client]);
  
  const standFromSeat = useCallback(() => {
    if (!client) return false;
    return client.standFromSeat();
  }, [client]);
  
  // Game methods
  const sendGameCommand = useCallback((action, data = {}) => {
    if (!client) return false;
    return client.sendGameCommand(action, data);
  }, [client]);
  
  // Create context value
  const contextValue = useMemo(() => ({
    // Client instance
    client,
    
    // Connection state
    isConnected,
    connectionState,
    
    // Game state
    playerState,
    lobbyState,
    tableState,
    
    // Methods
    connect,
    disconnect,
    sendCommand,
    on,
    
    // Player methods
    getPlayerState,
    
    // Lobby methods
    getLobbyState,
    createTable,
    joinTable,
    
    // Table methods
    getTableState,
    leaveTable,
    sitAtSeat,
    standFromSeat,
    
    // Game methods
    sendGameCommand
  }), [
    client, isConnected, connectionState, 
    playerState, lobbyState, tableState,
    connect, disconnect, sendCommand, on,
    getPlayerState, getLobbyState, createTable, joinTable,
    getTableState, leaveTable, sitAtSeat, standFromSeat,
    sendGameCommand
  ]);
  
  return (
    <ShoehiveContext.Provider value={contextValue}>
      {children}
    </ShoehiveContext.Provider>
  );
};

export default ShoehiveProvider; 