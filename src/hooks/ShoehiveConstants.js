/**
 * Re-exports constants from the Shoehive library
 * This provides a single point of access for all Shoehive constants
 */

// Import constants from the Shoehive library
import { CommandTypes, MessageTypes, ErrorTypes } from 'shoehive';

// Re-export them for use in our client
export const CLIENT_COMMAND_TYPES = CommandTypes;
export const CLIENT_MESSAGE_TYPES = MessageTypes;
export const CLIENT_ERROR_TYPES = ErrorTypes;

// Export any additional client-specific constants if needed
export const CONNECTION_STATES = {
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  RECONNECTING: 'reconnecting'
}; 