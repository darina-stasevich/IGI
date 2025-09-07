from decimal import Decimal
from urllib.parse import urlparse, parse_qs

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone

from django.core.exceptions import ValidationError
from django.utils import timezone
import re
from datetime import date

from .validators import validate_age_18_plus, validate_belarus_phone_number
class UserProfile(models.Model):
    ROLE_CHOICES = [
        ('client', 'Клиент'),
        ('doctor', 'Врач'),
    ]
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile', verbose_name="Пользователь")
    phone_number = models.CharField(max_length=20, verbose_name="Номер телефона", blank=True, validators=[validate_belarus_phone_number])
    date_of_birth = models.DateField(verbose_name="Дата рождения", null=True, blank=True, validators=[validate_age_18_plus])
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, verbose_name="Роль")

    def __str__(self):
        return f"{self.user.username} ({self.get_role_display()})"

    class Meta:
        verbose_name = "Профиль пользователя"
        verbose_name_plural = "Профили пользователей"

class Client(models.Model):
    user_profile = models.OneToOneField(UserProfile, on_delete=models.CASCADE, related_name='client_profile', verbose_name="Профиль пользователя")
    address = models.TextField(verbose_name="Адрес", blank=True)
    registration_date = models.DateField(auto_now_add=True, verbose_name="Дата регистрации")

    def __str__(self):
        return f"Клиент: {self.user_profile.user.get_full_name() or self.user_profile.user.username}"

    class Meta:
        verbose_name = "Клиент"
        verbose_name_plural = "Клиенты"

class DoctorCategory(models.Model):
    name = models.CharField(max_length=100, unique=True, verbose_name="Название категории врача")
    description = models.TextField(blank=True, null=True, verbose_name="Описание")

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = "Категория врача"
        verbose_name_plural = "Категории врачей"

class ServiceCategory(models.Model):
    name = models.CharField(max_length=100, unique=True, verbose_name="Название категории услуг")
    description = models.TextField(blank=True, null=True, verbose_name="Описание")

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = "Категория услуг"
        verbose_name_plural = "Категории услуг"

class Service(models.Model):
    name = models.CharField(max_length=200, verbose_name="Название услуги")
    description = models.TextField(verbose_name="Описание услуги")
    price = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="Стоимость")
    duration_minutes = models.IntegerField(verbose_name="Длительность (минуты)", help_text="Длительность процедуры в минутах")
    category = models.ForeignKey(ServiceCategory, on_delete=models.PROTECT, related_name='services', verbose_name="Категория услуг")
    office_number = models.CharField(max_length=5, blank=True, null=True, verbose_name="Номер кабинета")
    def __str__(self):
        return f"{self.name} ({self.category.name})"

    class Meta:
        verbose_name = "Услуга"
        verbose_name_plural = "Услуги"
        ordering = ['category', 'name']

class Doctor(models.Model):
    user_profile = models.OneToOneField(
    UserProfile,
        on_delete=models.CASCADE,
        related_name='doctor_profile',
        verbose_name="Профиль пользователя"
    )
    category = models.ForeignKey(
        DoctorCategory,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='doctors',
        verbose_name="Категория врача"
    )
    experience_years = models.IntegerField(default=0, verbose_name="Стаж (лет)")
    bio = models.TextField(blank=True, null=True, verbose_name="Биография/Основная специализация")
    services_can_perform = models.ManyToManyField(
        Service,
        related_name='doctors_performing',
        verbose_name="Выполняемые услуги",
        blank=True
    )

    contact_page_photo = models.ImageField(
        upload_to='doctor_contact_photos/',
        blank=True,
        null=True,
        verbose_name="Фото для страницы 'Контакты'",
        help_text="Если не указано, можно использовать фото из UserProfile или стандартное."
    )
    contact_page_description = models.TextField(
        blank=True,
        null=True,
        verbose_name="Описание для страницы 'Контакты'",
        help_text="Краткое описание роли или специализации для страницы контактов. Если не указано, можно использовать часть 'bio'."
    )

    show_on_contacts_page = models.BooleanField(
        default=True,
        verbose_name="Показывать на странице 'Контакты'"
    )
    contact_page_display_order = models.PositiveIntegerField(
        default=0,
        verbose_name="Порядок на странице 'Контакты'",
        help_text="Меньшее число означает более высокое положение в списке."
    )
    # ------------------------------------

    def __str__(self):
        try:
            if self.user_profile and self.user_profile.user:
                 full_name = self.user_profile.user.get_full_name()
                 if full_name:
                     return f"Врач: {full_name}"
                 return f"Врач: {self.user_profile.user.username}"
        except AttributeError:
            pass
        return f"Врач (ID: {self.pk})"


    class Meta:
        verbose_name = "Врач"
        verbose_name_plural = "Врачи"
        ordering = ['user_profile__user__last_name', 'user_profile__user__first_name'] # Сортировка по ФИО

