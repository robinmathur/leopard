/**
 * Agent API Service
 * API functions for agent CRUD operations
 */
import { httpClient } from './httpClient';
import type { PaginatedResponse } from '@/types/common';
import {
  Agent,
  AgentCreateRequest,
  AgentUpdateRequest,
  AgentListParams,
} from '@/types/agent';

/**
 * Agent API endpoints
 */
export const agentApi = {
  /**
   * List agents with optional filtering and pagination
   * @param params - Query parameters for filtering
   * @param signal - Optional AbortSignal to cancel the request
   */
  async list(params?: AgentListParams, signal?: AbortSignal): Promise<PaginatedResponse<Agent>> {
    const response = await httpClient.get<PaginatedResponse<Agent>>('/v1/agents/', {
      params,
      signal,
    });
    return response.data;
  },

  /**
   * Get a single agent by ID
   * @param id - Agent ID
   * @param signal - Optional AbortSignal to cancel the request
   */
  async getById(id: number, signal?: AbortSignal): Promise<Agent> {
    const response = await httpClient.get<Agent>(`/v1/agents/${id}/`, { signal });
    return response.data;
  },

  /**
   * Create a new agent
   */
  async create(data: AgentCreateRequest): Promise<Agent> {
    const response = await httpClient.post<Agent>('/v1/agents/', data);
    return response.data;
  },

  /**
   * Update an existing agent (partial update)
   */
  async update(id: number, data: AgentUpdateRequest): Promise<Agent> {
    const response = await httpClient.patch<Agent>(`/v1/agents/${id}/`, data);
    return response.data;
  },

  /**
   * Delete an agent (soft delete)
   */
  async delete(id: number): Promise<void> {
    await httpClient.delete(`/v1/agents/${id}/`);
  },

  /**
   * Restore a soft-deleted agent
   */
  async restore(id: number): Promise<Agent> {
    const response = await httpClient.post<Agent>(`/v1/agents/${id}/restore/`);
    return response.data;
  },
};

export default agentApi;
