import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import DescriptionIcon from '@mui/icons-material/Description';
import SchoolIcon from '@mui/icons-material/School';
import BadgeIcon from '@mui/icons-material/Badge';
import { Permission } from '@/auth/types';

/**
 * Navigation menu item interface
 */
export interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: typeof DashboardIcon;
  permission?: Permission;
  children?: NavItem[];
}

/**
 * Navigation configuration
 * Each item can have a permission requirement for visibility
 */
export const navigationConfig: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/',
    icon: DashboardIcon,
    permission: 'view_dashboard',
  },
  {
    id: 'clients',
    label: 'Clients',
    path: '/clients',
    icon: PeopleIcon,
    permission: 'view_clients',
  },
  {
    id: 'leads',
    label: 'Leads',
    path: '/leads',
    icon: TrendingUpIcon,
  },
  {
    id: 'visa-applications',
    label: 'Visa Applications',
    path: '/visa-applications',
    icon: DescriptionIcon,
    permission: 'view_applications',
  },
  {
    id: 'institute',
    label: 'Institute',
    path: '/institute',
    icon: SchoolIcon,
    permission: 'view_institutes',
  },
  {
    id: 'agent',
    label: 'Agent',
    path: '/agent',
    icon: BadgeIcon,
    permission: 'view_agents',
  },
];

/**
 * Filter navigation items based on user permissions
 */
export const filterNavByPermissions = (
  items: NavItem[],
  hasPermission: (permission: Permission) => boolean
): NavItem[] => {
  return items
    .filter((item) => {
      // If no permission is required, show the item
      if (!item.permission) return true;
      // Check if user has required permission
      return hasPermission(item.permission);
    })
    .map((item) => {
      // Recursively filter children if they exist
      if (item.children) {
        return {
          ...item,
          children: filterNavByPermissions(item.children, hasPermission),
        };
      }
      return item;
    });
};