class DoctorWeeklyAvailabilitySlot(models.Model):
    DAY_OF_WEEK_CHOICES = [
        (0, 'Понедельник'), (1, 'Вторник'), (2, 'Среда'),
        (3, 'Четверг'), (4, 'Пятница'), (5, 'Суббота'), (6, 'Воскресенье')
    ]
    doctor = models.ForeignKey(Doctor, on_delete=models.CASCADE, related_name='weekly_availability', verbose_name="Врач")
    day_of_week = models.IntegerField(choices=DAY_OF_WEEK_CHOICES, verbose_name="День недели")
    start_time = models.TimeField(verbose_name="Время начала")
    end_time = models.TimeField(verbose_name="Время окончания")

    def __str__(self):
        return f"{self.doctor} - {self.get_day_of_week_display()} ({self.start_time}-{self.end_time})"

    class Meta:
        verbose_name = "Слот еженедельного расписания врача"
        verbose_name_plural = "Слоты еженедельного расписания врачей"
        unique_together = ('doctor', 'day_of_week', 'start_time', 'end_time')
        ordering = ['doctor', 'day_of_week', 'start_time']


class DoctorAvailabilityOverride(models.Model):
    STATUS_CHOICES = [
        ('requested', 'Запрошен'),
        ('approved', 'Одобрен'),
        ('rejected', 'Отклонен'),
    ]

    doctor = models.ForeignKey(Doctor, on_delete=models.CASCADE, related_name='availability_overrides',
                               verbose_name="Врач")
    date = models.DateField(verbose_name="Дата")

    # Для сокращенного дня (недоступен в этот промежуток) или полного отгула (оба поля None)
    start_time = models.TimeField(null=True, blank=True, verbose_name="Время начала периода недоступности")
    end_time = models.TimeField(null=True, blank=True, verbose_name="Время окончания периода недоступности")

    # is_available всегда будет False для запросов отгула/сокращения, т.к. мы определяем период НЕДОСТУПНОСТИ
    is_available = models.BooleanField(default=False, verbose_name="Доступен (должно быть False для отгулов)")

    # Новые поля для системы запросов
    reason = models.CharField(max_length=255, blank=True, null=True, verbose_name="Причина запроса")
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='requested', verbose_name="Статус запроса")
    requested_at = models.DateTimeField(default=timezone.now, verbose_name="Дата подачи запроса")
    processed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='processed_availability_overrides',
        verbose_name="Обработал (администратор)"
    )
    status_updated_at = models.DateTimeField(null=True, blank=True, verbose_name="Дата последнего изменения статуса")

    _original_status = None

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._original_status = self.status

    def save(self, *args, **kwargs):
        is_new = self._state.adding

        self.is_available = False

        if is_new:
            self.requested_at = timezone.now()
            self.status_updated_at = timezone.now()
        else:
            if self.status != self._original_status:
                self.status_updated_at = timezone.now()

        super().save(*args, **kwargs)
        self._original_status = self.status

    def clean(self):
        super().clean()
        if self.date and self.pk is None and self.date < timezone.localdate():
            raise ValidationError({'date': "Дата запроса не может быть в прошлом."})

        if self.start_time and self.end_time and self.start_time >= self.end_time:
            raise ValidationError({'end_time': "Время окончания должно быть позже времени начала."})

        if (self.start_time and not self.end_time) or (not self.start_time and self.end_time):
            raise ValidationError("Если указано одно время (начала или окончания), должно быть указано и другое.")

        if self.status in ['requested', 'approved', 'rejected'] and self.is_available:
          pass

    def __str__(self):
        period_type = "Отгул (весь день)"
        if self.start_time and self.end_time:
            period_type = f"Сокращение ({self.start_time.strftime('%H:%M')}-{self.end_time.strftime('%H:%M')})"

        return f"{self.doctor} - {self.date.strftime('%d.%m.%Y')} - {period_type} - Статус: {self.get_status_display()}"

    class Meta:
        verbose_name = "Запрос на изменение расписания (отгул/сокращение)"
        verbose_name_plural = "Запросы на изменение расписания (отгулы/сокращения)"
        unique_together = ('doctor', 'date', 'start_time', 'end_time',
                           'status')
        ordering = ['doctor', '-date', '-requested_at']


