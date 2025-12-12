"""
Services for client supporting data (passport, qualifications, proficiency).
"""

from datetime import date
from typing import Optional

from django.db import transaction
from pydantic import BaseModel, Field, validator

from immigration.models import (
    LPE,
    Passport,
    Proficiency,
    Qualification,
)
from immigration.selectors.clients import client_get


class PassportInput(BaseModel):
    client_id: int
    passport_no: str = Field(..., max_length=20)
    passport_country: str = Field(..., min_length=2, max_length=2)
    date_of_issue: Optional[date] = None
    date_of_expiry: Optional[date] = None
    place_of_issue: Optional[str] = Field(None, max_length=100)
    country_of_birth: str = Field(..., min_length=2, max_length=2)
    nationality: str = Field(..., min_length=2, max_length=2)

    class Config:
        str_strip_whitespace = True


class LPEInput(BaseModel):
    name: str = Field(..., max_length=100)
    validity_term: int = Field(0, ge=0, le=100)
    description: Optional[str] = ""

    class Config:
        str_strip_whitespace = True


class ProficiencyInput(BaseModel):
    client_id: int
    test_name_id: int
    overall_score: Optional[float] = None
    speaking_score: Optional[float] = None
    reading_score: Optional[float] = None
    listening_score: Optional[float] = None
    writing_score: Optional[float] = None
    test_date: Optional[date] = None

    @validator(
        "overall_score",
        "speaking_score",
        "reading_score",
        "listening_score",
        "writing_score",
    )
    def validate_score(cls, value):
        if value is None:
            return value
        if value < 0 or value > 9:
            raise ValueError("Scores must be between 0 and 9")
        return value


class QualificationInput(BaseModel):
    client_id: int
    course: str = Field(..., max_length=100)
    institute: Optional[str] = Field(None, max_length=100)
    degree: Optional[str] = Field(None, max_length=100)
    field_of_study: Optional[str] = Field(None, max_length=100)
    enroll_date: Optional[date] = None
    completion_date: Optional[date] = None
    country: Optional[str] = Field(None, min_length=2, max_length=2)

    class Config:
        str_strip_whitespace = True


@transaction.atomic
def passport_upsert(*, data: PassportInput, user) -> Passport:
    """
    Create or update a passport for a client within the user's scope.
    """
    client = client_get(user=user, client_id=data.client_id)
    defaults = {
        "passport_no": data.passport_no,
        "passport_country": data.passport_country,
        "date_of_issue": data.date_of_issue,
        "date_of_expiry": data.date_of_expiry,
        "place_of_issue": data.place_of_issue or "",
        "country_of_birth": data.country_of_birth,
        "nationality": data.nationality,
        "created_by": user,
        "updated_by": user,
    }

    passport, created = Passport.objects.select_for_update().get_or_create(
        client=client,
        defaults=defaults,
    )

    if not created:
        # Update fields when record already exists
        passport.passport_no = data.passport_no
        passport.passport_country = data.passport_country
        passport.date_of_issue = data.date_of_issue
        passport.date_of_expiry = data.date_of_expiry
        passport.place_of_issue = data.place_of_issue or ""
        passport.country_of_birth = data.country_of_birth
        passport.nationality = data.nationality
        passport.updated_by = user

    passport.full_clean()
    passport.save()

    return passport


@transaction.atomic
def lpe_create(*, data: LPEInput, user) -> LPE:
    """
    Create a new language proficiency exam definition.
    """
    exam = LPE(
        name=data.name,
        validity_term=data.validity_term,
        description=data.description or "",
    )
    exam.full_clean()
    exam.save()
    return exam


@transaction.atomic
def lpe_update(*, exam: LPE, data: LPEInput, user) -> LPE:
    """
    Update an existing language proficiency exam.
    """
    exam.name = data.name
    exam.validity_term = data.validity_term
    exam.description = data.description or ""
    exam.full_clean()
    exam.save()
    return exam


@transaction.atomic
def lpe_delete(*, exam: LPE, user) -> None:
    exam.delete()


@transaction.atomic
def proficiency_create(*, data: ProficiencyInput, user) -> Proficiency:
    """
    Create a language proficiency record with scope validation.
    """
    client = client_get(user=user, client_id=data.client_id)
    try:
        exam = LPE.objects.get(id=data.test_name_id)
    except LPE.DoesNotExist as exc:
        raise ValueError(f"LPE with id={data.test_name_id} does not exist") from exc

    proficiency = Proficiency(
        client=client,
        test_name=exam,
        overall_score=data.overall_score,
        speaking_score=data.speaking_score,
        reading_score=data.reading_score,
        listening_score=data.listening_score,
        writing_score=data.writing_score,
        test_date=data.test_date,
        created_by=user,
        updated_by=user,
    )
    proficiency.full_clean()
    proficiency.save()
    return proficiency


@transaction.atomic
def proficiency_update(*, proficiency: Proficiency, data: ProficiencyInput, user) -> Proficiency:
    """
    Update an existing proficiency record.
    """
    if data.client_id != proficiency.client_id:
        # Enforce scope via client resolution
        client_get(user=user, client_id=data.client_id)
        proficiency.client_id = data.client_id

    if proficiency.test_name_id != data.test_name_id:
        try:
            exam = LPE.objects.get(id=data.test_name_id)
        except LPE.DoesNotExist as exc:
            raise ValueError(f"LPE with id={data.test_name_id} does not exist") from exc
        proficiency.test_name = exam

    proficiency.overall_score = data.overall_score
    proficiency.speaking_score = data.speaking_score
    proficiency.reading_score = data.reading_score
    proficiency.listening_score = data.listening_score
    proficiency.writing_score = data.writing_score
    proficiency.test_date = data.test_date
    proficiency.updated_by = user

    proficiency.full_clean()
    proficiency.save()
    return proficiency


@transaction.atomic
def proficiency_delete(*, proficiency: Proficiency, user) -> None:
    proficiency.delete()


@transaction.atomic
def qualification_create(*, data: QualificationInput, user) -> Qualification:
    """
    Create a qualification record scoped to the user's client access.
    """
    client = client_get(user=user, client_id=data.client_id)
    qualification = Qualification(
        client=client,
        course=data.course,
        institute=data.institute or "",
        degree=data.degree or "",
        field_of_study=data.field_of_study or "",
        enroll_date=data.enroll_date,
        completion_date=data.completion_date,
        country=data.country or "",
        created_by=user,
        updated_by=user,
    )
    qualification.full_clean()
    qualification.save()
    return qualification


@transaction.atomic
def qualification_update(*, qualification: Qualification, data: QualificationInput, user) -> Qualification:
    """
    Update a qualification record.
    """
    if qualification.client_id != data.client_id:
        client_get(user=user, client_id=data.client_id)
        qualification.client_id = data.client_id

    qualification.course = data.course
    qualification.institute = data.institute or ""
    qualification.degree = data.degree or ""
    qualification.field_of_study = data.field_of_study or ""
    qualification.enroll_date = data.enroll_date
    qualification.completion_date = data.completion_date
    qualification.country = data.country or ""
    qualification.updated_by = user

    qualification.full_clean()
    qualification.save()
    return qualification


@transaction.atomic
def qualification_delete(*, qualification: Qualification, user) -> None:
    qualification.delete()
