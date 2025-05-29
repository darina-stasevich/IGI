# main/context_processors.py
from django.utils import timezone
import calendar
import pytz
import datetime


def global_datetime_context(request):
    initial_active_tz_name = timezone.get_current_timezone_name()

    current_moment_django = timezone.now()

    utc_tz_obj = pytz.utc

    definitive_utc_time = current_moment_django.astimezone(utc_tz_obj)

    target_local_tz_name_from_request = getattr(request, 'activated_timezone_name', None)
    if not target_local_tz_name_from_request:
        target_local_tz_name_from_request = initial_active_tz_name
    if not target_local_tz_name_from_request:
        target_local_tz_name_from_request = 'UTC'

    try:
        target_local_pytz_obj = pytz.timezone(target_local_tz_name_from_request)
    except pytz.UnknownTimeZoneError:
        target_local_pytz_obj = utc_tz_obj
        target_local_tz_name_from_request = 'UTC'

    definitive_local_time = definitive_utc_time.astimezone(target_local_pytz_obj)

    current_year_local = definitive_local_time.year
    current_month_local = definitive_local_time.month
    today_day_local = definitive_local_time.day

    cal = calendar.TextCalendar(calendar.MONDAY)
    month_calendar_str = cal.formatmonth(current_year_local, current_month_local)

    first_day_of_local_month_obj = datetime.date(current_year_local, current_month_local, 1)

    return {
        'user_active_timezone_name': target_local_tz_name_from_request,
        'current_time_utc': definitive_utc_time,
        'current_time_local': definitive_local_time,

        'text_calendar_output': month_calendar_str,
        'current_local_month_date_obj': first_day_of_local_month_obj,
        'today_day_number_local': today_day_local,
    }