class DoctorLeave(models.Model):
    STATUS_CHOICES = [
        ('requested', 'Запрошен'),
        ('approved', 'Одобрен'),
        ('rejected', 'Отклонен'),
    ]
    doctor = models.ForeignKey(Doctor, on_delete=models.CASCADE, related_name='leaves', verbose_name="Врач")
    start_date = models.DateField(verbose_name="Дата начала")
    end_date = models.DateField(verbose_name="Дата окончания")
    reason = models.CharField(max_length=255, blank=True, null=True, verbose_name="Причина")
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='requested', verbose_name="Статус")
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_doctor_leaves', verbose_name="Одобрил")
    requested_at = models.DateTimeField(auto_now_add=True, verbose_name="Дата запроса")

    def __str__(self):
        return f"Отсутствие {self.doctor}: {self.start_date} - {self.end_date} ({self.get_status_display()})"

    class Meta:
        verbose_name = "Отсутствие/Отпуск врача"
        verbose_name_plural = "Отсутствия/Отпуска врачей"
        ordering = ['doctor', '-start_date']

    def clean(self):
        super().clean()
        if self.start_date and self.end_date:
            if self.start_date > self.end_date:
                raise ValidationError({'end_date': "Дата окончания отпуска не может быть раньше даты начала."})
            # Проверка на прошлое для новых записей (self.pk is None)
            if self.pk is None and self.start_date < timezone.localdate():
                raise ValidationError({'start_date': "Дата начала отпуска не может быть в прошлом."})


