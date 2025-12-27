/**
 * ClientTable Component
 * Displays clients in a paginated table with all required fields and actions
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
  Box,
  Skeleton,
} from '@mui/material';
import { Client, STAGE_LABELS, STAGE_COLORS, COUNTRIES } from '@/types/client';
import { ClientActions } from './ClientActions';

interface ClientTableProps {
  clients: Client[];
  loading?: boolean;
  pagination: {
    count: number;
    page: number;
    pageSize: number;
  };
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onEdit: (client: Client) => void;
  onDelete: (client: Client) => void;
  onView: (client: Client) => void;
  onMove: (client: Client) => void;
}

/**
 * Get country name from code
 */
const getCountryName = (code: string): string => {
  const country = COUNTRIES.find((c) => c.code === code);
  return country?.name || code;
};

/**
 * Format client full name
 */
const formatClientName = (client: Client): string => {
  const parts = [client.first_name];
  if (client.middle_name) parts.push(client.middle_name);
  if (client.last_name) parts.push(client.last_name);
  return parts.join(' ');
};

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
        <TableCell><Skeleton variant="text" width={40} /></TableCell>
        <TableCell><Skeleton variant="text" width={80} /></TableCell>
        <TableCell><Skeleton variant="text" width={120} /></TableCell>
        <TableCell><Skeleton variant="text" width={100} /></TableCell>
        <TableCell><Skeleton variant="text" width={150} /></TableCell>
        <TableCell><Skeleton variant="text" width={80} /></TableCell>
        <TableCell><Skeleton variant="text" width={80} /></TableCell>
        <TableCell><Skeleton variant="text" width={80} /></TableCell>
        <TableCell><Skeleton variant="text" width={80} /></TableCell>
        <TableCell><Skeleton variant="text" width={80} /></TableCell>
        <TableCell><Skeleton variant="rounded" width={70} height={24} /></TableCell>
        <TableCell>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Skeleton variant="circular" width={28} height={28} />
            <Skeleton variant="circular" width={28} height={28} />
            <Skeleton variant="circular" width={28} height={28} />
            <Skeleton variant="circular" width={28} height={28} />
          </Box>
        </TableCell>
      </TableRow>
    ))}
  </>
);

export const ClientTable = ({
  clients,
  loading = false,
  pagination,
  onPageChange,
  onPageSizeChange,
  onEdit,
  onDelete,
  onView,
  onMove,
}: ClientTableProps) => {
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
              <TableCell sx={{ fontWeight: 600, minWidth: 60 }}>ID</TableCell>
              <TableCell sx={{ fontWeight: 600, minWidth: 100 }}>Added Date</TableCell>
              <TableCell sx={{ fontWeight: 600, minWidth: 150 }}>Name</TableCell>
              <TableCell sx={{ fontWeight: 600, minWidth: 120 }}>Phone No</TableCell>
              <TableCell sx={{ fontWeight: 600, minWidth: 180 }}>Email</TableCell>
              <TableCell sx={{ fontWeight: 600, minWidth: 100 }}>DOB</TableCell>
              <TableCell sx={{ fontWeight: 600, minWidth: 100 }}>Country</TableCell>
              <TableCell sx={{ fontWeight: 600, minWidth: 100 }}>Referred By</TableCell>
              <TableCell sx={{ fontWeight: 600, minWidth: 100 }}>Added By</TableCell>
              <TableCell sx={{ fontWeight: 600, minWidth: 120 }}>Branch Office</TableCell>
              <TableCell sx={{ fontWeight: 600, minWidth: 90 }}>Stage</TableCell>
              <TableCell sx={{ fontWeight: 600, minWidth: 150 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <LoadingSkeleton />
            ) : clients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={12} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>
                    No clients found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              clients.map((client) => (
                <TableRow
                  key={client.id}
                  hover
                  sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                >
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {client.id}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {formatDate(client.created_at)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={500}>
                      {formatClientName(client)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {client.phone_number || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary" sx={{
                      maxWidth: 180,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {client.email || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {formatDate(client.dob)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {getCountryName(client.country)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {client.referred_by || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {client.created_by_name || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {client.branch_name || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={STAGE_LABELS[client.stage]}
                      color={STAGE_COLORS[client.stage]}
                      size="small"
                      sx={{ minWidth: 70 }}
                    />
                  </TableCell>
                  <TableCell>
                    <ClientActions
                      client={client}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      onView={onView}
                      onMove={onMove}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      {!loading && clients.length > 0 && (
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={pagination.count}
          rowsPerPage={pagination.pageSize}
          page={pagination.page - 1} // MUI uses 0-based, API uses 1-based
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      )}
    </Box>
  );
};

export default ClientTable;
