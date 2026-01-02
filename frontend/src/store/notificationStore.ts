/**
 * Notification Store
 * Manages notification state and SSE connection using Zustand
 */

import { create } from 'zustand';
import type { Notification, NotificationType } from '@/types/notification';
import {
  listNotifications,
  getUnreadCount,
  markNotificationRead,
  bulkMarkRead,
  updateNotification,
} from '@/services/api/notificationApi';
import { NotificationSSEClient, type SSEMessage } from '@/services/sse/notificationSSE';
import type { ApiError } from '@/services/api/httpClient';

interface NotificationStore {
  // State
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: ApiError | null;
  hasMore: boolean;
  currentPage: number;
  filterType: NotificationType | 'all';
  filterRead: 'all' | 'unread' | 'read';
  sseClient: NotificationSSEClient | null;
  isSSEConnected: boolean;

  // Actions
  fetchNotifications: (page?: number, reset?: boolean) => Promise<void>;
  fetchNotificationsForBadges: () => Promise<void>; // Fetch unread notifications without filters for badge counts
  fetchUnreadCount: () => Promise<void>;
  markAsRead: (id: number) => Promise<void>;
  bulkMarkAsRead: (ids: number[]) => Promise<void>;
  updateNotificationState: (id: number, updates: { read?: boolean; is_completed?: boolean }) => Promise<void>;
  addNotification: (notification: Notification) => void;
  removeNotification: (id: number) => void;
  setFilterType: (type: NotificationType | 'all') => void;
  setFilterRead: (read: 'all' | 'unread' | 'read') => void;
  connectSSE: () => void;
  disconnectSSE: () => void;
  resetStore: () => void;
}

