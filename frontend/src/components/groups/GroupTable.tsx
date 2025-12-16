/**
 * GroupTable Component
 * Displays groups in a paginated table
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
} from '@mui/material';
import { Edit, Delete, Security } from '@mui/icons-material';
import { Protect } from '@/components/protected/Protect';
import type { Group } from '@/types/user';

interface GroupTableProps {
  groups: Group[];
  loading?: boolean;
  pagination: {
    count: number;
    page: number;
    pageSize: number;
  };
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onEdit: (group: Group) => void;
  onDelete: (group: Group) => void;
  onAssignPermissions: (group: Group) => void;
}


export const GroupTable = ({
  groups,
  loading = false,
  pagination,
  onPageChange,
  onPageSizeChange,
  onEdit,
  onDelete,
  onAssignPermissions,
}: GroupTableProps) => {
  const handleChangePage = (_event: unknown, newPage: number) => {
    onPageChange(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    onPageSizeChange(parseInt(event.target.value, 10));
  };

  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>ID</TableCell>
            <TableCell>Name</TableCell>
            <TableCell>Permissions</TableCell>
            <TableCell>Users</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                <CircularProgress size={32} />
              </TableCell>
            </TableRow>
          ) : groups.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                <Typography variant="body2" color="text.secondary">
                  No groups found
                </Typography>
              </TableCell>
            </TableRow>
          ) : (
            groups.map((group) => (
              <TableRow key={group.id} hover>
                <TableCell>{group.id}</TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight={500}>
                    {group.name}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={group.permissions_count}
                    size="small"
                    color={group.permissions_count > 0 ? 'primary' : 'default'}
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={group.users_count}
                    size="small"
                    color={group.users_count > 0 ? 'primary' : 'default'}
                  />
                </TableCell>
                <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                  <Protect permission="change_user">
                    <Tooltip title="Edit">
                      <IconButton size="small" onClick={() => onEdit(group)}>
                        <Edit fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Protect>
                  <Protect permission="change_user">
                    <Tooltip title="Assign Permissions">
                      <IconButton size="small" onClick={() => onAssignPermissions(group)} color="primary">
                        <Security fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Protect>
                  <Protect permission="delete_user">
                    <Tooltip title="Delete">
                      <IconButton size="small" onClick={() => onDelete(group)} color="error">
                        <Delete fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Protect>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      {!loading && groups.length > 0 && (
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

