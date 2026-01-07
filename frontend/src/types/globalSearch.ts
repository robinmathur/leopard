/**
 * Global Search Types
 * Type definitions for global search functionality
 */

import type { EntityType } from '@/utils/virtualId';

/**
 * Base search result interface
 */
export interface SearchResult {
  /** Entity type */
  type: EntityType;
  /** Entity ID */
  id: number;
  /** Display name for the entity */
  displayName: string;
  /** Route to navigate to this entity */
  route: string;
  /** Virtual ID for display (e.g., "C55") */
  virtualId: string;
  /** Additional metadata for display */
  metadata?: {
    email?: string;
    phone?: string;
    subtitle?: string;
  };
}

/**
 * Client search result
 */
export interface ClientSearchResult extends SearchResult {
  type: 'client';
  metadata: {
    email?: string;
    phone?: string;
  };
}

/**
 * Visa Application search result
 */
export interface VisaApplicationSearchResult extends SearchResult {
  type: 'visa-application';
  metadata: {
    subtitle?: string; // e.g., client name
  };
}

/**
 * College Application search result
 */
export interface CollegeApplicationSearchResult extends SearchResult {
  type: 'college-application';
  metadata: {
    subtitle?: string; // e.g., client name
  };
}

/**
 * Agent search result
 */
export interface AgentSearchResult extends SearchResult {
  type: 'agent';
  metadata: {
    email?: string;
    phone?: string;
  };
}

/**
 * Institute search result
 */
export interface InstituteSearchResult extends SearchResult {
  type: 'institute';
  metadata: {
    subtitle?: string; // e.g., short name
  };
}

/**
 * Union type of all search results
 */
export type AnySearchResult =
  | ClientSearchResult
  | VisaApplicationSearchResult
  | CollegeApplicationSearchResult
  | AgentSearchResult
  | InstituteSearchResult;

/**
 * Grouped search results by entity type
 */
export interface GroupedSearchResults {
  clients: ClientSearchResult[];
  'visa-applications': VisaApplicationSearchResult[];
  'college-applications': CollegeApplicationSearchResult[];
  agents: AgentSearchResult[];
  institutes: InstituteSearchResult[];
}

