import { io, Socket } from 'socket.io-client';

export interface TRNGStatus {
  isRunning: boolean;
  bytesGenerated: number;
  bytesAvailable: number;
  lastUpdate: string;
  quality: {
    passed: number;
    failed: number;
    total: number;
  };
  currentRate: number;
  triggerEvents: string[];
}

export interface MetricsUpdate {
  timestamp: string;
  entropy: number;
  rate: number;
  quality: number;
  triggerEvent?: string;
}

class WebSocketManager {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<(data: unknown) => void>> = new Map();
  
  connect() {
    if (this.socket?.connected) return;
    
    this.socket = io('');
    
    this.socket.on('connect', () => {
      console.log('Connected to TRNG websocket');
    });
    
    this.socket.on('disconnect', () => {
      console.log('Disconnected from TRNG websocket');
    });
    
    this.socket.on('trng-status', (data: TRNGStatus) => {
      this.emit('status', data);
    });
    
    this.socket.on('metrics-update', (data: MetricsUpdate) => {
      this.emit('metrics', data);
    });
    
    this.socket.on('trigger-event', (data: { event: string; timestamp: string }) => {
      this.emit('trigger', data);
    });
    
    this.socket.on('error', (error) => {
      console.error('WebSocket error:', error);
      this.emit('error', error);
    });
  }
  
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
  
  on(event: string, callback: (data: unknown) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }
  
  off(event: string, callback: (data: unknown) => void) {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.delete(callback);
    }
  }
  
  private emit(event: string, data: unknown) {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${event} listener:`, error);
        }
      });
    }
  }
  
  requestStatus() {
    if (this.socket?.connected) {
      this.socket.emit('get-status');
    }
  }
  
  requestMetrics(period: string = '1h') {
    if (this.socket?.connected) {
      this.socket.emit('get-metrics', { period });
    }
  }
}

export const websocketManager = new WebSocketManager();