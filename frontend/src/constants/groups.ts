/**
 * Group Constants
 * Common group options for reuse across components
 */

export interface GroupOption {
  value: string;
  label: string;
}

/**
 * Group options matching backend constants
 * @deprecated Use groups fetched from backend API instead
 * This is kept for backward compatibility only
 */
export const GROUP_OPTIONS: GroupOption[] = [
  { value: 'SUPER_ADMIN', label: 'Super Admin' },
  { value: 'REGION_MANAGER', label: 'Region Manager' },
  { value: 'BRANCH_ADMIN', label: 'Branch Admin' },
  { value: 'CONSULTANT', label: 'Consultant' },
];

/**
 * Get group label by value
 */
export const getGroupLabel = (value: string): string => {
  const option = GROUP_OPTIONS.find((opt) => opt.value === value);
  return option?.label || value;
};

