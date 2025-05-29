import datetime
import statistics
import pytz
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
import io
import base64
import matplotlib
from django.shortcuts import render, redirect
from django.urls import reverse
import requests

matplotlib.use('Agg')
from django.core.exceptions import ObjectDoesNotExist
from django.db.models import Avg, Count, Q
from django.db.models.functions import ExtractYear, TruncMonth
from django.shortcuts import render, redirect, get_object_or_404, resolve_url
from django.contrib.auth import login, authenticate, logout
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.contrib.auth.models import User
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from django.views.decorators.http import require_POST

from .forms import ClientRegistrationForm, DoctorRegistrationForm, UserLoginForm, ClientProfileUpdateForm, ReviewForm, \
    DoctorLeaveRequestForm, DoctorDayOffRequestForm, AppointmentNotesForm
from .models import UserProfile, Client, Appointment, ServiceCategory, Service, Review, Doctor, DoctorLeave, \
    DoctorAvailabilityOverride, DoctorWeeklyAvailabilitySlot, PromoCode, Article, CompanyProfile, FaqItem, \
    NonDoctorStaffContact, Vacancy


# ---------- Аутентификация ----------
def user_login_view(request):
    if request.method == 'POST':
        form = UserLoginForm(request, data=request.POST)
        if form.is_valid():
            username = form.cleaned_data.get('username')
            password = form.cleaned_data.get('password')
            user = authenticate(request, username=username, password=password)
            if user is not None:
                login(request, user)
                if user.is_staff:
                    messages.info(request, f'Добро пожаловать, администратор {user.username}!')
                    return redirect(resolve_url('/admin/'))
                messages.info(request, f'Добро пожаловать, {user.username}! Ваша роль: {user.profile.role}')
                try:
                    if hasattr(user, 'profile') and user.profile.role == 'doctor':
                        return redirect('doctor_dashboard')
                    elif hasattr(user, 'profile') and user.profile.role == 'client':
                        return redirect('client_dashboard')
                    else:
                        messages.warning(request, 'Не удалось определить вашу роль. Обратитесь в поддержку.')
                        return redirect('home')
                except UserProfile.DoesNotExist:
                    messages.error(request,
                                   'Профиль пользователя не найден. Пожалуйста, зарегистрируйтесь снова или обратитесь в поддержку.')
                    logout(request)
                    return redirect('user_login')

            else:
                messages.error(request, 'Неверный логин или пароль.')
        else:
            messages.error(request, 'Неверный логин или пароль.')
    else:
        form = UserLoginForm()
    return render(request, 'login.html', {'form': form, 'form_title': 'Вход в систему'})

@login_required
def user_logout_view(request):
    logout(request)
    messages.info(request, 'Вы успешно вышли из системы.')
    return redirect('user_login')

# ---------- Клиентская часть ----------

def client_register_view(request):
    if request.method == 'POST':
        form = ClientRegistrationForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user)
            messages.success(request, 'Регистрация прошла успешно! Вы вошли в систему. Ваша роль: клиент')
            return redirect('client_dashboard')
        else:
            messages.error(request, 'Пожалуйста, исправьте ошибки в форме.')
    else:
        form = ClientRegistrationForm()
    return render(request, 'register_client.html', {'form': form, 'form_title': 'Регистрация клиента'})


@login_required
def client_dashboard_view(request):
    user = request.user

    if not hasattr(user, 'profile') or user.profile.role != 'client':
        messages.error(request, 'Доступ запрещен. Это не кабинет клиента.')
        return redirect('home')

    try:
        user_profile = user.profile
    except UserProfile.DoesNotExist:
        messages.error(request, 'Профиль пользователя не найден. Пожалуйста, обратитесь в поддержку или перезайдите.')
        logout(request)
        return redirect('user_login')

    if request.method == 'POST':
        form = ClientProfileUpdateForm(request.POST, user_instance=user)
        if form.is_valid():
            form.save()
            messages.success(request, 'Ваши данные успешно обновлены!')
            return redirect('client_dashboard')
        else:
            messages.error(request, 'Пожалуйста, исправьте ошибки в форме.')
    else:
        form = ClientProfileUpdateForm(user_instance=user)

    return render(request, 'dashboard_client.html', {'user': user, 'form': form, 'form_title': 'Редактирование профиля'})


@login_required
def delete_profile_view(request):
    if request.method == 'POST':
        user_to_delete = request.user
        try:
            if not isinstance(user_to_delete, User):
                messages.error(request, "Некорректный запрос на удаление.")
                return redirect('home')

            logout(request)

            user_to_delete.delete()

            messages.success(request, "Ваш профиль и все связанные данные были успешно удалены.")
            return redirect('home')
        except Exception as e:
            messages.error(request,
                           f"Произошла ошибка при удалении вашего профиля: {e}. Пожалуйста, обратитесь в поддержку.")
            return redirect('home')

    return render(request, 'confirm_delete_profile.html')


