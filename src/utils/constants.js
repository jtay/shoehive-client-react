/**
 * Constants used for the Shoehive client
 */

// Import constants from shoehive
import { CLIENT_COMMAND_TYPES as SHOEHIVE_COMMAND_TYPES, 
         CLIENT_MESSAGE_TYPES as SHOEHIVE_MESSAGE_TYPES } from 'shoehive';

// Re-export Shoehive command types
export const CLIENT_COMMAND_TYPES = {
  ...SHOEHIVE_COMMAND_TYPES,
  // Add any additional custom command types here
};

// Re-export Shoehive message types
export const CLIENT_MESSAGE_TYPES = {
  ...SHOEHIVE_MESSAGE_TYPES,
  // Add any additional custom message types here
};

// Error types
export const CLIENT_ERROR_TYPES = {
  CONNECTION_ERROR: 'connectionError',
  PARSE_ERROR: 'parseError',
  SOCKET_ERROR: 'socketError',
  SERVER_ERROR: 'serverError'
};

// Connection states
export const CONNECTION_STATES = {
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  RECONNECTING: 'reconnecting'
}; 