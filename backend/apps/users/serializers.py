from rest_framework import serializers
from .models import User, validate_sies_email


class StudentRegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = User
        fields = ['name', 'email', 'roll_number', 'phone', 'password']

    def validate_email(self, value):
        validate_sies_email(value)
        return value

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(**validated_data, role=User.ROLE_STUDENT)
        user.set_password(password)
        user.save()
        return user


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'name', 'email', 'roll_number', 'phone', 'role']
