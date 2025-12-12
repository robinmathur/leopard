from datetime import datetime
import uuid


class HistoryManager:
    @staticmethod
    def generate_history_entry(history_type, meta_data):
        history_entry = {
            "id": str(uuid.uuid4()),
            "type": history_type,
            "created_at": datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            "meta_data": meta_data
        }

        return history_entry

    @staticmethod
    def client_created(created_by):
        return HistoryManager.generate_history_entry(
            history_type="CLIENT_CREATED",
            meta_data={
                "changed_by": {
                    "id": created_by.id,
                    "name": created_by.first_name,
                    "type": "USER"
                }
            }
        )

    @staticmethod
    def client_status_changed(from_status, to_status, changed_by):
        return HistoryManager.generate_history_entry(
            history_type="STATUS_CHANGED",
            meta_data={
                "from_status": from_status,
                "to_status": to_status,
                "changed_by": {
                    "id": changed_by.id,
                    "name": changed_by.first_name,
                    "type": "USER"
                }
            }
        )

    @staticmethod
    def client_assigned(assigned_to, assigned_from, assigned_by):
        return HistoryManager.generate_history_entry(
            history_type="CLIENT_ASSIGNED",
            meta_data={
                "assigned_to": {
                    "id": assigned_to.id,
                    "name": assigned_to.first_name,
                    "type": "USER"
                },
                "assigned_from": {
                    "id": assigned_from.id,
                    "name": assigned_from.first_name,
                    "type": "USER"
                } if assigned_from else None,
                "assigned_by": {
                    "id": assigned_by.id,
                    "name": assigned_by.first_name,
                    "type": "USER"
                }
            }
        )

    @staticmethod
    def reminder_note_added(content, reminder_date):
        return HistoryManager.generate_history_entry(
            history_type="REMINDER_NOTE",
            meta_data={
                "content": content,
                "reminder_date": str(reminder_date)
            }
        )

    @staticmethod
    def application_created(application, created_by, assigned_to: None):
        return HistoryManager.generate_history_entry(
            history_type="APPLICATION_CREATED",
            meta_data={
                "application": {
                    "id": application.id,
                    "name": "Application",
                    "type": "APPLICATION"
                },
                "created_by": {
                    "id": created_by.id,
                    "name": created_by.first_name,
                    "type": "USER"
                },
                "course": {
                    "id": application.course.id,
                    "name": application.course.name,
                    "type": "COURSE"
                },
                "institute": {
                    "id": application.institute.id,
                    "name": application.institute.name,
                    "type": "INSTITUTE"
                },
                "tuition_fee": str(application.total_tuition_fee),
                "intake_date": application.start_date.intake_date.strftime('%Y-%m-%d'),
                "assigned_to": {
                    "id": assigned_to.id,
                    "name": assigned_to.first_name,
                    "type": "USER"
                } if assigned_to else None
            }
        )

    @staticmethod
    def application_assigned(application, created_by, assigned_to, assigned_from: None):
        return HistoryManager.generate_history_entry(
            history_type="APPLICATION_ASSIGNED",
            meta_data={
                "application": {
                    "id": application.id,
                    "name": "Application",
                    "type": "APPLICATION"
                },
                "course": {
                    "id": application.course.id,
                    "name": application.course.name,
                    "type": "COURSE"
                },
                "institute": {
                    "id": application.institute.id,
                    "name": application.institute.name,
                    "type": "INSTITUTE"
                },
                "assigned_to": {
                    "id": assigned_to.id,
                    "name": assigned_to.first_name,
                    "type": "USER"
                },
                "assigned_from": {
                    "id": assigned_from.id,
                    "name": assigned_from.first_name,
                    "type": "USER"
                } if assigned_from else None,
                "assigned_by": {
                    "id": created_by.id,
                    "name": created_by.first_name,
                    "type": "USER"
                }
            }
        )

    @staticmethod
    def visa_application_created(visa_application, created_by, assigned_to: None):
        return HistoryManager.generate_history_entry(
            history_type="VISA_APPLICATION_CREATED",
            meta_data={
                "visa_application": {
                    "id": visa_application.id,
                    "name": "Visa Application",
                    "type": "VISA_APPLICATION"
                },
                "assigned_to": {
                    "id": assigned_to.id,
                    "name": assigned_to.first_name,
                    "type": "USER"
                } if assigned_to else None,
                "created_by": {
                    "id": created_by.id,
                    "name": created_by.first_name,
                    "type": "USER"
                }
            }
        )

    @staticmethod
    def visa_application_assigned(visa_application, assigned_to, assigned_from, assigned_by):
        return HistoryManager.generate_history_entry(
            history_type="VISA_APPLICATION_ASSIGNED",
            meta_data={
                "visa_application": {
                    "id": visa_application.id,
                    "name": "Visa Application",
                    "type": "VISA_APPLICATION"
                },
                "assigned_to": {
                    "id": assigned_to.id,
                    "name": assigned_to.first_name,
                    "type": "USER"
                },
                "assigned_from": {
                    "id": assigned_from.id,
                    "name": assigned_from.first_name,
                    "type": "USER"
                } if assigned_from else None,
                "assigned_by": {
                    "id": assigned_by.id,
                    "name": assigned_by.first_name,
                    "type": "USER"
                }
            }
        )

    @staticmethod
    def visa_application_status_changed(visa_application, from_status, to_status, changed_by):
        return HistoryManager.generate_history_entry(
            history_type="VISA_APPLICATION_STATUS_CHANGED",
            meta_data={
                "visa_application": {
                    "id": visa_application.id,
                    "name": "Visa Application",
                    "type": "VISA_APPLICATION"
                },
                "from_status": from_status,
                "to_status": to_status,
                "changed_by": {
                    "id": changed_by.id,
                    "name": changed_by.first_name,
                    "type": "USER"
                }
            }
        )

    # Add other history type methods similarly
