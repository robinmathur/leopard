from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import django_countries.fields


class Migration(migrations.Migration):
    dependencies = [
        ("immigration", "0005_branch_deleted_at"),
    ]

    operations = [
        migrations.CreateModel(
            name="LPE",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=100, unique=True)),
                ("validity_term", models.PositiveSmallIntegerField(default=0)),
                ("description", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "verbose_name": "language proficiency exam",
                "verbose_name_plural": "language proficiency exams",
                "ordering": ["name"],
                "db_table": "immigration_lpe",
            },
        ),
        migrations.CreateModel(
            name="Passport",
            fields=[
                ("client", models.OneToOneField(db_column="id", on_delete=django.db.models.deletion.CASCADE, primary_key=True, related_name="passport", serialize=False, to="immigration.client")),
                ("passport_no", models.CharField(max_length=20)),
                ("passport_country", django_countries.fields.CountryField(max_length=2)),
                ("date_of_issue", models.DateField(blank=True, null=True)),
                ("date_of_expiry", models.DateField(blank=True, null=True)),
                ("place_of_issue", models.CharField(blank=True, max_length=100)),
                ("country_of_birth", django_countries.fields.CountryField(max_length=2)),
                ("nationality", django_countries.fields.CountryField(max_length=2)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("created_by", models.ForeignKey(blank=True, help_text="User who created this record", null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="passport_created_by", to=settings.AUTH_USER_MODEL)),
                ("updated_by", models.ForeignKey(blank=True, help_text="User who last updated this record", null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="passport_updated_by", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "verbose_name": "passport",
                "db_table": "immigration_passport",
            },
        ),
        migrations.CreateModel(
            name="Qualification",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("course", models.CharField(max_length=100)),
                ("institute", models.CharField(blank=True, max_length=100)),
                ("degree", models.CharField(blank=True, max_length=100)),
                ("field_of_study", models.CharField(blank=True, max_length=100)),
                ("enroll_date", models.DateField(blank=True, null=True)),
                ("completion_date", models.DateField(blank=True, null=True)),
                ("country", django_countries.fields.CountryField(blank=True, max_length=2)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("client", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="qualifications", to="immigration.client")),
                ("created_by", models.ForeignKey(blank=True, help_text="User who created this record", null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="qualification_created_by", to=settings.AUTH_USER_MODEL)),
                ("updated_by", models.ForeignKey(blank=True, help_text="User who last updated this record", null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="qualification_updated_by", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "verbose_name": "qualification",
                "ordering": ["-completion_date", "course"],
                "db_table": "immigration_qualification",
            },
        ),
        migrations.CreateModel(
            name="Proficiency",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("overall_score", models.DecimalField(blank=True, decimal_places=1, max_digits=4, null=True)),
                ("speaking_score", models.DecimalField(blank=True, decimal_places=1, max_digits=4, null=True)),
                ("reading_score", models.DecimalField(blank=True, decimal_places=1, max_digits=4, null=True)),
                ("listening_score", models.DecimalField(blank=True, decimal_places=1, max_digits=4, null=True)),
                ("writing_score", models.DecimalField(blank=True, decimal_places=1, max_digits=4, null=True)),
                ("test_date", models.DateField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("client", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="proficiencies", to="immigration.client")),
                ("created_by", models.ForeignKey(blank=True, help_text="User who created this record", null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="proficiency_created_by", to=settings.AUTH_USER_MODEL)),
                ("test_name", models.ForeignKey(blank=True, help_text="Exam type used for this scorecard", null=True, on_delete=django.db.models.deletion.PROTECT, related_name="proficiencies", to="immigration.lpe")),
                ("updated_by", models.ForeignKey(blank=True, help_text="User who last updated this record", null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="proficiency_updated_by", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "verbose_name": "language proficiency",
                "ordering": ["-test_date", "client_id"],
                "db_table": "immigration_proficiency",
            },
        ),
        migrations.AddIndex(
            model_name="qualification",
            index=models.Index(fields=["client", "completion_date"], name="qualification_client_completion_idx"),
        ),
        migrations.AddIndex(
            model_name="proficiency",
            index=models.Index(fields=["client", "test_date"], name="proficiency_client_test_date_idx"),
        ),
        migrations.AddIndex(
            model_name="proficiency",
            index=models.Index(fields=["test_name"], name="proficiency_test_name_idx"),
        ),
    ]