@login_required
def client_appointments_view(request):
    user = request.user

    if not hasattr(user, 'profile') or not user.profile:
        messages.error(request, "Профиль пользователя не найден.")
        logout(request)
        return redirect('user_login')

    if user.profile.role != 'client':
        messages.error(request, "Доступ запрещен. Эта страница только для клиентов.")
        return redirect('home')

    try:
        client_instance = user.profile.client_profile
    except ObjectDoesNotExist:
        messages.error(request, "Данные клиента не найдены. Пожалуйста, обратитесь в поддержку.")
        return redirect('home')
    except AttributeError:
        messages.error(request, "Связь между профилем пользователя и профилем клиента не настроена корректно.")
        return redirect('home')

    status_filter = request.GET.get('status', '')
    sort_order = request.GET.get('sort_order', '-start_datetime')

    procedure_year_filter = request.GET.get('procedure_year', '')
    procedure_month_filter = request.GET.get('procedure_month', '')

    appointments_query = Appointment.objects.filter(client=client_instance)

    available_years = list(
        appointments_query.annotate(year=ExtractYear('start_datetime'))
        .values_list('year', flat=True)
        .distinct()
        .order_by('-year')
    )
    available_months = [{'value': i, 'name': f"{i:02d}"} for i in range(1, 13)]

    if procedure_year_filter:
        try:
            appointments_query = appointments_query.filter(start_datetime__year=int(procedure_year_filter))
        except ValueError:
            messages.error(request, "Некорректный год для фильтрации.")

    if procedure_year_filter and procedure_month_filter:
        try:
            appointments_query = appointments_query.filter(start_datetime__month=int(procedure_month_filter))
        except ValueError:
            messages.error(request, "Некорректный месяц для фильтрации.")

    if status_filter:
        appointments_query = appointments_query.filter(status=status_filter)

    valid_sort_orders = {
        '-start_datetime': '-start_datetime',
        'start_datetime': 'start_datetime',
        '-created_at': '-created_at',
        'created_at': 'created_at'
    }
    if sort_order in valid_sort_orders:
        appointments_query = appointments_query.order_by(valid_sort_orders[sort_order])
    else:
        appointments_query = appointments_query.order_by('-start_datetime')

    context = {
        'appointments': appointments_query,
        'status_choices': Appointment.STATUS_CHOICES,
        'current_status_filter': status_filter,
        'current_sort_order': sort_order,
        'available_years': available_years,
        'available_months': available_months,
        'current_procedure_year': procedure_year_filter,
        'current_procedure_month': procedure_month_filter,
        'form_title': 'Мои записи на прием'
    }
    return render(request, 'client_appointments.html', context)

@login_required
@require_POST
def cancel_appointment_view(request, appointment_id):
    appointment = get_object_or_404(Appointment, id=appointment_id)

    try:
        if not hasattr(request.user, 'profile') or \
           not hasattr(request.user.profile, 'client_profile') or \
           appointment.client != request.user.profile.client_profile:
            messages.error(request, "У вас нет прав для отмены этой записи.")
            return redirect('client_appointments')
    except ObjectDoesNotExist:
        messages.error(request, "Профиль клиента не найден. Обратитесь в поддержку.")
        return redirect('client_appointments')


    if appointment.status == 'booked':
        appointment.status = 'cancelled_by_client'
        appointment.save()
        messages.success(request, f"Запись на услугу '{appointment.service.name}' ({appointment.start_datetime.strftime('%d.%m.%Y %H:%M')}) была успешно отменена.")
    else:
        messages.warning(request, "Эту запись уже нельзя отменить (возможно, она уже отменена или завершена).")

    return redirect('client_appointments')

def add_review_view(request):
    try:
        if not hasattr(request.user, 'profile'):
            messages.error(request, "Профиль пользователя не найден. Пожалуйста, завершите настройку профиля.")
            return redirect('home')

        user_profile = request.user.profile

        if user_profile.role != 'client':
            messages.error(request, "Оставлять отзывы могут только клиенты.")
            return redirect('review_list')
        if not Client.objects.filter(user_profile=user_profile).exists():
            messages.error(request, "Профиль клиента не полностью настроен или не найден.")
            return redirect('home')

    except ObjectDoesNotExist:
        messages.error(request, "Произошла ошибка при проверке профиля. Обратитесь в поддержку.")
        return redirect('home')

    form = ReviewForm(user=request.user)

    eligible_appointments_exist = form.fields['appointment'].queryset.exists()

    if request.method == 'POST':
        form = ReviewForm(request.POST, user=request.user)
        if form.is_valid():
            if not eligible_appointments_exist and not form.cleaned_data.get('appointment'):
                messages.error(request, "Нет доступных приемов для отзыва.")
            else:
                form.save()
                messages.success(request, "Спасибо! Ваш отзыв был успешно добавлен.")
                return redirect('review_list')
        else:
            messages.error(request, "Пожалуйста, исправьте ошибки в форме.")

    context = {
        'form': form,
        'page_title': "Оставить отзыв",
        'eligible_appointments_exist': eligible_appointments_exist,
    }
    return render(request, 'add_review.html', context)

