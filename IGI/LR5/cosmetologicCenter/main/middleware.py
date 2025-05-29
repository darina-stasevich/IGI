from django.conf import settings
from django.utils import timezone
import pytz
import urllib.parse
from datetime import datetime

class CookieTimezoneMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
        print("--- CookieTimezoneMiddleware initialized ---")

    def __call__(self, request):

        print(f"\n--- [NEW REQUEST] CookieTimezoneMiddleware called for path: {request.path} ---")

        if request.path.startswith('/admin/'):
            # Для админских путей мы НЕ будем активировать часовой пояс из cookie.
            # Django будет использовать TIME_ZONE из settings.py (у вас это 'UTC').
            # Убедимся, что активен именно он.
            try:
                default_tz = pytz.timezone(settings.TIME_ZONE)
                timezone.activate(default_tz)
                request.activated_timezone_name = settings.TIME_ZONE  # Для консистентности, если где-то используется
                print(
                    f"ADMIN_PATH: Path '{request.path}'. Timezone activation skipped. Active timezone set to settings.TIME_ZONE: '{settings.TIME_ZONE}'.")
            except Exception as e:
                # Это не должно происходить, если settings.TIME_ZONE валиден
                print(f"ADMIN_PATH: CRITICAL ERROR trying to activate settings.TIME_ZONE '{settings.TIME_ZONE}': {e}")
        else:

            print("All cookies received by middleware:")
            if request.COOKIES:
                for name, value in request.COOKIES.items():
                    print(f"  Cookie: {name} = {value}")
            else:
                print("  No cookies received.")

            user_timezone_from_cookie_raw = request.COOKIES.get('user_timezone')
            print(
                f"Raw value of 'user_timezone' cookie: '{user_timezone_from_cookie_raw}' (type: {type(user_timezone_from_cookie_raw)})")

            activated_timezone_name_for_request = str(timezone.get_default_timezone())
            final_activated_tz_str = None

            if user_timezone_from_cookie_raw:
                user_timezone_decoded = urllib.parse.unquote(user_timezone_from_cookie_raw)
                print(f"Attempting to process DECODED cookie value: '{user_timezone_decoded}'")

                try:
                    tz_object_for_activation = pytz.timezone(user_timezone_decoded)
                    print(f"  pytz.timezone('{user_timezone_decoded}') returned: {tz_object_for_activation}")
                    # Проверим смещение для конкретной даты, как в shell
                    test_naive_dt = datetime(2025, 5, 25, 15, 0, 0)
                    test_aware_dt = tz_object_for_activation.localize(test_naive_dt)
                    print(
                        f"  Offset for {user_timezone_decoded} (using this object for 2025-05-25 15:00): {test_aware_dt.utcoffset()}")
                    # --- Конец дополнительной отладки ---

                    final_activated_tz_str = user_timezone_decoded  # Предполагаем, что pytz.timezone() не вызвало ошибку
                    print(f"  SUCCESS: Timezone '{final_activated_tz_str}' seems valid according to pytz.")
                except pytz.exceptions.UnknownTimeZoneError:
                    print(f"  ERROR: Decoded timezone '{user_timezone_decoded}' is UNKNOWN to pytz.")
                except Exception as e:
                    print(f"  ERROR: An unexpected error occurred with pytz.timezone('{user_timezone_decoded}'): {e}")
            else:
                print("  'user_timezone' cookie was not found or is empty.")

            if final_activated_tz_str:
                try:
                    timezone.activate(pytz.timezone(final_activated_tz_str))
                    activated_timezone_name_for_request = final_activated_tz_str
                    print(f"  ACTIVATED timezone: '{activated_timezone_name_for_request}'")
                except Exception as e:
                    timezone.deactivate()
                    activated_timezone_name_for_request = str(timezone.get_default_timezone())
                    print(f"  ERROR during timezone.activate('{final_activated_tz_str}'). Reverted to default. Error: {e}")
            else:
                timezone.deactivate()
                activated_timezone_name_for_request = str(timezone.get_default_timezone())
                print(
                    f"  No valid user timezone to activate. Using default system timezone: '{activated_timezone_name_for_request}'")

            request.activated_timezone_name = activated_timezone_name_for_request
            print(f"request.activated_timezone_name SET TO: '{request.activated_timezone_name}'")
            print(
                f"Current active timezone for this request (from timezone.get_current_timezone()): {timezone.get_current_timezone_name()}")

        response = self.get_response(request)

        print(f"--- CookieTimezoneMiddleware finished for path: {request.path} ---")
        return response