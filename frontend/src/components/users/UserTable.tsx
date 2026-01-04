/**
 * UserTable Component
 * Displays users in a paginated table
 */
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  Typography,
  CircularProgress,
  IconButton,
  Tooltip,
  Link,
} from '@mui/material';
import { Security } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { Protect } from '@/components/protected/Protect';
import type { User } from '@/types/user';

interface UserTableProps {
  users: User[];
  loading?: boolean;
  pagination: {
    count: number;
    page: number;
    pageSize: number;
  };
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onAssignPermissions: (user: User) => void;
}

/**
 * Format date for display
 */
const formatDate = (dateString?: string | null): string => {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-AU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
};

export const UserTable = ({
  users,
  loading = false,
  pagination,
  onPageChange,
  onPageSizeChange,
  onAssignPermissions,
}: UserTableProps) => {
  const navigate = useNavigate();

  const handleChangePage = (_event: unknown, newPage: number) => {
    onPageChange(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    onPageSizeChange(parseInt(event.target.value, 10));
  };

  const handleViewUser = (userId: number) => {
    navigate(`/user-management/users/${userId}`, { state: { from: '/user-management/users' } });
  };

  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Username</TableCell>
            <TableCell>Full Name</TableCell>
            <TableCell>Email</TableCell>
            <TableCell>Primary Group</TableCell>
            <TableCell>Tenant</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Joined</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                <CircularProgress size={32} />
              </TableCell>
            </TableRow>
          ) : users.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                <Typography variant="body2" color="text.secondary">
                  No users found
                </Typography>
              </TableCell>
            </TableRow>
          ) : (
            users.map((user) => (
              <TableRow key={user.id} hover>
                <TableCell>
                  <Link
                    component="button"
                    variant="body2"
                    onClick={() => handleViewUser(user.id)}
                    sx={{
                      textDecoration: 'none',
                      color: 'primary.main',
                      fontWeight: 500,
                      '&:hover': { textDecoration: 'underline' },
                    }}
                  >
                    {user.username}
                  </Link>
                </TableCell>
                <TableCell>{user.full_name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  {user.primary_group ? (
                    <Chip
                      label={user.primary_group}
                      size="small"
                      color="primary"
                    />
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell>{user.tenant_name || '-'}</TableCell>
                <TableCell>
                  <Chip
                    label={user.is_active ? 'Active' : 'Inactive'}
                    size="small"
                    color={user.is_active ? 'success' : 'default'}
                  />
                </TableCell>
                <TableCell>{formatDate(user.date_joined)}</TableCell>
                <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                  <Protect permission="change_user">
                    <Tooltip title="Assign Permissions">
                      <IconButton size="small" onClick={() => onAssignPermissions(user)} color="primary">
                        <Security fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Protect>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      {!loading && users.length > 0 && (
        <TablePagination
          component="div"
          count={pagination.count}
          page={pagination.page}
          onPageChange={handleChangePage}
          rowsPerPage={pagination.pageSize}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[10, 25, 50, 100]}
        />
      )}
    </TableContainer>
  );
};

