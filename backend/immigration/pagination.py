from rest_framework.pagination import PageNumberPagination


# This pagination will apply to all views where explicitly pagination_class not set.
# Default page_size is driven by PAGE_SIZE in setting.py
class GenericPageNumberPagination(PageNumberPagination):
    page_size_query_param = 'page_size'


class StandardResultsSetPagination(PageNumberPagination):
    """
    Standard pagination for all API endpoints.
    
    Returns 25 items per page by default with pagination metadata:
    - count: Total number of items
    - next: URL to next page (or null)
    - previous: URL to previous page (or null)
    - results: Array of items for current page
    """
    page_size = 25
    page_size_query_param = 'page_size'
    max_page_size = 100


class ClientPageNumberPagination(GenericPageNumberPagination):
    page_size = 200
    max_page_size = 500


class NotificationPagination(GenericPageNumberPagination):
    page_size = 10
    max_page_size = 50
