from django.core.exceptions import ValidationError
from django.utils import timezone
import re
from datetime import date


def validate_age_18_plus(date_of_birth):
    today = date.today()
    if date_of_birth > today:
        raise ValidationError("Дата рождения не может быть в будущем.", code='dob_in_future')

    if today.year - date_of_birth.year < 18:
        raise ValidationError("Регистрация разрешена только для пользователей старше 18 лет.", code='age_too_young')
    if today.year - date_of_birth.year > 18:
        return

    # today.year - date_of_birth.year = 18
    if today.month > date_of_birth.month:
        return
    if today.month < date_of_birth.month:
        raise ValidationError("Регистрация разрешена только для пользователей старше 18 лет.", code='age_too_young')

    #today.month = date_of_birth.month
    if today.day > date_of_birth.day:
        return
    else:
        raise ValidationError("Регистрация разрешена только для пользователей старше 18 лет.", code='age_too_young')

def validate_belarus_phone_number(phone_number):
    pattern = re.compile(r"^\+375\s*\((25|29|33|44)\)\s*\d{3}-\d{2}-\d{2}$")
    if not pattern.match(phone_number):
        raise ValidationError("Неверный формат номера телефона. Ожидается +375 (XX) XXX-XX-XX.",
                              code='invalid_phone_format')