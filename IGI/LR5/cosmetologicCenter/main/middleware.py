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
            default_tz = pytz.timezone(settings.TIME_ZONE)
            timezone.activate(default_tz)
            request.activated_timezone_name = settings.TIME_ZONE
        else:

            user_timezone_from_cookie_raw = request.COOKIES.get('user_timezone')

            activated_timezone_name_for_request = str(timezone.get_default_timezone())
            final_activated_tz_str = None

            user_timezone_decoded = urllib.parse.unquote(user_timezone_from_cookie_raw)

            tz_object_for_activation = pytz.timezone(user_timezone_decoded)
            test_naive_dt = datetime(2025, 5, 25, 15, 0, 0)
            test_aware_dt = tz_object_for_activation.localize(test_naive_dt)

            final_activated_tz_str = user_timezone_decoded

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