@login_required
def booking_confirmation_view(request):
    if not hasattr(request.user, 'profile') or not hasattr(request.user.profile, 'client_profile'):
        messages.error(request, "Только зарегистрированные клиенты могут бронировать услуги.")
        return redirect('user_login' if not request.user.is_authenticated else 'home')

    service_id = request.GET.get('service_id')
    doctor_id = request.GET.get('doctor_id')
    date_str = request.GET.get('date_str')
    start_time_str = request.GET.get('start_time_str')
    end_time_str = request.GET.get('end_time_str')

    if not all([service_id, doctor_id, date_str, start_time_str, end_time_str]):
        messages.error(request, "Недостаточно данных для подтверждения бронирования.")
        return redirect('find_available_slots')

    try:
        service = get_object_or_404(Service, pk=int(service_id))
        doctor = get_object_or_404(Doctor, pk=int(doctor_id))

        selected_date = datetime.datetime.strptime(date_str, '%Y-%m-%d').date()
        selected_start_time = datetime.datetime.strptime(start_time_str, '%H:%M').time()
        selected_end_time = datetime.datetime.strptime(end_time_str, '%H:%M').time()

        naive_start_datetime = datetime.datetime.combine(selected_date, selected_start_time)
        naive_end_datetime = datetime.datetime.combine(selected_date, selected_end_time)

        print(f"[DEBUG booking_confirmation_view] Naive start_datetime: {naive_start_datetime}")

        tz_name_from_request = getattr(request, 'activated_timezone_name', None)

        if tz_name_from_request:
            try:
                target_tz = pytz.timezone(tz_name_from_request)
                print(f"[DEBUG booking_confirmation_view] Explicitly using pytz.timezone for: {tz_name_from_request}")
            except pytz.UnknownTimeZoneError:
                print(
                    f"[WARNING booking_confirmation_view] UnknownTimeZoneError for: {tz_name_from_request}. Falling back.")
                target_tz = timezone.get_current_timezone()
        else:
            print(
                f"[DEBUG booking_confirmation_view] No activated_timezone_name on request. Using timezone.get_current_timezone().")
            target_tz = timezone.get_current_timezone()

        print(f"[DEBUG booking_confirmation_view] Target timezone for make_aware/localize: {target_tz}")
        if naive_start_datetime:
            print(
                f"[DEBUG booking_confirmation_view] Offset for naive_start_datetime from target_tz: {target_tz.utcoffset(naive_start_datetime)}")
        else:
            print(f"[DEBUG booking_confirmation_view] naive_start_datetime is None, cannot get offset.")

        if hasattr(target_tz, 'localize'):
            start_datetime_aware = target_tz.localize(naive_start_datetime)
            end_datetime_aware = target_tz.localize(naive_end_datetime)
            print(f"[DEBUG booking_confirmation_view] Used target_tz.localize()")
        else:
            start_datetime_aware = timezone.make_aware(naive_start_datetime, target_tz)
            end_datetime_aware = timezone.make_aware(naive_end_datetime, target_tz)
            print(f"[DEBUG booking_confirmation_view] Used timezone.make_aware()")

        print(
            f"[DEBUG booking_confirmation_view] Aware start_datetime: {start_datetime_aware}, tzinfo: {start_datetime_aware.tzinfo}, offset: {start_datetime_aware.utcoffset()}")
        print(
            f"[DEBUG booking_confirmation_view] Aware end_datetime: {end_datetime_aware}, tzinfo: {end_datetime_aware.tzinfo}, offset: {end_datetime_aware.utcoffset()}")

        if start_datetime_aware < timezone.localtime(timezone.now()):
            messages.warning(request, "Вы пытаетесь забронировать время, которое уже прошло.")
            return redirect('find_available_slots')

    except (ValueError, Service.DoesNotExist, Doctor.DoesNotExist) as e:
        messages.error(request, f"Ошибка при получении деталей бронирования: {e}.")
        return redirect('find_available_slots')
    except Exception as e:
        messages.error(request, f"Произошла непредвиденная ошибка при обработке времени: {e}.")
        print(f"[ERROR booking_confirmation_view] Exception during datetime processing: {e}")
        return redirect('find_available_slots')

    print(
        f"[DEBUG booking_confirmation_view] For form, start_datetime_aware.isoformat(): {start_datetime_aware.isoformat()}")
    print(
        f"[DEBUG booking_confirmation_view] For form, end_datetime_aware.isoformat(): {end_datetime_aware.isoformat()}")

    initial_form_data = {
        'service_id': service.pk,
        'doctor_id': doctor.pk,
        'start_datetime': start_datetime_aware.isoformat(),
        'end_datetime': end_datetime_aware.isoformat(),
    }
    form = AppointmentNotesForm(initial=initial_form_data)

    context = {
        'form': form,
        'service': service,
        'doctor': doctor,
        'start_datetime_obj': start_datetime_aware,
        'end_datetime_obj': end_datetime_aware,
        'price': service.price,
    }
    return render(request, 'booking_confirmation.html', context)

@login_required
def create_appointment_view(request):
    if request.method != 'POST':
        messages.error(request, "Недопустимый метод запроса.")
        return redirect('find_available_slots')

    if not hasattr(request.user, 'profile') or not hasattr(request.user.profile, 'client_profile'):
        messages.error(request, "Только зарегистрированные клиенты могут создавать записи.")
        return redirect('user_login' if not request.user.is_authenticated else 'home')

    try:
        client_profile = request.user.profile.client_profile
    except Client.DoesNotExist:
        messages.error(request, "Профиль клиента не найден. Пожалуйста, убедитесь, что ваш профиль полностью заполнен.")
        return redirect('home')

    form = AppointmentNotesForm(request.POST)
    print(
        f"[DEBUG create_appointment_view] Raw POST data for datetimes: start='{request.POST.get('start_datetime')}', end='{request.POST.get('end_datetime')}'")

    if form.is_valid():
        cleaned_data = form.cleaned_data
        service_id = cleaned_data['service_id']
        doctor_id = cleaned_data['doctor_id']
        start_datetime_str_from_form = cleaned_data['start_datetime']
        end_datetime_str_from_form = cleaned_data['end_datetime']
        notes_by_client = cleaned_data.get('notes_by_client', '')

        try:
            service = get_object_or_404(Service, pk=service_id)
            doctor = get_object_or_404(Doctor, pk=doctor_id)

            parsed_start_datetime = parse_datetime(start_datetime_str_from_form)
            parsed_end_datetime = parse_datetime(end_datetime_str_from_form)

            if not parsed_start_datetime or not parsed_end_datetime:
                raise ValueError("Неверный формат даты/времени при создании записи (из формы).")

            try:
                current_tz = timezone.get_current_timezone()
            except Exception:
                current_tz = timezone.get_default_timezone()

            if timezone.is_naive(parsed_start_datetime):
                start_datetime = timezone.make_aware(parsed_start_datetime, current_tz)
            else:
                start_datetime = timezone.localtime(parsed_start_datetime, current_tz)

            if timezone.is_naive(parsed_end_datetime):
                end_datetime = timezone.make_aware(parsed_end_datetime, current_tz)
            else:
                end_datetime = timezone.localtime(parsed_end_datetime, current_tz)


            appointment = Appointment(
                client=client_profile,
                doctor=doctor,
                service=service,
                start_datetime=start_datetime,
                end_datetime=end_datetime,
                status='booked',
                price_at_booking=service.price,
                notes_by_client=notes_by_client
            )
            appointment.save()

            doctor_display_name = doctor.user_profile.user.get_full_name()
            if not doctor_display_name:
                doctor_display_name = doctor.user_profile.user.username
            messages.success(request,
                             f"Вы успешно записаны на услугу '{service.name}' к врачу {doctor_display_name} на {timezone.localtime(start_datetime).strftime('%d.%m.%Y в %H:%M')}.")
            return redirect('client_appointments')

        except (ValueError, Service.DoesNotExist, Doctor.DoesNotExist) as e:
            messages.error(request, f"Ошибка при создании записи: {e}. Попробуйте снова.")
            return redirect('find_available_slots')
        except Exception as e:
            messages.error(request, f"Произошла непредвиденная ошибка при создании записи: {e}.")
            return redirect('find_available_slots')
    else:
        messages.error(request, "Ошибка в данных формы. Пожалуйста, попробуйте забронировать услугу заново.")
        return redirect('find_available_slots')


