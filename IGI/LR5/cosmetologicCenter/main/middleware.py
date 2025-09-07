from django.conf import settings
from django.utils import timezone
import pytz
import urllib.parse
from datetime import datetime

class CookieTimezoneMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):

        if request.path.startswith('/admin/'):
            try:
                default_tz = pytz.timezone(settings.TIME_ZONE)
                timezone.activate(default_tz)
                request.activated_timezone_name = settings.TIME_ZONE
            except Exception as e:
                print(f"ADMIN_PATH: CRITICAL ERROR trying to activate settings.TIME_ZONE '{settings.TIME_ZONE}': {e}")
        else:

            user_timezone_from_cookie_raw = request.COOKIES.get('user_timezone')

            final_activated_tz_str = None

            if user_timezone_from_cookie_raw:
                user_timezone_decoded = urllib.parse.unquote(user_timezone_from_cookie_raw)

                try:
                    final_activated_tz_str = user_timezone_decoded
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
                except Exception as e:
                    timezone.deactivate()
                    activated_timezone_name_for_request = str(timezone.get_default_timezone())
            else:
                timezone.deactivate()
                activated_timezone_name_for_request = str(timezone.get_default_timezone())

            request.activated_timezone_name = activated_timezone_name_for_request
        response = self.get_response(request)
        return response