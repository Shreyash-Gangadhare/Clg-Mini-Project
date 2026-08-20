"""
seed_data — populate DB with demo menu items, one staff user, today's slots.
Usage: python manage.py seed_data [--reset]
"""
from datetime import datetime, timedelta, time
from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.users.models import User
from apps.menu.models import MenuItem
from apps.slots.models import Slot, SlotItemCapacity


MENU_FIXTURES = [
    dict(name='Vada Pav', description="Mumbai's iconic street food — spiced potato fritter in a soft bun with chutneys", price='15.00', category='ready_stock', prep_time_minutes=0, veg_flag=True),
    dict(name='Misal Pav', description='Spicy sprouted moth beans curry topped with farsan, onions, tomatoes — served with pav', price='45.00', category='made_to_order', prep_time_minutes=8, veg_flag=True),
    dict(name='Poha', description='Flattened rice tempered with mustard seeds, curry leaves, onion, and turmeric', price='30.00', category='ready_stock', prep_time_minutes=0, veg_flag=True),
    dict(name='Samosa (2 pcs)', description='Crispy fried pastry filled with spiced potato and peas, served with green chutney', price='20.00', category='ready_stock', prep_time_minutes=0, veg_flag=True),
    dict(name='Cold Coffee', description='Blended iced coffee with milk and sugar — thick, creamy, and chilled', price='40.00', category='ready_stock', prep_time_minutes=0, veg_flag=True),
    dict(name='Masala Chai', description='Strong black tea brewed with ginger, cardamom, cinnamon, and milk', price='12.00', category='ready_stock', prep_time_minutes=0, veg_flag=True),
    dict(name='Cutting Chai', description='Half-glass strong masala tea — the quintessential Mumbai quick-fix', price='10.00', category='ready_stock', prep_time_minutes=0, veg_flag=True),
    dict(name='Veg Sandwich', description='Toasted bread with cucumber, tomato, potato, cheese, and green chutney', price='35.00', category='made_to_order', prep_time_minutes=5, veg_flag=True),
    dict(name='Paneer Sandwich', description='Grilled sandwich stuffed with spiced cottage cheese, peppers, and onions', price='55.00', category='made_to_order', prep_time_minutes=7, veg_flag=True),
    dict(name='Chicken Sandwich', description='Grilled chicken tikka sandwich with lettuce, mayo, and green chutney', price='70.00', category='made_to_order', prep_time_minutes=7, veg_flag=False),
    dict(name='Maggi', description='2-minute noodles cooked with masala, veggies, and a dash of butter', price='30.00', category='made_to_order', prep_time_minutes=5, veg_flag=True),
    dict(name='Veg Fried Rice', description='Wok-tossed basmati rice with seasonal vegetables, soy sauce, and egg-free', price='60.00', category='made_to_order', prep_time_minutes=10, veg_flag=True),
    dict(name='Paneer Fried Rice', description='Wok-tossed rice with golden paneer cubes, bell peppers, and house sauce', price='75.00', category='made_to_order', prep_time_minutes=10, veg_flag=True),
    dict(name="Today's Special: Pav Bhaji", description='Buttery mashed vegetable curry served sizzling on a tawa with toasted butter pav', price='55.00', category='made_to_order', prep_time_minutes=12, veg_flag=True),
    dict(name='Lemon Soda', description='Chilled sparkling water with freshly squeezed lemon, black salt, and sugar', price='25.00', category='ready_stock', prep_time_minutes=0, veg_flag=True),
]


class Command(BaseCommand):
    help = 'Seed the database with demo menu items, staff user, and today\'s slots'

    def add_arguments(self, parser):
        parser.add_argument('--reset', action='store_true', help='Delete all existing data first')

    def handle(self, *args, **options):
        if options['reset']:
            MenuItem.objects.all().delete()
            Slot.objects.all().delete()
            User.objects.filter(role__in=['staff', 'admin']).delete()
            self.stdout.write(self.style.WARNING('Existing data cleared.'))

        # ── Menu items ───────────────────────────────────
        created_menu = 0
        for item_data in MENU_FIXTURES:
            _, created = MenuItem.objects.get_or_create(name=item_data['name'], defaults=item_data)
            if created:
                created_menu += 1
        self.stdout.write(self.style.SUCCESS(f'Menu: {created_menu} items created ({MenuItem.objects.count()} total)'))

        # ── Staff user ───────────────────────────────────
        if not User.objects.filter(email='admin@sies.edu.in').exists():
            User.objects.create_user(
                email='admin@sies.edu.in',
                name='Canteen Admin',
                password='admin123',
                role='admin',
                is_staff=True,
            )
            self.stdout.write(self.style.SUCCESS('Staff user created: admin@sies.edu.in / admin123'))
        else:
            self.stdout.write(self.style.WARNING('Staff user already exists: admin@sies.edu.in'))

        # Demo student user
        if not User.objects.filter(email='arjun.sharma@sies.edu.in').exists():
            User.objects.create_user(
                email='arjun.sharma@sies.edu.in',
                name='Arjun Sharma',
                password='student123',
                role='student',
                roll_number='CS2021001',
                phone='9876543210',
            )
            self.stdout.write(self.style.SUCCESS('Demo student created: arjun.sharma@sies.edu.in / student123'))

        # ── Today's slots ────────────────────────────────
        today = timezone.now().date()
        slot_count = 0
        for h in range(8, 17):
            for m in range(0, 60, 15):
                start = time(h, m)
                end_h, end_m = (h, m + 15) if m + 15 < 60 else (h + 1, 0)
                end = time(end_h, end_m)
                dt_start = timezone.make_aware(datetime.combine(today, start))
                cutoff = dt_start - timedelta(minutes=30)

                slot, created = Slot.objects.get_or_create(
                    date=today,
                    start_time=start,
                    defaults={'end_time': end, 'cutoff_time': cutoff}
                )
                if created:
                    slot_count += 1

                    # Seed capacities for each item
                    for item in MenuItem.objects.all():
                        max_units = 50 if item.category == 'ready_stock' else 20
                        # Demo near-cap: Vada Pav in 12:00 slot
                        if item.name == 'Vada Pav' and slot.start_time == time(12, 0):
                            SlotItemCapacity.objects.get_or_create(
                                slot=slot, menu_item=item,
                                defaults={'max_units': 2, 'units_booked': 1}
                            )
                        else:
                            SlotItemCapacity.objects.get_or_create(
                                slot=slot, menu_item=item,
                                defaults={'max_units': max_units}
                            )

        self.stdout.write(self.style.SUCCESS(f'Slots: {slot_count} created for {today}'))
        self.stdout.write(self.style.SUCCESS('Seed complete!'))
