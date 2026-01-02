import { useState } from 'react';
import { useLocation, Link as RouterLink } from 'react-router-dom';
import {
  AppBar as MuiAppBar,
  Toolbar,
  IconButton,
  Typography,
  InputBase,
  Avatar,
  Box,
  Breadcrumbs,
  Link,
  Menu,
  MenuItem,
  Divider,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { alpha } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import SearchIcon from '@mui/icons-material/Search';
import TaskIcon from '@mui/icons-material/Task';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import LogoutIcon from '@mui/icons-material/Logout';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import HomeIcon from '@mui/icons-material/Home';
import PeopleIcon from '@mui/icons-material/People';
import SchoolIcon from '@mui/icons-material/School';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import WarningIcon from '@mui/icons-material/Warning';
import { useAuthStore } from '@/store/authStore';
import { navigationConfig, NavItem } from './navigation.config';
import { CalendarDialog } from '@/components/calendar/CalendarDialog';
import { NotificationTypeDropdown } from '@/components/notifications/NotificationTypeDropdown';

/**
 * Breadcrumb item interface
 */
interface BreadcrumbItem {
  label: string;
  path: string;
  isLast: boolean;
}

const Search = styled('div')(({ theme }) => ({
  position: 'relative',
  borderRadius: theme.shape.borderRadius,
  backgroundColor: alpha(theme.palette.common.white, 0.15),
  '&:hover': {
    backgroundColor: alpha(theme.palette.common.white, 0.25),
  },
  marginRight: theme.spacing(2),
  marginLeft: 0,
  width: '100%',
  [theme.breakpoints.up('sm')]: {
    marginLeft: theme.spacing(3),
    width: 'auto',
  },
}));

const SearchIconWrapper = styled('div')(({ theme }) => ({
  padding: theme.spacing(0, 1),
  height: '100%',
  position: 'absolute',
  pointerEvents: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}));

const StyledInputBase = styled(InputBase)(({ theme }) => ({
  color: 'inherit',
  fontSize: '0.8125rem',
  '& .MuiInputBase-input': {
    padding: theme.spacing(0.75, 0.75, 0.75, 0),
    paddingLeft: `calc(1em + ${theme.spacing(3)})`,
    transition: theme.transitions.create('width'),
    width: '100%',
    [theme.breakpoints.up('md')]: {
      width: '30ch',
    },
  },
}));

interface AppBarProps {
  open: boolean;
  onMenuClick: () => void;
}

/**
 * Find navigation item by path
 */
const findNavItem = (path: string, items: NavItem[]): NavItem | null => {
  for (const item of items) {
    if (item.path === path) return item;
    if (item.children) {
      const found = findNavItem(path, item.children);
      if (found) return found;
    }
  }
  return null;
};

/**
 * Find parent navigation item
 */
const findParentNavItem = (path: string, items: NavItem[]): NavItem | null => {
  for (const item of items) {
    if (item.children) {
      for (const child of item.children) {
        if (child.path === path) return item;
      }
    }
  }
  return null;
};

/**
 * Generate breadcrumbs based on current path
 */
const generateBreadcrumbs = (pathname: string): BreadcrumbItem[] => {
  const breadcrumbs: BreadcrumbItem[] = [];

  // Handle root/dashboard
  if (pathname === '/') {
    return [{ label: 'Dashboard', path: '/', isLast: true }];
  }

  // Check if it's a detail page (e.g., /clients/123)
  const pathParts = pathname.split('/').filter(Boolean);
  const isDetailPage = pathParts.length >= 2 && !isNaN(Number(pathParts[pathParts.length - 1]));

  // Get the base path for matching
  let basePath = pathname;
  let detailId: string | null = null;

  if (isDetailPage) {
    detailId = pathParts[pathParts.length - 1];
    basePath = '/' + pathParts.slice(0, -1).join('/');
  }

  // Find the matching nav item
  const navItem = findNavItem(basePath, navigationConfig);
  const parentItem = findParentNavItem(basePath, navigationConfig);

  if (parentItem) {
    // Has parent (e.g., Clients > Add Client)
    breadcrumbs.push({ label: parentItem.label, path: parentItem.path, isLast: false });
    if (navItem) {
      breadcrumbs.push({ label: navItem.label, path: navItem.path, isLast: !isDetailPage });
    }
  } else if (navItem) {
    // Top-level item
    breadcrumbs.push({ label: navItem.label, path: navItem.path, isLast: !isDetailPage });
  } else {
    // Fallback for unknown paths - try to generate from path segments
    let currentPath = '';
    pathParts.forEach((part, index) => {
      if (!isNaN(Number(part))) {
        // It's an ID, skip for path building but add as detail
        return;
      }
      currentPath += '/' + part;
      const label = part.charAt(0).toUpperCase() + part.slice(1).replace(/-/g, ' ');
      breadcrumbs.push({
        label,
        path: currentPath,
        isLast: index === pathParts.length - 1 && !isDetailPage,
      });
    });
  }

  // Add detail page indicator
  if (isDetailPage && detailId) {
    breadcrumbs.push({ label: `#${detailId}`, path: pathname, isLast: true });
  }

  return breadcrumbs;
};

export const AppBar = ({ onMenuClick }: AppBarProps) => {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [calendarDialogOpen, setCalendarDialogOpen] = useState(false);
  const isMenuOpen = Boolean(anchorEl);

  // Generate breadcrumbs based on current path
  const breadcrumbs = generateBreadcrumbs(location.pathname);

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleMenuClose();
    logout();
  };

  return (
    <>
      <MuiAppBar
        position="fixed"
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          backgroundColor: 'background.paper',
          color: 'text.primary',
        }}
      >
        <Toolbar variant="dense" sx={{ minHeight: '48px', gap: 2 }}>
          {/* Menu button */}
          <IconButton
            color="inherit"
            aria-label="toggle drawer"
            onClick={onMenuClick}
            edge="start"
            size="small"
          >
            <MenuIcon />
          </IconButton>

          {/* Breadcrumbs */}
          <Box sx={{ flexGrow: 0, display: { xs: 'none', sm: 'block' } }}>
            <Breadcrumbs
              separator={<NavigateNextIcon fontSize="small" />}
              aria-label="breadcrumb"
              sx={{ fontSize: '0.8125rem' }}
            >
              {/* Home link - always shown */}
              <Link
                component={RouterLink}
                to="/"
                underline="hover"
                color="inherit"
                sx={{
                  fontSize: '0.8125rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                }}
              >
                <HomeIcon sx={{ fontSize: '1rem' }} />
                Home
              </Link>
              {/* Dynamic breadcrumb items */}
              {breadcrumbs.map((crumb, index) => (
                crumb.isLast ? (
                  <Typography
                    key={index}
                    sx={{ fontSize: '0.8125rem' }}
                    color="text.primary"
                  >
                    {crumb.label}
                  </Typography>
                ) : (
                  <Link
                    key={index}
                    component={RouterLink}
                    to={crumb.path}
                    underline="hover"
                    color="inherit"
                    sx={{ fontSize: '0.8125rem' }}
                  >
                    {crumb.label}
                  </Link>
                )
              ))}
            </Breadcrumbs>
          </Box>

          {/* Global Search */}
          <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center' }}>
            <Search>
              <SearchIconWrapper>
                <SearchIcon fontSize="small" />
              </SearchIconWrapper>
              <StyledInputBase
                placeholder="Search clients, applications..."
                inputProps={{ 'aria-label': 'search' }}
              />
            </Search>
          </Box>

          {/* Right side actions */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            {/* Client Assignment Notifications */}
            <NotificationTypeDropdown
              notificationType="CLIENT_ASSIGNED"
              icon={<PeopleIcon fontSize="small" />}
              label="Clients"
            />

            {/* Application Assignment Notifications */}
            <NotificationTypeDropdown
              notificationType="APPLICATION_ASSIGNED"
              icon={<SchoolIcon fontSize="small" />}
              label="Applications"
            />

            {/* Visa Application Assignment Notifications */}
            <NotificationTypeDropdown
              notificationType="VISA_APPLICATION_ASSIGNED"
              icon={<FlightTakeoffIcon fontSize="small" />}
              label="Visa Applications"
            />

            {/* Task Notifications */}
            <NotificationTypeDropdown
              notificationType="TASKS"
              icon={<TaskIcon fontSize="small" />}
              label="Tasks"
            />

            {/* Reminders */}
            <NotificationTypeDropdown
              notificationType="REMINDERS"
              icon={<NotificationsActiveIcon fontSize="small" />}
              label="Reminders"
            />

            {/* System Alerts */}
            <NotificationTypeDropdown
              notificationType="SYSTEM"
              icon={<WarningIcon fontSize="small" />}
              label="System"
            />

            {/* Calendar */}
            <IconButton
              size="small"
              color="inherit"
              onClick={() => setCalendarDialogOpen(true)}
              title="Calendar"
            >
              <CalendarTodayIcon fontSize="small" />
            </IconButton>

            {/* Profile */}
            <IconButton
              size="small"
              edge="end"
              aria-label="account of current user"
              aria-controls="profile-menu"
              aria-haspopup="true"
              onClick={handleProfileMenuOpen}
              color="inherit"
            >
              <Avatar
                sx={{
                  width: 28,
                  height: 28,
                  bgcolor: 'primary.main',
                  fontSize: '0.75rem',
                }}
              >
                {user?.firstName.charAt(0)}
                {user?.lastName.charAt(0)}
              </Avatar>
            </IconButton>
          </Box>
        </Toolbar>
      </MuiAppBar>

      {/* Profile Menu */}
      <Menu
        anchorEl={anchorEl}
        id="profile-menu"
        open={isMenuOpen}
        onClose={handleMenuClose}
        onClick={handleMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        slotProps={{
          paper: {
            elevation: 3,
            sx: {
              mt: 1,
              minWidth: 200,
            },
          },
        }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="body2" fontWeight={600}>
            {user?.firstName} {user?.lastName}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {user?.email}
          </Typography>
          <Typography
            variant="caption"
            color="primary"
            sx={{
              display: 'block',
              mt: 0.5,
              textTransform: 'capitalize',
            }}
          >
            {user?.role.replace('_', ' ')}
          </Typography>
        </Box>
        <Divider />
        <MenuItem onClick={handleMenuClose}>
          <AccountCircleIcon fontSize="small" sx={{ mr: 1 }} />
          Profile
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleLogout}>
          <LogoutIcon fontSize="small" sx={{ mr: 1 }} />
          Logout
        </MenuItem>
      </Menu>

      {/* Calendar Dialog */}
      <CalendarDialog
        open={calendarDialogOpen}
        onClose={() => setCalendarDialogOpen(false)}
      />
    </>
  );
};

