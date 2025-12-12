# Quick Start Guide

## 🚀 Get Started in 2 Minutes

### 1. Start the Development Server

The server is already running! Open your browser to:

**http://localhost:5173/**

### 2. Login with Test Accounts

Try different user roles to see how permissions work:

| Role | Email | Features |
|------|-------|----------|
| **Super Admin** | admin@immigrationcrm.com | ✓ All features, see everything |
| **Branch Manager** | manager@immigrationcrm.com | ✓ Manage branch, limited admin |
| **Agent** | agent@immigrationcrm.com | ✓ Manage clients/applications |
| **Intern** | intern@immigrationcrm.com | ✓ Read-only access |

**Password for all accounts**: `password123`

### 3. Explore the Features

After logging in, try these actions:

1. **Click around the sidebar** - Notice how different roles see different menu items
2. **Go to Clients page** - See the phone numbers:
   - Admin/Manager/Agent can see them
   - Intern sees `[Restricted]`
3. **Try to access Agent page** - Only Super Admin can see this
4. **Check the buttons** - Create/Edit buttons hide for roles without permission

## 🎯 Key Features to Test

### Permission-Based UI

```
Super Admin → Sees everything
    ↓
Branch Manager → Cannot see Agent Management
    ↓
Agent → Cannot see financial data, limited editing
    ↓
Intern → Read-only, contact info redacted
```

### What Changes Based on Role

**Navigation (Sidebar)**
- Dashboard ✓ (Everyone)
- Clients ✓ (Everyone except some can't edit)
- Leads ✓ (Everyone except Intern can't edit)
- Visa Applications ✓ (Everyone)
- Institute ✓ (Everyone)
- Agent ✗ (Super Admin only)

**Data Fields**
- Phone numbers: Visible to Agent+, hidden/redacted for Intern
- Financial data: Visible to Manager+, hidden for Agent/Intern
- Edit buttons: Only shown to users with edit permission

**Action Buttons**
- "Add Client" button: Only users with `create_client` permission
- "Edit" buttons: Only users with `edit_client` permission
- "Delete" buttons: Only users with `delete_client` permission

## 🔧 Making Changes

### Add a New Page

1. Create component in `src/pages/YourPage/YourPage.tsx`
2. Add route in `src/App.tsx`
3. Add to navigation in `src/components/layout/navigation.config.ts`

### Add Permission Control

```tsx
import { Protect } from '@/components/protected/Protect';

// Hide completely
<Protect permission="view_finance">
  <FinancialData />
</Protect>

// Show as [Restricted]
<Protect permission="view_contact_info" fallback="redact">
  {client.phone}
</Protect>
```

## 📚 Next Steps

1. **Read ARCHITECTURE.md** - Understand the system design
2. **Read RBAC_GUIDE.md** - Learn permission system in detail
3. **Read DEVELOPMENT.md** - Complete development guide

## 🎨 UI Design Notes

This application uses **Compact Mode** for high data density:

- All components use `size="small"`
- Reduced spacing and padding
- Smaller fonts (13px base)
- More data on screen

This is intentional for a high-volume business tool!

## 🔐 Security Reminder

⚠️ **Client-side permission checks are for UX only!**

Always validate permissions on your backend API. Never trust the frontend for security.

## 📦 Project Structure

```
src/
├── auth/              # Authentication & permissions
├── components/        # Reusable components
│   ├── layout/       # App layout (AppBar, Sidebar)
│   └── protected/    # <Protect> component
├── pages/            # Page components
├── store/            # Zustand state management
└── theme/            # MUI theme (compact mode)
```

## 🐛 Common Issues

**"Cannot find module '@/...'"**
- Restart TypeScript: Cmd+Shift+P → Restart TS Server

**"Permission not working"**
- Check spelling matches exactly
- Verify role has permission in `auth/types.ts`

**"Navigation item not showing"**
- Check `navigation.config.ts` has correct permission
- Verify user role includes that permission

## 💡 Tips

1. **Test all 4 roles** - Each has different capabilities
2. **Check the Clients page** - Best example of field-level permissions
3. **Try to access /agent route as non-admin** - See page-level protection
4. **Look at the code** - Well-commented and organized

## 🎓 Learning Path

1. ✅ Start dev server (Done!)
2. ✅ Login and explore UI
3. 📖 Read RBAC_GUIDE.md for permission examples
4. 📖 Read ARCHITECTURE.md for system design
5. 🔨 Start building your own features!

## Need Help?

- Check the documentation in `ARCHITECTURE.md`, `RBAC_GUIDE.md`, `DEVELOPMENT.md`
- All components are well-commented
- Look at existing pages as examples

---

**You're all set! Start exploring the application.** 🎉

