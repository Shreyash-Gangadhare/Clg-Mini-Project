from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate

from .models import User
from .serializers import StudentRegisterSerializer, UserSerializer


def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    refresh['role'] = user.role
    refresh['name'] = user.name
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }


class StudentAuthView(APIView):
    """POST /api/v1/auth/student/ — returns JWT tokens for students."""
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email', '').lower().strip()
        password = request.data.get('password', '')

        if not email.endswith('@sies.edu.in'):
            return Response({'detail': 'Must be a valid SIES college email.'}, status=400)

        user = authenticate(request, email=email, password=password)
        if not user:
            return Response({'detail': 'Invalid email or password.'}, status=401)

        if user.role not in ('student',):
            return Response({'detail': 'Not a student account. Use staff login.'}, status=403)

        tokens = get_tokens_for_user(user)
        return Response({**tokens, 'user': UserSerializer(user).data})


class StaffAuthView(APIView):
    """POST /api/v1/auth/staff/ — returns JWT tokens for staff/admin."""
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email', '').lower().strip()
        password = request.data.get('password', '')

        user = authenticate(request, email=email, password=password)
        if not user:
            return Response({'detail': 'Invalid credentials.'}, status=401)

        if user.role not in ('staff', 'admin'):
            return Response({'detail': 'Not a staff account. Use student login.'}, status=403)

        tokens = get_tokens_for_user(user)
        return Response({**tokens, 'user': UserSerializer(user).data})


class StudentRegisterView(APIView):
    """POST /api/v1/register/ — register a new student."""
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = StudentRegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            return Response(UserSerializer(user).data, status=201)
        return Response(serializer.errors, status=400)
