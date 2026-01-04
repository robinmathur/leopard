/**
 * RegionTable Component
 * Displays regions in a paginated table with all required fields
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
  Chip,
} from '@mui/material';
import { Region } from '@/types/region';

interface RegionTableProps {
  regions: Region[];
  loading?: boolean;
  pagination: {
    count: number;
    page: number;
    pageSize: number;
  };
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onView: (region: Region) => void;
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
        <TableCell><Skeleton variant="text" width={200} /></TableCell>
        <TableCell><Skeleton variant="text" width={60} /></TableCell>
        <TableCell><Skeleton variant="text" width={80} /></TableCell>
      </TableRow>
    ))}
  </>
);

export const RegionTable = ({
  regions,
  loading = false,
  pagination,
  onPageChange,
  onPageSizeChange,
  onView,
}: RegionTableProps) => {
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
              <TableCell sx={{ fontWeight: 600, minWidth: 250 }}>Description</TableCell>
              <TableCell sx={{ fontWeight: 600, minWidth: 100 }}>Branches</TableCell>
              <TableCell sx={{ fontWeight: 600, minWidth: 100 }}>Created</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <LoadingSkeleton />
            ) : regions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>
                    No regions found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              regions.map((region) => (
                <TableRow key={region.id} hover>
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
                      onClick={() => onView(region)}
                    >
                      {region.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {region.description || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={region.branch_count || 0}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>{formatDate(region.created_at)}</TableCell>
                </TableRow>
              ))
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