@login_required
def client_applied_promo_codes_view(request):
    try:
        client_profile = Client.objects.get(user_profile__user=request.user)
    except Client.DoesNotExist:
        messages.error(request, "Профиль клиента не найден.")
        return redirect('home')

    applied_appointments = Appointment.objects.filter(
        client=client_profile,
        applied_promo_code__isnull=False
    ).select_related(
        'service',
        'applied_promo_code'
    ).order_by('-created_at')

    context = {
        'applied_appointments': applied_appointments,
        'page_title': "Мои использованные промокоды",
    }
    return render(request, 'client_applied_promo_codes.html', context)

# ---------- Врачебная часть ----------

def doctor_register_view(request):
    if request.method == 'POST':
        form = DoctorRegistrationForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user)
            messages.success(request, 'Регистрация прошла успешно! Вы вошли в систему. Ваша роль: врач')
            return redirect('doctor_dashboard')
        else:
            messages.error(request, 'Пожалуйста, исправьте ошибки в форме.')
    else:
        form = DoctorRegistrationForm()
    return render(request, 'register_doctor.html', {'form': form, 'form_title': 'Регистрация врача'})


@login_required
def doctor_dashboard_view(request):
    if not hasattr(request.user, 'profile') or request.user.profile.role != 'doctor':
        messages.error(request, 'Доступ запрещен.')
        return redirect('home')

    try:
        current_doctor = request.user.profile.doctor_profile
    except Doctor.DoesNotExist:
        messages.error(request, 'Профиль врача не найден для текущего пользователя.')
        return redirect('home')

    weekly_schedule_slots = DoctorWeeklyAvailabilitySlot.objects.filter(
        doctor=current_doctor
    ).order_by('day_of_week', 'start_time')

    schedule_for_template = []
    slots_by_day_temp = {day_int: [] for day_int, _ in DoctorWeeklyAvailabilitySlot.DAY_OF_WEEK_CHOICES}

    for slot in weekly_schedule_slots:
        slots_by_day_temp[slot.day_of_week].append({
            'start_time': slot.start_time.strftime('%H:%M'),
            'end_time': slot.end_time.strftime('%H:%M')
        })

    for day_int, day_name in DoctorWeeklyAvailabilitySlot.DAY_OF_WEEK_CHOICES:
        schedule_for_template.append({
            'day_name': day_name,
            'slots': slots_by_day_temp[day_int]
        })

    context = {
        'user': request.user,
        'schedule_for_template': schedule_for_template,
    }
    return render(request, 'dashboard_doctor.html', context)


@login_required(login_url='user_login')
def doctor_schedule_view(request):
    try:
        if not hasattr(request.user, 'profile'):
            messages.error(request, "Профиль пользователя не найден.")
            return redirect('home')

        user_profile = request.user.profile
        if user_profile.role != 'doctor':
            messages.error(request, "Эта страница доступна только для врачей.")
            return redirect('home')

        current_doctor = Doctor.objects.get(user_profile=user_profile)

    except Doctor.DoesNotExist:
        messages.error(request, "Профиль врача не найден или не полностью настроен.")
        return redirect('home')
    except ObjectDoesNotExist:
        messages.error(request, "Произошла ошибка при доступе к профилю.")
        return redirect('home')

    appointments_queryset = Appointment.objects.filter(
        doctor=current_doctor
    ).select_related(
        'client__user_profile__user',
        'service'
    ).order_by('start_datetime')

    period_param = request.GET.get('period')
    date_param_str = request.GET.get('date')

    today = timezone.localdate()

    start_date_filter = today
    end_date_filter = today
    page_subtitle = f"на сегодня, {today.strftime('%d %B %Y')}"
    active_filter_type = 'today'
    date_for_input_field = today
    if date_param_str:
        try:
            date_for_input_field = datetime.datetime.strptime(date_param_str, '%Y-%m-%d').date()
        except ValueError:
            messages.warning(request, "Выбранная дата имела неверный формат, отображается сегодняшний день.")

    if period_param == 'today':
        start_date_filter = today
        end_date_filter = today
        page_subtitle = f"на сегодня, {today.strftime('%d %B %Y')}"
        active_filter_type = 'today'
        date_for_input_field = today
    elif period_param == 'week':
        start_date_filter = today - datetime.timedelta(days=today.weekday())
        end_date_filter = start_date_filter + datetime.timedelta(days=6)
        page_subtitle = f"на эту неделю ({start_date_filter.strftime('%d.%m')} - {end_date_filter.strftime('%d.%m.%Y')})"
        active_filter_type = 'week'
        date_for_input_field = today
    elif period_param == 'month':
        start_date_filter = today.replace(day=1)
        next_month_start = (
                    start_date_filter.replace(day=28) + datetime.timedelta(days=4))
        end_date_filter = next_month_start - datetime.timedelta(
            days=next_month_start.day)
        page_subtitle = f"на этот месяц ({start_date_filter.strftime('%B %Y')})"
        active_filter_type = 'month'
        date_for_input_field = today
    elif date_param_str:
        try:
            chosen_date = datetime.datetime.strptime(date_param_str, '%Y-%m-%d').date()
            start_date_filter = chosen_date
            end_date_filter = chosen_date
            page_subtitle = f"на {chosen_date.strftime('%d %B %Y')}"
            active_filter_type = 'custom_day'
        except ValueError:
            start_date_filter = today
            end_date_filter = today
            page_subtitle = f"на сегодня, {today.strftime('%d %B %Y')} (ошибка даты)"
            active_filter_type = 'today'
    start_datetime_filter = datetime.datetime.combine(start_date_filter, datetime.time.min)
    end_datetime_filter = datetime.datetime.combine(end_date_filter, datetime.time.max)

    appointments_queryset = appointments_queryset.filter(
        start_datetime__gte=start_datetime_filter,
        start_datetime__lte=end_datetime_filter
    )

    context = {
        'doctor': current_doctor,
        'appointments': appointments_queryset,
        'page_title': "Мое расписание",
        'page_subtitle': page_subtitle,
        'filter_period': active_filter_type,
        'selected_date_str': date_for_input_field.strftime('%Y-%m-%d'),
        'status_choices': dict(Appointment.STATUS_CHOICES),
        'today_str_for_comparison': today.strftime('%Y-%m-%d'),
    }
    return render(request, 'doctor_schedule.html', context)

