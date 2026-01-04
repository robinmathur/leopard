"""
Comment parsing service for @mention functionality.

This service handles parsing @mentions from comment text and resolving
usernames to user IDs.
"""

import re
from typing import List, Dict, Optional
from django.contrib.auth import get_user_model

User = get_user_model()


def parse_mentions(text: str) -> List[Dict[str, any]]:
    """
    Parse @mentions from comment text.
    
    Extracts @username patterns and resolves them to user IDs.
    
    Args:
        text: Comment text that may contain @mentions
        
    Returns:
        List of mention dicts with:
        - user_id: User ID
        - username: Username
        - start_pos: Start position in text
        - end_pos: End position in text
        
    Example:
        >>> text = "Please review @john.doe and @jane.smith"
        >>> mentions = parse_mentions(text)
        >>> # Returns:
        >>> # [
        >>> #     {'user_id': 5, 'username': 'john.doe', 'start_pos': 15, 'end_pos': 24},
        >>> #     {'user_id': 7, 'username': 'jane.smith', 'start_pos': 29, 'end_pos': 39}
        >>> # ]
    """
    mentions = []
    
    # Pattern to match @username (allows alphanumeric, dots, underscores, hyphens)
    # @username should be followed by whitespace, punctuation, or end of string
    pattern = r'@([a-zA-Z0-9._-]+)(?=\s|[,;:!?.]|$)'
    
    for match in re.finditer(pattern, text):
        username = match.group(1)
        start_pos = match.start()
        end_pos = match.end()
        
        # Try to resolve username to user
        try:
            user = User.objects.get(username=username)
            mentions.append({
                'user_id': user.id,
                'username': user.username,
                'full_name': f"{user.first_name} {user.last_name}".strip() or user.username,
                'start_pos': start_pos,
                'end_pos': end_pos,
            })
        except User.DoesNotExist:
            # Username not found - skip this mention
            # Could log this or handle differently based on requirements
            pass
    
    return mentions

