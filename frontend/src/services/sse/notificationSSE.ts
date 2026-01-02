/**
 * Notification SSE Client
 * Handles Server-Sent Events connection for real-time notifications
 */

import { getApiBaseUrl } from '@/config/domain.config';

export type SSEMessageType = 'notification_message' | 'connection_established' | 'heartbeat' | 'error';

export interface SSEMessage {
  type: SSEMessageType;
  notification?: unknown;
  message?: string;
  timestamp?: string;
  user_id?: number;
}

export type SSEMessageHandler = (message: SSEMessage) => void;
export type SSEErrorHandler = (error: Event) => void;
export type SSEConnectionHandler = () => void;

export interface NotificationSSEOptions {
  onMessage?: SSEMessageHandler;
  onError?: SSEErrorHandler;
  onConnect?: SSEConnectionHandler;
  onDisconnect?: SSEConnectionHandler;
  reconnectDelay?: number;
  maxReconnectAttempts?: number;
}

export class NotificationSSEClient {
  private eventSource: EventSource | null = null;
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isManualClose = false;
  private options: Required<NotificationSSEOptions>;

  constructor(options: NotificationSSEOptions = {}) {
    this.options = {
      onMessage: options.onMessage || (() => {}),
      onError: options.onError || (() => {}),
      onConnect: options.onConnect || (() => {}),
      onDisconnect: options.onDisconnect || (() => {}),
      reconnectDelay: options.reconnectDelay || 3000,
      maxReconnectAttempts: options.maxReconnectAttempts || 10,
    };
  }

  /**
   * Connect to SSE stream
   */
  connect(): void {
    if (this.eventSource && this.eventSource.readyState !== EventSource.CLOSED) {
      // Already connected or connecting
      return;
    }

    this.isManualClose = false;
    this.reconnectAttempts = 0;

    this._connect();
  }

  private _connect(): void {
    try {
      // Get token from localStorage
      const tokensStr = localStorage.getItem('auth_tokens');
      if (!tokensStr) {
        console.warn('No auth tokens found, cannot connect to SSE');
        return;
      }

      const tokens = JSON.parse(tokensStr);
      if (!tokens?.access) {
        console.warn('No access token found, cannot connect to SSE');
        return;
      }

      // Build SSE URL with token as query parameter (EventSource doesn't support headers)
      const apiBaseUrl = getApiBaseUrl();
      const sseUrl = `${apiBaseUrl}/v1/notifications/stream/?token=${tokens.access}`;

      // Create EventSource
      this.eventSource = new EventSource(sseUrl);

      // Handle connection open
      this.eventSource.onopen = () => {
        console.log('SSE connection established');
        this.reconnectAttempts = 0;
        this.options.onConnect();
      };

      // Handle messages
      this.eventSource.onmessage = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          this.options.onMessage(data as SSEMessage);
        } catch (error) {
          console.error('Error parsing SSE message:', error);
        }
      };

      // Handle errors
      this.eventSource.onerror = (error: Event) => {
        console.error('SSE connection error:', error);
        this.options.onError(error);

        // If connection is closed and not manually closed, attempt reconnect
        if (this.eventSource?.readyState === EventSource.CLOSED && !this.isManualClose) {
          this._attemptReconnect();
        }
      };
    } catch (error) {
      console.error('Error creating SSE connection:', error);
      this.options.onError(error as Event);
      this._attemptReconnect();
    }
  }

  /**
   * Attempt to reconnect with exponential backoff
   */
  private _attemptReconnect(): void {
    if (this.isManualClose) {
      return;
    }

    if (this.reconnectAttempts >= this.options.maxReconnectAttempts) {
      console.error('Max reconnect attempts reached, giving up');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.options.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(`Attempting to reconnect SSE in ${delay}ms (attempt ${this.reconnectAttempts}/${this.options.maxReconnectAttempts})`);

    this.reconnectTimer = setTimeout(() => {
      this._connect();
    }, delay);
  }

  /**
   * Disconnect from SSE stream
   */
  disconnect(): void {
    this.isManualClose = true;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
      this.options.onDisconnect();
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.eventSource?.readyState === EventSource.OPEN;
  }

  /**
   * Get connection state
   */
  getState(): number {
    return this.eventSource?.readyState ?? EventSource.CLOSED;
  }
}

