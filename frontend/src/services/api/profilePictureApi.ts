/**
 * Profile Picture API Client
 * Handles profile picture upload/download operations
 */
import httpClient from './httpClient';

export interface ProfilePicture {
  id: number;
  client: number;
  file: string;
  file_url: string;
  file_size: number;
  file_type: string;
  uploaded_by: number;
  uploaded_by_name: string;
  created_at: string;
  updated_at: string;
}

/**
 * Get profile picture for a client
 */
export const getProfilePicture = async (clientId: number): Promise<ProfilePicture> => {
  const response = await httpClient.get<ProfilePicture>(`/v1/clients/${clientId}/profile-picture/`);
  return response.data;
};

/**
 * Upload a profile picture for a client
 */
export const uploadProfilePicture = async (clientId: number, file: File): Promise<ProfilePicture> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await httpClient.post<ProfilePicture>(
    `/v1/clients/${clientId}/profile-picture/`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );
  return response.data;
};

/**
 * Delete profile picture for a client
 */
export const deleteProfilePicture = async (clientId: number): Promise<void> => {
  await httpClient.delete(`/v1/clients/${clientId}/profile-picture/`);
};

export default {
  getProfilePicture,
  uploadProfilePicture,
  deleteProfilePicture,
};