const initialState = {
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  isLoadingMore: false,
  error: null,
  hasMore: false,
  currentPage: 1,
  filterType: 'all' as NotificationType | 'all',
  filterRead: 'all' as 'all' | 'unread' | 'read',
  sseClient: null as NotificationSSEClient | null,
  isSSEConnected: false,
};

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  ...initialState,

  /**
   * Fetch notifications with pagination
   */
  fetchNotifications: async (page = 1, reset = false) => {
    const state = get();
    
    if (reset) {
      set({ isLoading: true, error: null, currentPage: 1 });
    } else {
      set({ isLoadingMore: true, error: null });
    }

    try {
      const params: any = {
        page,
        page_size: 20,
      };

      // Apply filters
      if (state.filterType !== 'all') {
        params.type = state.filterType;
      }

      if (state.filterRead === 'unread') {
        params.include_read = false;
      } else if (state.filterRead === 'read') {
        // For read-only, we need to fetch all and filter client-side
        // Or use a different approach if backend supports it
        params.include_read = true;
      } else {
        params.include_read = true;
      }

      const response = await listNotifications(params);

      set((prev) => {
        const newNotifications = reset ? response.results : [...prev.notifications, ...response.results];
        
        // Filter read/unread client-side if needed
        let filteredNotifications = newNotifications;
        if (state.filterRead === 'read') {
          filteredNotifications = newNotifications.filter((n) => n.read);
        } else if (state.filterRead === 'unread') {
          filteredNotifications = newNotifications.filter((n) => !n.read);
        }

        return {
          notifications: filteredNotifications,
          currentPage: page,
          hasMore: !!response.next,
          isLoading: false,
          isLoadingMore: false,
        };
      });

      // Refresh unread count
      get().fetchUnreadCount();
    } catch (error) {
      set({
        error: error as ApiError,
        isLoading: false,
        isLoadingMore: false,
      });
    }
  },

  /**
   * Fetch unread notifications for badge counts (without filters)
   */
  fetchNotificationsForBadges: async () => {
    try {
      // Fetch unread notifications without any type filters
      const response = await listNotifications({
        include_read: false,
        page_size: 100, // Get enough to calculate accurate badge counts
      });
      
      // Update notifications if store is empty or merge if needed
      set((state) => {
        if (state.notifications.length === 0) {
          return { notifications: response.results };
        }
        // Merge with existing, avoiding duplicates
        const existingIds = new Set(state.notifications.map((n) => n.id));
        const newNotifications = response.results.filter((n) => !existingIds.has(n.id));
        return { notifications: [...state.notifications, ...newNotifications] };
      });
    } catch (error) {
      console.error('Error fetching notifications for badges:', error);
    }
  },

  /**
   * Fetch unread notification count
   */
  fetchUnreadCount: async () => {
    try {
      const count = await getUnreadCount();
      set({ unreadCount: count });
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  },

  /**
   * Mark a notification as read
   */
  markAsRead: async (id: number) => {
    try {
      const updated = await markNotificationRead(id);
      set((state) => ({
        notifications: state.notifications.map((n) => (n.id === id ? updated : n)),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  },

  /**
   * Bulk mark notifications as read
   */
  bulkMarkAsRead: async (ids: number[]) => {
    try {
      const count = await bulkMarkRead(ids);
      set((state) => {
        const updatedNotifications = state.notifications.map((n) =>
          ids.includes(n.id) ? { ...n, read: true, read_at: new Date().toISOString() } : n
        );
        return {
          notifications: updatedNotifications,
          unreadCount: Math.max(0, state.unreadCount - count),
        };
      });
    } catch (error) {
      console.error('Error bulk marking notifications as read:', error);
    }
  },

  /**
   * Update notification state
   */
  updateNotificationState: async (id: number, updates: { read?: boolean; is_completed?: boolean }) => {
    try {
      const updated = await updateNotification(id, updates);
      set((state) => ({
        notifications: state.notifications.map((n) => (n.id === id ? updated : n)),
        unreadCount: updates.read === true ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
      }));
    } catch (error) {
      console.error('Error updating notification:', error);
    }
  },

  /**
   * Add a new notification (from SSE)
   */
  addNotification: (notification: Notification) => {
    set((state) => {
      // Check if notification already exists
      if (state.notifications.some((n) => n.id === notification.id)) {
        return state;
      }

      // Add to beginning of list
      const newNotifications = [notification, ...state.notifications];
      
      // Update unread count if notification is unread
      const newUnreadCount = notification.read ? state.unreadCount : state.unreadCount + 1;

      return {
        notifications: newNotifications,
        unreadCount: newUnreadCount,
      };
    });
  },

  /**
   * Remove a notification
   */
  removeNotification: (id: number) => {
    set((state) => {
      const notification = state.notifications.find((n) => n.id === id);
      const newUnreadCount = notification && !notification.read 
        ? Math.max(0, state.unreadCount - 1) 
        : state.unreadCount;

      return {
        notifications: state.notifications.filter((n) => n.id !== id),
        unreadCount: newUnreadCount,
      };
    });
  },

  /**
   * Set filter type
   */
  setFilterType: (type: NotificationType | 'all') => {
    set({ filterType: type, currentPage: 1 });
    get().fetchNotifications(1, true);
  },

  /**
   * Set filter read status
   */
  setFilterRead: (read: 'all' | 'unread' | 'read') => {
    set({ filterRead: read, currentPage: 1 });
    get().fetchNotifications(1, true);
  },

  /**
   * Connect to SSE stream
   */
  connectSSE: () => {
    const state = get();
    
    // Don't connect if already connected or connecting
    if (state.sseClient && state.isSSEConnected) {
      return;
    }

    // Fetch initial notifications for badge counts
    if (state.notifications.length === 0) {
      get().fetchNotificationsForBadges();
    }
    get().fetchUnreadCount();

    // Create SSE client
    const sseClient = new NotificationSSEClient({
      onMessage: (message: SSEMessage) => {
        if (message.type === 'notification_message' && message.notification) {
          // Add new notification
          get().addNotification(message.notification as Notification);
          // Refresh unread count
          get().fetchUnreadCount();
        } else if (message.type === 'heartbeat') {
          // Heartbeat received, connection is alive
          // Could update last heartbeat timestamp if needed
        }
      },
      onConnect: () => {
        set({ isSSEConnected: true });
      },
      onDisconnect: () => {
        set({ isSSEConnected: false });
      },
      onError: (error) => {
        console.error('SSE error:', error);
        set({ isSSEConnected: false });
      },
      reconnectDelay: 3000,
      maxReconnectAttempts: 10,
    });

    set({ sseClient });
    sseClient.connect();
  },

  /**
   * Disconnect from SSE stream
   */
  disconnectSSE: () => {
    const state = get();
    if (state.sseClient) {
      state.sseClient.disconnect();
      set({ sseClient: null, isSSEConnected: false });
    }
  },

  /**
   * Reset store to initial state
   */
  resetStore: () => {
    get().disconnectSSE();
    set(initialState);
  },
}));

