/**
 * Core client class for communication with Shoehive game servers
 */
import { CLIENT_MESSAGE_TYPES, CLIENT_COMMAND_TYPES } from 'shoehive';

class ShoehiveClient {
  constructor(serverUrl, options = {}) {
    this.serverUrl = serverUrl;
    this.socket = null;
    this.connected = false;
    this.playerState = null;
    this.lobbyState = null;
    this.tableState = null;
    this.eventHandlers = {};
    
    // Connection options
    this.autoReconnect = options.autoReconnect !== false;
    this.maxReconnectAttempts = options.maxReconnectAttempts || 5;
    this.reconnectDelay = options.reconnectDelay || 1000;
    this.reconnectAttempts = 0;
    this.authStrategy = options.authStrategy || null;
  }

  // Connect to the server
  connect() {
    if (this.socket && (this.socket.readyState === WebSocket.CONNECTING || this.socket.readyState === WebSocket.OPEN)) {
      console.warn('Socket connection already exists');
      return false;
    }

    try {
      // Apply auth strategy if provided
      if (this.authStrategy) {
        const authConfig = this.authStrategy();
        if (authConfig.url) {
          this.socket = new WebSocket(authConfig.url, authConfig.protocols);
        } else {
          this.socket = new WebSocket(this.serverUrl, authConfig.protocols);
        }
      } else {
        this.socket = new WebSocket(this.serverUrl);
      }

      this.setupSocketListeners();
      return true;
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.triggerEvent('error', {
        type: 'connectionError',
        message: 'Failed to create WebSocket connection',
        error
      });
      return false;
    }
  }

  // Set up socket event listeners
  setupSocketListeners() {
    this.socket.addEventListener('open', () => {
      console.log('Connected to Shoehive server');
      this.connected = true;
      this.reconnectAttempts = 0;
      this.triggerEvent('connected');
    });

    this.socket.addEventListener('message', (event) => {
      try {
        const message = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (error) {
        console.error('Error parsing message:', error);
        this.triggerEvent('error', {
          type: 'parseError',
          message: 'Failed to parse server message',
          error
        });
      }
    });

    this.socket.addEventListener('close', (event) => {
      console.log('Disconnected from Shoehive server', event.code, event.reason);
      this.connected = false;
      this.triggerEvent('disconnected', {
        code: event.code,
        reason: event.reason
      });

      // Attempt reconnection if enabled
      if (this.autoReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1);
        console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms...`);
        
        setTimeout(() => this.connect(), delay);
      }
    });

    this.socket.addEventListener('error', (error) => {
      console.error('WebSocket error:', error);
      this.triggerEvent('error', {
        type: 'socketError',
        message: 'WebSocket connection error',
        error
      });
    });
  }

  // Disconnect from the server
  disconnect() {
    if (this.socket) {
      this.autoReconnect = false; // Disable reconnection on manual disconnect
      this.socket.close();
      this.socket = null;
    }
  }

  // Send a command to the server
  sendCommand(action, data = {}) {
    if (!this.connected) {
      console.error('Cannot send command: Not connected to server');
      return false;
    }

    try {
      const command = {
        action,
        ...data
      };

      this.socket.send(JSON.stringify(command));
      return true;
    } catch (error) {
      console.error('Error sending command:', error);
      return false;
    }
  }

  // Send a game-specific command
  sendGameCommand(action, data = {}) {
    return this.sendCommand(action, data);
  }

  // Handle incoming messages
  handleMessage(message) {
    // Store state based on message type
    switch (message.type) {
      case CLIENT_MESSAGE_TYPES.PLAYER_STATE:
        this.playerState = message;
        break;
        
      case CLIENT_MESSAGE_TYPES.LOBBY_STATE:
        this.lobbyState = message;
        break;
        
      case CLIENT_MESSAGE_TYPES.TABLE_STATE:
        this.tableState = message;
        break;
    }

    // Trigger event for this message type
    this.triggerEvent(message.type, message);
    
    // Also trigger a generic 'message' event
    this.triggerEvent('message', message);
  }

  // Event handling
  on(event, callback) {
    if (!this.eventHandlers[event]) {
      this.eventHandlers[event] = [];
    }
    this.eventHandlers[event].push(callback);
    
    // Return a function to remove this listener
    return () => {
      if (this.eventHandlers[event]) {
        this.eventHandlers[event] = this.eventHandlers[event].filter(cb => cb !== callback);
      }
    };
  }

  // Trigger events
  triggerEvent(event, data) {
    if (this.eventHandlers[event]) {
      this.eventHandlers[event].forEach(callback => callback(data));
    }
  }

  // Convenience methods for common commands

  // Player commands
  getPlayerState() {
    return this.sendCommand(CLIENT_COMMAND_TYPES.PLAYER_STATE_GET);
  }

  // Lobby commands
  getLobbyState() {
    return this.sendCommand(CLIENT_COMMAND_TYPES.LOBBY_STATE_GET);
  }

  createTable(gameId, options = {}) {
    return this.sendCommand(CLIENT_COMMAND_TYPES.TABLE_CREATE, { gameId, options });
  }

  joinTable(tableId) {
    return this.sendCommand(CLIENT_COMMAND_TYPES.TABLE_JOIN, { tableId });
  }

  // Table commands
  getTableState() {
    return this.sendCommand(CLIENT_COMMAND_TYPES.TABLE_STATE_GET);
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
}

export default ShoehiveClient; 