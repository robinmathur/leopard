"""
Agent API views using service/selector pattern.

This module provides RESTful API endpoints for agent management with
role-based access control and proper separation of concerns.
"""

from rest_framework import status
from rest_framework.viewsets import ViewSet
from rest_framework.response import Response
from rest_framework.decorators import action
from immigration.authentication import TenantJWTAuthentication
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiParameter

from immigration.api.v1.permissions import RoleBasedPermission
from immigration.pagination import StandardResultsSetPagination
from immigration.api.v1.serializers.agents import (
    AgentOutputSerializer,
    AgentCreateSerializer,
    AgentUpdateSerializer,
)
from immigration.selectors.agents import agent_list, agent_get, deleted_agents_list
from immigration.services.agents import (
    agent_create,
    agent_update,
    agent_delete,
    agent_restore,
    AgentCreateInput,
    AgentUpdateInput
)
from immigration.models.agent import Agent


class CanManageAgents(RoleBasedPermission):
    """
    Permission for agent management operations.
    Requires 'view_agent' permission.
    """
    required_permission = 'immigration.view_agent'


@extend_schema_view(
    list=extend_schema(
        summary="List all agents",
        description="""
        Returns a paginated list of agents with optional filtering.
        
        Note: Agents are not tenant-scoped, so all authenticated users can view all agents.
        
        Query parameters allow filtering by name, type, email, phone, country, etc.
        """,
        parameters=[
            OpenApiParameter(
                name='search',
                type=str,
                description='Search across agent name, email, and phone number (partial match, case-insensitive)',
                required=False,
            ),
            OpenApiParameter(
                name='agent_name',
                type=str,
                description='Filter by agent name (partial match, case-insensitive)',
                required=False,
            ),
            OpenApiParameter(
                name='agent_type',
                type=str,
                description='Filter by agent type',
                required=False,
                enum=['SUPER_AGENT', 'SUB_AGENT'],
            ),
            OpenApiParameter(
                name='email',
                type=str,
                description='Filter by email (partial match, case-insensitive)',
                required=False,
            ),
            OpenApiParameter(
                name='phone_number',
                type=str,
                description='Filter by phone number (partial match)',
                required=False,
            ),
            OpenApiParameter(
                name='country',
                type=str,
                description='Filter by country code (2-letter ISO code)',
                required=False,
            ),
            OpenApiParameter(
                name='include_deleted',
                type=bool,
                description='Include soft-deleted agents in the result set',
                required=False,
            ),
        ],
        responses={
            200: AgentOutputSerializer(many=True),
            401: {'description': 'Unauthorized - Invalid or missing authentication'},
            403: {'description': 'Forbidden - Insufficient permissions'},
        },
        tags=['agents'],
    ),
    create=extend_schema(
        summary="Create a new agent",
        description="""
        Creates a new agent with proper validation.
        
        Business rules:
        - Created_by is automatically set to the requesting user
        - Agent name must be unique
        """,
        request=AgentCreateSerializer,
        responses={
            201: AgentOutputSerializer,
            400: {'description': 'Bad Request - Validation errors'},
            401: {'description': 'Unauthorized'},
            403: {'description': 'Forbidden - Insufficient permissions'},
        },
        tags=['agents'],
    ),
    retrieve=extend_schema(
        summary="Get agent details",
        description="Retrieve details of a specific agent by ID.",
        responses={
            200: AgentOutputSerializer,
            401: {'description': 'Unauthorized'},
            403: {'description': 'Forbidden - Insufficient permissions'},
            404: {'description': 'Not Found - Agent does not exist'},
        },
        tags=['agents'],
    ),
    update=extend_schema(
        summary="Update agent (full update)",
        description="Update all fields of an agent.",
        request=AgentUpdateSerializer,
        responses={
            200: AgentOutputSerializer,
            400: {'description': 'Bad Request - Validation errors'},
            401: {'description': 'Unauthorized'},
            403: {'description': 'Forbidden - Insufficient permissions'},
            404: {'description': 'Not Found'},
        },
        tags=['agents'],
    ),
    partial_update=extend_schema(
        summary="Partial update agent",
        description="Update specific fields of an agent. Only provided fields are updated.",
        request=AgentUpdateSerializer,
        responses={
            200: AgentOutputSerializer,
            400: {'description': 'Bad Request - Validation errors'},
            401: {'description': 'Unauthorized'},
            403: {'description': 'Forbidden - Insufficient permissions'},
            404: {'description': 'Not Found'},
        },
        tags=['agents'],
    ),
    destroy=extend_schema(
        summary="Delete agent (soft delete)",
        description="Soft delete an agent. Sets deleted_at timestamp without removing from database.",
        responses={
            204: {'description': 'No Content - Successfully deleted'},
            401: {'description': 'Unauthorized'},
            403: {'description': 'Forbidden - Insufficient permissions'},
            404: {'description': 'Not Found'},
        },
        tags=['agents'],
    ),
    restore=extend_schema(
        summary="Restore soft-deleted agent",
        description="Restore a previously soft-deleted agent.",
        responses={
            200: AgentOutputSerializer,
            400: {'description': 'Bad Request - Agent is not soft-deleted'},
            401: {'description': 'Unauthorized'},
            403: {'description': 'Forbidden - Insufficient permissions'},
            404: {'description': 'Not Found - Agent does not exist or not soft-deleted'},
        },
        tags=['agents'],
    ),
)
class AgentViewSet(ViewSet):
    """
    ViewSet for agent management using service/selector pattern.

    This ViewSet delegates business logic to services (write operations)
    and selectors (read operations), keeping views thin.
    """

    authentication_classes = [TenantJWTAuthentication]
    permission_classes = [CanManageAgents]
    pagination_class = StandardResultsSetPagination
    
    def list(self, request):
        """
        List all agents with optional filtering.

        GET /api/v1/agents/
        """
        # Extract filters from query params
        filters = {
            'search': request.query_params.get('search'),
            'agent_name': request.query_params.get('agent_name'),
            'agent_type': request.query_params.get('agent_type'),
            'email': request.query_params.get('email'),
            'phone_number': request.query_params.get('phone_number'),
            'country': request.query_params.get('country'),
        }

        # Remove None values
        filters = {k: v for k, v in filters.items() if v is not None}

        # Check if user wants to include soft-deleted agents
        include_deleted = str(
            request.query_params.get('include_deleted', 'false')
        ).lower() in ('true', '1', 'yes', 'on')

        # Get filtered agents using selector
        agents = agent_list(user=request.user, filters=filters, include_deleted=include_deleted)

        # Apply pagination
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(agents, request)
        serializer = AgentOutputSerializer(page, many=True)

        return paginator.get_paginated_response(serializer.data)
    
    def create(self, request):
        """
        Create a new agent.
        
        POST /api/v1/agents/
        """
        # Validate input
        serializer = AgentCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            # Convert to Pydantic model for service
            input_data = AgentCreateInput(**serializer.validated_data)
            
            # Create agent using service
            agent = agent_create(data=input_data, user=request.user)
            
            # Return created agent
            output_serializer = AgentOutputSerializer(agent)
            return Response(output_serializer.data, status=status.HTTP_201_CREATED)
        
        except ValueError as e:
            return Response(
                {'detail': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    def retrieve(self, request, pk=None):
        """
        Get a specific agent by ID.
        
        GET /api/v1/agents/{id}/
        """
        try:
            # Get agent using selector
            agent = agent_get(user=request.user, agent_id=pk)
            
            if not agent:
                return Response(
                    {'detail': 'Agent not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Serialize and return
            serializer = AgentOutputSerializer(agent)
            return Response(serializer.data)
        
        except Agent.DoesNotExist:
            return Response(
                {'detail': 'Agent not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    def update(self, request, pk=None):
        """
        Full update of an agent.
        
        PUT /api/v1/agents/{id}/
        """
        return self._update_agent(request, pk, partial=False)
    
    def partial_update(self, request, pk=None):
        """
        Partial update of an agent.
        
        PATCH /api/v1/agents/{id}/
        """
        return self._update_agent(request, pk, partial=True)
    
    def _update_agent(self, request, pk, partial=False):
        """
        Internal method to handle both full and partial updates.
        """
        try:
            # Get agent using selector
            agent = agent_get(user=request.user, agent_id=pk)
            
            if not agent:
                return Response(
                    {'detail': 'Agent not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Validate input
            serializer = AgentUpdateSerializer(data=request.data, partial=partial)
            serializer.is_valid(raise_exception=True)
            
            # Convert to Pydantic model for service
            input_data = AgentUpdateInput(**serializer.validated_data)
            
            # Update agent using service
            updated_agent = agent_update(
                agent=agent,
                data=input_data,
                user=request.user
            )
            
            # Return updated agent
            output_serializer = AgentOutputSerializer(updated_agent)
            return Response(output_serializer.data)
        
        except Agent.DoesNotExist:
            return Response(
                {'detail': 'Agent not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except ValueError as e:
            return Response(
                {'detail': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    def destroy(self, request, pk=None):
        """
        Soft delete an agent.
        
        DELETE /api/v1/agents/{id}/
        """
        try:
            # Get agent using selector
            agent = agent_get(user=request.user, agent_id=pk)
            
            if not agent:
                return Response(
                    {'detail': 'Agent not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Delete agent using service (soft delete)
            agent_delete(agent=agent, user=request.user)
            
            return Response(status=status.HTTP_204_NO_CONTENT)

        except Agent.DoesNotExist:
            return Response(
                {'detail': 'Agent not found'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=True, methods=['post'], url_path='restore')
    def restore(self, request, pk=None):
        """
        Restore a soft-deleted agent.

        POST /api/v1/agents/{id}/restore/
        """
        try:
            # Fetch agent from soft-deleted list
            agent = deleted_agents_list(user=request.user).get(id=pk)

            # Restore via service to ensure consistent behavior
            restored_agent = agent_restore(agent=agent, user=request.user)

            output_serializer = AgentOutputSerializer(restored_agent)
            return Response(output_serializer.data)

        except Agent.DoesNotExist:
            return Response(
                {'detail': 'Agent not found or not soft-deleted'},
                status=status.HTTP_404_NOT_FOUND
            )
        except ValueError as e:
            return Response(
                {'detail': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
