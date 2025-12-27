/**
 * Client Store
 * Zustand store for client state management
 */
import { create } from 'zustand';
import { clientApi } from '@/services/api/clientApi';
import {
  Client,
  ClientCreateRequest,
  ClientUpdateRequest,
  ClientListParams,
  StageCounts,
  NEXT_STAGE,
  ClientStage,
} from '@/types/client';
import { ApiError } from '@/services/api/httpClient';

// Module-level AbortController to track and cancel in-flight fetchClients requests
let fetchClientsAbortController: AbortController | null = null;
// Module-level AbortController for fetchClientById
let fetchClientByIdAbortController: AbortController | null = null;
// Module-level AbortController for fetchStageCounts
let fetchStageCountsAbortController: AbortController | null = null;

interface Pagination {
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface ClientStore {
  // State
  clients: Client[];
  selectedClient: Client | null;
  loading: boolean;
  error: ApiError | null;
  pagination: Pagination;
  stageCounts: StageCounts | null;
  stageCountsLoading: boolean;

  // Actions
  fetchClients: (params?: ClientListParams) => Promise<void>;
  fetchClientById: (id: number) => Promise<Client | null>;
  fetchStageCounts: () => Promise<void>;
  addClient: (data: ClientCreateRequest) => Promise<Client | null>;
  updateClient: (id: number, data: ClientUpdateRequest) => Promise<Client | null>;
  deleteClient: (id: number) => Promise<boolean>;
  moveToNextStage: (id: number) => Promise<Client | null>;
  moveToStage: (id: number, targetStage: ClientStage) => Promise<Client | null>;
  setSelectedClient: (client: Client | null) => void;
  clearError: () => void;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  cancelFetchClients: () => void;
  cancelFetchClientById: () => void;
  cancelFetchStageCounts: () => void;
}

export const useClientStore = create<ClientStore>((set, get) => ({
  // Initial state
  clients: [],
  selectedClient: null,
  loading: false,
  error: null,
  pagination: {
    count: 0,
    page: 1,
    pageSize: 10,
    totalPages: 0,
  },
  stageCounts: null,
  stageCountsLoading: false,

  /**
   * Fetch clients with pagination and filtering
   * Automatically cancels any in-flight request to prevent race conditions
   */
  fetchClients: async (params?: ClientListParams) => {
    // Abort any in-flight request to prevent race conditions
    fetchClientsAbortController?.abort();
    fetchClientsAbortController = new AbortController();
    const signal = fetchClientsAbortController.signal;

    set({ loading: true, error: null });

    try {
      const { pagination } = get();
      const response = await clientApi.list({
        page: params?.page ?? pagination.page,
        page_size: params?.page_size ?? pagination.pageSize,
        ...params,
      }, signal);

      set({
        clients: response.results,
        pagination: {
          count: response.count,
          page: params?.page ?? pagination.page,
          pageSize: params?.page_size ?? pagination.pageSize,
          totalPages: Math.ceil(response.count / (params?.page_size ?? pagination.pageSize)),
        },
        loading: false,
      });
    } catch (error) {
      // Ignore abort errors - request was intentionally cancelled
      if ((error as Error).name === 'CanceledError' || signal.aborted) {
        return;
      }
      set({
        clients: [],  // Clear stale data on error
        loading: false,
        error: error as ApiError,
      });
    }
  },

  /**
   * Fetch a single client by ID
   * Automatically cancels any in-flight request to prevent race conditions
   */
  fetchClientById: async (id: number) => {
    // Abort any in-flight request to prevent race conditions
    fetchClientByIdAbortController?.abort();
    fetchClientByIdAbortController = new AbortController();
    const signal = fetchClientByIdAbortController.signal;

    set({ loading: true, error: null });

    try {
      const client = await clientApi.getById(id, signal);
      set({ selectedClient: client, loading: false });
      return client;
    } catch (error) {
      // Ignore abort errors - request was intentionally cancelled
      if ((error as Error).name === 'CanceledError' || signal.aborted) {
        return null;
      }
      set({
        loading: false,
        error: error as ApiError,
      });
      return null;
    }
  },

  /**
   * Fetch stage counts for all client stages
   * Automatically cancels any in-flight request to prevent race conditions
   */
  fetchStageCounts: async () => {
    // Abort any in-flight request to prevent race conditions
    fetchStageCountsAbortController?.abort();
    fetchStageCountsAbortController = new AbortController();
    const signal = fetchStageCountsAbortController.signal;

    set({ stageCountsLoading: true });

    try {
      const counts = await clientApi.getStageCounts(signal);
      set({ stageCounts: counts, stageCountsLoading: false });
    } catch (error) {
      // Ignore abort errors - request was intentionally cancelled
      if ((error as Error).name === 'CanceledError' || signal.aborted) {
        return;
      }
      set({
        stageCountsLoading: false,
        error: error as ApiError,
      });
    }
  },

  /**
   * Add a new client
   */
  addClient: async (data: ClientCreateRequest) => {
    set({ loading: true, error: null });

    try {
      const newClient = await clientApi.create(data);
      
      // Add to local state
      set((state) => ({
        clients: [newClient, ...state.clients],
        pagination: {
          ...state.pagination,
          count: state.pagination.count + 1,
        },
        loading: false,
      }));

      return newClient;
    } catch (error) {
      set({
        loading: false,
        error: error as ApiError,
      });
      return null;
    }
  },

  /**
   * Update an existing client
   */
  updateClient: async (id: number, data: ClientUpdateRequest) => {
    set({ loading: true, error: null });

    try {
      const updatedClient = await clientApi.update(id, data);
      
      // Update in local state
      set((state) => ({
        clients: state.clients.map((c) =>
          c.id === id ? updatedClient : c
        ),
        selectedClient:
          state.selectedClient?.id === id ? updatedClient : state.selectedClient,
        loading: false,
      }));

      return updatedClient;
    } catch (error) {
      set({
        loading: false,
        error: error as ApiError,
      });
      return null;
    }
  },

  /**
   * Delete a client (soft delete)
   */
  deleteClient: async (id: number) => {
    set({ loading: true, error: null });

    try {
      await clientApi.delete(id);
      
      // Remove from local state
      set((state) => ({
        clients: state.clients.filter((c) => c.id !== id),
        selectedClient:
          state.selectedClient?.id === id ? null : state.selectedClient,
        pagination: {
          ...state.pagination,
          count: state.pagination.count - 1,
        },
        loading: false,
      }));

      return true;
    } catch (error) {
      set({
        loading: false,
        error: error as ApiError,
      });
      return false;
    }
  },

  /**
   * Move client to next stage in workflow
   */
  moveToNextStage: async (id: number) => {
    const client = get().clients.find((c) => c.id === id);
    if (!client) {
      set({ error: { message: 'Client not found' } });
      return null;
    }

    const nextStage = NEXT_STAGE[client.stage];
    if (!nextStage) {
      set({ error: { message: 'Client is already in the final stage' } });
      return null;
    }

    return get().updateClient(id, { stage: nextStage });
  },

  /**
   * Move client to a specific stage
   */
  moveToStage: async (id: number, targetStage: ClientStage) => {
    const client = get().clients.find((c) => c.id === id);
    if (!client) {
      set({ error: { message: 'Client not found' } });
      return null;
    }

    if (client.stage === targetStage) {
      set({ error: { message: 'Client is already in this stage' } });
      return null;
    }

    return get().updateClient(id, { stage: targetStage });
  },

  /**
   * Set the currently selected client
   */
  setSelectedClient: (client: Client | null) => {
    set({ selectedClient: client });
  },

  /**
   * Clear any errors
   */
  clearError: () => {
    set({ error: null });
  },

  /**
   * Set current page for pagination
   */
  setPage: (page: number) => {
    set((state) => ({
      pagination: { ...state.pagination, page },
    }));
    get().fetchClients({ page });
  },

  /**
   * Set page size for pagination
   */
  setPageSize: (pageSize: number) => {
    set((state) => ({
      pagination: { ...state.pagination, pageSize, page: 1 },
    }));
    get().fetchClients({ page: 1, page_size: pageSize });
  },

  /**
   * Cancel any in-flight fetchClients request
   * Useful for cleanup on component unmount
   */
  cancelFetchClients: () => {
    fetchClientsAbortController?.abort();
    fetchClientsAbortController = null;
  },

  /**
   * Cancel any in-flight fetchClientById request
   * Useful for cleanup on component unmount
   */
  cancelFetchClientById: () => {
    fetchClientByIdAbortController?.abort();
    fetchClientByIdAbortController = null;
  },

  /**
   * Cancel any in-flight fetchStageCounts request
   * Useful for cleanup on component unmount
   */
  cancelFetchStageCounts: () => {
    fetchStageCountsAbortController?.abort();
    fetchStageCountsAbortController = null;
  },
}));

export default useClientStore;
