# Testing SSE Notifications Locally (Without Nginx)

**You don't need Nginx for local testing!** This guide shows you how to test the SSE implementation on your local machine.

## Prerequisites

- Django project running
- At least one user account created
- PostgreSQL database running

## Step 1: Start the Server

### Option A: Django Development Server (Easiest)

```bash
cd /Users/robinmathur/Documents/workspace/leopard
python manage.py runserver
```

### Option B: Daphne (Better for async/SSE)

```bash
cd /Users/robinmathur/Documents/workspace/leopard
daphne -b 0.0.0.0 -p 8000 leopard.asgi:application
```

Both work fine, but Daphne has better async support.

## Step 2: Get a JWT Token

Open a new terminal and get your authentication token:

```bash
curl -X POST http://localhost:8000/api/token/ \
  -H "Content-Type: application/json" \
  -d '{"username":"your_username","password":"your_password"}'
```

**Replace `your_username` and `your_password` with your actual credentials.**

You'll get a response like:
```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

**Copy the `access` token** - you'll need it for the next steps.

## Step 3: Test with Browser (Recommended)

### Method 1: Use the Test HTML Page

1. Open `test_sse.html` in your browser:
   ```bash
   open test_sse.html
   # or
   # On Windows: start test_sse.html
   # On Linux: xdg-open test_sse.html
   ```

2. Paste your JWT token in the input field

3. Click "Connect"

4. You should see:
   - Status changes to "Connected ✓"
   - A system message: "Connected to SSE stream"
   - Heartbeat updates every 30 seconds

### Method 2: Browser Developer Console

Open your browser console (F12) and run:

```javascript
const token = 'YOUR_JWT_TOKEN_HERE';
const eventSource = new EventSource(`http://localhost:8000/api/v1/notifications/stream/?token=${token}`);

eventSource.onmessage = (event) => {
    console.log('Received:', JSON.parse(event.data));
};

eventSource.onerror = (error) => {
    console.error('Error:', error);
};
```

## Step 4: Test with curl (Terminal)

Open a new terminal window:

```bash
# Replace YOUR_TOKEN with your actual JWT token
curl -N -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8000/api/v1/notifications/stream/
```

**Expected output:**
```
data: {"type": "connection_established", "message": "SSE connection established", "user_id": 1}

data: {"type": "heartbeat", "timestamp": "2025-12-08T..."}

data: {"type": "heartbeat", "timestamp": "2025-12-08T..."}
```

The connection will stay open, showing heartbeats every 30 seconds.

## Step 5: Trigger a Notification

While your SSE connection is open, trigger a notification in another terminal:

### Method A: Create a Task (Recommended)

```bash
curl -X POST http://localhost:8000/api/v1/tasks/create/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test SSE Notification",
    "detail": "This task will trigger a real-time notification",
    "assigned_to": 1,
    "due_date": "2025-12-10T12:00:00Z",
    "priority": "HIGH"
  }'
```

**Change `assigned_to` to your user ID!**

### Method B: Django Shell

```bash
python manage.py shell
```

Then run:

```python
from django.contrib.auth import get_user_model
from django.utils import timezone
from immigration.services.tasks import task_create

User = get_user_model()
user = User.objects.first()  # Or get your specific user

task = task_create(
    title="Test Notification",
    detail="Testing SSE real-time delivery",
    assigned_to=user,
    due_date=timezone.now() + timezone.timedelta(days=1),
    priority="HIGH",
    created_by=user
)

