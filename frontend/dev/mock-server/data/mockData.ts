/**
 * Mock Data for Development
 * Realistic test data for authentication and client management
 */

// Type definitions (duplicated from src/types/client.ts to avoid path alias issues in dev/)
export type ClientStage = 'LE' | 'FU' | 'CT' | 'CL';
export type Gender = 'MALE' | 'FEMALE' | 'OTHER';

export interface Client {
  id: number;
  first_name: string;
  middle_name?: string;
  last_name?: string;
  email?: string;
  phone_number?: string;
  gender: Gender;
  dob?: string;
  country: string;
  street?: string;
  suburb?: string;
  state?: string;
  postcode?: string;
  stage: ClientStage;
  active: boolean;
  description?: string;
  referred_by?: string;
  visa_category?: number;
  visa_category_name?: string;
  assigned_to?: number;
  assigned_to_name?: string;
  agent?: number;
  agent_name?: string;
  branch_office?: number;
  branch_office_name?: string;
  created_by?: number;
  created_by_name?: string;
  created_at: string;
  updated_by?: number;
  updated_at: string;
}

// Mock JWT-like tokens
export const mockTokens = {
  access: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJleHAiOjk5OTk5OTk5OTl9.mock_access',
  refresh: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJleHAiOjk5OTk5OTk5OTl9.mock_refresh',
};

// Mock branches data for profile endpoint
export const mockBranchesData = [
  { id: 1, name: 'Melbourne CBD' },
  { id: 2, name: 'Sydney Office' },
  { id: 3, name: 'Brisbane Branch' },
  { id: 4, name: 'Perth Office' },
];

// Mock regions data for profile endpoint
export const mockRegionsData = [
  { id: 1, name: 'Victoria' },
  { id: 2, name: 'New South Wales' },
  { id: 3, name: 'Queensland' },
  { id: 4, name: 'Western Australia' },
];

// Mock users with different roles
export const mockUsers = [
  {
    id: 1,
    username: 'admin@immigrationcrm.com',
    email: 'admin@immigrationcrm.com',
    first_name: 'Super',
    last_name: 'Admin',
    primary_group: 'SUPER_ADMIN',
    groups_list: ['SUPER_ADMIN'],
    tenant: 1,
    tenant_name: 'Immigration CRM Tenant',
    branches_data: mockBranchesData, // Super admin has access to all branches
    regions_data: mockRegionsData, // Super admin has access to all regions
    is_active: true,
    password: 'password123',
  },
  {
    id: 2,
    username: 'manager@immigrationcrm.com',
    email: 'manager@immigrationcrm.com',
    first_name: 'Branch',
    last_name: 'Manager',
    primary_group: 'BRANCH_ADMIN',
    groups_list: ['BRANCH_ADMIN'],
    tenant: 1,
    tenant_name: 'Immigration CRM Tenant',
    branches_data: [mockBranchesData[0]], // Branch admin has access to their branch only
    regions_data: [mockRegionsData[0]], // Branch admin has access to their region only
    is_active: true,
    password: 'password123',
  },
  {
    id: 3,
    username: 'agent@immigrationcrm.com',
    email: 'agent@immigrationcrm.com',
    first_name: 'Jane',
    last_name: 'Agent',
    primary_group: 'CONSULTANT',
    groups_list: ['CONSULTANT'],
    tenant: 1,
    tenant_name: 'Immigration CRM Tenant',
    branches_data: [mockBranchesData[0]], // Consultant assigned to one branch
    regions_data: [mockRegionsData[0]],
    is_active: true,
    password: 'password123',
  },
  {
    id: 4,
    username: 'intern@immigrationcrm.com',
    email: 'intern@immigrationcrm.com',
    first_name: 'John',
    last_name: 'Intern',
    primary_group: 'INTERN',
    groups_list: ['INTERN'],
    tenant: 1,
    tenant_name: 'Immigration CRM Tenant',
    branches_data: [mockBranchesData[0]], // Intern assigned to one branch
    regions_data: [mockRegionsData[0]],
    is_active: true,
    password: 'password123',
  },
];

