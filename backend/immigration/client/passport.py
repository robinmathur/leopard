from django.db import models
from django_countries.fields import CountryField
from rest_framework import serializers, viewsets

from immigration.client.client import Client


class Passport(models.Model):
    id = models.OneToOneField(Client, primary_key=True, on_delete=models.CASCADE, )
    passport_no = models.CharField(max_length=10)
    passport_country = CountryField()
    date_of_issue = models.DateField(blank=True, null=True)
    date_of_expiry = models.DateField(blank=True, null=True)
    place_of_issue = models.CharField(blank=True, null=True)
    country_of_birth = CountryField()
    nationality = CountryField()

    class Meta:
        verbose_name = "passport"


class PassportSerializer(serializers.ModelSerializer):
    class Meta:
        model = Passport
        fields = '__all__'


class PassportViewSet(viewsets.ModelViewSet):
    queryset = Passport.objects.all()
    serializer_class = PassportSerializer