@login_required(login_url='user_login')
def doctor_leave_request_view(request):
    try:
        if not hasattr(request.user, 'profile') or request.user.profile.role != 'doctor':
            messages.error(request, "Эта страница доступна только для врачей.")
            return redirect('home')
        current_doctor = Doctor.objects.get(user_profile=request.user.profile)
    except Doctor.DoesNotExist:
        messages.error(request, "Профиль врача не найден. Обратитесь к администратору.")
        return redirect('home')
    except ObjectDoesNotExist:
        messages.error(request, "Профиль пользователя не найден.")
        return redirect('home')


    if request.method == 'POST':
        form = DoctorLeaveRequestForm(request.POST)
        if form.is_valid():
            leave_request = form.save(commit=False)
            leave_request.doctor = current_doctor
            leave_request.save()
            messages.success(request, "Ваш запрос на отпуск успешно отправлен.")
            return redirect('doctor_leave_requests')
        else:
            messages.error(request, "Пожалуйста, исправьте ошибки в форме.")
    else:
        form = DoctorLeaveRequestForm()

    existing_leave_requests = DoctorLeave.objects.filter(doctor=current_doctor).order_by('-start_date')

    context = {
        'form': form,
        'leave_requests': existing_leave_requests,
        'page_title': "Мои запросы на отпуск",
        'status_choices_dict': dict(DoctorLeave.STATUS_CHOICES),
    }
    return render(request, 'doctor_leave_requests.html', context)


@login_required(login_url='user_login')
def doctor_day_off_request_view(request):
    try:
        if not hasattr(request.user, 'profile') or request.user.profile.role != 'doctor':
            messages.error(request, "Эта страница доступна только для врачей.")
            return redirect('home')
        current_doctor = Doctor.objects.get(user_profile=request.user.profile)
    except Doctor.DoesNotExist:
        messages.error(request, "Профиль врача не найден.")
        return redirect('home')
    except ObjectDoesNotExist:
        messages.error(request, "Профиль пользователя не найден.")
        return redirect('home')

    if request.method == 'POST':
        form = DoctorDayOffRequestForm(request.POST)
        if form.is_valid():
            day_off_request = form.save(commit=False)
            day_off_request.doctor = current_doctor
            day_off_request.status = 'requested'
            day_off_request.is_available = False

            day_off_request.save()
            messages.success(request, "Ваш запрос на изменение расписания успешно отправлен.")
            return redirect('doctor_day_off_requests')
        else:
            messages.error(request, "Пожалуйста, исправьте ошибки в форме.")
    else:
        form = DoctorDayOffRequestForm()

    existing_requests = DoctorAvailabilityOverride.objects.filter(
        doctor=current_doctor,
        status__in=[s[0] for s in DoctorAvailabilityOverride.STATUS_CHOICES]
    ).order_by('-date', '-requested_at')

    context = {
        'form': form,
        'day_off_requests': existing_requests,
        'page_title': "Запросы на отгул / сокращенный день",
    }
    return render(request, 'doctor_day_off_requests.html', context)

# ---------- Общие представления ----------

def home_view(request):
    latest_article = Article.objects.filter(is_published=True).order_by('-published_date').first()

    welcome_message = "Добро пожаловать в нашу клинику 'Здоровье'!"

    context = {
        'welcome_message': welcome_message,
        'latest_article': latest_article,
  }
    return render(request, 'home.html', context)


def service_list_view(request):
    if request.user.is_authenticated and hasattr(request.user, 'profile') and request.user.profile.role == 'doctor':
        return redirect('home')

    categories = ServiceCategory.objects.all().order_by('name')
    selected_category_id = request.GET.get('category_id')

    services_queryset = Service.objects.select_related('category')

    current_category = None

    if selected_category_id:
        try:
            selected_category_id = int(selected_category_id)
            services_queryset = services_queryset.filter(category_id=selected_category_id)
            current_category = ServiceCategory.objects.get(id=selected_category_id)
            services_queryset = services_queryset.order_by('name')
        except (ValueError, ServiceCategory.DoesNotExist):
            selected_category_id = None
            current_category = None
            services_queryset = services_queryset.order_by('category__name', 'name')
    else:
        services_queryset = services_queryset.order_by('category__name', 'name')

    context = {
        'services': services_queryset,
        'categories': categories,
        'current_category': current_category,
        'selected_category_id': selected_category_id,
    }
    return render(request, 'service_list.html', context)

