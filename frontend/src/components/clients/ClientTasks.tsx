/**
 * ClientTasks Component
 * Client-specific tasks component using shared TaskList
 */
import { useEffect, useState } from 'react';
import { Paper } from '@mui/material';
import { TaskList } from '@/components/shared/TaskList';
import { Task, TaskStatus } from '@/services/api/taskApi';
import { getTasks, completeTask } from '@/services/api/taskApi';

export interface ClientTasksProps {
  /** Client ID */
  clientId: number;
}

/**
 * ClientTasks Component
 * Displays and manages tasks for a specific client
 */
export const ClientTasks = ({ clientId }: ClientTasksProps) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch tasks when component mounts or clientId changes
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const data = await getTasks(clientId);
        // Sort by due_date (earliest first, then by created_at)
        const sorted = data.sort((a, b) => {
          const dateA = new Date(a.due_date).getTime();
          const dateB = new Date(b.due_date).getTime();
          if (dateA === dateB) {
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          }
          return dateA - dateB;
        });
        setTasks(sorted);
      } catch (err) {
        setError((err as Error).message || 'Failed to load tasks');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [clientId]);

  // Handle task click
  const handleTaskClick = (task: Task) => {
    // TODO: Navigate to task detail or open task modal
    alert(`Navigate to Task ${task.id} - Coming in future enhancement`);
  };

  // Handle status change
  const handleStatusChange = async (taskId: number, status: TaskStatus) => {
    if (status === 'COMPLETED') {
      try {
        const updatedTask = await completeTask(taskId);
        setTasks((prevTasks) =>
          prevTasks.map((task) => (task.id === taskId ? updatedTask : task))
        );
      } catch (err) {
        setError((err as Error).message || 'Failed to complete task');
      }
    }
  };

  return (
    <Paper sx={{ p: 3 }}>
      <TaskList
        tasks={tasks}
        isLoading={isLoading}
        error={error}
        onTaskClick={handleTaskClick}
        onStatusChange={handleStatusChange}
        showFilters
      />
    </Paper>
  );
};

export default ClientTasks;
