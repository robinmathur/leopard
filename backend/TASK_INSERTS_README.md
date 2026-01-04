# Task Data INSERT Scripts

This directory contains scripts to generate SQL INSERT statements for task data.

## Files

- `generate_task_inserts.py` - Python script to generate SQL INSERT statements
- `task_inserts_sample.sql` - Sample generated SQL file with 100 tasks

## Usage

### Option 1: Use the Generated Sample File

1. **Adjust the foreign key IDs** in `task_inserts_sample.sql`:
   - `assigned_to_id` - User IDs from your `immigration_user` table
   - `branch_id` - Branch IDs from your `immigration_branch` table
   - `created_by_id`, `updated_by_id`, `assigned_by_id` - User IDs
   - `content_type_id` - ContentType IDs (query: `SELECT id, app_label, model FROM django_content_type WHERE model IN ('client', 'visaapplication');`)
   - `object_id` - Client or VisaApplication IDs

2. **Run in the correct tenant schema**:
   ```sql
   -- For a specific tenant schema
   SET search_path TO tenant_global;
   
   -- Then run the INSERT statements
   \i task_inserts_sample.sql
   ```

### Option 2: Generate Custom SQL

1. **Edit the script** to set your actual IDs:
   ```python
   generate_sql_inserts(
       num_tasks=100,
       user_ids=[1, 2, 3, 4, 5],  # Your actual user IDs
       branch_ids=[1, 2, 3],      # Your actual branch IDs
       client_ids=[1, 2, 3, ...],  # Your actual client IDs
       visa_app_ids=[1, 2, 3, ...] # Your actual visa application IDs
   )
   ```

2. **Run the script**:
   ```bash
   python generate_task_inserts.py > task_inserts_custom.sql
   ```

3. **Execute the SQL** in your tenant schema

## Important Notes

1. **Multi-tenant**: Make sure to run these in the correct tenant schema context
2. **Foreign Keys**: All foreign key IDs must exist in your database
3. **ContentType IDs**: You need to query your `django_content_type` table to get the correct IDs for Client and VisaApplication models
4. **Constraints**: The task model has a constraint that `assigned_to` and `branch` cannot both be set (one must be NULL)

## Query ContentType IDs

```sql
SELECT id, app_label, model 
FROM django_content_type 
WHERE model IN ('client', 'visaapplication');
```

## Example: Get User and Branch IDs

```sql
-- Get user IDs
SELECT id, username FROM immigration_user LIMIT 10;

-- Get branch IDs  
SELECT id, name FROM immigration_branch LIMIT 10;
```

## PostgreSQL Schema Context

For multi-tenant setup, you need to set the schema:

```sql
-- Set schema for tenant
SET search_path TO tenant_global;

-- Or use schema-qualified table name
INSERT INTO tenant_global.immigration_task (...) VALUES (...);
```

