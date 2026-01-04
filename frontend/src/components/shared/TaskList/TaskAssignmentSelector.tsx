/**
 * TaskAssignmentSelector Component
 * Allows selection between assigning to a user or a branch
 */
import { useState, useEffect } from 'react';
import { Box, Radio, RadioGroup, FormControlLabel, FormControl, FormLabel, Typography } from '@mui/material';
import { UserAutocomplete } from '@/components/common/UserAutocomplete';
import { BranchAutocomplete } from '@/components/common/BranchAutocomplete';
import { User } from '@/types/user';
import { Branch } from '@/types/branch';

interface TaskAssignmentSelectorProps {
  selectedUser: User | null;
  selectedBranch: Branch | null;
  onUserChange: (user: User | null) => void;
  onBranchChange: (branch: Branch | null) => void;
  disabled?: boolean;
  error?: {
    assignmentType?: string;
    user?: string;
    branch?: string;
  };
}

type AssignmentType = 'user' | 'branch' | 'none';

export const TaskAssignmentSelector = ({
  selectedUser,
  selectedBranch,
  onUserChange,
  onBranchChange,
  disabled = false,
  error,
}: TaskAssignmentSelectorProps) => {
  const [assignmentType, setAssignmentType] = useState<AssignmentType>(() => {
    if (selectedUser) return 'user';
    if (selectedBranch) return 'branch';
    return 'none';
  });

  // Update assignment type when selectedUser or selectedBranch changes externally
  useEffect(() => {
    if (selectedUser) {
      setAssignmentType('user');
    } else if (selectedBranch) {
      setAssignmentType('branch');
    } else {
      setAssignmentType('none');
    }
  }, [selectedUser, selectedBranch]);

  const handleAssignmentTypeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newType = event.target.value as AssignmentType;
    setAssignmentType(newType);
    
    // Clear the other selection when switching types
    if (newType === 'user') {
      onBranchChange(null);
    } else if (newType === 'branch') {
      onUserChange(null);
    } else {
      onUserChange(null);
      onBranchChange(null);
    }
  };

  return (
    <Box>
      <FormControl component="fieldset" error={!!error?.assignmentType} disabled={disabled}>
        <FormLabel component="legend">Assignment Type</FormLabel>
        <RadioGroup
          row
          value={assignmentType}
          onChange={handleAssignmentTypeChange}
        >
          <FormControlLabel value="none" control={<Radio />} label="Unassigned" />
          <FormControlLabel value="user" control={<Radio />} label="Assign to User" />
          <FormControlLabel value="branch" control={<Radio />} label="Assign to Branch" />
        </RadioGroup>
        {error?.assignmentType && (
          <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
            {error.assignmentType}
          </Typography>
        )}
      </FormControl>

      {assignmentType === 'user' && (
        <Box sx={{ mt: 2 }}>
          <UserAutocomplete
            value={selectedUser}
            onChange={onUserChange}
            label="Assign To"
            placeholder="Search by name or email"
            disabled={disabled}
            error={!!error?.user}
            helperText={error?.user}
          />
        </Box>
      )}

      {assignmentType === 'branch' && (
        <Box sx={{ mt: 2 }}>
          <BranchAutocomplete
            value={selectedBranch}
            onChange={onBranchChange}
            label="Assign To Branch"
            placeholder="Search by branch name"
            disabled={disabled}
            error={!!error?.branch}
            helperText={error?.branch}
          />
        </Box>
      )}
    </Box>
  );
};

export default TaskAssignmentSelector;

