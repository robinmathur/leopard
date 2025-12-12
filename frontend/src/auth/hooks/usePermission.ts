import { useAuthStore } from '@/store/authStore';
import { Permission } from '@/auth/types';

/**
 * Custom hook for checking user permissions
 * Provides a clean API for permission checks in components
 * 
 * @example
 * ```tsx
 * const { hasPermission, hasAnyPermission } = usePermission();
 * 
 * if (hasPermission('view_contact_info')) {
 *   // Render contact information
 * }
 * 
 * if (hasAnyPermission(['edit_client', 'delete_client'])) {
 *   // Show edit/delete buttons
 * }
 * ```
 */
export const usePermission = () => {
  const { hasPermission, hasAnyPermission, hasAllPermissions, user } = useAuthStore();

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    user,
    role: user?.role,
  };
};