def review_list_view(request):
    if request.user.is_authenticated and hasattr(request.user, 'profile') and request.user.profile.role == 'doctor':
        return redirect('home')

    # Appointment -> Service
    # Appointment -> Doctor -> UserProfile -> User
    # Appointment -> Client -> UserProfile -> User

    reviews_queryset = Review.objects.select_related(
        'appointment__service__category',
        'appointment__service',
        'appointment__doctor__user_profile__user',
        'appointment__client__user_profile__user',
        'appointment__doctor__category'
    ).all()

    available_service_categories = ServiceCategory.objects.filter(
        services__appointments__review__isnull=False
    ).distinct().order_by('name')

    selected_category_id = request.GET.get('service_category')
    current_service_category = None

    if selected_category_id:
        try:
            selected_category_id = int(selected_category_id)
            reviews_queryset = reviews_queryset.filter(appointment__service__category_id=selected_category_id)
            current_service_category = ServiceCategory.objects.get(id=selected_category_id)
        except (ValueError, ServiceCategory.DoesNotExist):
            selected_category_id = None

    sort_options = {
        '-created_at': 'Дата (сначала новые)',
        'created_at': 'Дата (сначала старые)',
        '-rating': 'Рейтинг (сначала высокие)',
        'rating': 'Рейтинг (сначала низкие)',
    }
    default_sort = '-created_at'
    current_sort_key = request.GET.get('sort', default_sort)

    if current_sort_key not in sort_options:
        current_sort_key = default_sort

    reviews_queryset = reviews_queryset.order_by(current_sort_key)

    if 'rating' in current_sort_key:
        reviews_queryset = reviews_queryset.order_by(current_sort_key, '-created_at')

    context = {
        'reviews': reviews_queryset,
        'page_title': "Отзывы наших клиентов",
        'available_service_categories': available_service_categories,
        'current_service_category': current_service_category,
        'selected_category_id': selected_category_id,
        'sort_options': sort_options,
        'current_sort_key': current_sort_key,
    }
    return render(request, 'review_list.html', context)


def find_available_slots_view(request):
    if request.user.is_authenticated and hasattr(request.user, 'profile') and request.user.profile.role == 'doctor':
        return redirect('home')

    categories = ServiceCategory.objects.all().order_by('name')
    services = Service.objects.none()

    selected_category_obj = None
    selected_service_obj = None
    selected_date_obj = None

    available_slots = []

    category_id_str = request.GET.get('category')
    service_id_str = request.GET.get('service')
    date_str = request.GET.get('date')
    action = request.GET.get('action')

    # Выбор категории
    if category_id_str:
        try:
            selected_category_obj = get_object_or_404(ServiceCategory, pk=int(category_id_str))
            services = Service.objects.filter(category=selected_category_obj).order_by('name')
        except (ValueError, ServiceCategory.DoesNotExist):
            messages.error(request, "Неверная категория услуг.")
            category_id_str = None
            selected_category_obj = None

    # Выбор услуги
    if service_id_str:
        try:
            temp_service_obj = get_object_or_404(Service, pk=int(service_id_str))
            if selected_category_obj:
                if temp_service_obj.category == selected_category_obj:
                    selected_service_obj = temp_service_obj
                else:
                    messages.warning(request,
                                     f"Услуга '{temp_service_obj.name}' не принадлежит категории '{selected_category_obj.name}'. Пожалуйста, выберите услугу из текущей категории.")
                    selected_service_obj = None
            else:
                selected_service_obj = temp_service_obj
                selected_category_obj = temp_service_obj.category
                services = Service.objects.filter(category=selected_category_obj).order_by('name')
        except (ValueError, Service.DoesNotExist):
            messages.error(request, "Выбранная услуга не найдена.")
            selected_service_obj = None

    # Выбор даты
    if date_str:
        try:
            selected_date_obj = datetime.datetime.strptime(date_str, '%Y-%m-%d').date()
            if selected_date_obj < timezone.localdate():
                messages.error(request, "Нельзя выбрать прошедшую дату.")
                selected_date_obj = None
        except ValueError:
            messages.error(request, "Неверный формат даты. Используйте ГГГГ-ММ-ДД.")
            selected_date_obj = None

    # Поиск слотов
    if action == 'show_slots' and selected_service_obj and selected_date_obj:
        service_duration = datetime.timedelta(minutes=selected_service_obj.duration_minutes)
        day_of_week_for_selected_date = selected_date_obj.weekday()

        doctors_for_service = Doctor.objects.filter(services_can_perform=selected_service_obj)

        now_aware = timezone.localtime(timezone.now())

        try:
            current_tz = timezone.get_current_timezone()
        except Exception:
            current_tz = timezone.get_default_timezone()

        for doctor in doctors_for_service:
            weekly_slots_for_day = DoctorWeeklyAvailabilitySlot.objects.filter(
                doctor=doctor, day_of_week=day_of_week_for_selected_date
            ).order_by('start_time')

            if not weekly_slots_for_day.exists():
                continue

            is_on_leave = DoctorLeave.objects.filter(
                doctor=doctor, status='approved',
                start_date__lte=selected_date_obj, end_date__gte=selected_date_obj
            ).exists()
            if is_on_leave:
                continue

            approved_overrides = DoctorAvailabilityOverride.objects.filter(
                doctor=doctor, date=selected_date_obj, status='approved', is_available=False
            )
            if approved_overrides.filter(start_time__isnull=True, end_time__isnull=True).exists():
                continue

            existing_appointments = Appointment.objects.filter(
                doctor=doctor,
                start_datetime__date=selected_date_obj,
                status__in=['booked', 'completed']
            ).order_by('start_datetime')

            for weekly_slot in weekly_slots_for_day:
                doc_work_start_time = weekly_slot.start_time
                doc_work_end_time = weekly_slot.end_time
                current_potential_time = doc_work_start_time

                while current_potential_time < doc_work_end_time:
                    naive_slot_start_dt = datetime.datetime.combine(selected_date_obj, current_potential_time)
                    if selected_date_obj == now_aware.date() and naive_slot_start_dt.time() <= now_aware.time():
                        current_potential_time = (datetime.datetime.combine(datetime.date.min,
                                                                            current_potential_time) + datetime.timedelta(
                            minutes=15)).time()
                        continue

                    naive_slot_end_dt = naive_slot_start_dt + service_duration

                    slot_start_dt = timezone.make_aware(naive_slot_start_dt, current_tz)
                    slot_end_dt = timezone.make_aware(naive_slot_end_dt, current_tz)

                    doc_work_end_datetime_aware = timezone.make_aware(
                        datetime.datetime.combine(selected_date_obj, doc_work_end_time), current_tz)
                    if slot_end_dt > doc_work_end_datetime_aware:
                        break

                    is_slot_conflicted = False

                    for override in approved_overrides.filter(start_time__isnull=False, end_time__isnull=False):
                        naive_override_start_dt = datetime.datetime.combine(selected_date_obj, override.start_time)
                        naive_override_end_dt = datetime.datetime.combine(selected_date_obj, override.end_time)
                        override_start_dt_aware = timezone.make_aware(naive_override_start_dt, current_tz)
                        override_end_dt_aware = timezone.make_aware(naive_override_end_dt, current_tz)

                        if max(slot_start_dt, override_start_dt_aware) < min(slot_end_dt, override_end_dt_aware):
                            is_slot_conflicted = True
                            break
                    if is_slot_conflicted:
                        current_potential_time = (datetime.datetime.combine(datetime.date.min,
                                                                            current_potential_time) + datetime.timedelta(
                            minutes=15)).time()
                        continue

                    for appt in existing_appointments:
                        if appt.end_datetime and max(slot_start_dt, appt.start_datetime) < min(slot_end_dt,
                                                                                               appt.end_datetime):
                            is_slot_conflicted = True
                            break
                    if is_slot_conflicted:
                        current_potential_time = (datetime.datetime.combine(datetime.date.min,
                                                                            current_potential_time) + datetime.timedelta(
                            minutes=15)).time()
                        continue

                    available_slots.append({
                        'doctor': doctor,
                        'start_datetime': slot_start_dt,
                        'end_datetime': slot_end_dt,
                    })
                    current_potential_time = (datetime.datetime.combine(datetime.date.min,
                                                                        current_potential_time) + datetime.timedelta(
                        minutes=15)).time()

        if not available_slots and action == 'show_slots':
            messages.info(request, "На выбранную дату для данной услуги свободных мест нет.")

    context = {
        'categories': categories,
        'services': services,
        'selected_category_obj': selected_category_obj,
        'selected_service_obj': selected_service_obj,
        'selected_date_str': date_str,
        'available_slots': available_slots,
        'action_show_slots': action == 'show_slots',
    }
    return render(request, 'find_available_slots.html', context)


