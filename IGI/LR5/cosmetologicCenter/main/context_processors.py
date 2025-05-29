# main/context_processors.py
from django.utils import timezone
import calendar
import pytz
import datetime


def global_datetime_context(request):
    print(f"\n--- CTX_PROC: Start ---")
    # Шаг 0: Какая таймзона активна в Django в начале контекстного процессора?
    # Это должно быть то, что установил middleware (например, 'Europe/Minsk').
    initial_active_tz_name = timezone.get_current_timezone_name()
    print(f"CTX_PROC: Initial timezone.get_current_timezone_name(): {initial_active_tz_name}")

    # Шаг 1: Получаем текущий момент времени с помощью timezone.now().
    # Django утверждает, что это должно учитывать активную таймзону.
    # Если активна 'Europe/Minsk', current_moment_django должен быть ~16:xx Europe/Minsk.
    current_moment_django = timezone.now()
    print(
        f"CTX_PROC: 1. current_moment_django (from timezone.now()): {current_moment_django} (tzinfo: {current_moment_django.tzinfo})")

    # Шаг 2: Определяем объект UTC таймзоны.
    utc_tz_obj = pytz.utc

    # Шаг 3: Конвертируем current_moment_django в UTC.
    # Это должно дать нам истинное текущее время в UTC.
    # Например, если current_moment_django был 16:xx Europe/Minsk, это должно стать 13:xx UTC.
    definitive_utc_time = current_moment_django.astimezone(utc_tz_obj)
    print(
        f"CTX_PROC: 3. definitive_utc_time (current_moment_django.astimezone(utc_tz_obj)): {definitive_utc_time} (tzinfo: {definitive_utc_time.tzinfo})")

    # Шаг 4: Получаем имя целевой локальной таймзоны из request (установлено middleware).
    # Фоллбэк на текущую активную, затем на 'UTC'.
    target_local_tz_name_from_request = getattr(request, 'activated_timezone_name', None)
    if not target_local_tz_name_from_request:
        target_local_tz_name_from_request = initial_active_tz_name  # Используем то, что было активно в начале
    if not target_local_tz_name_from_request:  # Если все еще None (маловероятно)
        target_local_tz_name_from_request = 'UTC'
    print(f"CTX_PROC: 4. target_local_tz_name_from_request: {target_local_tz_name_from_request}")

    # Шаг 5: Получаем pytz объект для целевой локальной таймзоны.
    try:
        target_local_pytz_obj = pytz.timezone(target_local_tz_name_from_request)
    except pytz.UnknownTimeZoneError:
        print(
            f"CTX_PROC: UnknownTimeZoneError for '{target_local_tz_name_from_request}'. Defaulting to UTC for local_time conversion.")
        target_local_pytz_obj = utc_tz_obj  # Фоллбэк на UTC
        target_local_tz_name_from_request = 'UTC'  # Обновляем имя, чтобы соответствовать
    print(f"CTX_PROC: 5. target_local_pytz_obj: {target_local_pytz_obj}")

    # Шаг 6: Конвертируем definitive_utc_time (истинное UTC) в целевую локальную таймзону.
    definitive_local_time = definitive_utc_time.astimezone(target_local_pytz_obj)
    print(
        f"CTX_PROC: 6. definitive_local_time (definitive_utc_time.astimezone(target_local_pytz_obj)): {definitive_local_time} (tzinfo: {definitive_local_time.tzinfo})")

    # Календарная часть (использует локальное время для месяца/года)
    current_year_local = definitive_local_time.year
    current_month_local = definitive_local_time.month
    today_day_local = definitive_local_time.day

    cal = calendar.TextCalendar(calendar.MONDAY)  # Английский календарь для надежности
    month_calendar_str = cal.formatmonth(current_year_local, current_month_local)

    first_day_of_local_month_obj = datetime.date(current_year_local, current_month_local, 1)

    print(f"CTX_PROC_DEBUG: About to return to template:")
    print(f"CTX_PROC_DEBUG: current_time_utc = {definitive_utc_time} ({type(definitive_utc_time)})")
    print(f"CTX_PROC_DEBUG: current_time_local = {definitive_local_time} ({type(definitive_local_time)})")
    print(f"CTX_PROC_DEBUG: user_active_timezone_name = {target_local_tz_name_from_request}")
    print(f"--- CTX_PROC: End ---")

    return {
        'user_active_timezone_name': target_local_tz_name_from_request,
        'current_time_utc': definitive_utc_time,  # Передаем истинное UTC
        'current_time_local': definitive_local_time,  # Передаем истинное локальное

        'text_calendar_output': month_calendar_str,
        'current_local_month_date_obj': first_day_of_local_month_obj,
        'today_day_number_local': today_day_local,
    }