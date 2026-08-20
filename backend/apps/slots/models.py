from django.db import models
from django.utils import timezone


class Slot(models.Model):
    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    cutoff_time = models.DateTimeField()  # orders not accepted after this

    class Meta:
        db_table = 'slots'
        ordering = ['date', 'start_time']
        unique_together = ['date', 'start_time']

    def __str__(self):
        return f'{self.date} {self.start_time}–{self.end_time}'

    @property
    def is_open(self):
        return timezone.now() < self.cutoff_time

    @property
    def start_time_str(self):
        return self.start_time.strftime('%H:%M')

    @property
    def end_time_str(self):
        return self.end_time.strftime('%H:%M')


class SlotItemCapacity(models.Model):
    slot = models.ForeignKey(Slot, on_delete=models.CASCADE, related_name='capacities')
    menu_item = models.ForeignKey('menu.MenuItem', on_delete=models.CASCADE, related_name='slot_capacities')
    max_units = models.PositiveIntegerField(default=20)
    units_booked = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = 'slot_item_capacities'
        unique_together = ['slot', 'menu_item']

    def __str__(self):
        return f'{self.slot} · {self.menu_item} ({self.units_booked}/{self.max_units})'

    @property
    def remaining(self):
        return self.max_units - self.units_booked
