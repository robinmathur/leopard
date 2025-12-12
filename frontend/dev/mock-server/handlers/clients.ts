/**
 * Client Mock Handlers
 * MSW handlers for client management API endpoints
 */
import { http, HttpResponse, delay } from 'msw';
import {
  getMockClients,
  getMockClientById,
  addMockClient,
  updateMockClient,
  deleteMockClient,
  type Client,
  type ClientStage,
} from '../data/mockData';

const API_BASE = '/api';

/**
 * Check authorization header
 */
function isAuthorized(request: Request): boolean {
  const authHeader = request.headers.get('Authorization');
  return !!(authHeader && authHeader.startsWith('Bearer '));
}

/**
 * Return unauthorized response
 */
function unauthorizedResponse() {
  return HttpResponse.json(
    { detail: 'Authentication required' },
    { status: 401 }
  );
}

export const clientHandlers = [
  /**
   * GET /api/v1/clients/ - List clients with pagination and filtering
   */
  http.get(`${API_BASE}/v1/clients/`, async ({ request }) => {
    await delay(300);
    
    if (!isAuthorized(request)) {
      return unauthorizedResponse();
    }
    
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const pageSize = parseInt(url.searchParams.get('page_size') || '10', 10);
    const stage = url.searchParams.get('stage') as ClientStage | null;
    const active = url.searchParams.get('active');
    const email = url.searchParams.get('email');
    const firstName = url.searchParams.get('first_name');
    const lastName = url.searchParams.get('last_name');
    
    let clients = getMockClients();
    
    // Apply filters
    if (stage) {
      clients = clients.filter(c => c.stage === stage);
    }
    if (active !== null) {
      const isActive = active === 'true';
      clients = clients.filter(c => c.active === isActive);
    }
    if (email) {
      clients = clients.filter(c => c.email?.toLowerCase().includes(email.toLowerCase()));
    }
    if (firstName) {
      clients = clients.filter(c => c.first_name.toLowerCase().includes(firstName.toLowerCase()));
    }
    if (lastName) {
      clients = clients.filter(c => c.last_name?.toLowerCase().includes(lastName.toLowerCase()));
    }
    
    // Sort by created_at descending (newest first)
    clients.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    // Paginate
    const totalCount = clients.length;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedClients = clients.slice(startIndex, endIndex);
    
    // Build pagination URLs
    const baseUrl = `${API_BASE}/v1/clients/`;
    const nextPage = endIndex < totalCount ? `${baseUrl}?page=${page + 1}&page_size=${pageSize}` : null;
    const prevPage = page > 1 ? `${baseUrl}?page=${page - 1}&page_size=${pageSize}` : null;
    
    return HttpResponse.json({
      count: totalCount,
      next: nextPage,
      previous: prevPage,
      results: paginatedClients,
    });
  }),

  /**
   * POST /api/v1/clients/ - Create a new client
   */
  http.post(`${API_BASE}/v1/clients/`, async ({ request }) => {
    await delay(300);
    
    if (!isAuthorized(request)) {
      return unauthorizedResponse();
    }
    
    const body = await request.json() as Partial<Client>;
    
    // Validate required fields
    const errors: Record<string, string[]> = {};
    
    if (!body.first_name || body.first_name.trim() === '') {
      errors.first_name = ['This field is required.'];
    }
    if (!body.gender) {
      errors.gender = ['This field is required.'];
    }
    if (!body.country) {
      errors.country = ['This field is required.'];
    }
    
    if (Object.keys(errors).length > 0) {
      return HttpResponse.json(errors, { status: 400 });
    }
    
    // Create client with defaults
    const newClient = addMockClient({
      first_name: body.first_name!,
      middle_name: body.middle_name,
      last_name: body.last_name,
      email: body.email,
      phone_number: body.phone_number,
      gender: body.gender!,
      dob: body.dob,
      country: body.country!,
      street: body.street,
      suburb: body.suburb,
      state: body.state,
      postcode: body.postcode,
      stage: body.stage || 'LE', // Default to Lead
      active: body.active ?? true,
      description: body.description,
      referred_by: body.referred_by,
      visa_category: body.visa_category,
      visa_category_name: body.visa_category_name,
      assigned_to: body.assigned_to,
      assigned_to_name: body.assigned_to_name,
      agent: body.agent,
      agent_name: body.agent_name,
      created_by: 1, // Mock user ID
      created_by_name: 'Current User',
    });
    
    return HttpResponse.json(newClient, { status: 201 });
  }),

  /**
   * GET /api/v1/clients/:id/ - Get single client
   */
  http.get(`${API_BASE}/v1/clients/:id/`, async ({ request, params }) => {
    await delay(200);
    
    if (!isAuthorized(request)) {
      return unauthorizedResponse();
    }
    
    const id = parseInt(params.id as string, 10);
    const client = getMockClientById(id);
    
    if (!client) {
      return HttpResponse.json(
        { detail: 'Not found.' },
        { status: 404 }
      );
    }
    
    return HttpResponse.json(client);
  }),

  /**
   * PUT /api/v1/clients/:id/ - Full update of client
   */
  http.put(`${API_BASE}/v1/clients/:id/`, async ({ request, params }) => {
    await delay(300);
    
    if (!isAuthorized(request)) {
      return unauthorizedResponse();
    }
    
    const id = parseInt(params.id as string, 10);
    const body = await request.json() as Partial<Client>;
    
    // Validate required fields
    const errors: Record<string, string[]> = {};
    
    if (!body.first_name || body.first_name.trim() === '') {
      errors.first_name = ['This field is required.'];
    }
    if (!body.gender) {
      errors.gender = ['This field is required.'];
    }
    if (!body.country) {
      errors.country = ['This field is required.'];
    }
    
    if (Object.keys(errors).length > 0) {
      return HttpResponse.json(errors, { status: 400 });
    }
    
    const updatedClient = updateMockClient(id, {
      ...body,
      updated_by: 1,
    });
    
    if (!updatedClient) {
      return HttpResponse.json(
        { detail: 'Not found.' },
        { status: 404 }
      );
    }
    
    return HttpResponse.json(updatedClient);
  }),

  /**
   * PATCH /api/v1/clients/:id/ - Partial update of client
   */
  http.patch(`${API_BASE}/v1/clients/:id/`, async ({ request, params }) => {
    await delay(300);
    
    if (!isAuthorized(request)) {
      return unauthorizedResponse();
    }
    
    const id = parseInt(params.id as string, 10);
    const body = await request.json() as Partial<Client>;
    
    // Validate stage transition if stage is being updated
    if (body.stage) {
      const currentClient = getMockClientById(id);
      if (currentClient && currentClient.stage === 'CL') {
        return HttpResponse.json(
          { stage: ['Cannot change stage from Close.'] },
          { status: 400 }
        );
      }
    }
    
    const updatedClient = updateMockClient(id, {
      ...body,
      updated_by: 1,
    });
    
    if (!updatedClient) {
      return HttpResponse.json(
        { detail: 'Not found.' },
        { status: 404 }
      );
    }
    
    return HttpResponse.json(updatedClient);
  }),

  /**
   * DELETE /api/v1/clients/:id/ - Soft delete client
   */
  http.delete(`${API_BASE}/v1/clients/:id/`, async ({ request, params }) => {
    await delay(200);
    
    if (!isAuthorized(request)) {
      return unauthorizedResponse();
    }
    
    const id = parseInt(params.id as string, 10);
    const deleted = deleteMockClient(id);
    
    if (!deleted) {
      return HttpResponse.json(
        { detail: 'Not found.' },
        { status: 404 }
      );
    }
    
    return new HttpResponse(null, { status: 204 });
  }),
];
