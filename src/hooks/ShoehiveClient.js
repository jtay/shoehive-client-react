/**
 * Core Shoehive client class that handles WebSocket communication with a Shoehive server
 */
import { CLIENT_COMMAND_TYPES, CLIENT_MESSAGE_TYPES } from './ShoehiveConstants';

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
      case CLIENT_MESSAGE_TYPES.PLAYER_STATE:
        this.playerState = message;
        this.triggerEvent('playerState', message);
        if (this.onPlayerStateChange) {
          this.onPlayerStateChange(message);
        }
        break;
        
      case CLIENT_MESSAGE_TYPES.LOBBY_STATE:
        this.lobbyState = message;
        this.triggerEvent('lobbyState', message);
        if (this.onLobbyStateChange) {
          this.onLobbyStateChange(message);
        }
        break;
        
      case CLIENT_MESSAGE_TYPES.TABLE_STATE:
        this.tableState = message;
        this.triggerEvent('tableState', message);
        if (this.onTableStateChange) {
          this.onTableStateChange(message);
        }
        break;
        
      case CLIENT_MESSAGE_TYPES.ERROR:
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
    return this.sendCommand(CLIENT_COMMAND_TYPES.PLAYER_GET_STATE);
  }

  // Lobby commands
  getLobbyState() {
    return this.sendCommand(CLIENT_COMMAND_TYPES.LOBBY_GET_STATE);
  }

  createTable(gameId, options = {}) {
    return this.sendCommand(CLIENT_COMMAND_TYPES.LOBBY_CREATE_TABLE, { gameId, options });
  }

  joinTable(tableId) {
    return this.sendCommand(CLIENT_COMMAND_TYPES.LOBBY_JOIN_TABLE, { tableId });
  }

  // Table commands
  getTableState() {
    return this.sendCommand(CLIENT_COMMAND_TYPES.TABLE_GET_STATE);
  }

  leaveTable() {
    return this.sendCommand(CLIENT_COMMAND_TYPES.TABLE_LEAVE);
  }

  sitAtSeat(seatIndex) {
    return this.sendCommand(CLIENT_COMMAND_TYPES.TABLE_SEAT_SIT, { seatIndex });
  }

  standFromSeat() {
    return this.sendCommand(CLIENT_COMMAND_TYPES.TABLE_SEAT_STAND);
  }

  // Game-specific commands can be added as needed
  sendGameCommand(action, data = {}) {
    return this.sendCommand(CLIENT_COMMAND_TYPES.GAME_COMMAND, { 
      gameAction: action,
      ...data 
    });
  }
}

export default ShoehiveClient; 