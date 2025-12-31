"""
Temporary script to generate SQL INSERT statements for task data.

Usage:
    python generate_task_inserts.py > task_inserts.sql

Note: You'll need to adjust the foreign key IDs (assigned_to, branch, created_by, etc.)
based on your actual database. Also, make sure to run these in the correct tenant schema.
"""

import random
from datetime import datetime, timedelta

# Task templates
task_templates = [
    ('Follow up with client', 'Contact client regarding application status and answer any questions'),
    ('Review documents', 'Review and verify all submitted documents for completeness and accuracy'),
    ('Prepare application', 'Prepare complete visa application package with all required forms'),
    ('Schedule interview', 'Schedule visa interview appointment with consulate'),
    ('Submit application', 'Submit completed application to immigration authorities'),
    ('Document collection', 'Collect required supporting documents from client'),
    ('Client meeting', 'Meeting to discuss visa options and requirements'),
    ('Application review', 'Internal review of application materials before submission'),
    ('Verify passport validity', 'Check passport expiration date and validity period'),
    ('Obtain police clearance', 'Assist client in obtaining police clearance certificate'),
    ('Medical examination', 'Schedule and coordinate medical examination appointment'),
    ('Financial documentation', 'Review and organize financial evidence documents'),
    ('Translation services', 'Arrange translation of documents if needed'),
    ('Update client status', 'Update client record with latest information'),
    ('Follow up on pending case', 'Check status of submitted application with authorities'),
    ('Prepare appeal documents', 'Prepare documents for visa appeal if rejected'),
    ('Client onboarding', 'Complete initial client onboarding process'),
    ('Visa grant notification', 'Notify client of visa grant and next steps'),
    ('Post-arrival support', 'Provide support for client after visa grant'),
    ('Renewal preparation', 'Prepare documents for visa renewal application'),
    ('Compliance check', 'Verify client compliance with visa conditions'),
    ('Document notarization', 'Arrange for document notarization if required'),
    ('Biometric appointment', 'Schedule biometric data collection appointment'),
    ('Payment processing', 'Process visa application fees and service charges'),
    ('Case file organization', 'Organize and maintain case file documentation'),
]

priorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']
statuses = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']
tag_options = ['urgent', 'follow-up', 'documentation', 'client-meeting', 'application', 'review', 'compliance']

def escape_sql_string(s):
    """Escape single quotes for SQL."""
    return s.replace("'", "''")

