import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import DescriptionIcon from '@mui/icons-material/Description';
import SchoolIcon from '@mui/icons-material/School';
import BadgeIcon from '@mui/icons-material/Badge';
import AssignmentIcon from '@mui/icons-material/Assignment';
import TimelineIcon from '@mui/icons-material/Timeline';
import CategoryIcon from '@mui/icons-material/Category';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import GroupIcon from '@mui/icons-material/Group';
import BusinessIcon from '@mui/icons-material/Business';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import DomainIcon from '@mui/icons-material/Domain';
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
    permission: 'view_client',
  },
  {
    id: 'leads',
    label: 'Leads',
    path: '/leads',
    icon: TrendingUpIcon,
    permission: 'view_client'
  },
  {
    id: 'visa-manager',
    label: 'Visa Manager',
    path: '/visa-manager',
    icon: DescriptionIcon,
    permission: 'view_visaapplication',
    children: [
      {
        id: 'visa-dashboard',
        label: 'Visa Dashboard',
        path: '/visa-manager/dashboard',
        icon: AssignmentIcon,
        permission: 'view_visaapplication',
      },
      {
        id: 'visa-tracker',
        label: 'Visa Tracker',
        path: '/visa-manager/tracker',
        icon: TimelineIcon,
        permission: 'view_visaapplication',
      },
      {
        id: 'visa-applications',
        label: 'Visa Applications',
        path: '/visa-manager/applications',
        icon: DescriptionIcon,
        permission: 'view_visaapplication',
      },
      {
        id: 'visa-types',
        label: 'Visa Type',
        path: '/visa-manager/types',
        icon: CategoryIcon,
        permission: 'view_visaapplication',
      },
    ],
  },
  {
    id: 'application-manager',
    label: 'Application Manager',
    path: '/application-manager',
    icon: SchoolIcon,
    permission: 'view_collegeapplication',
    children: [
      {
        id: 'application-dashboard',
        label: 'Application Dashboard',
        path: '/application-manager/dashboard',
        icon: AssignmentIcon,
        permission: 'view_collegeapplication',
      },
      {
        id: 'application-tracker',
        label: 'Application Tracker',
        path: '/application-manager/tracker',
        icon: TimelineIcon,
        permission: 'view_collegeapplication',
      },
      {
        id: 'application-types',
        label: 'Application Type',
        path: '/application-manager/types',
        icon: CategoryIcon,
        permission: 'view_applicationtype',
      },
    ],
  },
  {
    id: 'institute',
    label: 'Institute',
    path: '/institute',
    icon: SchoolIcon,
    permission: 'view_institute'
  },
  {
    id: 'agent',
    label: 'Agent',
    path: '/agent',
    icon: BadgeIcon,
    permission: 'view_agent',
  },
  {
    id: 'region-branch-management',
    label: 'Org Management',
    path: '/org-management',
    icon: DomainIcon,
    permission: 'view_region',
    children: [
      {
        id: 'regions',
        label: 'Regions',
        path: '/org-management/regions',
        icon: LocationOnIcon,
        permission: 'view_region',
      },
      {
        id: 'branches',
        label: 'Branches',
        path: '/org-management/branches',
        icon: BusinessIcon,
        permission: 'view_branch',
      },
    ],
  },
  {
    id: 'user-management',
    label: 'User Management',
    path: '/user-management',
    icon: AdminPanelSettingsIcon,
    permission: 'view_user',
    children: [
      {
        id: 'users',
        label: 'Users',
        path: '/user-management/users',
        icon: PeopleIcon,
        permission: 'view_user',
      },
      {
        id: 'groups',
        label: 'Groups',
        path: '/user-management/groups',
        icon: GroupIcon,
        permission: 'view_group',
      },
    ],
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

