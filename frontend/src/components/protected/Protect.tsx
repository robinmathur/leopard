import { ReactNode } from 'react';
import { Box, Typography } from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { usePermission } from '@/auth/hooks/usePermission';
import { Permission } from '@/auth/types';

export interface ProtectProps {
  /** Required permission(s) to view the content */
  permission?: Permission | Permission[];
  
  /** Children to render if user has permission */
  children: ReactNode;
  
  /** Fallback to render if user lacks permission (default: hide completely) */
  fallback?: ReactNode | 'hide' | 'redact';
  
  /** If true, requires all permissions when multiple are provided */
  requireAll?: boolean;
}

/**
 * Permission Guard Component
 * Controls visibility of UI elements based on user permissions
 * 
 * @example
 * ```tsx
 * // Hide completely if no permission (default)
 * <Protect permission="view_contact_info">
 *   <ContactInfo />
 * </Protect>
 * 
 * // Show redacted state if no permission
 * <Protect permission="view_contact_info" fallback="redact">
 *   <PhoneNumber value={client.phone} />
 * </Protect>
 * 
 * // Show custom fallback
 * <Protect permission="view_finance" fallback={<div>Access denied</div>}>
 *   <FinancialData />
 * </Protect>
 * 
 * // Require any permission from list
 * <Protect permission={['edit_client', 'delete_client']}>
 *   <ActionButtons />
 * </Protect>
 * 
 * // Require all permissions
 * <Protect permission={['view_finance', 'edit_finance']} requireAll>
 *   <EditFinancialData />
 * </Protect>
 * ```
 */
export const Protect = ({
  permission,
  children,
  fallback = 'hide',
  requireAll = false,
}: ProtectProps) => {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = usePermission();

  // If no permission specified, render children (fail-open for development)
  if (!permission) {
    return <>{children}</>;
  }

  // Check permissions
  let hasAccess = false;
  
  if (Array.isArray(permission)) {
    hasAccess = requireAll
      ? hasAllPermissions(permission)
      : hasAnyPermission(permission);
  } else {
    hasAccess = hasPermission(permission);
  }

  // User has permission - render children
  if (hasAccess) {
    return <>{children}</>;
  }

  // User lacks permission - handle fallback
  if (fallback === 'hide') {
    return null;
  }

  if (fallback === 'redact') {
    return (
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.5,
          color: 'text.disabled',
          fontSize: '0.8125rem',
        }}
      >
        <LockOutlinedIcon sx={{ fontSize: '0.875rem' }} />
        <Typography
          variant="body2"
          sx={{
            color: 'text.disabled',
            fontStyle: 'italic',
          }}
        >
          [Restricted]
        </Typography>
      </Box>
    );
  }

  // Custom fallback component
  return <>{fallback}</>;
};

