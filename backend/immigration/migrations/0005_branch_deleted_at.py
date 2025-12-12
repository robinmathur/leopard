"""Add soft deletion support to Branch model."""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("immigration", "0004_task_remove_application_application_type_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="branch",
            name="deleted_at",
            field=models.DateTimeField(
                null=True,
                blank=True,
                editable=False,
                help_text="Timestamp when record was soft-deleted",
            ),
        ),
        migrations.AddIndex(
            model_name="branch",
            index=models.Index(fields=["deleted_at"], name="immigration_branch_deleted_at_idx"),
        ),
    ]

