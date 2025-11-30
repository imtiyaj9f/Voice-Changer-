export enum ConnectionState {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR',
}

export interface AudioVolumeState {
  input: number;
  output: number;
}

export interface LogEntry {
  id: string;
  timestamp: Date;
  sender: 'user' | 'model' | 'system';
  message: string;
}

export interface Game {
  id: string;
  name: string;
  icon: string; // Emoji or URL
  packageId: string; // Android Package Name (e.g., com.dts.freefireth)
  color: string;
}