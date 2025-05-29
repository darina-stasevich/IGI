# main/forms.py
from django import forms
from django.contrib.auth.models import User
from django.contrib.auth.forms import AuthenticationForm
from django.core.exceptions import ValidationError
from django.utils import timezone

from .validators import validate_age_18_plus, validate_belarus_phone_number
from .models import UserProfile, Client, Doctor, DoctorCategory, Service, Review, Appointment, DoctorLeave, \
    DoctorAvailabilityOverride


class BaseUserRegistrationForm(forms.Form):
    username = forms.CharField(max_length=30, label="Логин",
                               widget=forms.TextInput(attrs={'placeholder': 'Ваш логин'}))
    password = forms.CharField(widget=forms.PasswordInput, label="Пароль")
    confirm_password = forms.CharField(widget=forms.PasswordInput, label="Повторите пароль")
    email = forms.EmailField(label="Email", widget=forms.EmailInput(attrs={'placeholder': 'user@example.com'}))
    first_name = forms.CharField(max_length=40, label="Имя", required=True)
    last_name = forms.CharField(max_length=40, label="Фамилия", required=True)

    phone_number = forms.CharField(
        max_length=20,
        label="Номер телефона",
        required=True,
        help_text="Формат: +375 (XX) XXX-XX-XX",
        widget=forms.TextInput(attrs={'placeholder': '+375 (29) 123-45-67'}),
        validators=[validate_belarus_phone_number]
    )
    date_of_birth = forms.DateField(
        widget=forms.DateInput(attrs={'type': 'date', 'placeholder': 'ГГГГ-ММ-ДД'}),
        label="Дата рождения",
        required=True,
        validators=[validate_age_18_plus]
    )

    def clean_username(self):
        username = self.cleaned_data.get('username')
        if User.objects.filter(username__iexact=username).exists():
            raise ValidationError("Пользователь с таким именем уже существует.")
        return username

    def clean_email(self):
        email = self.cleaned_data.get('email')
        if User.objects.filter(email__iexact=email).exists():
            raise ValidationError("Пользователь с таким email уже зарегистрирован.")
        return email

    def clean_confirm_password(self):
        password = self.cleaned_data.get('password')
        confirm_password = self.cleaned_data.get('confirm_password')
        if password and confirm_password and password != confirm_password:
            raise ValidationError("Пароли не совпадают.")
        return confirm_password


class ClientRegistrationForm(BaseUserRegistrationForm):
    address = forms.CharField(widget=forms.Textarea(attrs={'rows': 3}), label="Адрес", required=False)

    def save(self, commit=True):
        user = User.objects.create_user(
            username=self.cleaned_data['username'],
            email=self.cleaned_data['email'],
            password=self.cleaned_data['password'],
            first_name=self.cleaned_data.get('first_name', ''),
            last_name=self.cleaned_data.get('last_name', '')
        )
        user_profile = UserProfile.objects.create(
            user=user,
            role='client',
            phone_number=self.cleaned_data['phone_number'],
            date_of_birth=self.cleaned_data['date_of_birth']
        )
        Client.objects.create(
            user_profile=user_profile,
            address=self.cleaned_data.get('address', '')
        )
        return user

class DoctorRegistrationForm(BaseUserRegistrationForm):
    category = forms.ModelChoiceField(
        queryset=DoctorCategory.objects.all(),
        label="Категория врача",
        required=True,
        empty_label=None
    )
    experience_years = forms.IntegerField(
        label="Стаж (полных лет)",
        min_value=0,
        max_value=60,
        required=True
    )
    bio = forms.CharField(
        widget=forms.Textarea(
            attrs={'rows': 5, 'placeholder': 'Расскажите о вашей специализации, опыте и подходах к работе...'}),
        label="Биография и специализация",
        required=True
    )
    services_can_perform = forms.ModelMultipleChoiceField(
        queryset=Service.objects.all(),
        widget=forms.CheckboxSelectMultiple,
        label="Выполняемые услуги",
        required=True,
        help_text="Выберите одну или несколько услуг, которые вы предоставляете."
    )

    def save(self, commit=True):
        user = User.objects.create_user(
            username=self.cleaned_data['username'],
            email=self.cleaned_data['email'],
            password=self.cleaned_data['password'],
            first_name=self.cleaned_data.get('first_name', ''),
            last_name=self.cleaned_data.get('last_name', '')
        )
        user_profile = UserProfile.objects.create(
            user=user,
            role='doctor',
            phone_number=self.cleaned_data['phone_number'],
            date_of_birth=self.cleaned_data['date_of_birth']
        )

        doctor = Doctor.objects.create(
            user_profile=user_profile,
            category=self.cleaned_data['category'],
            experience_years=self.cleaned_data['experience_years'],
            bio=self.cleaned_data['bio']
        )

        services = self.cleaned_data.get('services_can_perform')
        if services:
            doctor.services_can_perform.set(services)

        return user
