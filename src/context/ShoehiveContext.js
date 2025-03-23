import { createContext } from 'react';

/**
 * React context for Shoehive client state
 */
const ShoehiveContext = createContext({
  // Client instance
  client: null,
  
  // Connection state
  isConnected: false,
  connectionState: 'disconnected',
  
  // Game state
  playerState: null,
  lobbyState: null,
  tableState: null,
  
  // Methods
  connect: () => {},
  disconnect: () => {},
  sendCommand: () => false,
  on: () => () => {},
  
  // Player methods
  getPlayerState: () => false,
  
  // Lobby methods
  getLobbyState: () => false,
  createTable: () => false,
  joinTable: () => false,
  
  // Table methods
  getTableState: () => false,
  leaveTable: () => false,
  sitAtSeat: () => false,
  standFromSeat: () => false,
  
  // Game methods
  sendGameCommand: () => false
});

export default ShoehiveContext; 