def public_promo_code_list_view(request):
    if request.user.is_authenticated and hasattr(request.user, 'profile') and request.user.profile.role == 'doctor':
        return redirect('home')

    current_date = timezone.localdate()

    active_promo_codes = PromoCode.objects.filter(
        is_active=True,
        valid_from__lte=current_date,
        valid_to__gte=current_date,).extra(
        where=["(max_uses IS NULL OR used_count < max_uses)"]
    ).order_by('-valid_to', 'code')

    context = {
        'promo_codes': active_promo_codes,
        'current_date': current_date,
        'page_title': "Акции и промокоды",
    }
    return render(request, 'public_promo_code_list.html', context)

def about_company_view(request):
    company_profile = CompanyProfile.objects.first()

    context = {
        'company_profile': company_profile,
    }
    return render(request, 'about_company.html', context)


def article_list_view(request):
    articles = Article.objects.filter(is_published=True).order_by('-published_date')

    context = {
        'articles': articles,
    }
    return render(request, 'article_list.html', context)


def faq_list_view(request):
    if request.user.is_authenticated and hasattr(request.user, 'profile') and request.user.profile.role == 'doctor':
        return redirect('home')

    faq_items = FaqItem.objects.filter(is_visible=True)

    context = {
        'faq_items': faq_items,
    }
    return render(request, 'faq_list.html', context)


def contacts_view(request):
    if request.user.is_authenticated and hasattr(request.user, 'profile') and request.user.profile.role == 'doctor':
        return redirect('home')

    doctors = Doctor.objects.filter(show_on_contacts_page=True).order_by('contact_page_display_order',
                                                                         'user_profile__user__last_name',
                                                                         'user_profile__user__first_name')

    other_staff = NonDoctorStaffContact.objects.filter(is_visible_on_contacts_page=True)

    company_profile = CompanyProfile.objects.first()

    context = {
        'doctors': doctors,
        'other_staff': other_staff,
        'company_profile': company_profile,
    }
    return render(request, 'contacts.html', context)

def privacy_policy_view(request):
    if request.user.is_authenticated and hasattr(request.user, 'profile') and request.user.profile.role == 'doctor':
        return redirect('home')

    context = {}
    return render(request, 'privacy_policy.html', context)


def vacancy_list_view(request):
    if request.user.is_authenticated and hasattr(request.user, 'profile') and request.user.profile.role == 'doctor':
        return redirect('home')

    vacancies = Vacancy.objects.filter(is_active=True)

    context = {
        'vacancies': vacancies,
    }
    return render(request, 'vacancy_list.html', context)