// Permissions by role
export const mockPermissionsByRole: Record<string, Array<{ codename: string; name: string; content_type: string }>> = {
  SUPER_ADMIN: [
    { codename: 'view_client', name: 'Can view client', content_type: 'core.client' },
    { codename: 'add_client', name: 'Can add client', content_type: 'core.client' },
    { codename: 'change_client', name: 'Can change client', content_type: 'core.client' },
    { codename: 'delete_client', name: 'Can delete client', content_type: 'core.client' },
    { codename: 'view_lead', name: 'Can view lead', content_type: 'core.lead' },
    { codename: 'add_lead', name: 'Can add lead', content_type: 'core.lead' },
    { codename: 'change_lead', name: 'Can change lead', content_type: 'core.lead' },
    { codename: 'delete_lead', name: 'Can delete lead', content_type: 'core.lead' },
    { codename: 'view_visaapplication', name: 'Can view application', content_type: 'core.visaapplication' },
    { codename: 'add_visaapplication', name: 'Can add application', content_type: 'core.visaapplication' },
    { codename: 'change_visaapplication', name: 'Can change application', content_type: 'core.visaapplication' },
    { codename: 'delete_visaapplication', name: 'Can delete application', content_type: 'core.visaapplication' },
    { codename: 'view_institute', name: 'Can view institute', content_type: 'core.institute' },
    { codename: 'add_institute', name: 'Can add institute', content_type: 'core.institute' },
    { codename: 'change_institute', name: 'Can change institute', content_type: 'core.institute' },
    { codename: 'delete_institute', name: 'Can delete institute', content_type: 'core.institute' },
    { codename: 'view_agent', name: 'Can view agent', content_type: 'core.agent' },
    { codename: 'add_agent', name: 'Can add agent', content_type: 'core.agent' },
    { codename: 'change_agent', name: 'Can change agent', content_type: 'core.agent' },
    { codename: 'delete_agent', name: 'Can delete agent', content_type: 'core.agent' },
    { codename: 'view_contact_info', name: 'Can view contact info', content_type: 'core.client' },
    { codename: 'view_client_documents', name: 'Can view client documents', content_type: 'core.client' },
    { codename: 'view_finance', name: 'Can view finance', content_type: 'core.finance' },
    { codename: 'edit_finance', name: 'Can edit finance', content_type: 'core.finance' },
    { codename: 'approve_payments', name: 'Can approve payments', content_type: 'core.finance' },
    { codename: 'view_branch_data', name: 'Can view branch data', content_type: 'core.branch' },
    { codename: 'manage_branch', name: 'Can manage branch', content_type: 'core.branch' },
    { codename: 'view_all_branches', name: 'Can view all branches', content_type: 'core.branch' },
    { codename: 'view_dashboard', name: 'Can view dashboard', content_type: 'core.dashboard' },
    { codename: 'view_analytics', name: 'Can view analytics', content_type: 'core.analytics' },
    { codename: 'export_data', name: 'Can export data', content_type: 'core.data' },
  ],
  BRANCH_ADMIN: [
    { codename: 'view_client', name: 'Can view client', content_type: 'core.client' },
    { codename: 'add_client', name: 'Can add client', content_type: 'core.client' },
    { codename: 'change_client', name: 'Can change client', content_type: 'core.client' },
    { codename: 'view_lead', name: 'Can view lead', content_type: 'core.lead' },
    { codename: 'add_lead', name: 'Can add lead', content_type: 'core.lead' },
    { codename: 'change_lead', name: 'Can change lead', content_type: 'core.lead' },
    { codename: 'view_visaapplication', name: 'Can view application', content_type: 'core.visaapplication' },
    { codename: 'add_visaapplication', name: 'Can add application', content_type: 'core.visaapplication' },
    { codename: 'change_visaapplication', name: 'Can change application', content_type: 'core.visaapplication' },
    { codename: 'view_institute', name: 'Can view institute', content_type: 'core.institute' },
    { codename: 'view_agent', name: 'Can view agent', content_type: 'core.agent' },
    { codename: 'view_contact_info', name: 'Can view contact info', content_type: 'core.client' },
    { codename: 'view_client_documents', name: 'Can view client documents', content_type: 'core.client' },
    { codename: 'view_finance', name: 'Can view finance', content_type: 'core.finance' },
    { codename: 'view_branch_data', name: 'Can view branch data', content_type: 'core.branch' },
    { codename: 'manage_branch', name: 'Can manage branch', content_type: 'core.branch' },
    { codename: 'view_dashboard', name: 'Can view dashboard', content_type: 'core.dashboard' },
    { codename: 'view_analytics', name: 'Can view analytics', content_type: 'core.analytics' },
    { codename: 'export_data', name: 'Can export data', content_type: 'core.data' },
  ],
  CONSULTANT: [
    { codename: 'view_client', name: 'Can view client', content_type: 'core.client' },
    { codename: 'add_client', name: 'Can add client', content_type: 'core.client' },
    { codename: 'change_client', name: 'Can change client', content_type: 'core.client' },
    { codename: 'view_lead', name: 'Can view lead', content_type: 'core.lead' },
    { codename: 'add_lead', name: 'Can add lead', content_type: 'core.lead' },
    { codename: 'change_lead', name: 'Can change lead', content_type: 'core.lead' },
    { codename: 'view_visaapplication', name: 'Can view application', content_type: 'core.visaapplication' },
    { codename: 'add_visaapplication', name: 'Can add application', content_type: 'core.visaapplication' },
    { codename: 'change_visaapplication', name: 'Can change application', content_type: 'core.visaapplication' },
    { codename: 'view_institute', name: 'Can view institute', content_type: 'core.institute' },
    { codename: 'view_contact_info', name: 'Can view contact info', content_type: 'core.client' },
    { codename: 'view_dashboard', name: 'Can view dashboard', content_type: 'core.dashboard' },
  ],
  INTERN: [
    { codename: 'view_client', name: 'Can view client', content_type: 'core.client' },
    { codename: 'view_lead', name: 'Can view lead', content_type: 'core.lead' },
    { codename: 'view_visaapplication', name: 'Can view application', content_type: 'core.visaapplication' },
    { codename: 'view_institute', name: 'Can view institute', content_type: 'core.institute' },
    { codename: 'view_dashboard', name: 'Can view dashboard', content_type: 'core.dashboard' },
  ],
};

