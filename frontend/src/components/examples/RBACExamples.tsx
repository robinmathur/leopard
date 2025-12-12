/**
 * RBAC Examples Component
 * Demonstrates various ways to implement permission-based UI controls
 * 
 * This file is for reference only - import patterns into your own components
 */

import { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Chip,
  IconButton,
  Alert,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { Protect } from '@/components/protected/Protect';
import { usePermission } from '@/auth/hooks/usePermission';

// ============================================================================
// Example 1: Simple Field-Level Protection
// ============================================================================

export const Example1_FieldProtection = () => {
  const client = {
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+1 234 567 8900',
    revenue: '$50,000',
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6">Client Information</Typography>
        
        {/* Public info - always visible */}
        <Typography>Name: {client.name}</Typography>
        <Typography>Email: {client.email}</Typography>
        
        {/* Protected - shows as [Restricted] if no permission */}
        <Protect permission="view_contact_info" fallback="redact">
          <Typography>Phone: {client.phone}</Typography>
        </Protect>
        
        {/* Protected - completely hidden if no permission */}
        <Protect permission="view_finance">
          <Typography>Revenue: {client.revenue}</Typography>
        </Protect>
      </CardContent>
    </Card>
  );
};

// ============================================================================
// Example 2: Conditional Action Buttons
// ============================================================================

export const Example2_ActionButtons = () => {
  const { hasPermission, hasAnyPermission } = usePermission();

  return (
    <Box sx={{ display: 'flex', gap: 1 }}>
      {/* Show edit button only if user can edit */}
      <Protect permission="edit_client">
        <Button variant="contained" size="small" startIcon={<EditIcon />}>
          Edit
        </Button>
      </Protect>
      
      {/* Show delete button only if user can delete */}
      <Protect permission="delete_client">
        <Button variant="outlined" size="small" color="error" startIcon={<DeleteIcon />}>
          Delete
        </Button>
      </Protect>
      
      {/* Show if user has ANY of the permissions */}
      {hasAnyPermission(['edit_client', 'delete_client']) && (
        <Button variant="text" size="small">
          More Actions
        </Button>
      )}
    </Box>
  );
};

// ============================================================================
// Example 3: Table with Conditional Columns
// ============================================================================

export const Example3_ConditionalTable = () => {
  const { hasPermission } = usePermission();

  const clients = [
    { id: '1', name: 'John Doe', email: 'john@ex.com', phone: '+1 234 567 8900', revenue: '$50k' },
    { id: '2', name: 'Jane Smith', email: 'jane@ex.com', phone: '+1 234 567 8901', revenue: '$75k' },
  ];

  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Email</TableCell>
            
            {/* Conditional column header */}
            {hasPermission('view_contact_info') && (
              <TableCell>Phone</TableCell>
            )}
            
            {hasPermission('view_finance') && (
              <TableCell>Revenue</TableCell>
            )}
            
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {clients.map((client) => (
            <TableRow key={client.id}>
              <TableCell>{client.name}</TableCell>
              <TableCell>{client.email}</TableCell>
              
              {/* Conditional cell - hidden completely */}
              {hasPermission('view_contact_info') && (
                <TableCell>{client.phone}</TableCell>
              )}
              
              {/* Conditional cell - or use Protect for redaction */}
              {hasPermission('view_finance') && (
                <TableCell>
                  <Protect permission="view_finance" fallback="redact">
                    {client.revenue}
                  </Protect>
                </TableCell>
              )}
              
              <TableCell align="right">
                <Protect permission="edit_client">
                  <IconButton size="small">
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Protect>
                <Protect permission="delete_client">
                  <IconButton size="small" color="error">
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Protect>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

// ============================================================================
// Example 4: Form with Conditional Fields
// ============================================================================

export const Example4_ConditionalForm = () => {
  const { hasPermission } = usePermission();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    notes: '',
  });

  const canEdit = hasPermission('edit_client');

  return (
    <Box component="form">
      {/* Always visible */}
      <TextField
        fullWidth
        size="small"
        label="Name"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        disabled={!canEdit}
        sx={{ mb: 2 }}
      />

      <TextField
        fullWidth
        size="small"
        label="Email"
        type="email"
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        disabled={!canEdit}
        sx={{ mb: 2 }}
      />

      {/* Only show if user has permission */}
      <Protect permission="view_contact_info">
        <TextField
          fullWidth
          size="small"
          label="Phone"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          disabled={!canEdit}
          sx={{ mb: 2 }}
        />
      </Protect>

      {/* Show as disabled if no permission */}
      <TextField
        fullWidth
        size="small"
        label="Internal Notes"
        multiline
        rows={3}
        value={hasPermission('view_client_documents') ? formData.notes : 'Restricted'}
        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
        disabled={!hasPermission('view_client_documents')}
        sx={{ mb: 2 }}
        InputProps={{
          startAdornment: !hasPermission('view_client_documents') ? (
            <VisibilityOffIcon fontSize="small" />
          ) : null,
        }}
      />

      <Protect permission="edit_client">
        <Button type="submit" variant="contained" size="small">
          Save Changes
        </Button>
      </Protect>
    </Box>
  );
};

// ============================================================================
// Example 5: Status Badge with Permissions
// ============================================================================

export const Example5_StatusBadge = () => {
  const { hasPermission } = usePermission();
  
  const application = {
    status: 'pending_approval',
    financialStatus: 'payment_required',
  };

  return (
    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
      {/* Everyone can see basic status */}
      <Chip label="Pending Approval" size="small" color="warning" />
      
      {/* Only users with finance permission see financial status */}
      <Protect permission="view_finance">
        <Chip label="Payment Required" size="small" color="error" />
      </Protect>
      
      {/* Action button only for approvers */}
      <Protect permission="approve_payments">
        <Button size="small" variant="contained">
          Approve
        </Button>
      </Protect>
    </Box>
  );
};

// ============================================================================
// Example 6: Complex Multi-Permission Logic
// ============================================================================

export const Example6_ComplexPermissions = () => {
  const { hasPermission, hasAllPermissions, hasAnyPermission, role } = usePermission();

  return (
    <Box>
      {/* Requires ALL specified permissions */}
      <Protect permission={['view_finance', 'edit_finance']} requireAll>
        <Alert severity="info">
          You have full financial access
        </Alert>
      </Protect>

      {/* Requires ANY of the specified permissions */}
      <Protect permission={['edit_client', 'delete_client', 'create_client']}>
        <Alert severity="success">
          You can manage clients
        </Alert>
      </Protect>

      {/* Role-based check */}
      {role === 'super_admin' && (
        <Alert severity="warning">
          You are logged in as Super Admin
        </Alert>
      )}

      {/* Complex imperative logic */}
      {(hasPermission('view_finance') && hasPermission('approve_payments')) && (
        <Button variant="contained" color="success">
          Approve Payment
        </Button>
      )}
    </Box>
  );
};

// ============================================================================
// Example 7: Access Denied Message
// ============================================================================

export const Example7_AccessDenied = () => {
  const { hasPermission } = usePermission();

  if (!hasPermission('view_agents')) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">
          <Typography variant="body1" fontWeight={600}>
            Access Denied
          </Typography>
          <Typography variant="body2">
            You don't have permission to view this page. Please contact your administrator if you need access.
          </Typography>
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      {/* Protected content */}
      <Typography variant="h6">Agent Management</Typography>
    </Box>
  );
};

// ============================================================================
// Example 8: Custom Fallback Components
// ============================================================================

const LockedField = () => (
  <Box
    sx={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 0.5,
      px: 1,
      py: 0.5,
      bgcolor: 'grey.100',
      borderRadius: 1,
    }}
  >
    <VisibilityOffIcon sx={{ fontSize: '0.875rem', color: 'text.disabled' }} />
    <Typography variant="caption" color="text.disabled">
      Premium Feature
    </Typography>
  </Box>
);

export const Example8_CustomFallback = () => {
  const client = {
    phone: '+1 234 567 8900',
    revenue: '$50,000',
  };

  return (
    <Box>
      {/* Built-in redact fallback */}
      <Protect permission="view_contact_info" fallback="redact">
        <Typography>Phone: {client.phone}</Typography>
      </Protect>

      {/* Custom fallback component */}
      <Protect permission="view_finance" fallback={<LockedField />}>
        <Typography>Revenue: {client.revenue}</Typography>
      </Protect>

      {/* Disabled button as fallback */}
      <Protect 
        permission="edit_client"
        fallback={
          <Button size="small" disabled>
            Edit (No Permission)
          </Button>
        }
      >
        <Button size="small" variant="contained">
          Edit
        </Button>
      </Protect>
    </Box>
  );
};

// ============================================================================
// Usage in Your Components
// ============================================================================

/*
// Copy these patterns into your own components:

import { Protect } from '@/components/protected/Protect';
import { usePermission } from '@/auth/hooks/usePermission';

function YourComponent() {
  const { hasPermission, hasAnyPermission, hasAllPermissions, role } = usePermission();

  return (
    <Box>
      {/* Pattern 1: Declarative with Protect *\/}
      <Protect permission="your_permission">
        <YourContent />
      </Protect>

      {/* Pattern 2: Imperative with hook *\/}
      {hasPermission('your_permission') && (
        <YourContent />
      )}

      {/* Pattern 3: With fallback *\/}
      <Protect permission="your_permission" fallback="redact">
        <SensitiveData />
      </Protect>
    </Box>
  );
}
*/

