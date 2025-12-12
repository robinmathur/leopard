/**
 * Client API Service
 * API functions for client CRUD operations
 */
import { httpClient } from './httpClient';
import {
  Client,
  ClientCreateRequest,
  ClientUpdateRequest,
  ClientListParams,
  PaginatedResponse,
  StageCounts,
  NEXT_STAGE,
} from '@/types/client';

/**
 * Client API endpoints
 */
export const clientApi = {
  /**
   * List clients with optional filtering and pagination
   * @param params - Query parameters for filtering
   * @param signal - Optional AbortSignal to cancel the request
   */
  async list(params?: ClientListParams, signal?: AbortSignal): Promise<PaginatedResponse<Client>> {
    const response = await httpClient.get<PaginatedResponse<Client>>('/v1/clients/', {
      params,
      signal,
    });
    return response.data;
  },

  /**
   * Get a single client by ID
   */
  async getById(id: number): Promise<Client> {
    const response = await httpClient.get<Client>(`/v1/clients/${id}/`);
    return response.data;
  },

  /**
   * Create a new client
   */
  async create(data: ClientCreateRequest): Promise<Client> {
    const response = await httpClient.post<Client>('/v1/clients/', data);
    return response.data;
  },

  /**
   * Update an existing client (partial update)
   */
  async update(id: number, data: ClientUpdateRequest): Promise<Client> {
    const response = await httpClient.patch<Client>(`/v1/clients/${id}/`, data);
    return response.data;
  },

  /**
   * Delete a client (soft delete)
   */
  async delete(id: number): Promise<void> {
    await httpClient.delete(`/v1/clients/${id}/`);
  },

  /**
   * Move client to the next stage in workflow
   * LE -> FU -> CT -> CL
   */
  async moveToNextStage(id: number, currentStage: Client['stage']): Promise<Client> {
    const nextStage = NEXT_STAGE[currentStage];
    if (!nextStage) {
      throw new Error('Client is already in the final stage');
    }
    return this.update(id, { stage: nextStage });
  },

  /**
   * Get counts of clients by stage
   * Returns counts for LEAD, FOLLOW_UP, CLIENT, CLOSE, and TOTAL
   */
  async getStageCounts(): Promise<StageCounts> {
    const response = await httpClient.get<StageCounts>('/v1/clients/stage-counts/');
    return response.data;
  },
};

export default clientApi;
