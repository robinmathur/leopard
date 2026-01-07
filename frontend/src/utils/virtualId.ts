/**
 * Virtual ID Utility Functions
 * 
 * Virtual IDs are frontend-only identifiers that use prefixes to distinguish
 * entity types. Format: prefix<id> (no hyphen)
 * 
 * Examples:
 * - C55 = Client with ID 55
 * - V123 = Visa Application with ID 123
 * - A456 = College Application with ID 456
 * - AG789 = Agent with ID 789
 * - I321 = Institute with ID 321
 */

export type EntityType = 'client' | 'visa-application' | 'college-application' | 'agent' | 'institute';

export interface ParsedVirtualId {
  type: EntityType;
  id: number;
}

/**
 * Virtual ID prefix mappings
 */
const PREFIX_MAP: Record<string, EntityType> = {
  C: 'client',
  V: 'visa-application',
  A: 'college-application',
  AG: 'agent',
  I: 'institute',
};

/**
 * Reverse mapping: entity type to prefix
 */
const TYPE_TO_PREFIX: Record<EntityType, string> = {
  'client': 'C',
  'visa-application': 'V',
  'college-application': 'A',
  'agent': 'AG',
  'institute': 'I',
};

/**
 * Format a virtual ID from entity type and numeric ID
 * @param type - Entity type
 * @param id - Numeric ID
 * @returns Virtual ID string (e.g., "C55", "V123")
 */
export function formatVirtualId(type: EntityType, id: number): string {
  const prefix = TYPE_TO_PREFIX[type];
  if (!prefix) {
    throw new Error(`Unknown entity type: ${type}`);
  }
  return `${prefix}${id}`;
}

/**
 * Parse a virtual ID string into entity type and numeric ID
 * @param virtualId - Virtual ID string (e.g., "C55", "V123")
 * @returns Parsed virtual ID with type and id, or null if invalid
 */
export function parseVirtualId(virtualId: string): ParsedVirtualId | null {
  if (!virtualId || typeof virtualId !== 'string') {
    return null;
  }

  // Trim whitespace and convert to uppercase for matching
  const trimmed = virtualId.trim().toUpperCase();

  // Try to match prefixes in order of length (longest first to match "AG" before "A")
  const prefixes = ['AG', 'C', 'V', 'A', 'I'];
  
  for (const prefix of prefixes) {
    if (trimmed.startsWith(prefix)) {
      const idStr = trimmed.slice(prefix.length);
      const id = parseInt(idStr, 10);
      
      // Check if the remaining part is a valid number
      if (!isNaN(id) && id > 0 && idStr === id.toString()) {
        const type = PREFIX_MAP[prefix];
        if (type) {
          return { type, id };
        }
      }
    }
  }

  return null;
}

/**
 * Check if a string is a valid virtual ID format
 * @param str - String to check
 * @returns True if the string matches a virtual ID pattern
 */
export function isValidVirtualId(str: string): boolean {
  return parseVirtualId(str) !== null;
}

/**
 * Extract numeric ID from virtual ID string
 * @param virtualId - Virtual ID string
 * @returns Numeric ID or null if invalid
 */
export function extractIdFromVirtualId(virtualId: string): number | null {
  const parsed = parseVirtualId(virtualId);
  return parsed ? parsed.id : null;
}

/**
 * Get entity type from virtual ID string
 * @param virtualId - Virtual ID string
 * @returns Entity type or null if invalid
 */
export function getEntityTypeFromVirtualId(virtualId: string): EntityType | null {
  const parsed = parseVirtualId(virtualId);
  return parsed ? parsed.type : null;
}