def generate_sql_inserts(num_tasks=100, user_ids=None, branch_ids=None, client_ids=None, visa_app_ids=None):
    """
    Generate SQL INSERT statements for tasks.
    
    Args:
        num_tasks: Number of tasks to generate
        user_ids: List of user IDs for assignment (if None, uses placeholders)
        branch_ids: List of branch IDs for assignment (if None, uses placeholders)
        client_ids: List of client IDs for linking (if None, uses placeholders)
        visa_app_ids: List of visa application IDs for linking (if None, uses placeholders)
    """
    if user_ids is None:
        user_ids = [1, 2, 3, 4, 5]  # Placeholder user IDs
    if branch_ids is None:
        branch_ids = [1, 2, 3]  # Placeholder branch IDs
    if client_ids is None:
        client_ids = [1, 2, 3, 4, 5]  # Placeholder client IDs
    if visa_app_ids is None:
        visa_app_ids = [1, 2, 3, 4, 5]  # Placeholder visa application IDs
    
    # Get ContentType IDs (these are usually 1 for Client, 2 for VisaApplication, etc.)
    # You'll need to query: SELECT id, app_label, model FROM django_content_type WHERE model IN ('client', 'visaapplication');
    client_content_type_id = 1  # Adjust based on your database
    visa_app_content_type_id = 2  # Adjust based on your database
    
    now = datetime.now()
    inserts = []
    
    print("-- SQL INSERT statements for immigration_task table")
    print("-- Generated: " + now.strftime("%Y-%m-%d %H:%M:%S"))
    print("-- Note: Adjust foreign key IDs and content_type IDs based on your database")
    print("-- Note: Run these in the appropriate tenant schema context")
    print()
    print("BEGIN;")
    print()
    
    for i in range(1, num_tasks + 1):
        # Random task template
        title, base_detail = random.choice(task_templates)
        
        # Vary the detail
        detail_variations = [
            base_detail,
            f'{base_detail}. Please ensure all requirements are met.',
            f'{base_detail}. This is a high-priority item.',
            f'{base_detail}. Follow up within 24 hours if needed.',
        ]
        detail = random.choice(detail_variations)
        
        # Random priority (weighted)
        priority = random.choices(
            priorities,
            weights=[15, 35, 35, 15]
        )[0]
        
        # Random status (weighted)
        status = random.choices(
            statuses,
            weights=[30, 25, 35, 10]
        )[0]
        
        # Random due date
        days_offset = random.choices(
            [random.randint(-30, -1), random.randint(0, 7), random.randint(8, 30), random.randint(31, 90)],
            weights=[20, 30, 30, 20]
        )[0]
        due_date = now + timedelta(days=days_offset, hours=random.randint(9, 17))
        
        # Random assignment
        assignment_type = random.choices(['user', 'branch', 'unassigned'], weights=[70, 20, 10])[0]
        assigned_to_id = None
        branch_id = None
        
        if assignment_type == 'user' and user_ids:
            assigned_to_id = random.choice(user_ids)
        elif assignment_type == 'branch' and branch_ids:
            branch_id = random.choice(branch_ids)
        
        # Random creator
        created_by_id = random.choice(user_ids) if user_ids else None
        
        # Random assigner
        assigned_by_id = None
        if assigned_to_id and user_ids:
            assigned_by_id = random.choice([u for u in user_ids if u != assigned_to_id] + [assigned_to_id])
        
        # Link to client or visa application (30% chance)
        content_type_id = None
        object_id = None
        if random.random() < 0.3:
            if client_ids and random.random() < 0.6:
                content_type_id = client_content_type_id
                object_id = random.choice(client_ids)
            elif visa_app_ids:
                content_type_id = visa_app_content_type_id
                object_id = random.choice(visa_app_ids)
        
        # Random tags (20% chance)
        tags_json = "'[]'"
        if random.random() < 0.2:
            num_tags = random.randint(1, 3)
            selected_tags = random.sample(tag_options, min(num_tags, len(tag_options)))
            # Convert to JSON array format
            tags_json = "'" + str(selected_tags).replace("'", '"') + "'"
        
        # Comments (empty for now, but you can add some)
        comments_json = "'[]'"
        
        # Set completed_at if status is COMPLETED
        completed_at = None
        if status == 'COMPLETED':
            completed_at = due_date - timedelta(days=random.randint(0, 5), hours=random.randint(1, 8))
        
        # Created and updated timestamps
        created_at = now - timedelta(days=random.randint(0, 60), hours=random.randint(0, 23))
        updated_at = created_at + timedelta(days=random.randint(0, 30), hours=random.randint(0, 12))
        if status == 'COMPLETED' and completed_at:
            updated_at = max(updated_at, completed_at)
        
        # Updated by (might be same as created_by or different)
        updated_by_id = random.choice(user_ids) if user_ids else None
        
        # Build SQL
        sql = f"""INSERT INTO immigration_task (
    title, detail, priority, status, due_date,
    assigned_to_id, branch_id, assigned_by_id,
    created_by_id, created_at, updated_by_id, updated_at,
    content_type_id, object_id, tags, comments, completed_at
) VALUES (
    '{escape_sql_string(title)}',
    '{escape_sql_string(detail)}',
    '{priority}',
    '{status}',
    '{due_date.strftime("%Y-%m-%d %H:%M:%S")}',
    {f'{assigned_to_id}' if assigned_to_id else 'NULL'},
    {f'{branch_id}' if branch_id else 'NULL'},
    {f'{assigned_by_id}' if assigned_by_id else 'NULL'},
    {f'{created_by_id}' if created_by_id else 'NULL'},
    '{created_at.strftime("%Y-%m-%d %H:%M:%S")}',
    {f'{updated_by_id}' if updated_by_id else 'NULL'},
    '{updated_at.strftime("%Y-%m-%d %H:%M:%S")}',
    {f'{content_type_id}' if content_type_id else 'NULL'},
    {f'{object_id}' if object_id else 'NULL'},
    {tags_json},
    {comments_json},
    {f"'{completed_at.strftime('%Y-%m-%d %H:%M:%S')}'" if completed_at else 'NULL'}
);"""
        
        inserts.append(sql)
        print(sql)
    
    print()
    print("COMMIT;")
    print()
    print(f"-- Total: {num_tasks} tasks inserted")
    
    return inserts

if __name__ == '__main__':
    # Generate 100 tasks
    # You can customize the IDs based on your database
    generate_sql_inserts(
        num_tasks=100,
        user_ids=None,  # Replace with actual user IDs: [1, 2, 3, 4, 5]
        branch_ids=None,  # Replace with actual branch IDs: [1, 2, 3]
        client_ids=None,  # Replace with actual client IDs
        visa_app_ids=None  # Replace with actual visa application IDs
    )

