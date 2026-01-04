/**
 * RegionOverview Component
 * Displays comprehensive region overview with essential information
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box,  Typography, Paper, Divider, Skeleton, Link, Chip , Grid} from '@mui/material';
import { Region } from '@/types/region';
import { Branch } from '@/types/branch';
import { branchApi } from '@/services/api/branchApi';

interface RegionOverviewProps {
  region: Region;
  loading?: boolean;
}

/**
 * Format date string
 */
const formatDate = (dateString?: string): string => {
  if (!dateString) return '-';
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateString; }};

/**
 * Detail row component
 */
interface DetailRowProps {
  label: string;
  value: React.ReactNode;
}

const DetailRow = ({ label, value }: DetailRowProps) => (
  <Box>
    <Typography variant="caption" color="text.secondary">
      {label}
    </Typography>
    <Typography variant="body2" sx={{ mt: 0.5 }}>
      {value || '-'}
    </Typography>
  </Box>
);

/**
 * RegionOverview skeleton loader
 */
export const RegionOverviewSkeleton = () => (
  <Paper sx={{ p: 3 }}>
    <Grid container spacing={3}>
      <Grid size={{ xs: 12 }}>
        <Skeleton variant="text" width="60%" height={32} />
        <Skeleton variant="text" width="40%" height={24} sx={{ mt: 2 }}/>
        <Skeleton variant="text" width="50%" height={24} sx={{ mt: 1 }}/>
      </Grid>
    </Grid>
  </Paper>
);

// Module-level cache to prevent duplicate fetches across StrictMode remounts
const branchesCache = new Map<number, Branch[]>();

/**
 * RegionOverview component
 */
export const RegionOverview = ({ region, loading = false }: RegionOverviewProps) => {
  const navigate = useNavigate();
  const [branches, setBranches] = useState<Branch[]>(() => {
    // Initialize from cache if available
    return branchesCache.get(region.id) || [];
  });
  const [branchesLoading, setBranchesLoading] = useState(false);

  useEffect(() => {
    // If we already have cached branches for this region, use them
    const cached = branchesCache.get(region.id);
    if (cached) {
      setBranches(cached);
      return;
    }

    let cancelled = false;

    const fetchBranches = async () => {
      setBranchesLoading(true);
      try {
        const response = await branchApi.list({ region_id: region.id });
        if (!cancelled) {
          setBranches(response.results);
          branchesCache.set(region.id, response.results); }}catch (error) {
        if (!cancelled) {
          console.error('Failed to fetch branches:', error); }}finally {
        if (!cancelled) {
          setBranchesLoading(false); }}};

    if (region.id) {
      fetchBranches();
    }

    return () => {
      cancelled = true;
    };
  }, [region.id]);

  if (loading) {
    return <RegionOverviewSkeleton />;
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Grid container spacing={3}>
        {/* Region Details Section */}
        <Grid size={{ xs: 12 }}>
          {/* Basic Information */}
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            Basic Information
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <DetailRow label="Region Name" value={region.name} />
            </Grid>
            {region.description && (
              <Grid size={{ xs: 12 }}>
                <DetailRow label="Description" value={region.description} />
              </Grid>
            )}
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <DetailRow
                label="Branches"
                value={
                  <Chip
                    label={region.branch_count || branches.length || 0}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                }
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 2 }}/>

          {/* Branches Section */}
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            Branches in this Region
          </Typography>
          {branchesLoading ? (
            <Box sx={{ py: 2 }}>
              <Skeleton variant="text" width="100%" height={24} />
              <Skeleton variant="text" width="80%" height={24} />
            </Box>
          ) : branches.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
              No branches assigned to this region
            </Typography>
          ) : (
            <Box sx={{ mt: 1 }}>
              {branches.map((branch) => (
                <Box
                  key={branch.id}
                  sx={{
                    py: 1,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    '&:last-child': {
                      borderBottom: 'none',
                    }, }}>
                  <Link
                    component="button"
                    variant="body2"
                    onClick={() => navigate(`/org-management/branches/${branch.id}`, { state: { from: '/org-management/branches' }})}
                    sx={{
                      color: 'primary.main',
                      textDecoration: 'none',
                      '&:hover': {
                        textDecoration: 'underline',
                      },
                      cursor: 'pointer', }}>
                    {branch.name}
                  </Link>
                  {branch.phone && (
                    <Typography variant="caption" color="text.secondary" sx={{ ml: 2, display: 'inline' }}>
                      {branch.phone}
                    </Typography>
                  )}
                </Box>
              ))}
            </Box>
          )}

          <Divider sx={{ my: 2 }}/>

          {/* Audit Information */}
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            Audit Information
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <DetailRow label="Created At" value={formatDate(region.created_at)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <DetailRow label="Last Updated" value={formatDate(region.updated_at)} />
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default RegionOverview;

