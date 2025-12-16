/**
 * Content Type Utilities
 * Functions for formatting and displaying content type names
 */

/**
 * Convert content type string to friendly display name
 * Examples:
 * - "immigration.client" -> "Client"
 * - "immigration.user" -> "User"
 * - "auth.permission" -> "Permission"
 * - "auth.group" -> "Group"
 */
export const getContentTypeDisplayName = (contentType: string): string => {
  // Split by dot to get app_label and model
  const parts = contentType.split('.');
  if (parts.length !== 2) {
    return contentType;
  }

  const [, model] = parts;
  
  // Capitalize first letter and handle special cases
  const displayName = model
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return displayName;
};

/**
 * Get app label from content type
 * Example: "immigration.client" -> "immigration"
 */
export const getAppLabel = (contentType: string): string => {
  const parts = contentType.split('.');
  return parts[0] || contentType;
};

/**
 * Get model name from content type
 * Example: "immigration.client" -> "client"
 */
export const getModelName = (contentType: string): string => {
  const parts = contentType.split('.');
  return parts[1] || contentType;
};

