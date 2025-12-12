/**
 * ProfilePictureUpload Component
 * Handles profile picture upload, display, and deletion
 */
import { useState, useRef, useEffect } from 'react';
import {
  Box,
  Avatar,
  IconButton,
  CircularProgress,
  Alert,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonIcon from '@mui/icons-material/Person';
import {
  getProfilePicture,
  uploadProfilePicture,
  deleteProfilePicture,
  ProfilePicture,
} from '@/services/api/profilePictureApi';

export interface ProfilePictureUploadProps {
  /** Client ID */
  clientId: number;
  
  /** Client name for avatar fallback */
  clientName: string;
  
  /** Avatar size */
  size?: number;
  
  /** Whether to show upload/delete controls */
  editable?: boolean;
}

// Validation constants
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

/**
 * Validate file type
 */
const isValidFileType = (file: File): boolean => {
  return ALLOWED_FILE_TYPES.includes(file.type);
};

/**
 * Validate file size
 */
const isValidFileSize = (file: File): boolean => {
  return file.size <= MAX_FILE_SIZE;
};

/**
 * Format file size for display
 */
const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/**
 * Get initials from name
 */
const getInitials = (name: string): string => {
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

/**
 * ProfilePictureUpload Component
 */
export const ProfilePictureUpload = ({
  clientId,
  clientName,
  size = 120,
  editable = true,
}: ProfilePictureUploadProps) => {
  const [profilePicture, setProfilePicture] = useState<ProfilePicture | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch profile picture on mount
  useEffect(() => {
    const fetchPicture = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const picture = await getProfilePicture(clientId);
        setProfilePicture(picture);
      } catch (err) {
        // 404 means no picture exists, which is fine
        if ((err as { response?: { status?: number } }).response?.status === 404) {
          setProfilePicture(null);
        } else {
          console.error('Failed to load profile picture:', err);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchPicture();
  }, [clientId]);

  // Handle file selection
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);

    // Validate file type
    if (!isValidFileType(file)) {
      setError(
        `Invalid file type. Please upload a JPEG, PNG, or WebP image. (Selected: ${file.type || 'unknown'})`
      );
      return;
    }

    // Validate file size
    if (!isValidFileSize(file)) {
      setError(
        `File size exceeds the maximum limit of 5MB. (Selected: ${formatFileSize(file.size)})`
      );
      return;
    }

    // Upload the file
    setIsUploading(true);
    try {
      const uploadedPicture = await uploadProfilePicture(clientId, file);
      setProfilePicture(uploadedPicture);
      setError(null);
    } catch (err) {
      const errorMessage = (err as { response?: { data?: { detail?: string } } }).response?.data?.detail;
      setError(errorMessage || 'Failed to upload profile picture. Please try again.');
    } finally {
      setIsUploading(false);
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Handle delete
  const handleDelete = async () => {
    setIsUploading(true);
    setError(null);
    
    try {
      await deleteProfilePicture(clientId);
      setProfilePicture(null);
      setDeleteDialogOpen(false);
    } catch (err) {
      setError('Failed to delete profile picture. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  // Trigger file input click
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {/* Avatar with loading state */}
      <Box sx={{ position: 'relative' }}>
        {isLoading ? (
          <Avatar
            sx={{
              width: size,
              height: size,
              bgcolor: 'grey.300',
            }}
          >
            <CircularProgress size={size / 3} />
          </Avatar>
        ) : (
          <Avatar
            src={profilePicture?.file_url}
            alt={clientName}
            sx={{
              width: size,
              height: size,
              bgcolor: profilePicture ? 'transparent' : 'primary.light',
              fontSize: size / 3,
            }}
          >
            {!profilePicture && (clientName ? getInitials(clientName) : <PersonIcon fontSize="inherit" />)}
          </Avatar>
        )}

        {/* Upload/Delete controls */}
        {editable && !isLoading && (
          <Box
            sx={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              display: 'flex',
              gap: 0.5,
            }}
          >
            {/* Upload button */}
            <Tooltip title="Upload photo">
              <IconButton
                size="small"
                onClick={handleUploadClick}
                disabled={isUploading}
                sx={{
                  bgcolor: 'background.paper',
                  boxShadow: 1,
                  '&:hover': {
                    bgcolor: 'background.paper',
                    boxShadow: 2,
                  },
                }}
              >
                {isUploading ? (
                  <CircularProgress size={16} />
                ) : (
                  <PhotoCameraIcon fontSize="small" />
                )}
              </IconButton>
            </Tooltip>

            {/* Delete button */}
            {profilePicture && (
              <Tooltip title="Delete photo">
                <IconButton
                  size="small"
                  onClick={() => setDeleteDialogOpen(true)}
                  disabled={isUploading}
                  color="error"
                  sx={{
                    bgcolor: 'background.paper',
                    boxShadow: 1,
                    '&:hover': {
                      bgcolor: 'background.paper',
                      boxShadow: 2,
                    },
                  }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        )}
      </Box>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ALLOWED_EXTENSIONS.join(',')}
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      {/* Error message */}
      {error && (
        <Alert severity="error" sx={{ mt: 2, width: '100%', maxWidth: size * 2 }}>
          {error}
        </Alert>
      )}

      {/* File info */}
      {profilePicture && (
        <Box sx={{ mt: 1, textAlign: 'center' }}>
          <Box
            component="span"
            sx={{
              fontSize: '0.75rem',
              color: 'text.secondary',
            }}
          >
            {formatFileSize(profilePicture.file_size)}
          </Box>
        </Box>
      )}

      {/* Delete confirmation dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => !isUploading && setDeleteDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Delete Profile Picture?</DialogTitle>
        <DialogContent>
          Are you sure you want to delete this profile picture? This action cannot be undone.
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={isUploading}>
            Cancel
          </Button>
          <Button
            onClick={handleDelete}
            color="error"
            variant="contained"
            disabled={isUploading}
          >
            {isUploading ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProfilePictureUpload;
