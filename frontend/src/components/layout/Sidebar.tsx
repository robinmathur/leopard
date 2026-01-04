import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  Box,
  Typography,
  Divider,
  Menu,
  MenuItem,
} from '@mui/material';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { usePermission } from '@/auth/hooks/usePermission';
import { navigationConfig, filterNavByPermissions, NavItem } from './navigation.config';

const DRAWER_WIDTH = 240;
const DRAWER_WIDTH_COLLAPSED = 60;

interface SidebarProps {
  open: boolean;
}

export const Sidebar = ({ open }: SidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { hasPermission } = usePermission();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [submenuAnchor, setSubmenuAnchor] = useState<{
    element: HTMLElement;
    item: NavItem;
  } | null>(null);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Filter navigation items based on user permissions
  const filteredNav = filterNavByPermissions(navigationConfig, hasPermission);

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  const handleToggleExpand = (itemId: string) => {
    setExpandedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    // Clear any pending close timeout
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setSubmenuAnchor(null); // Close submenu when navigating
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const handleSubmenuOpen = (event: React.MouseEvent<HTMLElement>, item: NavItem) => {
    // Cancel any pending close
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }

    if (!open && item.children && item.children.length > 0) {
      // Immediately update submenu when hovering over a new item
      setSubmenuAnchor({ element: event.currentTarget, item });
    } else if (!open && (!item.children || item.children.length === 0)) {
      // Close submenu when hovering over items without children
      scheduleSubmenuClose();
    }
  };

  const scheduleSubmenuClose = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
    }
    closeTimeoutRef.current = setTimeout(() => {
      setSubmenuAnchor(null);
    }, 150); // 150ms delay
  };

  const handleSubmenuClose = () => {
    scheduleSubmenuClose();
  };

  const cancelSubmenuClose = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  };

  const renderNavItem = (item: NavItem, depth = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.has(item.id);
    const active = isActive(item.path);

    return (
      <Box key={item.id}>
        <ListItemButton
          selected={active}
          onClick={() => {
            if (hasChildren) {
              if (open) {
                handleToggleExpand(item.id);
              }
              // In collapsed state, menu opens on hover, not click
            } else {
              handleNavigate(item.path);
            }
          }}
          onMouseEnter={(e) => handleSubmenuOpen(e, item)}
          onMouseLeave={() => {
            // Don't close immediately, let menu handle its own hover state
          }}
          sx={{
            pl: 2 + depth * 2,
            py: 0.5,
            mx: 1,
            borderRadius: 1,
          }}
        >
          <ListItemIcon sx={{ minWidth: open ? 36 : 'auto', mr: open ? 0 : 'auto' }}>
            <item.icon sx={{ fontSize: '1.125rem' }} />
          </ListItemIcon>
          {open && (
            <>
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{
                  fontSize: '0.8125rem',
                  fontWeight: active ? 600 : 500,
                }}
              />
              {hasChildren && (
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  {isExpanded ? (
                    <ExpandLessIcon fontSize="small" />
                  ) : (
                    <ExpandMoreIcon fontSize="small" />
                  )}
                </Box>
              )}
            </>
          )}
        </ListItemButton>

        {/* Render children */}
        {hasChildren && open && (
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {item.children!.map((child) => renderNavItem(child, depth + 1))}
            </List>
          </Collapse>
        )}
      </Box>
    );
  };

  return (
    <Drawer
      variant="permanent"
      open={open}
      sx={{
        width: open ? DRAWER_WIDTH : DRAWER_WIDTH_COLLAPSED,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: open ? DRAWER_WIDTH : DRAWER_WIDTH_COLLAPSED,
          boxSizing: 'border-box',
          transition: (theme) =>
            theme.transitions.create('width', {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
          overflowX: 'hidden',
          mt: '48px', // Height of AppBar
        },
      }}
    >
      {/* Logo/Brand */}
      {open && (
        <Box sx={{ p: 2, pb: 1 }}>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              fontSize: '1rem',
              color: 'primary.main',
            }}
          >
            Immigration CRM
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Multi-Tenant Platform
          </Typography>
        </Box>
      )}

      <Divider />

      {/* Navigation */}
      <List
        sx={{ pt: 1 }}
        onMouseLeave={() => {
          // Schedule close when mouse leaves the navigation area
          if (!open) {
            scheduleSubmenuClose();
          }
        }}
      >
        {filteredNav.map((item) => renderNavItem(item))}
      </List>

      {/* Submenu popover for collapsed state */}
      <Menu
        anchorEl={submenuAnchor?.element}
        open={Boolean(submenuAnchor)}
        onClose={handleSubmenuClose}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        sx={{
          ml: 1,
          pointerEvents: 'none', // Don't block mouse events to items below
          '& .MuiPaper-root': {
            minWidth: 180,
            pointerEvents: 'auto', // Re-enable pointer events on the menu itself
          },
        }}
        MenuListProps={{
          sx: { py: 0.5 },
          onMouseEnter: cancelSubmenuClose, // Cancel close when entering menu
          onMouseLeave: scheduleSubmenuClose, // Schedule close when leaving menu
        }}
        slotProps={{
          paper: {
            sx: {
              ml: 1, // Additional offset to create space
            },
          },
        }}
      >
        {submenuAnchor?.item.children?.map((child) => {
          const childActive = isActive(child.path);
          return (
            <MenuItem
              key={child.id}
              onClick={() => handleNavigate(child.path)}
              selected={childActive}
              sx={{
                fontSize: '0.8125rem',
                py: 0.75,
                px: 2,
              }}
            >
              <ListItemIcon sx={{ minWidth: 32 }}>
                <child.icon sx={{ fontSize: '1rem' }} />
              </ListItemIcon>
              <ListItemText
                primary={child.label}
                primaryTypographyProps={{
                  fontSize: '0.8125rem',
                  fontWeight: childActive ? 600 : 500,
                }}
              />
            </MenuItem>
          );
        })}
      </Menu>
    </Drawer>
  );
};