class Appointment(models.Model):
    STATUS_CHOICES = [
        ('booked', 'Забронировано'),
        ('paid', 'Оплачено'),
        ('completed', 'Завершено'),
        ('cancelled_by_client', 'Отменено клиентом'),
        ('cancelled_by_clinic', 'Отменено клиникой'),
        ('no_show', 'Клиент не явился'),
    ]
    client = models.ForeignKey('Client', on_delete=models.CASCADE, related_name='appointments', verbose_name="Клиент")
    doctor = models.ForeignKey('Doctor', on_delete=models.CASCADE, related_name='appointments', verbose_name="Врач")
    service = models.ForeignKey('Service', on_delete=models.PROTECT, related_name='appointments', verbose_name="Услуга")
    start_datetime = models.DateTimeField(verbose_name="Дата и время начала")
    end_datetime = models.DateTimeField(verbose_name="Дата и время окончания")
    status = models.CharField(max_length=25, choices=STATUS_CHOICES, default='booked', verbose_name="Статус записи")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Дата создания записи")
    notes_by_client = models.TextField(blank=True, null=True, verbose_name="Примечание клиента")

    price_at_booking = models.DecimalField(
        max_digits=10, decimal_places=2,
        verbose_name="Цена услуги на момент бронирования"
    )

    # ---- Упрощенные поля для промокода ----
    applied_promo_code = models.ForeignKey(
        'PromoCode',
        on_delete=models.SET_NULL,  # Если промокод удалят, запись останется, но без прямой связи
        null=True, blank=True,
        related_name='appointments_where_applied',  # Изменил related_name
        verbose_name="Примененный промокод"
    )
    # Сумма скидки, которая была применена к этой записи благодаря промокоду.
    # Это значение будет рассчитано и установлено во view/form при применении промокода.
    discount_amount_applied = models.DecimalField(
        max_digits=10, decimal_places=2,
        null=True, blank=True,
        default=Decimal('0.00'),  # По умолчанию скидка 0
        verbose_name="Сумма примененной скидки"
    )
    # ------------------------------------

    status_last_updated_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Дата последнего изменения статуса",
        editable=False
    )
    _original_status = None

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._original_status = self.status

    def save(self, *args, **kwargs):
        if self.pk is not None:
            if self.status != self._original_status:
                self.status_last_updated_at = timezone.now()

        # Если скидка не была установлена (например, при создании без промокода),
        # убедимся, что она 0, а не None, если это предпочтительнее для расчетов.
        if self.discount_amount_applied is None:
            self.discount_amount_applied = Decimal('0.00')

        super().save(*args, **kwargs)
        self._original_status = self.status

    def get_final_price_display(self):
        """
        Рассчитывает итоговую цену для отображения (не хранится отдельно).
        """
        if self.price_at_booking is not None and self.discount_amount_applied is not None:
            final_price = self.price_at_booking - self.discount_amount_applied
            return max(final_price, Decimal('0.00'))  # Цена не может быть отрицательной
        return self.price_at_booking  # Если что-то не так, возвращаем исходную цену

    def __str__(self):
        return f"Запись: {str(self.client)} к {str(self.doctor)} на {self.service.name} ({self.start_datetime.strftime('%Y-%m-%d %H:%M')})"

    class Meta:
        verbose_name = "Запись на прием"
        verbose_name_plural = "Записи на прием"
        ordering = ['-start_datetime']
        constraints = [  # Оставляем ограничения из предыдущих правок
            models.UniqueConstraint(
                fields=['doctor', 'start_datetime'],
                condition=~models.Q(status__in=['cancelled_by_client', 'cancelled_by_clinic']),
                name='unique_doctor_active_slot_appointment_v2'  # Обновил имя для уникальности
            ),
            models.UniqueConstraint(
                fields=['client', 'start_datetime'],
                condition=~models.Q(status__in=['cancelled_by_client', 'cancelled_by_clinic']),
                name='unique_client_active_slot_appointment_v2'  # Обновил имя для уникальности
            )
        ]
class PromoCode(models.Model):
    code = models.CharField(max_length=50, unique=True, verbose_name="Промокод")
    description = models.TextField(blank=True, null=True, verbose_name="Описание")
    discount_percentage = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, verbose_name="Скидка в %", validators=[MinValueValidator(0), MaxValueValidator(100)])
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, verbose_name="Скидка суммой", validators=[MinValueValidator(0)])
    valid_from = models.DateField(verbose_name="Действителен с")
    valid_to = models.DateField(verbose_name="Действителен по")
    is_active = models.BooleanField(default=True, verbose_name="Активен")
    max_uses = models.PositiveIntegerField(null=True, blank=True, verbose_name="Макс. использований (всего)")
    uses_per_user = models.PositiveIntegerField(null=True, blank=True, verbose_name="Макс. использований (на пользователя)")
    used_count = models.PositiveIntegerField(default=0, verbose_name="Использовано раз")

    def __str__(self):
        return self.code

    class Meta:
        verbose_name = "Промокод"
        verbose_name_plural = "Промокоды"

