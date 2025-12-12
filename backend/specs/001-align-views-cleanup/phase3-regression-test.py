#!/usr/bin/env python3
"""
Regression Smoke Test: Task and Notification Endpoints

This script verifies that the refactored task and notification serializers
maintain backward compatibility with the expected API schemas.

Run: python3 phase3-regression-test.py
"""

import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'leopard.settings')
django.setup()

from immigration.api.v1.serializers.task import (
    TaskOutputSerializer,
    TaskCreateSerializer,
    TaskUpdateSerializer
)
from immigration.api.v1.serializers.notification import (
    NotificationOutputSerializer,
    NotificationCreateSerializer,
    NotificationUpdateSerializer
)
from immigration.constants import TaskPriority, TaskStatus, NotificationType


def test_task_output_serializer():
    """Verify TaskOutputSerializer has all required fields."""
    print("Testing TaskOutputSerializer...")
    
    expected_fields = [
        'id', 'title', 'detail', 'priority', 'priority_display', 'status', 'status_display',
        'due_date', 'assigned_to', 'assigned_to_name', 'assigned_to_full_name',
        'tags', 'comments', 'client_id', 'visa_application_id',
        'completed_at', 'created_at', 'updated_at'
    ]
    
    actual_fields = set(TaskOutputSerializer().fields.keys())
    expected_fields_set = set(expected_fields)
    
    missing = expected_fields_set - actual_fields
    extra = actual_fields - expected_fields_set
    
    if missing:
        print(f"  ✗ FAIL: Missing fields: {missing}")
        return False
    
    if extra:
        print(f"  ⚠ WARNING: Extra fields: {extra}")
    
    # Verify read-only fields
    read_only = TaskOutputSerializer().fields['id'].read_only
    if not read_only:
        print("  ✗ FAIL: 'id' field should be read-only")
        return False
    
    print("  ✓ PASS: All required fields present")
    return True


def test_task_create_serializer():
    """Verify TaskCreateSerializer has all required fields."""
    print("Testing TaskCreateSerializer...")
    
    expected_fields = [
        'title', 'detail', 'priority', 'due_date', 'assigned_to',
        'tags', 'client_id', 'visa_application_id'
    ]
    
    actual_fields = set(TaskCreateSerializer().fields.keys())
    expected_fields_set = set(expected_fields)
    
    missing = expected_fields_set - actual_fields
    
    if missing:
        print(f"  ✗ FAIL: Missing fields: {missing}")
        return False
    
    # Verify priority choices
    priority_field = TaskCreateSerializer().fields['priority']
    expected_choices = set(TaskPriority.values())
    actual_choices = set(c for c in priority_field.choices)
    
    if expected_choices != actual_choices:
        print(f"  ✗ FAIL: Priority choices mismatch. Expected {expected_choices}, got {actual_choices}")
        return False
    
    print("  ✓ PASS: All required fields present with correct validation")
    return True


def test_task_update_serializer():
    """Verify TaskUpdateSerializer has all required fields."""
    print("Testing TaskUpdateSerializer...")
    
    expected_fields = ['title', 'detail', 'priority', 'status', 'due_date', 'tags']
    
    actual_fields = set(TaskUpdateSerializer().fields.keys())
    expected_fields_set = set(expected_fields)
    
    missing = expected_fields_set - actual_fields
    
    if missing:
        print(f"  ✗ FAIL: Missing fields: {missing}")
        return False
    
    # Verify all fields are optional (for PATCH support)
    for field_name in expected_fields:
        field = TaskUpdateSerializer().fields[field_name]
        if field.required:
            print(f"  ✗ FAIL: Field '{field_name}' should be optional (required=False)")
            return False
    
    print("  ✓ PASS: All required fields present and optional")
    return True


