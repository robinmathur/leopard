from django.contrib import admin
# Temporarily disabled during refactoring - models being migrated to new structure
# from immigration.client.passport import Passport
# from immigration.client.lpe import LPE
# from immigration.institute import Institute, InstituteLocation, InstituteIntake, CourseLevel, Course, BroadField, \
#     NarrowField
# from immigration.visa.visa_category import VisaCategory
from immigration.models import Agent, Client, VisaCategory, VisaType, VisaApplication
# from immigration import notification, task
# from immigration.client import client, experience, proficiency, qualification
# from immigration.client.history import client_history
# from immigration.application import application_type, application_stage, application
# from immigration.visa import visa_type, visa_application


# Register your models here.
@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    list_display = ["first_name", "last_name", "email"]


@admin.register(VisaCategory)
class VisaCategoryAdmin(admin.ModelAdmin):
    list_display = ["name", "code"]


@admin.register(VisaType)
class VisaTypeAdmin(admin.ModelAdmin):
    list_display = ["visa_category", "name", "code"]


@admin.register(VisaApplication)
class VisaApplicationAdmin(admin.ModelAdmin):
    list_display = ["client", "visa_type", "status", "date_applied"]
    list_filter = ["status", "visa_type__visa_category"]
    search_fields = ["client__first_name", "client__last_name", "transaction_reference_no"]


@admin.register(Agent)
class AgentAdmin(admin.ModelAdmin):
    list_display = ["agent_name", "agent_type", "phone_number", "email"]


# Temporarily disabled during refactoring - old models
# @admin.register(Institute)
# class InstituteAdmin(admin.ModelAdmin):
#     list_display = ["name", "short_name", "phone", "website"]
#     fields = ["name", "short_name", "phone", "website", "created_by", "created_at", "updated_by", "updated_at"]
#     readonly_fields = ["created_by", "updated_by", "created_at", "updated_at"]
#
#
# @admin.register(Passport)
# class PassportAdmin(admin.ModelAdmin):
#     pass
#
#
# @admin.register(LPE)
# class LPEAdmin(admin.ModelAdmin):
#     list_display = ["name", "validity_term"]
#
#
# @admin.register(proficiency.Proficiency)
# class ProficiencyAdmin(admin.ModelAdmin):
#     pass
#
#
# @admin.register(qualification.Qualification)
# class QualificationAdmin(admin.ModelAdmin):
#     pass
#
#
# @admin.register(experience.Experience)
# class ExperienceAdmin(admin.ModelAdmin):
#     pass


# Temporarily disabled during refactoring - models being refactored
# @admin.register(agent.Agent)
# class AgentAdmin(admin.ModelAdmin):
#     list_display = ["id", "agent_name", 'agent_type', "phone_number", "email", "state", "country", "created_by"]
#     readonly_fields = ["created_by", "updated_by", "created_at", "updated_at"]
#
#
# @admin.register(VisaCategory)
# class VisaCategoryAdmin(admin.ModelAdmin):
#     list_display = ["name"]
#     readonly_fields = ["created_by", "updated_by", "created_at", "updated_at"]
#
#
# @admin.register(InstituteLocation)
# class InstituteLocationAdmin(admin.ModelAdmin):
#     list_display = ["state", "institute"]
#
#
# @admin.register(InstituteIntake)
# class InstituteIntakeAdmin(admin.ModelAdmin):
#     list_display = ["intake_date", "institute"]
#
#
# @admin.register(Course)
# class CourseAdmin(admin.ModelAdmin):
#     list_display = ["name", "level", "institute", "broad_field", "narrow_field"]
#
#
# @admin.register(BroadField)
# class BroadFieldAdmin(admin.ModelAdmin):
#     list_display = ["name"]
#
#
# @admin.register(NarrowField)
# class NarrowFieldAdmin(admin.ModelAdmin):
#     list_display = ["name", "broad_field"]
#
#
# @admin.register(CourseLevel)
# class CourseLevelAdmin(admin.ModelAdmin):
#     list_display = ["name"]
#
#
# @admin.register(notification.Notification)
# class NotificationAdmin(admin.ModelAdmin):
#     list_display = ["type", "due_date", "created_at"]
#
#
# @admin.register(application_type.ApplicationType)
# class ApplicationTypeAdmin(admin.ModelAdmin):
#     list_display = ['title', 'currency', 'tax_name']
#
#
# @admin.register(application.Application)
# class ApplicationAdmin(admin.ModelAdmin):
#     list_display = ["client", "course"]
#
#
# @admin.register(application_stage.ApplicationStage)
# class ApplicationStageAdmin(admin.ModelAdmin):
#     list_display = ['application_type', 'stage_name', 'position_index']
#
#
# @admin.register(visa_type.VisaType)
# class VisaTypeAdmin(admin.ModelAdmin):
#     list_display = ['visa_category', 'visa_type', 'sub_class', 'visa_service_fee', 'immigration_fee']
#
#
# @admin.register(visa_application.VisaApplication)
# class VisaApplicationAdmin(admin.ModelAdmin):
#     list_display = ['client', 'visa_type']
#
#
# @admin.register(client_history.ClientHistory)
# class ClientHistoryAdmin(admin.ModelAdmin):
#     list_display = ['id']
#
# @admin.register(branch.Branch)
# class BranchAdmin(admin.ModelAdmin):
#     list_display = ["name", 'created_at']
#
#
# @admin.register(task.Task)
# class TaskAdmin(admin.ModelAdmin):
#     list_display = ["id", "title", 'created_by']