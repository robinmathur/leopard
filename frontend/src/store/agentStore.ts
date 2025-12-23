/**
 * Agent Store
 * Zustand store for agent state management
 */
import { create } from 'zustand';
import { agentApi } from '@/services/api/agentApi';
import {
  Agent,
  AgentCreateRequest,
  AgentUpdateRequest,
  AgentListParams,
} from '@/types/agent';
import { ApiError } from '@/services/api/httpClient';

// Module-level AbortController to track and cancel in-flight fetchAgents requests
let fetchAgentsAbortController: AbortController | null = null;
// Module-level AbortController for fetchAgentById
let fetchAgentByIdAbortController: AbortController | null = null;

interface Pagination {
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface AgentStore {
  // State
  agents: Agent[];
  selectedAgent: Agent | null;
  loading: boolean;
  error: ApiError | null;
  pagination: Pagination;

  // Actions
  fetchAgents: (params?: AgentListParams) => Promise<void>;
  fetchAgentById: (id: number) => Promise<Agent | null>;
  addAgent: (data: AgentCreateRequest) => Promise<Agent | null>;
  updateAgent: (id: number, data: AgentUpdateRequest) => Promise<Agent | null>;
  deleteAgent: (id: number) => Promise<boolean>;
  restoreAgent: (id: number) => Promise<Agent | null>;
  setSelectedAgent: (agent: Agent | null) => void;
  clearError: () => void;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  cancelFetchAgents: () => void;
  cancelFetchAgentById: () => void;
}

export const useAgentStore = create<AgentStore>((set, get) => ({
  // Initial state
  agents: [],
  selectedAgent: null,
  loading: false,
  error: null,
  pagination: {
    count: 0,
    page: 1,
    pageSize: 25,
    totalPages: 0,
  },

  /**
   * Fetch agents with pagination and filtering
   * Automatically cancels any in-flight request to prevent race conditions
   */
  fetchAgents: async (params?: AgentListParams) => {
    // Abort any in-flight request to prevent race conditions
    fetchAgentsAbortController?.abort();
    fetchAgentsAbortController = new AbortController();
    const signal = fetchAgentsAbortController.signal;

    set({ loading: true, error: null });

    try {
      const { pagination } = get();
      const response = await agentApi.list(
        {
          page: params?.page ?? pagination.page,
          page_size: params?.page_size ?? pagination.pageSize,
          ...params,
        },
        signal
      );

      set({
        agents: response.results,
        pagination: {
          count: response.count,
          page: params?.page ?? pagination.page,
          pageSize: params?.page_size ?? pagination.pageSize,
          totalPages: Math.ceil(
            response.count / (params?.page_size ?? pagination.pageSize)
          ),
        },
        loading: false,
      });
    } catch (error) {
      // Ignore abort errors - request was intentionally cancelled
      if ((error as Error).name === 'CanceledError' || signal.aborted) {
        return;
      }

      const apiError = error as ApiError;
      set({
        error: apiError,
        loading: false,
      });
    }
  },

  /**
   * Fetch a single agent by ID
   * Automatically cancels any in-flight request to prevent race conditions
   */
  fetchAgentById: async (id: number) => {
    // Abort any in-flight request to prevent race conditions
    fetchAgentByIdAbortController?.abort();
    fetchAgentByIdAbortController = new AbortController();
    const signal = fetchAgentByIdAbortController.signal;

    set({ loading: true, error: null });

    try {
      const agent = await agentApi.getById(id, signal);
      set({
        selectedAgent: agent,
        loading: false,
      });
      return agent;
    } catch (error) {
      // Ignore abort errors - request was intentionally cancelled
      if ((error as Error).name === 'CanceledError' || signal.aborted) {
        return null;
      }
      const apiError = error as ApiError;
      set({
        error: apiError,
        loading: false,
        selectedAgent: null,
      });
      return null;
    }
  },

  /**
   * Create a new agent
   */
  addAgent: async (data: AgentCreateRequest) => {
    set({ loading: true, error: null });

    try {
      const agent = await agentApi.create(data);
      const { agents, pagination } = get();
      set({
        agents: [agent, ...agents],
        pagination: {
          ...pagination,
          count: pagination.count + 1,
        },
        loading: false,
      });
      return agent;
    } catch (error) {
      const apiError = error as ApiError;
      set({
        error: apiError,
        loading: false,
      });
      return null;
    }
  },

  /**
   * Update an existing agent
   */
  updateAgent: async (id: number, data: AgentUpdateRequest) => {
    set({ loading: true, error: null });

    try {
      const updatedAgent = await agentApi.update(id, data);
      const { agents, selectedAgent } = get();

      // Update in list
      const updatedAgents = agents.map((agent) =>
        agent.id === id ? updatedAgent : agent
      );

      // Update selected if it's the same agent
      const updatedSelected =
        selectedAgent?.id === id ? updatedAgent : selectedAgent;

      set({
        agents: updatedAgents,
        selectedAgent: updatedSelected,
        loading: false,
      });
      return updatedAgent;
    } catch (error) {
      const apiError = error as ApiError;
      set({
        error: apiError,
        loading: false,
      });
      return null;
    }
  },

  /**
   * Delete an agent (soft delete)
   */
  deleteAgent: async (id: number) => {
    set({ loading: true, error: null });

    try {
      await agentApi.delete(id);
      const { agents, selectedAgent } = get();

      // Remove from list
      const filteredAgents = agents.filter((agent) => agent.id !== id);

      // Clear selected if it's the deleted agent
      const updatedSelected =
        selectedAgent?.id === id ? null : selectedAgent;

      set({
        agents: filteredAgents,
        selectedAgent: updatedSelected,
        pagination: {
          ...get().pagination,
          count: get().pagination.count - 1,
        },
        loading: false,
      });
      return true;
    } catch (error) {
      const apiError = error as ApiError;
      set({
        error: apiError,
        loading: false,
      });
      return false;
    }
  },

  /**
   * Restore a soft-deleted agent
   */
  restoreAgent: async (id: number) => {
    set({ loading: true, error: null });

    try {
      const agent = await agentApi.restore(id);
      const { agents, pagination } = get();
      set({
        agents: [agent, ...agents],
        pagination: {
          ...pagination,
          count: pagination.count + 1,
        },
        loading: false,
      });
      return agent;
    } catch (error) {
      const apiError = error as ApiError;
      set({
        error: apiError,
        loading: false,
      });
      return null;
    }
  },

  /**
   * Set the currently selected agent
   */
  setSelectedAgent: (agent: Agent | null) => {
    set({ selectedAgent: agent });
  },

  /**
   * Clear the current error
   */
  clearError: () => {
    set({ error: null });
  },

  /**
   * Set the current page
   */
  setPage: (page: number) => {
    set((state) => ({
      pagination: {
        ...state.pagination,
        page,
      },
    }));
    get().fetchAgents({ page });
  },

  /**
   * Set the page size
   */
  setPageSize: (pageSize: number) => {
    set((state) => ({
      pagination: {
        ...state.pagination,
        pageSize,
        page: 1, // Reset to first page when changing page size
      },
    }));
    get().fetchAgents({ page: 1, page_size: pageSize });
  },

  /**
   * Cancel any in-flight fetchAgents request
   */
  cancelFetchAgents: () => {
    fetchAgentsAbortController?.abort();
    fetchAgentsAbortController = null;
  },

  /**
   * Cancel any in-flight fetchAgentById request
   */
  cancelFetchAgentById: () => {
    fetchAgentByIdAbortController?.abort();
    fetchAgentByIdAbortController = null;
  },
}));