class Review(models.Model):
    RATING_CHOICES = [(i, str(i)) for i in range(1, 6)]

    appointment = models.OneToOneField(
        Appointment,
        on_delete=models.CASCADE,
        related_name='review',
        verbose_name="Посещение"
    )
    rating = models.IntegerField(choices=RATING_CHOICES, verbose_name="Оценка")
    comment = models.TextField(verbose_name="Текст отзыва")
    created_at = models.DateTimeField(default=timezone.now, verbose_name="Дата создания")

    def __str__(self):
        return f"Отзыв на посещение у {self.appointment.doctor} от {self.appointment.client} (Оценка: {self.rating})"

    class Meta:
        verbose_name = "Отзыв"
        verbose_name_plural = "Отзывы"
        ordering = ['-created_at']


class CompanyProfile(models.Model):
    main_info_title = models.CharField(
        max_length=200,
        default="О нашей клинике",
        verbose_name="Заголовок основного блока"
    )
    main_info_text = models.TextField(verbose_name="Основной текст о компании")

    history_title = models.CharField(
        max_length=200,
        default="Наша история",
        blank=True,
        verbose_name="Заголовок блока 'История'"
    )
    history_text = models.TextField(blank=True, verbose_name="Текст истории по годам")

    requisites_title = models.CharField(
        max_length=200,
        default="Реквизиты",
        blank=True,
        verbose_name="Заголовок блока 'Реквизиты'"
    )
    requisites_text = models.TextField(blank=True, verbose_name="Текст реквизитов")

    certificate_title = models.CharField(
        max_length=200,
        default="Лицензии и сертификаты",
        blank=True,
        verbose_name="Заголовок блока 'Сертификаты'"
    )
    certificate_static_path = models.CharField(
        max_length=255,
        blank=True,
        verbose_name="Путь к файлу сертификата в папке static",
        help_text="Например: 'main/certificates/certificate.pdf'"
    )

    logo_url = models.URLField(verbose_name="URL логотипа", blank=True, null=True)
    video_url = models.URLField(verbose_name="URL видео (например, YouTube, Vimeo)", blank=True, null=True)

    last_updated = models.DateTimeField(auto_now=True, verbose_name="Последнее обновление")

    def __str__(self):
        return self.main_info_title or "Профиль компании"

    class Meta:
        verbose_name = "Профиль компании"

    # --- ВОТ НЕДОСТАЮЩИЙ МЕТОД ---
    def get_embed_url(self):
        if not self.video_url:
            return None

        url_data = urlparse(self.video_url)

        if "youtube.com" in url_data.netloc:
            query = parse_qs(url_data.query)
            video_id = query.get("v", [None])[0]
            if video_id:
                return f"https://www.youtube.com/embed/{video_id}"

        elif "youtu.be" in url_data.netloc:
            video_id = url_data.path.lstrip('/')
            if video_id:
                return f"https://www.youtube.com/embed/{video_id}"

        elif "vimeo.com" in url_data.netloc:
            video_id = url_data.path.lstrip('/')
            if video_id.isdigit():
                return f"https://player.vimeo.com/video/{video_id}"

        return None

class Article(models.Model):
    title = models.CharField(max_length=50, verbose_name="Заголовок")
    slug = models.SlugField(
        max_length=50,
        unique=True,
        verbose_name="Slug (для URL)",
        help_text="Уникальная часть URL, генерируется из заголовка (например, 'novaya-statya-o-zdorovie')"
    )
    short_description = models.TextField(verbose_name="Краткое описание (1-2 предложения)")
    full_content = models.TextField(verbose_name="Полное содержание статьи")
    image_url = models.URLField(
        verbose_name="URL картинки",
        blank=True,
        null=True,
        help_text="Ссылка на изображение для статьи"
    )
    image = models.ImageField(upload_to='articles_images/', blank=True, null=True, verbose_name="Изображение")

    published_date = models.DateTimeField(default=timezone.now, verbose_name="Дата публикации")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Дата создания")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Дата обновления")
    is_published = models.BooleanField(default=True, verbose_name="Опубликовано")

    author = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name="Автор",
        related_name="articles"
    )

    def __str__(self):
        return self.title

    class Meta:
        verbose_name = "Статья (Новость)"
        verbose_name_plural = "Статьи (Новости)"
        ordering = ['-published_date']


