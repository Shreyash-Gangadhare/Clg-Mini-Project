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


# 72 items — ported from frontend/src/api/mock/fixtures.js (2026-08-21)
# Each entry maps directly to MenuItem model fields.
# `category` values: 'ready_stock' | 'made_to_order' (Django model choices)
MENU_FIXTURES = [
    # ── HOT REFRESHMENTS ──────────────────────────────────────────
    dict(name='Tea',                     description="Classic cutting chai — strong, milky, and spiced just right for that 9 AM lecture survival",                          price='10.00',  category='ready_stock',  prep_time_minutes=2,  veg_flag=True),
    dict(name='Coffee',                  description="Hot milk coffee, South Indian style — rich, aromatic, and dangerously addictive",                                     price='15.00',  category='ready_stock',  prep_time_minutes=2,  veg_flag=True),
    dict(name='Filter Coffee',           description="Authentic South Indian drip coffee — dark decoction, frothy milk, served in a davara set",                           price='25.00',  category='ready_stock',  prep_time_minutes=3,  veg_flag=True),

    # ── FAST FOOD / SNACKS ────────────────────────────────────────
    dict(name='Vadapav',                 description="Mumbai's soul food — crispy batata vada in a pav with garlic chutney. The OG street snack",                          price='18.00',  category='ready_stock',  prep_time_minutes=0,  veg_flag=True),
    dict(name='Potato Vada',             description="Golden spiced potato fritter, straight out of the kadai — best eaten scorching hot",                                 price='15.00',  category='ready_stock',  prep_time_minutes=0,  veg_flag=True),
    dict(name='Samosa',                  description="Crispy triangle of joy — spiced potato-pea filling, fried to golden perfection",                                     price='16.00',  category='ready_stock',  prep_time_minutes=0,  veg_flag=True),
    dict(name='Samosa Pav',              description="Samosa meets pav in the greatest crossover since any Avengers movie",                                                price='20.00',  category='ready_stock',  prep_time_minutes=0,  veg_flag=True),
    dict(name='Dhokla',                  description="Soft, spongy Gujarati steamed delight — tempered with mustard seeds and curry leaves",                               price='35.00',  category='ready_stock',  prep_time_minutes=0,  veg_flag=True),
    dict(name='Bhaji One Plate',         description="Mixed vegetable bhaji with a generous ghee finish — pairs with anything, honestly",                                  price='40.00',  category='ready_stock',  prep_time_minutes=0,  veg_flag=True),
    dict(name='Bhaji Pav',               description="Buttery bhaji with soft pav — because some problems are solved with carbs and ghee",                                 price='25.00',  category='ready_stock',  prep_time_minutes=0,  veg_flag=True),
    dict(name='Patice',                  description="Aloo-stuffed fried cutlet, crispy shell, soft spiced interior — a canteen classic",                                  price='25.00',  category='ready_stock',  prep_time_minutes=0,  veg_flag=True),
    dict(name='Misal Pav',               description="Spicy moth beans gravy, farsan on top, pav on the side — Maharashtra's proudest export",                            price='60.00',  category='made_to_order', prep_time_minutes=8,  veg_flag=True),

    # ── BREAKFAST ─────────────────────────────────────────────────
    dict(name='Upma',                    description="Soft semolina upma tempered with mustard, cashews, and curry leaves — breakfast done right",                         price='40.00',  category='ready_stock',  prep_time_minutes=0,  veg_flag=True),
    dict(name='Poha',                    description="Flattened rice with mustard seeds, onion, turmeric and lemon — the breakfast that never fails",                      price='40.00',  category='ready_stock',  prep_time_minutes=0,  veg_flag=True),
    dict(name='Sabudana Khichdi',        description="Pearl sago stir-fried with peanuts, green chilli, and ghee — comfort in every bite",                                 price='50.00',  category='ready_stock',  prep_time_minutes=0,  veg_flag=True),
    dict(name='Sabudana Vada',           description="Crispy sago and peanut fritter — airy outside, pillowy inside, served with mint chutney",                           price='50.00',  category='ready_stock',  prep_time_minutes=0,  veg_flag=True),

    # ── USAL SNACKS ───────────────────────────────────────────────
    dict(name='Vada Usal Single',        description="One vada dunked in spicy sprouted bean curry — for when one is somehow enough",                                      price='45.00',  category='ready_stock',  prep_time_minutes=0,  veg_flag=True),
    dict(name='Vada Usal with 2 Pav',   description="Vada usal upgraded — now with pav. This is the combo that powers exam season",                                       price='60.00',  category='ready_stock',  prep_time_minutes=0,  veg_flag=True),
    dict(name='Samosa Usal Single',      description="A samosa drowning in usal curry — this crossover lives rent-free in our hearts",                                     price='50.00',  category='ready_stock',  prep_time_minutes=0,  veg_flag=True),
    dict(name='Usal with 2 Pav',         description="Hot sprouted bean gravy, two soft pav on the side — the Maharashtrian power lunch",                                  price='60.00',  category='ready_stock',  prep_time_minutes=0,  veg_flag=True),

    # ── SOUTH INDIAN ──────────────────────────────────────────────
    dict(name='Idli Sambar',             description="Two steamed rice cakes with piping hot tamarind sambar and coconut chutney on the side",                            price='40.00',  category='ready_stock',  prep_time_minutes=0,  veg_flag=True),
    dict(name='Medu Vada',               description="Crispy fried lentil doughnuts with sambar — South India's answer to the perfect snack",                              price='50.00',  category='ready_stock',  prep_time_minutes=0,  veg_flag=True),
    dict(name='Sada Dosa',               description="Thin, crispy plain dosa — pure and unadulterated. Served with sambar + two chutneys",                               price='50.00',  category='made_to_order', prep_time_minutes=5,  veg_flag=True),
    dict(name='Masala Dosa',             description="Crispy dosa stuffed with spiced potato masala — the original Indian street crepe",                                   price='60.00',  category='made_to_order', prep_time_minutes=7,  veg_flag=True),
    dict(name='Cheese Masala Dosa',      description="Masala dosa with a generous cheese blanket — because everything is better with cheese",                              price='80.00',  category='made_to_order', prep_time_minutes=8,  veg_flag=True),
    dict(name='Chinese Dosa',            description="Dosa stuffed with Indo-Chinese filling — a Mumbai college invention that works perfectly",                           price='70.00',  category='made_to_order', prep_time_minutes=8,  veg_flag=True),
    dict(name='Rava Dosa',               description="Lacy, crispy semolina crepe — netting-like texture that holds its crunch beautifully",                              price='55.00',  category='made_to_order', prep_time_minutes=7,  veg_flag=True),
    dict(name='Rava Masala Dosa',        description="Crispy rava dosa stuffed with potato masala — texture upgrade on a classic",                                         price='70.00',  category='made_to_order', prep_time_minutes=8,  veg_flag=True),
    dict(name='Set Dosa',                description="Three soft, spongy mini-dosas served as a set — lighter and fluffier than the classic",                              price='60.00',  category='made_to_order', prep_time_minutes=7,  veg_flag=True),
    dict(name='Cheese Masala Rava Dosa', description="The final form — rava dosa + masala + cheese. Peak dosa evolution achieved",                                         price='85.00',  category='made_to_order', prep_time_minutes=10, veg_flag=True),
    dict(name='Uttapam',                 description="Thick, soft rice pancake topped with onion and tomato — breakfast royalty from the South",                           price='50.00',  category='made_to_order', prep_time_minutes=7,  veg_flag=True),
    dict(name='Onion Uttapam',           description="Uttapam loaded with caramelised onions — sweet, soft, and deeply satisfying",                                        price='60.00',  category='made_to_order', prep_time_minutes=7,  veg_flag=True),
    dict(name='Masala Uttapam',          description="Uttapam with spiced masala topping — a complete meal that doesn't apologise for being filling",                       price='60.00',  category='made_to_order', prep_time_minutes=8,  veg_flag=True),

    # ── INDIAN MEALS ──────────────────────────────────────────────
    dict(name='Poori Bhaji',             description="Puffy deep-fried poori with spiced potato bhaji — weekend vibes on a weekday",                                       price='70.00',  category='made_to_order', prep_time_minutes=8,  veg_flag=True),
    dict(name='Chapati Bhaji',           description="Soft wheat chapatis with mixed vegetable bhaji — the wholesome homestyle meal",                                      price='70.00',  category='made_to_order', prep_time_minutes=8,  veg_flag=True),
    dict(name='Dal Rice',                description="Simple yellow dal with steamed rice — the meal that gets you through a 3-hour lab session",                          price='70.00',  category='made_to_order', prep_time_minutes=5,  veg_flag=True),
    dict(name='Dal Khichdi',             description="Slow-cooked lentil-rice porridge with ghee drizzle — comfort food for the soul",                                     price='80.00',  category='made_to_order', prep_time_minutes=8,  veg_flag=True),
    dict(name='Lunch Thali',             description="Full canteen thali — dal, sabzi, rice, chapati, papad, and pickle. Eat well, study harder",                          price='150.00', category='made_to_order', prep_time_minutes=10, veg_flag=True),

    # ── INDO-CHINESE ──────────────────────────────────────────────
    dict(name='Manchurian',              description="Crispy veggie balls tossed in Indo-Chinese manchurian sauce — not Chinese, definitely delicious",                    price='30.00',  category='made_to_order', prep_time_minutes=8,  veg_flag=True),
    dict(name='Manchurian Pav',          description="Manchurian gravy served in a pav. Mumbai fusion at its most unhinged and glorious",                                  price='35.00',  category='made_to_order', prep_time_minutes=8,  veg_flag=True),
    dict(name='Manchurian Gravy',        description="Manchurian in a thick, saucy gravy — the version you pour over everything else",                                     price='60.00',  category='made_to_order', prep_time_minutes=10, veg_flag=True),
    dict(name='Fried Rice',              description="Wok-tossed vegetable fried rice — the Indo-Chinese staple that never gets old",                                      price='70.00',  category='made_to_order', prep_time_minutes=10, veg_flag=True),
    dict(name='Schezwan Rice',           description="Fiery schezwan-tossed rice — for when regular fried rice just isn't exciting enough",                                price='80.00',  category='made_to_order', prep_time_minutes=10, veg_flag=True),
    dict(name='Manchurian Rice',         description="Fried rice topped with manchurian — the combo that orders itself",                                                   price='90.00',  category='made_to_order', prep_time_minutes=12, veg_flag=True),
    dict(name='Hakka Noodles',           description="Stir-fried noodles with crisp veggies and soy sauce — the campus Indo-Chinese classic",                              price='70.00',  category='made_to_order', prep_time_minutes=10, veg_flag=True),
    dict(name='Schezwan Noodles',        description="Hakka noodles hit with schezwan chilli paste — spicy, punchy, completely worth it",                                  price='80.00',  category='made_to_order', prep_time_minutes=10, veg_flag=True),
    dict(name='Manchurian Noodles',      description="Noodles + manchurian in a single bowl — the double threat combo that packs a punch",                                price='90.00',  category='made_to_order', prep_time_minutes=12, veg_flag=True),

    # ── SANDWICHES ────────────────────────────────────────────────
    dict(name='Plain Sandwich',          description="Simple bread sandwich with butter and green chutney — the reliable baseline",                                        price='35.00',  category='ready_stock',  prep_time_minutes=3,  veg_flag=True),
    dict(name='Toast Sandwich',          description="Toasted bread with fresh veggies and chutney — crispy edges, soft filling",                                          price='40.00',  category='ready_stock',  prep_time_minutes=4,  veg_flag=True),
    dict(name='Cheese Sandwich',         description="Generously cheesed sandwich — because cheese solves most problems",                                                  price='60.00',  category='ready_stock',  prep_time_minutes=4,  veg_flag=True),
    dict(name='Masala Sandwich',         description="Sandwich with spiced potato masala filling — the canteen cult favourite",                                             price='60.00',  category='ready_stock',  prep_time_minutes=4,  veg_flag=True),
    dict(name='Cheese Masala Sandwich',  description="Masala sandwich, now with molten cheese — the upgrade you didn't know you needed",                                   price='70.00',  category='ready_stock',  prep_time_minutes=5,  veg_flag=True),
    dict(name='Bread Butter',            description="Sliced bread with butter — humble, reliable, and honestly sometimes exactly what you need",                          price='25.00',  category='ready_stock',  prep_time_minutes=0,  veg_flag=True),
    dict(name='Toast Bread Butter',      description="Toasted bread with butter — one step above plain, infinitely more satisfying",                                       price='30.00',  category='ready_stock',  prep_time_minutes=2,  veg_flag=True),
    dict(name='Cheese Toast Sandwich',   description="Toasted sandwich oozing with cheese — the one your roommate always steals a bite of",                                price='70.00',  category='ready_stock',  prep_time_minutes=5,  veg_flag=True),
    dict(name='Grill Sandwich',          description="Press-grilled sandwich with vegetable filling and signature chutney — proper lunch energy",                          price='100.00', category='made_to_order', prep_time_minutes=7,  veg_flag=True),
    dict(name='Cheese Grill Sandwich',   description="Grilled sandwich stuffed with vegetables and cheese — the canteen's premium tier sandwich",                           price='120.00', category='made_to_order', prep_time_minutes=8,  veg_flag=True),
    dict(name='Masala Cheese Grill Sandwich', description="The premium sandwich — masala potato + melted cheese + grill marks. The final boss",                            price='170.00', category='made_to_order', prep_time_minutes=10, veg_flag=True),

    # ── EXTRAS ────────────────────────────────────────────────────
    dict(name='Extra Pav',               description="One extra pav — because one pav is never enough and we respect that",                                               price='5.00',   category='ready_stock',  prep_time_minutes=0,  veg_flag=True),
    dict(name='Extra Butter Pav',        description="Pav with butter. You already know. No explanation required",                                                        price='10.00',  category='ready_stock',  prep_time_minutes=0,  veg_flag=True),
    dict(name='Extra Poori',             description="One extra fluffy puri — for when the bhaji-to-puri ratio isn't adding up",                                          price='5.00',   category='ready_stock',  prep_time_minutes=0,  veg_flag=True),
    dict(name='Extra Chappati',          description="One extra soft chapati — because some meals just need one more round",                                               price='7.00',   category='ready_stock',  prep_time_minutes=0,  veg_flag=True),

    # ── COLD REFRESHMENTS ─────────────────────────────────────────
    dict(name='Mosambi Juice',           description="Fresh sweet lime juice — the only cure for a 2 PM crash between double lectures",                                   price='30.00',  category='ready_stock',  prep_time_minutes=2,  veg_flag=True),
    dict(name='Pineapple Juice',         description="Chilled pineapple juice — tropical, sweet, and dangerously refreshing",                                             price='30.00',  category='ready_stock',  prep_time_minutes=2,  veg_flag=True),
    dict(name='Orange Juice',            description="Fresh-pressed orange juice — vitamin C for when assignments have destroyed your immune system",                      price='30.00',  category='ready_stock',  prep_time_minutes=2,  veg_flag=True),
    dict(name='Watermelon Juice',        description="Cold watermelon juice — summer in a glass. Makes Mumbai heat survivable",                                            price='30.00',  category='ready_stock',  prep_time_minutes=2,  veg_flag=True),
    dict(name='Milkshake',               description="Thick, creamy blended milkshake — the meal replacement you didn't know you needed",                                 price='40.00',  category='ready_stock',  prep_time_minutes=3,  veg_flag=True),
    dict(name='Cold Drink (200ml)',      description="Glass-bottled cold drink — chilled carbonation for an instant mood reset",                                          price='15.00',  category='ready_stock',  prep_time_minutes=0,  veg_flag=True),
    dict(name='Buttermilk (Chaas)',      description="Chilled spiced buttermilk — the South Asian answer to post-meal satisfaction",                                      price='15.00',  category='ready_stock',  prep_time_minutes=1,  veg_flag=True),
    dict(name='Sweet Lassi',             description="Thick, sweet yogurt drink — Punjab's finest contribution to canteen culture",                                       price='25.00',  category='ready_stock',  prep_time_minutes=2,  veg_flag=True),
    dict(name='Bisleri (Small)',         description="Cold mineral water 250ml — hydration, basic but non-negotiable",                                                    price='10.00',  category='ready_stock',  prep_time_minutes=0,  veg_flag=True),
    dict(name='Bisleri (Big)',           description="Cold mineral water 1 litre — because a small water isn't going to cut it today",                                    price='20.00',  category='ready_stock',  prep_time_minutes=0,  veg_flag=True),
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
