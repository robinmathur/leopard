# Quick SSE Test Guide (30 seconds)

## 1. Start Server
```bash
cd /Users/robinmathur/Documents/workspace/leopard
python manage.py runserver
```

## 2. Get Token (New Terminal)
```bash
curl -X POST http://localhost:8000/api/token/ \
  -H "Content-Type: application/json" \
  -d '{"username":"YOUR_USERNAME","password":"YOUR_PASSWORD"}'
```
Copy the `access` token from the response.

## 3. Test SSE (Browser - EASIEST)
```bash
open test_sse.html
```
1. Paste your token
2. Click "Connect"
3. Should see "Connected ✓"

## 4. Trigger Notification (New Terminal)
```bash
curl -X POST http://localhost:8000/api/v1/tasks/create/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Task",
    "detail": "Testing SSE",
    "assigned_to": 1,
    "due_date": "2025-12-10T12:00:00Z",
    "priority": "HIGH"
  }'
```
**Change `assigned_to` to your user ID!**

## 5. Verify
You should see the notification appear **immediately** in your browser!

---

## Alternative: Test with curl
```bash
# Terminal 1: Connect to SSE
curl -N -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8000/api/v1/notifications/stream/

# Terminal 2: Create task (use command from step 4)
```

## Get Your User ID
```bash
python manage.py shell
```
```python
from django.contrib.auth import get_user_model
User = get_user_model()
user = User.objects.get(username='your_username')
print(user.id)  # Use this in assigned_to field
```

---

**✅ Success**: Notification appears within 2 seconds  
**❌ Failed**: Check `TESTING_SSE_LOCALLY.md` for troubleshooting

