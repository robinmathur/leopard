import { useState } from 'react';
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

  // Filter navigation items based on user permissions
  const filteredNav = filterNavByPermissions(navigationConfig, hasPermission);

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
  };

  const isActive = (path: string) => {
    return location.pathname === path;
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
              handleToggleExpand(item.id);
            } else {
              handleNavigate(item.path);
            }
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
      <List sx={{ pt: 1 }}>
        {filteredNav.map((item) => renderNavItem(item))}
      </List>
    </Drawer>
  );
};