print(f"Task created! Check your SSE connection for notification.")
```

## Expected Results

**When you create a task, you should IMMEDIATELY see:**

In your SSE connection (curl or browser):
```json
data: {
  "id": 123,
  "notification_type": "TASK_ASSIGNED",
  "title": "New Task Assigned: Test SSE Notification",
  "message": "A new high priority task has been assigned to you.",
  "due_date": "2025-12-10T12:00:00Z",
  "meta_info": {"task_id": 456, "priority": "HIGH"},
  "read": false,
  "created_at": "2025-12-08T..."
}
```

## Troubleshooting

### 1. "Authentication credentials were not provided"

**Problem**: Token not being passed correctly

**Solutions**:
- Make sure you copied the `access` token (not `refresh`)
- For curl: Use `-H "Authorization: Bearer YOUR_TOKEN"`
- For browser: Use query parameter `?token=YOUR_TOKEN`
- Check token hasn't expired (tokens expire after a set time)

### 2. Connection closes immediately

**Problem**: Usually authentication or server issue

**Check**:
```bash
# Test if server is running
curl http://localhost:8000/api/v1/notifications/

# Check server logs for errors
# Look at the terminal where you ran runserver/daphne
```

### 3. No notifications received

**Problem**: Task not assigned to correct user

**Solution**:
```python
# In Django shell, check your user ID
from django.contrib.auth import get_user_model
User = get_user_model()
user = User.objects.get(username='your_username')
print(f"Your user ID is: {user.id}")

# Use this ID in the assigned_to field
```

### 4. "Connection to localhost refused"

**Problem**: Server not running

**Solution**:
```bash
# Start the server
python manage.py runserver
# or
daphne -b 0.0.0.0 -p 8000 leopard.asgi:application
```

### 5. Database connection errors

**Problem**: PostgreSQL not running or wrong credentials

**Solution**:
```bash
# Check if PostgreSQL is running
# On Mac:
brew services list | grep postgresql

# On Linux:
sudo systemctl status postgresql

# Start if needed:
brew services start postgresql  # Mac
sudo systemctl start postgresql  # Linux
```

## Testing Checklist

- [ ] Server starts without errors
- [ ] Can get JWT token via `/api/token/`
- [ ] SSE connection establishes successfully
- [ ] Heartbeat messages appear every 30 seconds
- [ ] Creating a task triggers immediate notification
- [ ] Notification appears in SSE stream within 2 seconds
- [ ] Multiple tasks create multiple notifications
- [ ] Connection stays alive for extended period

## Advanced Testing

### Test with Multiple Users

1. Open two browser windows with the test HTML page
2. Login as User A in window 1
3. Login as User B in window 2
4. Assign a task to User A - only window 1 should get notification
5. Assign a task to User B - only window 2 should get notification

### Test Connection Stability

```bash
# Keep connection open for 5 minutes
curl -N -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8000/api/v1/notifications/stream/ &

# Wait 5 minutes, should see heartbeats
# Then create a task - notification should still arrive
```

### Load Testing

```python
# In Django shell - create 10 rapid-fire notifications
from django.contrib.auth import get_user_model
from django.utils import timezone
from immigration.services.tasks import task_create

User = get_user_model()
user = User.objects.first()

for i in range(10):
    task_create(
        title=f"Load Test Task {i+1}",
        detail=f"Testing notification delivery #{i+1}",
        assigned_to=user,
        due_date=timezone.now() + timezone.timedelta(days=1),
        priority="MEDIUM",
        created_by=user
    )
```

All 10 notifications should arrive in real-time!

## Production Considerations

When you deploy to production **with Nginx**, you'll need:

1. **Nginx Configuration**: Already done in `deployment/nginx/nginx.conf`
2. **Redis Channel Layer**: Replace InMemoryChannelLayer with Redis
3. **Multiple Workers**: Daphne can handle multiple workers with Redis

But for **local development**, the current setup (InMemoryChannelLayer + single worker) works perfectly!

## Next Steps

Once you've verified SSE works locally:

1. Test with real use cases (assigning tasks between users)
2. Test with mobile app/frontend integration
3. Consider adding more notification types (visa updates, client assignments, etc.)
4. Plan Redis integration for production deployment

---

**Questions or Issues?** Check the server logs where you ran `runserver` or `daphne` for detailed error messages.

