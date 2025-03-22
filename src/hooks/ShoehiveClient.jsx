import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';

// Create a context for the Shoehive client
const ShoehiveContext = createContext(null);

/**
 * Core Shoehive client class that handles WebSocket communication with a Shoehive server
 */
class ShoehiveClient {
  constructor(serverUrl, options = {}) {
    this.serverUrl = serverUrl;
    this.socket = null;
    this.connected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = options.maxReconnectAttempts || 5;
    this.reconnectDelay = options.reconnectDelay || 1000;
    this.autoReconnect = options.autoReconnect !== false;
    
    // Authentication options
    this.authStrategy = options.authStrategy || null;
    
    // State containers
    this.playerState = null;
    this.lobbyState = null;
    this.tableState = null;
    
    // Event handlers storage
    this.eventHandlers = {};
    
    // State update callbacks (used by React components)
    this.onPlayerStateChange = null;
    this.onLobbyStateChange = null;
    this.onTableStateChange = null;
    this.onConnectionChange = null;
  }

  /**
   * Connect to the Shoehive server
   */
  connect() {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      console.log('WebSocket connection already exists');
      return;
    }

    console.log(`Connecting to Shoehive server at ${this.serverUrl}`);
    
    // Apply authentication if a strategy is provided
    let url = this.serverUrl;
    let protocols = undefined;
    
    if (this.authStrategy) {
      const authDetails = this.authStrategy();
      
      // If auth strategy returns a modified URL (e.g., with query params)
      if (authDetails.url) {
        url = authDetails.url;
      }
      
      // If auth strategy provides WebSocket protocols
      if (authDetails.protocols) {
        protocols = authDetails.protocols;
      }
      
      // Create WebSocket with or without protocols
      this.socket = protocols 
        ? new WebSocket(url, protocols) 
        : new WebSocket(url);
      
      // Apply headers or other connection properties if provided
      if (authDetails.headers && this.socket.setRequestHeader) {
        Object.entries(authDetails.headers).forEach(([key, value]) => {
          this.socket.setRequestHeader(key, value);
        });
      }
    } else {
      // Create WebSocket without auth
      this.socket = new WebSocket(url);
    }

    this.socket.addEventListener('open', () => {
      console.log('Connected to Shoehive server');
      this.connected = true;
      this.reconnectAttempts = 0;
      this.triggerEvent('connected');
      
      if (this.onConnectionChange) {
        this.onConnectionChange(true);
      }
    });

    this.socket.addEventListener('message', (event) => {
      try {
        const message = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    });

    this.socket.addEventListener('close', (event) => {
      console.log(`Disconnected from Shoehive server: ${event.code} ${event.reason}`);
      this.connected = false;
      this.triggerEvent('disconnected', event);
      
      if (this.onConnectionChange) {
        this.onConnectionChange(false);
      }
      
      // Handle reconnection
      if (this.autoReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1);
        console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        
        setTimeout(() => this.connect(), delay);
      }
    });

    this.socket.addEventListener('error', (error) => {
      console.error('WebSocket error:', error);
      this.triggerEvent('error', error);
    });
  }

  /**
   * Disconnect from the server
   */
  disconnect() {
    if (this.socket) {
      this.autoReconnect = false;
      this.socket.close();
    }
  }

  /**
   * Send a command to the server
   * @param {string} action - The command action
   * @param {object} data - Additional data for the command
   * @returns {boolean} - Whether the command was sent
   */
  sendCommand(action, data = {}) {
    if (!this.connected) {
      console.error('Cannot send command: Not connected to server');
      return false;
    }

    const command = {
      action,
      ...data
    };

    try {
      this.socket.send(JSON.stringify(command));
      return true;
    } catch (error) {
      console.error('Error sending command:', error);
      return false;
    }
  }

  /**
   * Handle incoming messages from the server
   * @param {object} message - The parsed message object
   */
  handleMessage(message) {
    console.log('Received message:', message);

    switch (message.type) {
      case 'player:state':
        this.playerState = message;
        this.triggerEvent('playerState', message);
        if (this.onPlayerStateChange) {
          this.onPlayerStateChange(message);
        }
        break;
        
      case 'lobby:state':
        this.lobbyState = message;
        this.triggerEvent('lobbyState', message);
        if (this.onLobbyStateChange) {
          this.onLobbyStateChange(message);
        }
        break;
        
      case 'table:state':
        this.tableState = message;
        this.triggerEvent('tableState', message);
        if (this.onTableStateChange) {
          this.onTableStateChange(message);
        }
        break;
        
      case 'error':
        console.error('Server error:', message.message);
        this.triggerEvent('serverError', message);
        break;
        
      default:
        this.triggerEvent(message.type, message);
    }
  }

  /**
   * Register an event handler
   * @param {string} event - The event to listen for
   * @param {function} callback - The callback function
   */
  on(event, callback) {
    if (!this.eventHandlers[event]) {
      this.eventHandlers[event] = [];
    }
    this.eventHandlers[event].push(callback);
    
    // Return a function to remove the event listener
    return () => {
      this.eventHandlers[event] = this.eventHandlers[event].filter(cb => cb !== callback);
    };
  }

  /**
   * Trigger event callbacks
   * @param {string} event - The event to trigger
   * @param {*} data - The event data
   */
  triggerEvent(event, data) {
    if (this.eventHandlers[event]) {
      this.eventHandlers[event].forEach(callback => callback(data));
    }
  }

  // ----- Convenience methods for common commands -----

  // Player commands
  getPlayerState() {
    return this.sendCommand('player:state:get');
  }

  // Lobby commands
  getLobbyState() {
    return this.sendCommand('lobby:state:get');
  }

  createTable(gameId, options = {}) {
    return this.sendCommand('lobby:table:create', { gameId, options });
  }

  joinTable(tableId) {
    return this.sendCommand('lobby:table:join', { tableId });
  }

  // Table commands
  getTableState() {
    return this.sendCommand('table:state:get');
  }

  leaveTable() {
    return this.sendCommand('table:leave');
  }

  sitAtSeat(seatIndex) {
    return this.sendCommand('table:seat:sit', { seatIndex });
  }

  standFromSeat() {
    return this.sendCommand('table:seat:stand');
  }

  // Game-specific commands can be added as needed
  sendGameCommand(action, data = {}) {
    return this.sendCommand(action, data);
  }
}

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

/**
 * Hook to use Shoehive client in React components
 */
export const useShoehive = () => {
  const context = useContext(ShoehiveContext);
  if (!context) {
    throw new Error('useShoehive must be used within a ShoehiveProvider');
  }
  return context;
};

export default ShoehiveClient;