def test_notification_output_serializer():
    """Verify NotificationOutputSerializer has all required fields."""
    print("Testing NotificationOutputSerializer...")
    
    expected_fields = [
        'id', 'notification_type', 'notification_type_display',
        'assigned_to', 'assigned_to_name', 'title', 'message',
        'due_date', 'meta_info', 'read', 'read_at', 'is_completed',
        'is_overdue', 'created_at', 'updated_at'
    ]
    
    actual_fields = set(NotificationOutputSerializer().fields.keys())
    expected_fields_set = set(expected_fields)
    
    missing = expected_fields_set - actual_fields
    extra = actual_fields - expected_fields_set
    
    if missing:
        print(f"  ✗ FAIL: Missing fields: {missing}")
        return False
    
    if extra:
        print(f"  ⚠ WARNING: Extra fields (backward compatible): {extra}")
    
    print("  ✓ PASS: All required fields present")
    return True


def test_notification_create_serializer():
    """Verify NotificationCreateSerializer has all required fields."""
    print("Testing NotificationCreateSerializer...")
    
    expected_fields = ['type', 'assigned_to', 'title', 'message', 'due_date', 'meta_info']
    
    actual_fields = set(NotificationCreateSerializer().fields.keys())
    expected_fields_set = set(expected_fields)
    
    missing = expected_fields_set - actual_fields
    
    if missing:
        print(f"  ✗ FAIL: Missing fields: {missing}")
        return False
    
    # Verify type choices
    type_field = NotificationCreateSerializer().fields['type']
    expected_choices = set(NotificationType.values())
    actual_choices = set(c for c in type_field.choices)
    
    if expected_choices != actual_choices:
        print(f"  ✗ FAIL: Type choices mismatch. Expected {expected_choices}, got {actual_choices}")
        return False
    
    print("  ✓ PASS: All required fields present with correct validation")
    return True


def test_notification_update_serializer():
    """Verify NotificationUpdateSerializer has all required fields."""
    print("Testing NotificationUpdateSerializer...")
    
    expected_fields = ['read', 'is_completed']
    
    actual_fields = set(NotificationUpdateSerializer().fields.keys())
    expected_fields_set = set(expected_fields)
    
    missing = expected_fields_set - actual_fields
    
    if missing:
        print(f"  ✗ FAIL: Missing fields: {missing}")
        return False
    
    # Verify all fields are optional
    for field_name in expected_fields:
        field = NotificationUpdateSerializer().fields[field_name]
        if field.required:
            print(f"  ✗ FAIL: Field '{field_name}' should be optional (required=False)")
            return False
    
    print("  ✓ PASS: All required fields present and optional")
    return True


def main():
    """Run all regression tests."""
    print("=" * 60)
    print("Regression Smoke Test: Task and Notification Serializers")
    print("=" * 60)
    print()
    
    tests = [
        ("Task Output Serializer", test_task_output_serializer),
        ("Task Create Serializer", test_task_create_serializer),
        ("Task Update Serializer", test_task_update_serializer),
        ("Notification Output Serializer", test_notification_output_serializer),
        ("Notification Create Serializer", test_notification_create_serializer),
        ("Notification Update Serializer", test_notification_update_serializer),
    ]
    
    results = []
    for test_name, test_func in tests:
        try:
            passed = test_func()
            results.append((test_name, passed))
        except Exception as e:
            print(f"  ✗ EXCEPTION: {e}")
            results.append((test_name, False))
        print()
    
    # Summary
    print("=" * 60)
    print("Summary:")
    print("=" * 60)
    
    passed_count = sum(1 for _, passed in results if passed)
    total_count = len(results)
    
    for test_name, passed in results:
        status = "✓ PASS" if passed else "✗ FAIL"
        print(f"{status}: {test_name}")
    
    print()
    print(f"Total: {passed_count}/{total_count} tests passed")
    
    if passed_count == total_count:
        print()
        print("✅ All regression tests passed! Backward compatibility maintained.")
        return 0
    else:
        print()
        print("❌ Some tests failed. Backward compatibility may be broken.")
        return 1


if __name__ == '__main__':
    sys.exit(main())