class FaqItem(models.Model):
    question = models.CharField(max_length=255, verbose_name="Вопрос / Термин")
    answer = models.TextField(verbose_name="Ответ / Определение")
    date_added = models.DateField(default=timezone.now, verbose_name="Дата добавления на сайт")
    is_visible = models.BooleanField(default=True, verbose_name="Показывать на сайте")
    display_order = models.PositiveIntegerField(
        default=0,
        verbose_name="Порядок отображения",
        help_text="Меньшее число означает более высокое положение в списке"
    )

    def __str__(self):
        return self.question

    class Meta:
        verbose_name = "Вопрос-Ответ (FAQ)"
        verbose_name_plural = "Вопросы-Ответы (FAQ)"
        ordering = ['display_order', '-date_added']


class NonDoctorStaffContact(models.Model):
    full_name = models.CharField(max_length=150, verbose_name="ФИО сотрудника")
    position = models.CharField(
        max_length=100,
        verbose_name="Должность",
    )

    photo = models.ImageField(
        upload_to='other_staff_photos/',
        blank=True,
        null=True,
        verbose_name="Фотография"
    )

    work_description = models.TextField(
        verbose_name="Зона ответственности",
        blank=True
    )
    phone = models.CharField(max_length=25, verbose_name="Рабочий телефон", blank=True)
    email = models.EmailField(verbose_name="Рабочий Email", blank=True)

    display_order = models.PositiveIntegerField(
        default=0,
        verbose_name="Порядок отображения на стр. 'Контакты'",
        help_text="Меньшее число означает более высокое положение в списке"
    )
    is_visible_on_contacts_page = models.BooleanField(
        default=True,
        verbose_name="Показывать на странице 'Контакты'"
    )

    def __str__(self):
        return f"{self.full_name} - {self.position}"

    class Meta:
        verbose_name = "Контакт (не врач)"
        verbose_name_plural = "Контакты (не врачи)"
        ordering = ['display_order', 'full_name']


class Vacancy(models.Model):
    title = models.CharField(max_length=200, verbose_name="Название вакансии")
    short_description = models.TextField(verbose_name="Краткое описание (для списка)")
    full_description = models.TextField(verbose_name="Полное описание (требования, условия, обязанности)")

    doctor_category = models.ForeignKey(
        DoctorCategory,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='vacancies',
        verbose_name="Требуемая специализация врача (если применимо)"
    )

    salary_info = models.CharField(max_length=100, verbose_name="Информация о зарплате", blank=True)
    date_posted = models.DateField(default=timezone.now, verbose_name="Дата публикации вакансии")
    is_active = models.BooleanField(default=True, verbose_name="Вакансия активна (отображается)")
    contact_info = models.TextField(
        verbose_name="Контактная информация для отклика",
        blank=True,
        help_text="Email, телефон или ссылка на форму отклика"
    )

    def __str__(self):
        if self.doctor_category:
            return f"{self.title} ({self.doctor_category.name})"
        return self.title

    class Meta:
        verbose_name = "Вакансия"
        verbose_name_plural = "Вакансии"
        ordering = ['-date_posted']

class PartnerCompany(models.Model):
    name = models.CharField(
        max_length=100,
        verbose_name="Название компании"
    )
    website_url = models.URLField(
        verbose_name="Ссылка на сайт",
        help_text="Полный URL-адрес сайта партнера (например, https://example.com)"
    )
    logo = models.ImageField(
        upload_to='partners_logos/',
        verbose_name="Логотип",
        help_text="Загрузите изображение логотипа"
    )
    description = models.TextField(
        blank=True,
        verbose_name="Краткое описание (необязательно)"
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name="Активен",
        help_text="Снимите галочку, чтобы скрыть партнера с сайта, не удаляя его"
    )

    class Meta:
        verbose_name = "Компания-партнер"
        verbose_name_plural = "Компании-партнеры"
        ordering = ['name'] # Сортировка по имени по умолчанию

    def __str__(self):
        return self.name