class UserLoginForm(AuthenticationForm):
    username = forms.CharField(
        label="Логин",
        widget=forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Логин'}))
    password = forms.CharField(
        label = "Пароль",
        widget=forms.PasswordInput(attrs={'class': 'form-control', 'placeholder': 'Пароль'}))


class ClientProfileUpdateForm(forms.Form):
    first_name = forms.CharField(max_length=40, label="Имя", required=True)
    last_name = forms.CharField(max_length=40, label="Фамилия", required=True)
    phone_number = forms.CharField(
        max_length=20,
        label="Номер телефона",
        required=True,
        help_text="Формат: +375 (XX) XXX-XX-XX",
        widget=forms.TextInput(attrs={'placeholder': '+375 (29) 123-45-67'}),
        validators=[validate_belarus_phone_number]
    )
    date_of_birth = forms.DateField(
        widget=forms.DateInput(attrs={'type': 'date', 'placeholder': 'ГГГГ-ММ-ДД'}, format='%Y-%m-%d'),
        label="Дата рождения",
        required=True,
        validators=[validate_age_18_plus]
    )
    address = forms.CharField(widget=forms.Textarea(attrs={'rows': 3}), label="Адрес", required=False)

    def __init__(self, *args, **kwargs):
        self.user_instance = kwargs.pop('user_instance', None)
        super().__init__(*args, **kwargs)

        if not self.user_instance:
            print("DEBUG FORM INIT: No user_instance provided.")
            return

        print(f"DEBUG FORM INIT: Initializing for user: {self.user_instance.username}")

        self.fields['first_name'].initial = self.user_instance.first_name
        self.fields['last_name'].initial = self.user_instance.last_name

        if hasattr(self.user_instance, 'profile'):
            profile = self.user_instance.profile
            self.fields['phone_number'].initial = profile.phone_number

            print(
                f"DEBUG FORM INIT: UserProfile ID: {profile.pk}, DoB from model: '{profile.date_of_birth}', Type: {type(profile.date_of_birth)}")

            self.fields['date_of_birth'].initial = profile.date_of_birth

            try:
                client_specific_profile = profile.client_profile
                self.fields['address'].initial = client_specific_profile.address
            except Client.DoesNotExist:
                self.fields['address'].initial = ''
                print(f"DEBUG FORM INIT: Client.DoesNotExist for UserProfile ID {profile.pk}")
            except AttributeError:
                self.fields['address'].initial = ''
                print(
                    f"DEBUG FORM INIT: AttributeError - UserProfile ID {profile.pk} has no 'client_profile' attribute.")  # Отладка
        else:
            print(f"DEBUG FORM INIT: User {self.user_instance.username} has no profile attribute.")

    def save(self):
        if not self.user_instance:
            raise Exception("Экземпляр пользователя не предоставлен форме ClientProfileUpdateForm.")

        user = self.user_instance
        user.first_name = self.cleaned_data['first_name']
        user.last_name = self.cleaned_data['last_name']
        user.save(update_fields=['first_name', 'last_name'])

        if hasattr(user, 'profile'):
            profile = user.profile
            profile.phone_number = self.cleaned_data['phone_number']

            dob_to_save = self.cleaned_data.get('date_of_birth')
            print(f"DEBUG FORM SAVE: Saving DoB: '{dob_to_save}', Type: {type(dob_to_save)}")
            profile.date_of_birth = dob_to_save

            profile.save(update_fields=['phone_number', 'date_of_birth'])

            try:
                client_specific_profile = profile.client_profile
                client_specific_profile.address = self.cleaned_data.get('address', '')
                client_specific_profile.save(update_fields=['address'])
            except Client.DoesNotExist:
                print(
                    f"DEBUG FORM SAVE: Client.DoesNotExist for UserProfile ID {profile.pk} when trying to save address.")  # Отладка
            except AttributeError:
                print(
                    f"DEBUG FORM SAVE: AttributeError - UserProfile ID {profile.pk} has no 'client_profile' attribute when trying to save address.")  # Отладка

        return user


class ReviewForm(forms.ModelForm):
    class Meta:
        model = Review
        fields = ['appointment', 'rating', 'comment']
        widgets = {
            'comment': forms.Textarea(attrs={'rows': 4, 'class': 'form-textarea'}),
            'rating': forms.Select(attrs={'class': 'form-select'}),
        }

    def __init__(self, *args, **kwargs):
        user = kwargs.pop('user', None)
        super().__init__(*args, **kwargs)

        eligible_appointments_queryset = Appointment.objects.none()

        if user and user.is_authenticated and hasattr(user, 'profile') and user.profile.role == 'client':
            try:
                client_instance = Client.objects.get(user_profile=user.profile)

                eligible_appointments_queryset = Appointment.objects.filter(
                    client=client_instance,
                    status='completed',
                    review__isnull=True
                ).select_related('service', 'doctor__user_profile__user').order_by('-start_datetime')
            except Client.DoesNotExist:
                pass

        self.fields['appointment'].queryset = eligible_appointments_queryset
        self.fields['appointment'].widget.attrs.update({'class': 'form-select'})

        self.fields['appointment'].label_from_instance = lambda obj: (
            f"{obj.service.name} (врач: {obj.doctor.user_profile.user.get_full_name() or obj.doctor.user_profile.user.username}) "
            f"- {obj.start_datetime.strftime('%d %b %Y, %H:%M')}"
        )

        if not eligible_appointments_queryset.exists():
            self.fields['appointment'].widget.attrs['disabled'] = True
            self.fields[
                'appointment'].help_text = "У вас нет завершенных приемов, на которые можно было бы оставить отзыв."
        else:
            self.fields['appointment'].empty_label = None

        self.fields['appointment'].label = "Выберите прием для отзыва"
        self.fields['rating'].label = "Ваша оценка"
        self.fields['comment'].label = "Текст отзыва"


class DoctorLeaveRequestForm(forms.ModelForm):
    start_date = forms.DateField(
        label="Дата начала отпуска",
        widget=forms.DateInput(attrs={'type': 'date', 'class': 'form-input-date'}),
        initial=lambda: timezone.localdate() + timezone.timedelta(days=1)
    )
    end_date = forms.DateField(
        label="Дата окончания отпуска",
        widget=forms.DateInput(attrs={'type': 'date', 'class': 'form-input-date'}),
        initial=lambda: timezone.localdate() + timezone.timedelta(days=2)
    )
    reason = forms.CharField(
        label="Причина (необязательно)",
        widget=forms.Textarea(attrs={'rows': 3, 'class': 'form-textarea', 'maxlength': '255'}),
        required=False,
        max_length=255
    )

    class Meta:
        model = DoctorLeave
        fields = ['start_date', 'end_date', 'reason']

    def clean_start_date(self):
        start_date = self.cleaned_data.get('start_date')
        if start_date and start_date < timezone.localdate():
            raise forms.ValidationError("Дата начала отпуска не может быть в прошлом.")
        return start_date

    def clean(self):
        cleaned_data = super().clean()
        start_date = cleaned_data.get('start_date')
        end_date = cleaned_data.get('end_date')

        if start_date and end_date and start_date > end_date:
            self.add_error('end_date', "Дата окончания отпуска не может быть раньше даты начала.")

        return cleaned_data

class DoctorDayOffRequestForm(forms.ModelForm):
    date = forms.DateField(
        label="Дата",
        widget=forms.DateInput(attrs={'type': 'date', 'class': 'form-input-date'}),
        initial=lambda: timezone.localdate() + timezone.timedelta(days=1)
    )
    start_time = forms.TimeField(
        label="Время начала отсутствия (ЧЧ:ММ)",
        widget=forms.TimeInput(attrs={'type': 'time', 'class': 'form-input-time'}),
        required=False,
        help_text="Оставьте пустым для отгула на весь день. Укажите для сокращенного дня."
    )
    end_time = forms.TimeField(
        label="Время окончания отсутствия (ЧЧ:ММ)",
        widget=forms.TimeInput(attrs={'type': 'time', 'class': 'form-input-time'}),
        required=False,
        help_text="Оставьте пустым для отгула на весь день. Укажите для сокращенного дня."
    )
    reason = forms.CharField(
        label="Причина запроса",
        widget=forms.Textarea(attrs={'rows': 3, 'class': 'form-textarea', 'maxlength': '255'}),
        required=True
    )

    class Meta:
        model = DoctorAvailabilityOverride
        fields = ['date', 'start_time', 'end_time', 'reason']

    def clean_date(self):
        date = self.cleaned_data.get('date')
        if date and date < timezone.localdate():
            raise forms.ValidationError("Дата не может быть в прошлом.")
        return date

    def clean(self):
        cleaned_data = super().clean()
        start_time = cleaned_data.get('start_time')
        end_time = cleaned_data.get('end_time')

        if start_time and end_time:
            if start_time >= end_time:
                self.add_error('end_time', "Время окончания должно быть позже времени начала.")
        elif (start_time and not end_time) or (not start_time and end_time):
            if start_time and not end_time:
                self.add_error('end_time', "Укажите время окончания периода отсутствия.")
            if not start_time and end_time:
                self.add_error('start_time', "Укажите время начала периода отсутствия.")

        return cleaned_data

class AppointmentNotesForm(forms.Form):
    notes_by_client = forms.CharField(
        widget=forms.Textarea(attrs={'rows': 3, 'placeholder': 'Ваши пожелания или комментарии к записи (необязательно)'}),
        required=False,
        label="Примечания к записи"
    )
    service_id = forms.IntegerField(widget=forms.HiddenInput())
    doctor_id = forms.IntegerField(widget=forms.HiddenInput())
    start_datetime = forms.CharField(widget=forms.HiddenInput())
    end_datetime = forms.CharField(widget=forms.HiddenInput())