// Mock clients - 20 clients across all stages
let nextClientId = 21;

export const mockClients: Client[] = [
  // Lead stage (LE) - 5 clients
  {
    id: 1,
    first_name: 'Emma',
    middle_name: 'Rose',
    last_name: 'Wilson',
    email: 'emma.wilson@email.com',
    phone_number: '+61 412 345 678',
    gender: 'FEMALE' as Gender,
    dob: '1995-03-15',
    country: 'AU',
    street: '123 Collins Street',
    suburb: 'Melbourne',
    state: 'VIC',
    postcode: '3000',
    stage: 'LE' as ClientStage,
    active: true,
    description: 'Interested in student visa',
    referred_by: 'Google Search',
    visa_category: 1,
    visa_category_name: 'Student Visa (500)',
    assigned_to: 3,
    assigned_to_name: 'Jane Agent',
    branch_office: 1,
    branch_office_name: 'Melbourne CBD',
    created_by: 1,
    created_by_name: 'Super Admin',
    created_at: '2025-01-05T10:30:00Z',
    updated_by: 3,
    updated_at: '2025-01-08T14:20:00Z',
  },
  {
    id: 2,
    first_name: 'Raj',
    last_name: 'Patel',
    email: 'raj.patel@email.com',
    phone_number: '+91 98765 43210',
    gender: 'MALE' as Gender,
    dob: '1990-07-22',
    country: 'IN',
    suburb: 'Mumbai',
    state: 'Maharashtra',
    stage: 'LE' as ClientStage,
    active: true,
    description: 'Skilled worker visa inquiry',
    referred_by: 'Friend referral',
    visa_category: 2,
    visa_category_name: 'Skilled Worker (482)',
    assigned_to: 3,
    assigned_to_name: 'Jane Agent',
    branch_office: 2,
    branch_office_name: 'Sydney Office',
    created_by: 2,
    created_by_name: 'Branch Manager',
    created_at: '2025-01-10T09:00:00Z',
    updated_at: '2025-01-10T09:00:00Z',
  },
  {
    id: 3,
    first_name: 'Li',
    last_name: 'Wei',
    email: 'li.wei@email.com',
    phone_number: '+86 138 1234 5678',
    gender: 'MALE' as Gender,
    dob: '1988-11-30',
    country: 'CN',
    stage: 'LE' as ClientStage,
    active: true,
    description: 'Business visa consultation',
    visa_category: 3,
    visa_category_name: 'Business Innovation (188)',
    branch_office: 1,
    branch_office_name: 'Melbourne CBD',
    created_by: 1,
    created_by_name: 'Super Admin',
    created_at: '2025-01-12T11:45:00Z',
    updated_at: '2025-01-12T11:45:00Z',
  },
  {
    id: 4,
    first_name: 'Maria',
    last_name: 'Santos',
    email: 'maria.santos@email.com',
    phone_number: '+63 917 123 4567',
    gender: 'FEMALE' as Gender,
    dob: '1992-05-18',
    country: 'PH',
    stage: 'LE' as ClientStage,
    active: true,
    referred_by: 'Facebook Ad',
    visa_category: 1,
    visa_category_name: 'Student Visa (500)',
    branch_office: 3,
    branch_office_name: 'Brisbane Branch',
    created_by: 3,
    created_by_name: 'Jane Agent',
    created_at: '2025-01-14T08:30:00Z',
    updated_at: '2025-01-14T08:30:00Z',
  },
  {
    id: 5,
    first_name: 'Nguyen',
    last_name: 'Van Minh',
    email: 'nvminh@email.com',
    phone_number: '+84 912 345 678',
    gender: 'MALE' as Gender,
    country: 'VN',
    stage: 'LE' as ClientStage,
    active: true,
    branch_office: 2,
    branch_office_name: 'Sydney Office',
    created_by: 3,
    created_by_name: 'Jane Agent',
    created_at: '2025-01-15T10:00:00Z',
    updated_at: '2025-01-15T10:00:00Z',
  },

  // Follow Up stage (FU) - 5 clients
  {
    id: 6,
    first_name: 'Priya',
    last_name: 'Sharma',
    email: 'priya.sharma@email.com',
    phone_number: '+91 87654 32109',
    gender: 'FEMALE' as Gender,
    dob: '1994-09-10',
    country: 'IN',
    suburb: 'Delhi',
    state: 'Delhi',
    stage: 'FU' as ClientStage,
    active: true,
    description: 'Documents submitted, awaiting review',
    visa_category: 1,
    visa_category_name: 'Student Visa (500)',
    branch_office: 1,
    branch_office_name: 'Melbourne CBD',
    assigned_to: 3,
    assigned_to_name: 'Jane Agent',
    created_by: 2,
    created_by_name: 'Branch Manager',
    created_at: '2024-12-01T14:00:00Z',
    updated_at: '2025-01-05T16:30:00Z',
  },
  {
    id: 7,
    first_name: 'Chen',
    last_name: 'Xiaoming',
    email: 'chen.xm@email.com',
    phone_number: '+86 139 8765 4321',
    gender: 'MALE' as Gender,
    dob: '1985-02-28',
    country: 'CN',
    street: '456 Nanjing Road',
    suburb: 'Shanghai',
    stage: 'FU' as ClientStage,
    active: true,
    description: 'Waiting for English test results',
    visa_category: 2,
    visa_category_name: 'Skilled Worker (482)',
    assigned_to: 3,
    assigned_to_name: 'Jane Agent',
    created_by: 1,
    created_by_name: 'Super Admin',
    created_at: '2024-11-15T09:30:00Z',
    updated_at: '2025-01-10T11:00:00Z',
  },
  {
    id: 8,
    first_name: 'Kim',
    middle_name: 'Soo',
    last_name: 'Jin',
    email: 'kim.sj@email.com',
    phone_number: '+82 10 1234 5678',
    gender: 'FEMALE' as Gender,
    dob: '1991-12-05',
    country: 'KR',
    stage: 'FU' as ClientStage,
    active: true,
    visa_category: 1,
    visa_category_name: 'Student Visa (500)',
    assigned_to: 3,
    assigned_to_name: 'Jane Agent',
    created_by: 3,
    created_by_name: 'Jane Agent',
    created_at: '2024-12-10T13:45:00Z',
    updated_at: '2025-01-08T09:15:00Z',
  },
  {
    id: 9,
    first_name: 'Ahmed',
    last_name: 'Khan',
    email: 'ahmed.khan@email.com',
    phone_number: '+92 300 123 4567',
    gender: 'MALE' as Gender,
    dob: '1993-04-20',
    country: 'PK',
    stage: 'FU' as ClientStage,
    active: true,
    description: 'Medical examination scheduled',
    visa_category: 2,
    visa_category_name: 'Skilled Worker (482)',
    created_by: 2,
    created_by_name: 'Branch Manager',
    created_at: '2024-12-20T10:00:00Z',
    updated_at: '2025-01-12T14:30:00Z',
  },
  {
    id: 10,
    first_name: 'Tanaka',
    last_name: 'Yuki',
    email: 'tanaka.yuki@email.com',
    phone_number: '+81 90 1234 5678',
    gender: 'FEMALE' as Gender,
    country: 'JP',
    stage: 'FU' as ClientStage,
    active: true,
    visa_category: 3,
    visa_category_name: 'Business Innovation (188)',
    created_by: 1,
    created_by_name: 'Super Admin',
    created_at: '2024-12-25T11:30:00Z',
    updated_at: '2025-01-11T10:45:00Z',
  },

  // Client stage (CT) - 5 clients
  {
    id: 11,
    first_name: 'James',
    last_name: 'Thompson',
    email: 'james.t@email.com',
    phone_number: '+61 423 456 789',
    gender: 'MALE' as Gender,
    dob: '1989-08-15',
    country: 'AU',
    street: '789 George Street',
    suburb: 'Sydney',
    state: 'NSW',
    postcode: '2000',
    stage: 'CT' as ClientStage,
    active: true,
    description: 'Visa application submitted',
    visa_category: 4,
    visa_category_name: 'Partner Visa (820)',
    assigned_to: 3,
    assigned_to_name: 'Jane Agent',
    created_by: 2,
    created_by_name: 'Branch Manager',
    created_at: '2024-09-01T09:00:00Z',
    updated_at: '2025-01-10T15:00:00Z',
  },
  {
    id: 12,
    first_name: 'Fatima',
    last_name: 'Ali',
    email: 'fatima.ali@email.com',
    phone_number: '+971 50 123 4567',
    gender: 'FEMALE' as Gender,
    dob: '1996-01-25',
    country: 'AE',
    stage: 'CT' as ClientStage,
    active: true,
    visa_category: 1,
    visa_category_name: 'Student Visa (500)',
    assigned_to: 3,
    assigned_to_name: 'Jane Agent',
    created_by: 3,
    created_by_name: 'Jane Agent',
    created_at: '2024-08-15T14:30:00Z',
    updated_at: '2025-01-05T11:20:00Z',
  },
  {
    id: 13,
    first_name: 'David',
    middle_name: 'John',
    last_name: 'Brown',
    email: 'david.brown@email.com',
    phone_number: '+44 7700 123456',
    gender: 'MALE' as Gender,
    dob: '1987-06-10',
    country: 'GB',
    suburb: 'London',
    stage: 'CT' as ClientStage,
    active: true,
    description: 'Skilled visa in processing',
    visa_category: 2,
    visa_category_name: 'Skilled Worker (482)',
    assigned_to: 3,
    assigned_to_name: 'Jane Agent',
    created_by: 1,
    created_by_name: 'Super Admin',
    created_at: '2024-07-20T08:45:00Z',
    updated_at: '2025-01-08T16:00:00Z',
  },
  {
    id: 14,
    first_name: 'Sarah',
    last_name: 'Miller',
    email: 'sarah.m@email.com',
    phone_number: '+1 310 555 0123',
    gender: 'FEMALE' as Gender,
    dob: '1993-11-08',
    country: 'US',
    suburb: 'Los Angeles',
    state: 'CA',
    stage: 'CT' as ClientStage,
    active: true,
    visa_category: 3,
    visa_category_name: 'Business Innovation (188)',
    created_by: 2,
    created_by_name: 'Branch Manager',
    created_at: '2024-10-05T12:00:00Z',
    updated_at: '2025-01-07T09:30:00Z',
  },
  {
    id: 15,
    first_name: 'Arjun',
    last_name: 'Reddy',
    email: 'arjun.r@email.com',
    phone_number: '+91 99887 76655',
    gender: 'MALE' as Gender,
    dob: '1990-03-30',
    country: 'IN',
    suburb: 'Hyderabad',
    state: 'Telangana',
    stage: 'CT' as ClientStage,
    active: true,
    visa_category: 2,
    visa_category_name: 'Skilled Worker (482)',
    assigned_to: 3,
    assigned_to_name: 'Jane Agent',
    created_by: 3,
    created_by_name: 'Jane Agent',
    created_at: '2024-11-01T10:15:00Z',
    updated_at: '2025-01-09T13:45:00Z',
  },

  // Close stage (CL) - 5 clients
  {
    id: 16,
    first_name: 'Michael',
    last_name: 'Chen',
    email: 'michael.chen@email.com',
    phone_number: '+61 434 567 890',
    gender: 'MALE' as Gender,
    dob: '1986-09-22',
    country: 'AU',
    street: '321 Bourke Street',
    suburb: 'Melbourne',
    state: 'VIC',
    postcode: '3000',
    stage: 'CL' as ClientStage,
    active: false,
    description: 'Visa granted - case closed successfully',
    visa_category: 2,
    visa_category_name: 'Skilled Worker (482)',
    assigned_to: 3,
    assigned_to_name: 'Jane Agent',
    created_by: 1,
    created_by_name: 'Super Admin',
    created_at: '2024-03-10T09:00:00Z',
    updated_at: '2024-12-15T16:30:00Z',
  },
  {
    id: 17,
    first_name: 'Lisa',
    last_name: 'Wang',
    email: 'lisa.wang@email.com',
    phone_number: '+86 137 2468 1357',
    gender: 'FEMALE' as Gender,
    dob: '1995-07-14',
    country: 'CN',
    stage: 'CL' as ClientStage,
    active: false,
    description: 'Student visa approved',
    visa_category: 1,
    visa_category_name: 'Student Visa (500)',
    created_by: 3,
    created_by_name: 'Jane Agent',
    created_at: '2024-05-01T11:30:00Z',
    updated_at: '2024-11-20T14:00:00Z',
  },
  {
    id: 18,
    first_name: 'Robert',
    last_name: 'Garcia',
    email: 'robert.g@email.com',
    phone_number: '+1 415 555 0199',
    gender: 'MALE' as Gender,
    dob: '1982-12-03',
    country: 'US',
    stage: 'CL' as ClientStage,
    active: false,
    description: 'Business visa granted',
    visa_category: 3,
    visa_category_name: 'Business Innovation (188)',
    created_by: 2,
    created_by_name: 'Branch Manager',
    created_at: '2024-02-15T08:00:00Z',
    updated_at: '2024-10-30T12:45:00Z',
  },
  {
    id: 19,
    first_name: 'Aisha',
    last_name: 'Rahman',
    email: 'aisha.r@email.com',
    phone_number: '+880 17 1234 5678',
    gender: 'FEMALE' as Gender,
    dob: '1997-04-08',
    country: 'BD',
    stage: 'CL' as ClientStage,
    active: false,
    description: 'Withdrew application',
    visa_category: 1,
    visa_category_name: 'Student Visa (500)',
    created_by: 3,
    created_by_name: 'Jane Agent',
    created_at: '2024-06-20T10:30:00Z',
    updated_at: '2024-09-15T09:00:00Z',
  },
  {
    id: 20,
    first_name: 'Peter',
    last_name: 'Müller',
    email: 'peter.muller@email.com',
    phone_number: '+49 151 1234 5678',
    gender: 'MALE' as Gender,
    dob: '1984-10-17',
    country: 'DE',
    stage: 'CL' as ClientStage,
    active: false,
    description: 'Skilled visa approved',
    visa_category: 2,
    visa_category_name: 'Skilled Worker (482)',
    assigned_to: 3,
    assigned_to_name: 'Jane Agent',
    created_by: 1,
    created_by_name: 'Super Admin',
    created_at: '2024-01-05T13:00:00Z',
    updated_at: '2024-08-22T11:30:00Z',
  },
];

// Current authenticated user (set on login)
let currentUser: typeof mockUsers[0] | null = null;

export function setCurrentUser(user: typeof mockUsers[0] | null) {
  currentUser = user;
}

export function getCurrentUser() {
  return currentUser;
}

// Functions to manipulate mock clients
export function getMockClients() {
  return [...mockClients];
}

export function getMockClientById(id: number): Client | undefined {
  return mockClients.find(c => c.id === id);
}

export function addMockClient(client: Omit<Client, 'id' | 'created_at' | 'updated_at'>): Client {
  const newClient: Client = {
    ...client,
    id: nextClientId++,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  mockClients.push(newClient);
  return newClient;
}

export function updateMockClient(id: number, updates: Partial<Client>): Client | null {
  const index = mockClients.findIndex(c => c.id === id);
  if (index === -1) return null;
  
  mockClients[index] = {
    ...mockClients[index],
    ...updates,
    updated_at: new Date().toISOString(),
  };
  return mockClients[index];
}

export function deleteMockClient(id: number): boolean {
  const index = mockClients.findIndex(c => c.id === id);
  if (index === -1) return false;
  
  mockClients.splice(index, 1);
  return true;
}
