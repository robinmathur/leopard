"""
Note views for API layer.

These views handle HTTP requests for note endpoints.
Business logic lives in services - views are thin wrappers.
"""

from rest_framework import status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes

from immigration.models import Note
from immigration.services.notes import (
    note_list,
    note_create,
    note_update,
    note_delete,
    note_get,
)
from immigration.api.v1.serializers.note import (
    NoteOutput,
    NoteCreateRequest,
    NoteUpdateRequest,
)
from immigration.pagination import StandardResultsSetPagination
# from immigration.permissions import HasPermission


class NoteViewSet(viewsets.ModelViewSet):
    """
    ViewSet for note endpoints.
    
    Provides full CRUD operations for notes with permission checks.
    
    Permissions:
    - List/Retrieve: Authenticated users
    - Create: immigration.add_note
    - Update: immigration.change_note (or note author)
    - Delete: immigration.delete_note (or note author)
    """
    
    serializer_class = NoteOutput
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination
    
    def get_queryset(self):
        """
        Get notes with optional filtering by client or author.
        """
        client_id = self.request.query_params.get('client')
        author_id = self.request.query_params.get('author')
        
        return note_list(
            client_id=int(client_id) if client_id else None,
            author_id=int(author_id) if author_id else None,
            user=self.request.user
        )
    
    def get_serializer_class(self):
        """
        Return appropriate serializer class based on action.
        """
        if self.action == 'create':
            return NoteCreateRequest
        elif self.action in ['update', 'partial_update']:
            return NoteUpdateRequest
        return NoteOutput
    
    @extend_schema(
        summary="List notes",
        description="Get all notes accessible by the authenticated user. Can filter by client or author.",
        parameters=[
            OpenApiParameter(
                name='client',
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY,
                description='Filter by client ID',
                required=False,
            ),
            OpenApiParameter(
                name='author',
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY,
                description='Filter by author user ID',
                required=False,
            ),
        ],
        responses={200: NoteOutput(many=True)},
    )
    def list(self, request, *args, **kwargs):
        """List notes with optional filters."""
        return super().list(request, *args, **kwargs)
    
    @extend_schema(
        summary="Create note",
        description="Create a new note for a client. Requires 'add_note' permission.",
        request=NoteCreateRequest,
        responses={
            201: NoteOutput,
            400: {'description': 'Validation error'},
            403: {'description': 'Missing add_note permission'},
        },
    )
    def create(self, request, *args, **kwargs):
        """
        Create a new note.
        
        Permission check: immigration.add_note
        """
        # Check permission
        if not request.user.has_perm('immigration.add_note'):
            return Response(
                {'detail': 'You do not have permission to add notes.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Create note via service
        try:
            note = note_create(
                client_id=serializer.validated_data['client'],
                content=serializer.validated_data['content'],
                author=request.user
            )
        except Exception as e:
            return Response(
                {'detail': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Return created note
        output_serializer = NoteOutput(note, context={'request': request})
        return Response(output_serializer.data, status=status.HTTP_201_CREATED)
    
    @extend_schema(
        summary="Get note details",
        description="Retrieve a specific note by ID.",
        responses={
            200: NoteOutput,
            404: {'description': 'Note not found'},
        },
    )
    def retrieve(self, request, *args, **kwargs):
        """Retrieve a note by ID."""
        return super().retrieve(request, *args, **kwargs)
    
    @extend_schema(
        summary="Update note (full)",
        description="Update a note. Requires 'change_note' permission or being the note author.",
        request=NoteUpdateRequest,
        responses={
            200: NoteOutput,
            400: {'description': 'Validation error'},
            403: {'description': 'Missing change_note permission'},
            404: {'description': 'Note not found'},
        },
    )
    def update(self, request, *args, **kwargs):
        """Update a note (PUT)."""
        return self._update_note(request, *args, **kwargs)
    
    @extend_schema(
        summary="Update note (partial)",
        description="Partially update a note. Requires 'change_note' permission or being the note author.",
        request=NoteUpdateRequest,
        responses={
            200: NoteOutput,
            400: {'description': 'Validation error'},
            403: {'description': 'Missing change_note permission'},
            404: {'description': 'Note not found'},
        },
    )
    def partial_update(self, request, *args, **kwargs):
        """Update a note (PATCH)."""
        return self._update_note(request, *args, **kwargs)
    
    def _update_note(self, request, *args, **kwargs):
        """Common update logic for PUT and PATCH."""
        note_instance = self.get_object()
        
        serializer = self.get_serializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        
        # Update note via service (includes permission check)
        try:
            updated_note = note_update(
                note_id=note_instance.id,
                content=serializer.validated_data.get('content', note_instance.content),
                user=request.user
            )
        except PermissionError as e:
            return Response(
                {'detail': str(e)},
                status=status.HTTP_403_FORBIDDEN
            )
        except Exception as e:
            return Response(
                {'detail': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Return updated note
        output_serializer = NoteOutput(updated_note, context={'request': request})
        return Response(output_serializer.data)
    
    @extend_schema(
        summary="Delete note",
        description="Delete a note (hard delete). Requires 'delete_note' permission or being the note author.",
        responses={
            204: {'description': 'Note deleted successfully'},
            403: {'description': 'Missing delete_note permission'},
            404: {'description': 'Note not found'},
        },
    )
    def destroy(self, request, *args, **kwargs):
        """
        Delete a note.
        
        Permission check: immigration.delete_note or note author
        """
        note_instance = self.get_object()
        
        # Delete note via service (includes permission check)
        try:
            note_delete(note_id=note_instance.id, user=request.user)
        except PermissionError as e:
            return Response(
                {'detail': str(e)},
                status=status.HTTP_403_FORBIDDEN
            )
        
        return Response(status=status.HTTP_204_NO_CONTENT)