def public_statistics_view(request):
    if request.user.is_authenticated and hasattr(request.user, 'profile') and request.user.profile.role == 'doctor':
        return redirect('home')

    popular_service_categories_qs = ServiceCategory.objects.annotate(
        num_completed_appointments=Count(
            'services__appointments',
            filter=Q(services__appointments__status='completed')
        )
    ).filter(num_completed_appointments__gt=0).order_by('-num_completed_appointments')[:5]

    total_service_categories_count = ServiceCategory.objects.count()

    total_unique_services_count = Service.objects.count()

    reviews_query = Review.objects.filter(appointment__status='completed')
    review_aggregation = reviews_query.aggregate(
        average_rating=Avg('rating'),
        total_reviews=Count('id')
    )
    average_client_rating = review_aggregation.get('average_rating')
    total_reviews_count = review_aggregation.get('total_reviews', 0)

    median_client_rating = None
    if total_reviews_count > 0:
        completed_review_ratings = list(reviews_query.values_list('rating', flat=True))
        if completed_review_ratings:
            try:
                median_client_rating = statistics.median(completed_review_ratings)
                if median_client_rating is not None:
                    median_client_rating = round(median_client_rating, 1)
            except statistics.StatisticsError:
                median_client_rating = None
            except Exception as e:
                print(f"Error calculating median client rating: {e}")
                median_client_rating = None

    if average_client_rating is not None:
        average_client_rating = round(average_client_rating, 1)

    total_completed_procedures_count = Appointment.objects.filter(status='completed').count()

    appointments_line_chart_base64 = None
    try:
        twelve_months_ago = timezone.now().date() - datetime.timedelta(days=365)
        appointments_per_month_data = Appointment.objects.filter(
            status='completed',
            start_datetime__date__gte=twelve_months_ago
        ).annotate(
            month=TruncMonth('start_datetime')
        ).values('month').annotate(
            count=Count('id')
        ).order_by('month')

        if appointments_per_month_data:
            months = [item['month'] for item in appointments_per_month_data if
                      isinstance(item['month'], (datetime.date, datetime))]
            counts = [item['count'] for item in appointments_per_month_data if
                      isinstance(item['month'], (datetime.date, datetime))]

            if months and counts:
                plt.figure(figsize=(10, 5))
                plt.plot(months, counts, marker='o', linestyle='-', color='dodgerblue')
                plt.title('Динамика выполненных записей (за последние 12 мес.)', fontsize=14)
                plt.xlabel('Месяц', fontsize=12)
                plt.ylabel('Количество записей', fontsize=12)
                plt.gca().xaxis.set_major_formatter(mdates.DateFormatter('%Y-%m'))
                plt.gca().xaxis.set_major_locator(mdates.MonthLocator(interval=1))
                plt.xticks(rotation=45, ha="right")
                plt.grid(True, linestyle='--', alpha=0.6)
                plt.tight_layout()
                buffer = io.BytesIO()
                plt.savefig(buffer, format='png', dpi=90)
                buffer.seek(0)
                appointments_line_chart_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
                buffer.close()
        plt.close()
    except Exception as e:
        print(f"Error generating appointments line chart: {e}")

    categories_pie_chart_base64 = None
    try:
        category_names = [cat.name for cat in popular_service_categories_qs]
        category_counts = [cat.num_completed_appointments for cat in popular_service_categories_qs]

        if category_names and category_counts and sum(category_counts) > 0:
            plt.figure(figsize=(8, 7))
            colors = plt.cm.Pastel1(range(len(category_names)))
            wedges, texts, autotexts = plt.pie(
                category_counts, autopct='%1.1f%%', startangle=90, colors=colors,
                pctdistance=0.85, wedgeprops={'edgecolor': 'white'}
            )
            plt.setp(autotexts, size=10, weight="bold", color="black")
            plt.title('Топ-5 популярных категорий услуг', fontsize=14, pad=20)
            plt.legend(wedges, category_names, title="Категории", loc="center left",
                       bbox_to_anchor=(1, 0, 0.5, 1), fontsize=10)
            plt.axis('equal')
            plt.tight_layout(rect=[0, 0, 0.75, 1])
            buffer_pie = io.BytesIO()
            plt.savefig(buffer_pie, format='png', dpi=90)
            buffer_pie.seek(0)
            categories_pie_chart_base64 = base64.b64encode(buffer_pie.getvalue()).decode('utf-8')
            buffer_pie.close()
        plt.close()
    except Exception as e:
        print(f"Error generating categories pie chart: {e}")

    context = {
        'popular_service_categories': popular_service_categories_qs,
        'total_service_categories_count': total_service_categories_count,
        'total_unique_services_count': total_unique_services_count,
        'average_client_rating': average_client_rating,
        'median_client_rating': median_client_rating,
        'total_reviews_count': total_reviews_count,
        'total_completed_procedures_count': total_completed_procedures_count,
        'page_title': 'Наша статистика',
        'appointments_line_chart_base64': appointments_line_chart_base64,
        'categories_pie_chart_base64': categories_pie_chart_base64,
    }

    return render(request, 'public_statistics.html', context)

def http_cat_view(request):
    context = {
        'page_title': 'HTTP Коты и Факты о числах',
        'image_url': None,
        'number_fact': None,
        'status_code_input': '',
        'error_message': None,
        'api_error_message': None,
    }
    http_cat_api_base_url = "https://http.cat/"
    numbers_api_base_url = "http://numbersapi.com/"

    if request.method == 'POST':
        status_code_or_number = request.POST.get('status_code_or_number', '').strip()
        context['status_code_input'] = status_code_or_number

        if status_code_or_number:
            try:
                code_int = int(status_code_or_number)
                if 100 <= code_int <= 599:
                    context['image_url'] = f"{http_cat_api_base_url}{status_code_or_number}.jpg"
                else:
                    context['image_url'] = f"{http_cat_api_base_url}{status_code_or_number}.jpg"

                try:
                    numbers_api_url = f"{numbers_api_base_url}{code_int}"
                    response = requests.get(numbers_api_url, timeout=5)
                    response.raise_for_status()
                    context['number_fact'] = response.text
                except requests.exceptions.RequestException as e:
                    print(f"Error fetching from numbersapi.com: {e}")
                    context['api_error_message'] = "Не удалось получить факт о числе. Сервис numbersapi.com может быть недоступен."
                except ValueError:
                    context['error_message'] = "Пожалуйста, введите числовое значение."


            except ValueError:
                context['error_message'] = "Пожалуйста, введите числовое значение."
            except Exception as e:
                print(f"General error in http_cat_view: {e}")
                context['error_message'] = "Произошла общая ошибка при обработке вашего запроса."
        else:
            context['error_message'] = "Пожалуйста, введите число (например, HTTP статус-код)."

    return render(request, 'http_cat_page.html', context)