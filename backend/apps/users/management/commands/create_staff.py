"""
create_staff — create a staff user for the canteen.
Usage: python manage.py create_staff --email admin@sies.edu.in --name "Canteen Admin" --password secret123
"""
from django.core.management.base import BaseCommand
from apps.users.models import User


class Command(BaseCommand):
    help = 'Create a staff/admin user for the canteen portal'

    def add_arguments(self, parser):
        parser.add_argument('--email', required=True, help='Staff email address')
        parser.add_argument('--name', required=True, help='Full name')
        parser.add_argument('--password', required=True, help='Login password')
        parser.add_argument('--role', default='staff', choices=['staff', 'admin'], help='Role (default: staff)')

    def handle(self, *args, **options):
        email = options['email'].lower().strip()
        name = options['name']
        password = options['password']
        role = options['role']

        if User.objects.filter(email=email).exists():
            self.stdout.write(self.style.WARNING(f'User {email} already exists — updating password.'))
            user = User.objects.get(email=email)
            user.set_password(password)
            user.role = role
            user.is_staff = True
            user.save()
        else:
            user = User.objects.create_user(
                email=email,
                name=name,
                password=password,
                role=role,
                is_staff=True,
            )
            self.stdout.write(self.style.SUCCESS(f'Staff user created: {user.email} [{role}]'))
