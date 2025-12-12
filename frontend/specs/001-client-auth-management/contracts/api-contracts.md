# API Contracts: Client Authentication & Management System

**Feature Branch**: `001-client-auth-management`
**Date**: 2025-12-10
**Source**: OpenAPI spec (`dev/openapi-spec.yaml`)

This document summarizes the API endpoints used by this feature. The full OpenAPI specification is in `dev/openapi-spec.yaml`.

## Authentication Endpoints

### POST /api/token/
Obtain JWT token pair with credentials.

**Request**:
```json
{
  "username": "string",
  "password": "string"
}
```

**Response 200**:
```json
{
  "access": "eyJ...",
  "refresh": "eyJ..."
}
```

**Errors**: 401 (Invalid credentials)

---

### POST /api/token/refresh/
Refresh access token using refresh token.

**Request**:
```json
{
  "refresh": "eyJ..."
}
```

**Response 200**:
```json
{
  "access": "eyJ...",
  "refresh": "eyJ..."
}
```

**Errors**: 401 (Invalid/expired refresh token)

---

### GET /api/v1/users/me/permissions/
Get current user's permissions.

**Headers**: `Authorization: Bearer {access_token}`

**Response 200**:
```json
{
  "permissions": [
    {
      "codename": "view_client",
      "name": "Can view client",
      "content_type": "core.client"
    }
  ],
  "role": "CONSULTANT",
  "role_display": "Consultant"
}
```

**Errors**: 401 (Unauthorized)

---

## Client Endpoints

### GET /api/v1/clients/
List clients with pagination and filtering.

**Headers**: `Authorization: Bearer {access_token}`

**Query Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| page | integer | Page number |
| page_size | integer | Results per page |
| stage | string | Filter by stage (LE, FU, CT, CL) |
| active | boolean | Filter by active status |
| email | string | Partial email match |
| first_name | string | Partial name match |
| last_name | string | Partial name match |
| include_deleted | boolean | Include soft-deleted |

**Response 200**:
```json
{
  "count": 100,
  "next": "http://api.example.org/clients/?page=2",
  "previous": null,
  "results": [
    {
      "id": 1,
      "first_name": "John",
      "last_name": "Doe",
      "email": "john@example.com",
      "phone_number": "+1234567890",
      "gender": "MALE",
      "country": "AU",
      "stage": "LE",
      "active": true,
      "assigned_to": 5,
      "assigned_to_name": "Jane Agent",
      "created_at": "2025-01-01T00:00:00Z",
      "updated_at": "2025-01-01T00:00:00Z"
    }
  ]
}
```

**Errors**: 401, 403

---

### POST /api/v1/clients/
Create a new client.

**Headers**: `Authorization: Bearer {access_token}`

**Request**:
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com",
  "phone_number": "+1234567890",
  "gender": "MALE",
  "country": "AU",
  "stage": "LE",
  "description": "Potential student visa client"
}
```

**Response 201**: Full client object

**Errors**: 400 (Validation), 401, 403

---

### GET /api/v1/clients/{id}/
Get single client details.

**Headers**: `Authorization: Bearer {access_token}`

**Response 200**: Full client object

**Errors**: 401, 403, 404

---

### PUT /api/v1/clients/{id}/
Full update of client.

**Headers**: `Authorization: Bearer {access_token}`

**Request**: Full client update object

**Response 200**: Updated client object

**Errors**: 400, 401, 403, 404

---

### PATCH /api/v1/clients/{id}/
Partial update of client (including stage change).

**Headers**: `Authorization: Bearer {access_token}`

**Request** (example for stage change):
```json
{
  "stage": "FU"
}
```

**Response 200**: Updated client object

**Errors**: 400, 401, 403, 404

---

### DELETE /api/v1/clients/{id}/
Soft delete a client.

**Headers**: `Authorization: Bearer {access_token}`

**Response 204**: No content

**Errors**: 401, 403, 404

---

## Frontend Service Interface

```typescript
// src/services/api/authApi.ts
export interface AuthApi {
  login(username: string, password: string): Promise<AuthTokens>;
  refreshToken(refresh: string): Promise<AuthTokens>;
  getPermissions(): Promise<PermissionsResponse>;
}

// src/services/api/clientApi.ts
export interface ClientApi {
  list(params?: ClientListParams): Promise<PaginatedResponse<Client>>;
  getById(id: number): Promise<Client>;
  create(data: ClientCreateRequest): Promise<Client>;
  update(id: number, data: ClientUpdateRequest): Promise<Client>;
  delete(id: number): Promise<void>;
  moveToNextStage(id: number): Promise<Client>;
}

export interface ClientListParams {
  page?: number;
  page_size?: number;
  stage?: ClientStage;
  active?: boolean;
  email?: string;
  first_name?: string;
  last_name?: string;
}
```

---

## Error Response Format

All API errors follow this format:

```json
{
  "detail": "Error message",
  "code": "error_code"
}
```

Or for validation errors:

```json
{
  "field_name": ["Error message 1", "Error message 2"],
  "another_field": ["Error message"]
}
```

---

## HTTP Status Codes

| Code | Meaning | When Used |
|------|---------|-----------|
| 200 | OK | Successful GET, PUT, PATCH |
| 201 | Created | Successful POST |
| 204 | No Content | Successful DELETE |
| 400 | Bad Request | Validation error |
| 401 | Unauthorized | Missing/invalid token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
