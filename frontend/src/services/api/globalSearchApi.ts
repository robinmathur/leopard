/**
 * Global Search API Service
 * 
 * Provides unified search across all entity types (Client, Visa Application,
 * College Application, Agent, Institute) with support for virtual IDs.
 */

import { clientApi } from './clientApi';
import { listVisaApplications } from './visaApplicationApi';
import { listCollegeApplications } from './collegeApplicationApi';
import { agentApi } from './agentApi';
import { instituteApi } from './instituteApi';
import { parseVirtualId, formatVirtualId, type EntityType } from '@/utils/virtualId';
import type {
  SearchResult,
  ClientSearchResult,
  VisaApplicationSearchResult,
  CollegeApplicationSearchResult,
  AgentSearchResult,
  InstituteSearchResult,
} from '@/types/globalSearch';

/**
 * Search parameters
 */
export interface GlobalSearchParams {
  /** Search query string */
  query: string;
  /** Maximum results per entity type */
  limitPerType?: number;
  /** Abort signal for cancellation */
  signal?: AbortSignal;
}

/**
 * Search results grouped by entity type
 */
export interface GlobalSearchResults {
  results: SearchResult[];
  /** True if query matched a virtual ID pattern */
  isVirtualId: boolean;
  /** Parsed virtual ID if query was a virtual ID */
  virtualId?: {
    type: EntityType;
    id: number;
    route: string;
  };
}

/**
 * Maximum results per entity type (default)
 */
const DEFAULT_LIMIT_PER_TYPE = 5;

/**
 * Perform global search across all entity types
 */
export async function globalSearch(
  params: GlobalSearchParams
): Promise<GlobalSearchResults> {
  const { query, limitPerType = DEFAULT_LIMIT_PER_TYPE, signal } = params;

  // Check if query is a virtual ID
  const parsedVirtualId = parseVirtualId(query);
  if (parsedVirtualId) {
    // Return virtual ID info for direct navigation
    const route = getRouteForEntityType(parsedVirtualId.type, parsedVirtualId.id);
    return {
      results: [],
      isVirtualId: true,
      virtualId: {
        type: parsedVirtualId.type,
        id: parsedVirtualId.id,
        route,
      },
    };
  }

  // Perform parallel searches across all entity types
  const [clients, visaApps, collegeApps, agents, institutes] = await Promise.all([
    searchClients(query, limitPerType, signal),
    searchVisaApplications(query, limitPerType, signal),
    searchCollegeApplications(query, limitPerType, signal),
    searchAgents(query, limitPerType, signal),
    searchInstitutes(query, limitPerType, signal),
  ]);

  // Combine all results
  const results: SearchResult[] = [
    ...clients,
    ...visaApps,
    ...collegeApps,
    ...agents,
    ...institutes,
  ];

  return {
    results,
    isVirtualId: false,
  };
}

/**
 * Search clients by name, email, or phone number
 */
async function searchClients(
  query: string,
  limit: number,
  signal?: AbortSignal
): Promise<ClientSearchResult[]> {
  try {
    const response = await clientApi.list(
      {
        search: query,
        page_size: limit,
      },
      signal
    );

    return response.results.map((client) => ({
      type: 'client' as const,
      id: client.id,
      displayName: `${client.first_name}${client.last_name ? ` ${client.last_name}` : ''}`.trim(),
      route: `/clients/${client.id}`,
      virtualId: formatVirtualId('client', client.id),
      metadata: {
        email: client.email,
        phone: client.phone_number,
      },
    }));
  } catch (error) {
    console.error('Error searching clients:', error);
    return [];
  }
}

/**
 * Search visa applications by client name
 */
async function searchVisaApplications(
  query: string,
  limit: number,
  signal?: AbortSignal
): Promise<VisaApplicationSearchResult[]> {
  try {
    const response = await listVisaApplications(
      {
        client_name: query,
        page_size: limit,
      },
      signal
    );

    return response.results.map((app) => ({
      type: 'visa-application' as const,
      id: app.id,
      displayName: `Visa Application #${app.id}`,
      route: `/visa-applications/${app.id}`,
      virtualId: formatVirtualId('visa-application', app.id),
      metadata: {
        subtitle: app.client_name,
      },
    }));
  } catch (error) {
    console.error('Error searching visa applications:', error);
    return [];
  }
}

/**
 * Search college applications by client name
 */
async function searchCollegeApplications(
  query: string,
  limit: number,
  signal?: AbortSignal
): Promise<CollegeApplicationSearchResult[]> {
  try {
    const response = await listCollegeApplications(
      {
        client_name: query,
        page_size: limit,
      },
      signal
    );

    return response.results.map((app) => ({
      type: 'college-application' as const,
      id: app.id,
      displayName: `College Application #${app.id}`,
      route: `/college-applications/${app.id}`,
      virtualId: formatVirtualId('college-application', app.id),
      metadata: {
        subtitle: app.client_name,
      },
    }));
  } catch (error) {
    console.error('Error searching college applications:', error);
    return [];
  }
}

/**
 * Search agents by name, email, or phone number
 */
async function searchAgents(
  query: string,
  limit: number,
  signal?: AbortSignal
): Promise<AgentSearchResult[]> {
  try {
    const response = await agentApi.list(
      {
        search: query,
        page_size: limit,
      },
      signal
    );

    return response.results.map((agent) => ({
      type: 'agent' as const,
      id: agent.id,
      displayName: agent.agent_name,
      route: `/agent/${agent.id}`,
      virtualId: formatVirtualId('agent', agent.id),
      metadata: {
        email: agent.email,
        phone: agent.phone_number,
      },
    }));
  } catch (error) {
    console.error('Error searching agents:', error);
    return [];
  }
}

/**
 * Search institutes by name or short name
 */
async function searchInstitutes(
  query: string,
  limit: number,
  signal?: AbortSignal
): Promise<InstituteSearchResult[]> {
  try {
    const response = await instituteApi.list(
      {
        search: query,
        page_size: limit,
      },
      signal
    );

    return response.results.map((institute) => ({
      type: 'institute' as const,
      id: institute.id,
      displayName: institute.name,
      route: `/institute/${institute.id}`,
      virtualId: formatVirtualId('institute', institute.id),
      metadata: {
        subtitle: institute.short_name,
      },
    }));
  } catch (error) {
    console.error('Error searching institutes:', error);
    return [];
  }
}

/**
 * Get route for entity type and ID
 */
function getRouteForEntityType(type: EntityType, id: number): string {
  switch (type) {
    case 'client':
      return `/clients/${id}`;
    case 'visa-application':
      return `/visa-applications/${id}`;
    case 'college-application':
      return `/college-applications/${id}`;
    case 'agent':
      return `/agent/${id}`;
    case 'institute':
      return `/institute/${id}`;
    default:
      throw new Error(`Unknown entity type: ${type}`);
  }
}

