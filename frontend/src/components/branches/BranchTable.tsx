/**
 * BranchTable Component
 * Displays branches in a paginated table with all required fields
 */
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Typography,
  Box,
  Skeleton,
} from '@mui/material';
import { Branch } from '@/types/branch';

interface BranchTableProps {
  branches: Branch[];
  loading?: boolean;
  pagination: {
    count: number;
    page: number;
    pageSize: number;
  };
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onView: (branch: Branch) => void;
}

/**
 * Format date for display
 */
const formatDate = (dateString?: string): string => {
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

/**
 * Loading skeleton rows
 */
const LoadingSkeleton = () => (
  <>
    {[...Array(5)].map((_, index) => (
      <TableRow key={index}>
        <TableCell><Skeleton variant="text" width={150} /></TableCell>
        <TableCell><Skeleton variant="text" width={120} /></TableCell>
        <TableCell><Skeleton variant="text" width={100} /></TableCell>
        <TableCell><Skeleton variant="text" width={150} /></TableCell>
        <TableCell><Skeleton variant="text" width={100} /></TableCell>
        <TableCell><Skeleton variant="text" width={80} /></TableCell>
      </TableRow>
    ))}
  </>
);

export const BranchTable = ({
  branches,
  loading = false,
  pagination,
  onPageChange,
  onPageSizeChange,
  onView,
}: BranchTableProps) => {
  const handleChangePage = (_event: unknown, newPage: number) => {
    onPageChange(newPage + 1); // MUI uses 0-based, API uses 1-based
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    onPageSizeChange(parseInt(event.target.value, 10));
  };

  return (
    <Box>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600, minWidth: 200 }}>Name</TableCell>
              <TableCell sx={{ fontWeight: 600, minWidth: 150 }}>Region</TableCell>
              <TableCell sx={{ fontWeight: 600, minWidth: 120 }}>Phone</TableCell>
              <TableCell sx={{ fontWeight: 600, minWidth: 180 }}>Address</TableCell>
              <TableCell sx={{ fontWeight: 600, minWidth: 120 }}>Country</TableCell>
              <TableCell sx={{ fontWeight: 600, minWidth: 100 }}>Created</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <LoadingSkeleton />
            ) : branches.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>
                    No branches found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              branches.map((branch) => {
                const addressParts = [
                  branch.street,
                  branch.suburb,
                  branch.state,
                  branch.postcode,
                ].filter(Boolean);
                const address = addressParts.length > 0 ? addressParts.join(', ') : '-';

                return (
                  <TableRow key={branch.id} hover>
                    <TableCell>
                      <Typography
                        variant="body2"
                        fontWeight={500}
                        sx={{
                          cursor: 'pointer',
                          color: 'primary.main',
                          '&:hover': {
                            textDecoration: 'underline',
                          },
                        }}
                        onClick={() => onView(branch)}
                      >
                        {branch.name}
                      </Typography>
                    </TableCell>
                    <TableCell>{branch.region_name || '-'}</TableCell>
                    <TableCell>{branch.phone || '-'}</TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {address}
                      </Typography>
                    </TableCell>
                    <TableCell>{branch.country || '-'}</TableCell>
                    <TableCell>{formatDate(branch.created_at)}</TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={pagination.count}
        page={pagination.page - 1} // MUI uses 0-based, API uses 1-based
        onPageChange={handleChangePage}
        rowsPerPage={pagination.pageSize}
        onRowsPerPageChange={handleChangeRowsPerPage}
        rowsPerPageOptions={[10, 25, 50, 100]}
      />
    </Box>
  );
};

