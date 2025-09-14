from datetime import timedelta
from decimal import Decimal

from django.conf import settings
from django.contrib import admin
from django.core.exceptions import ValidationError
from django.utils import timezone
from django.utils.safestring import mark_safe

from .models import (
    UserProfile, Client, DoctorCategory, ServiceCategory, Service, Doctor,
    DoctorWeeklyAvailabilitySlot, DoctorAvailabilityOverride, DoctorLeave,
    Appointment, PromoCode, Review, Vacancy, NonDoctorStaffContact, FaqItem, Article, CompanyProfile, PartnerCompany
)

@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'role', 'phone_number', 'date_of_birth')
    list_filter = ('role',)
    search_fields = ('user__username', 'user__first_name', 'user__last_name', 'phone_number')
    raw_id_fields = ('user',)

@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    list_display = ('get_username', 'get_full_name', 'registration_date', 'address')
    search_fields = ('user_profile__user__username', 'user_profile__user__first_name', 'user_profile__user__last_name', 'address')
    raw_id_fields = ('user_profile',)

    def get_username(self, obj):
        return obj.user_profile.user.username
    get_username.short_description = 'Логин'
    get_username.admin_order_field = 'user_profile__user__username'

    def get_full_name(self, obj):
        return obj.user_profile.user.get_full_name()
    get_full_name.short_description = 'ФИО'
    get_full_name.admin_order_field = 'user_profile__user__last_name'


@admin.register(DoctorCategory)
class DoctorCategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'description')
    search_fields = ('name',)

@admin.register(ServiceCategory)
class ServiceCategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'description')
    search_fields = ('name',)

@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'price', 'duration_minutes')
    list_filter = ('category',)
    search_fields = ('name', 'description')
    list_editable = ('price', 'duration_minutes')

@admin.register(Doctor)
class DoctorAdmin(admin.ModelAdmin):
    list_display = (
        'get_full_name_link',
        'category',
        'experience_years',
        'show_on_contacts_page',
        'contact_page_display_order'
    )
    list_filter = ('category', 'show_on_contacts_page', 'services_can_perform')
    search_fields = (
        'user_profile__user__username',
        'user_profile__user__first_name',
        'user_profile__user__last_name',
        'bio',
        'contact_page_description'
    )
    raw_id_fields = ('user_profile', 'category')
    filter_horizontal = ('services_can_perform',)
    list_editable = ('show_on_contacts_page', 'contact_page_display_order')

    fieldsets = (
        (None, {
            'fields': ('user_profile', 'category', 'experience_years', 'bio')
        }),
        ('Выполняемые услуги', {
            'fields': ('services_can_perform',)
        }),
        ('Настройки для страницы "Контакты"', {
            'classes': ('collapse',),
            'fields': (
                'show_on_contacts_page',
                'contact_page_display_order',
                'contact_page_photo',
                'contact_page_photo_preview',
                'contact_page_description'
            )
        }),
    )
    readonly_fields = ('contact_page_photo_preview',)

    def get_full_name_link(self, obj):
        return obj.user_profile.user.get_full_name() if obj.user_profile and obj.user_profile.user else '-'

    get_full_name_link.short_description = 'ФИО врача'
    get_full_name_link.admin_order_field = 'user_profile__user__last_name'  # Сортировка по фамилии

    def contact_page_photo_preview(self, obj):
        if obj.contact_page_photo:
            return mark_safe(f'<img src="{obj.contact_page_photo.url}" style="max-height: 150px;" />')
        return "Фото не загружено"

    contact_page_photo_preview.short_description = 'Превью фото для контактов'

@admin.register(DoctorWeeklyAvailabilitySlot)
class DoctorWeeklyAvailabilitySlotAdmin(admin.ModelAdmin):
    list_display = ('doctor', 'get_day_of_week_display', 'start_time', 'end_time')
    list_filter = ('doctor', 'day_of_week')
    raw_id_fields = ('doctor',)

    def get_day_of_week_display(self, obj):
        return obj.get_day_of_week_display()
    get_day_of_week_display.short_description = 'День недели'
    get_day_of_week_display.admin_order_field = 'day_of_week'


@admin.register(DoctorAvailabilityOverride)
class DoctorAvailabilityOverrideAdmin(admin.ModelAdmin):
    list_display = (
    'doctor', 'date', 'start_time', 'end_time', 'reason', 'status', 'requested_at', 'processed_by', 'status_updated_at',
    'is_available')
    list_filter = ('status', 'doctor', 'date', 'is_available')
    search_fields = ('doctor__user_profile__user__username', 'reason')
    list_editable = ('status',)  # Позволяем менять статус из списка
    raw_id_fields = ('doctor', 'processed_by')

    # Определяем поля для формы редактирования
    fields = ('doctor', 'date', 'start_time', 'end_time', 'is_available',
              'reason', 'status', 'requested_at', 'processed_by', 'status_updated_at')

    def get_readonly_fields(self, request, obj=None):
        base_readonly = ['requested_at', 'status_updated_at']
        if obj:  # Редактирование
            # is_available не должно меняться для запросов отгула, оно всегда False
            # Оно устанавливается в save() модели, но здесь можно явно указать
            current_readonly = base_readonly + ['is_available']
            if obj.status != 'requested':
                # Если запрос обработан, основные данные не меняем
                return current_readonly + ['doctor', 'date', 'start_time', 'end_time', 'reason']
            else:
                # Если еще "запрошен", не даем менять врача
                return current_readonly + ['doctor']
        return base_readonly  # Для новых записей

    def save_model(self, request, obj, form, change):
        # obj.is_available = False # Гарантируем, что для запросов это False (также делается в модели)

        if change and 'status' in form.changed_data:
            if obj.status in ['approved', 'rejected'] and not obj.processed_by:
                obj.processed_by = request.user
            elif obj.status == 'requested':
                obj.processed_by = None
            # status_updated_at будет обновлен в save() модели DoctorAvailabilityOverride

        # Если создается новый объект через админку и статус сразу approved/rejected
        if not change and obj.status in ['approved', 'rejected'] and not obj.processed_by:
            obj.processed_by = request.user

        super().save_model(request, obj, form, change)


@admin.register(DoctorLeave)
class DoctorLeaveAdmin(admin.ModelAdmin):
    list_display = ('doctor', 'start_date', 'end_date', 'reason', 'status', 'requested_at', 'approved_by')
    list_filter = ('doctor', 'status', 'start_date', 'end_date')
    search_fields = ('doctor__user_profile__user__username', 'doctor__user_profile__user__first_name',
                     'doctor__user_profile__user__last_name', 'reason')
    raw_id_fields = ('doctor', 'approved_by')
    date_hierarchy = 'start_date'
    list_editable = ('status',)

    fields = ('doctor', 'start_date', 'end_date', 'reason', 'status', 'requested_at', 'approved_by')

    def get_readonly_fields(self, request, obj=None):
        if obj:
            base_readonly = ['requested_at']

            if obj.status != 'requested':
                return base_readonly + ['doctor', 'start_date', 'end_date', 'reason']
            else:
                return base_readonly + ['doctor']
        else:
            return ['requested_at']

    def save_model(self, request, obj, form, change):

        if obj.status in ['approved', 'rejected']:
            if not obj.approved_by:
                obj.approved_by = request.user
        elif obj.status == 'requested':
            obj.approved_by = None

        super().save_model(request, obj, form, change)


@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    list_display = (
        'client', 'doctor', 'service', 'start_datetime',
        'status',
        'price_at_booking',
        'applied_promo_code',
        'discount_amount_applied'
    )
    list_filter = ('status', 'doctor', 'client', 'service', 'start_datetime', 'applied_promo_code')
    search_fields = (
        'client__user_profile__user__username',
        'client__user_profile__user__first_name',
        'client__user_profile__user__last_name',
        'doctor__user_profile__user__username',
        'doctor__user_profile__user__first_name',
        'doctor__user_profile__user__last_name',
        'service__name', 'notes_by_client',
        'applied_promo_code__code'
    )
    raw_id_fields = ('client', 'doctor', 'service', 'applied_promo_code')
    date_hierarchy = 'start_datetime'
    list_editable = ('status',)

    readonly_fields = (
        'created_at', 'end_datetime', 'status_last_updated_at',
        # 'price_at_booking', # Можно сделать readonly после первого сохранения
        # 'discount_amount_applied', # Если он всегда устанавливается только при применении промокода
    )

    fieldsets = (
        (None, {
            'fields': ('client', 'doctor', 'service', 'status')
        }),
        ('Время и даты', {
            'fields': ('start_datetime', 'end_datetime', 'created_at', 'status_last_updated_at')
        }),
        ('Детализация цены и промокод', {
            # price_at_booking здесь, чтобы администратор видел исходную цену
            # applied_promo_code для выбора промокода
            # discount_amount_applied для отображения/ручного ввода (если это разрешено)
            'fields': ('price_at_booking', 'applied_promo_code', 'discount_amount_applied')
        }),
        ('Заметки клиента', {
            'fields': ('notes_by_client',)
        }),
    )

    def save_model(self, request, obj, form, change):

        if obj.service and (not obj.price_at_booking or not change):
            obj.price_at_booking = obj.service.price

        if obj.start_datetime and obj.service:
            obj.end_datetime = obj.start_datetime + timedelta(minutes=obj.service.duration_minutes)

        if obj.applied_promo_code:
            promo = obj.applied_promo_code

            if promo.is_active:  # Минимальная проверка
                calculated_discount = Decimal('0.00')
                if promo.discount_percentage is not None:
                    if obj.price_at_booking:  # Убедимся, что цена есть
                        calculated_discount = (obj.price_at_booking * promo.discount_percentage) / Decimal(100)
                elif promo.discount_amount is not None:
                    calculated_discount = promo.discount_amount

                obj.discount_amount_applied = min(calculated_discount,
                                                  obj.price_at_booking if obj.price_at_booking else Decimal('0.00'))

            else:
                if change or not obj.pk:
                    obj.discount_amount_applied = Decimal('0.00')
        elif not obj.applied_promo_code and (change or not obj.pk):  # Если промокод убран
            obj.discount_amount_applied = Decimal('0.00')

        # Ваш отладочный код времени
        print(f"--- Debug AppointmentAdmin.save_model ---")
        print(f"Django's current active timezone: {timezone.get_current_timezone()}")
        print(f"settings.TIME_ZONE: {settings.TIME_ZONE}")
        if obj.start_datetime:
            print(
                f"Received obj.start_datetime: {obj.start_datetime} (tz: {getattr(obj.start_datetime, 'tzinfo', 'Naive')})")
        if obj.end_datetime:
            print(
                f"Calculated obj.end_datetime: {obj.end_datetime} (tz: {getattr(obj.end_datetime, 'tzinfo', 'Naive')})")
        print(f"Final obj.price_at_booking: {obj.price_at_booking}")
        print(f"Final obj.applied_promo_code: {obj.applied_promo_code}")
        print(f"Final obj.discount_amount_applied: {obj.discount_amount_applied}")
        print(f"--- End Debug ---")

        super().save_model(request, obj, form, change)


@admin.register(PromoCode)
class PromoCodeAdmin(admin.ModelAdmin):
    list_display = ('code', 'discount_percentage', 'discount_amount', 'valid_from', 'valid_to', 'is_active', 'used_count', 'max_uses')
    list_filter = ('is_active', 'valid_from', 'valid_to')
    search_fields = ('code', 'description')
    list_editable = ('is_active', )
    fieldsets = (
        (None, {
            'fields': ('code', 'description', 'is_active')
        }),
        ('Условия скидки', {
            'fields': ('discount_percentage', 'discount_amount')
        }),
        ('Срок действия и лимиты', {
            'fields': ('valid_from', 'valid_to', 'max_uses', 'uses_per_user', 'used_count')
        }),
    )

    def clean(self):
        cleaned_data = super().clean()
        discount_percentage = cleaned_data.get('discount_percentage')
        discount_amount = cleaned_data.get('discount_amount')

        if discount_percentage is not None and discount_amount is not None:
            raise ValidationError(
                "Нельзя одновременно указывать скидку в процентах и фиксированную сумму скидки. Выберите что-то одно."
            )
        if discount_percentage is None and discount_amount is None:
            raise ValidationError(
                "Необходимо указать либо скидку в процентах, либо фиксированную сумму скидки."
            )
        return cleaned_data

@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ('get_client_for_review', 'get_service_for_review', 'get_doctor_for_review', 'rating', 'created_at')
    list_filter = ('rating', 'created_at', 'appointment__doctor', 'appointment__service')
    search_fields = ('comment', 'appointment__client__user_profile__user__username', 'appointment__service__name')
    raw_id_fields = ('appointment',)
    readonly_fields = ('created_at',)

    def get_client_for_review(self, obj):
        if obj.appointment:
            return obj.appointment.client
        return None
    get_client_for_review.short_description = 'Клиент'
    get_client_for_review.admin_order_field = 'appointment__client'

    def get_service_for_review(self, obj):
        if obj.appointment:
            return obj.appointment.service
        return None
    get_service_for_review.short_description = 'Услуга'
    get_service_for_review.admin_order_field = 'appointment__service'

    def get_doctor_for_review(self, obj):
        if obj.appointment:
            return obj.appointment.doctor
        return None
    get_doctor_for_review.short_description = 'Врач'
    get_doctor_for_review.admin_order_field = 'appointment__doctor'


@admin.register(CompanyProfile)
class CompanyProfileAdmin(admin.ModelAdmin):
    list_display = ('main_info_title', 'last_updated')
    readonly_fields = ('last_updated',)

    fieldsets = (
        ('Основная информация', {
            'fields': ('main_info_title', 'main_info_text', 'logo_url', 'video_url')
        }),
        ('Лицензии и сертификаты (опционально)', {
            'classes': ('collapse',),
            'fields': ('certificate_title', 'certificate_text')
        }),
        ('История компании (опционально)', {
            'classes': ('collapse',),
            'fields': ('history_title', 'history_text')
        }),
        ('Реквизиты (опционально)', {
            'classes': ('collapse',),
            'fields': ('requisites_title', 'requisites_text')
        }),
        (None, {
            'fields': ('last_updated',)
        })
    )

    def has_add_permission(self, request):
        return not CompanyProfile.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return True


# --- Админка для Статей (Новостей) ---
@admin.register(Article)
class ArticleAdmin(admin.ModelAdmin):
    list_display = ('title', 'author_name', 'published_date', 'is_published', 'image_preview')
    list_filter = ('is_published', 'author', 'published_date')
    search_fields = ('title', 'short_description', 'full_content')
    prepopulated_fields = {'slug': ('title',)}
    raw_id_fields = ('author',)  # Если много пользователей-авторов
    date_hierarchy = 'published_date'
    list_editable = ('is_published',)
    readonly_fields = ('created_at', 'updated_at', 'image_preview_large')

    fieldsets = (
        (None, {
            'fields': ('title', 'slug', 'author', 'is_published', 'published_date')
        }),
        ('Содержимое', {
            'fields': ('short_description', 'full_content')
        }),
        ('Изображение', {
            'fields': ('image', 'image_preview_large', 'image_url')  # image_url оставлен, если все же нужен
        }),
        ('Даты (служебные)', {
            'classes': ('collapse',),
            'fields': ('created_at', 'updated_at')
        }),
    )

    def author_name(self, obj):
        return obj.author.get_full_name() if obj.author else '-'

    author_name.short_description = 'Автор'
    author_name.admin_order_field = 'author__first_name'  # или author__username

    def image_preview(self, obj):
        if obj.image:
            return mark_safe(f'<img src="{obj.image.url}" style="max-height: 70px;" />')
        return "Нет фото"

    image_preview.short_description = 'Превью'

    def image_preview_large(self, obj):  # Для отображения в fieldsets
        if obj.image:
            return mark_safe(f'<img src="{obj.image.url}" style="max-height: 200px;" />')
        return "Фото не загружено"

    image_preview_large.short_description = 'Превью изображения'


# --- Админка для FAQ ---
@admin.register(FaqItem)
class FaqItemAdmin(admin.ModelAdmin):
    list_display = ('question', 'date_added', 'is_visible', 'display_order')
    list_filter = ('is_visible', 'date_added')
    search_fields = ('question', 'answer')
    list_editable = ('is_visible', 'display_order')
    ordering = ('display_order', '-date_added')


# --- Админка для Контактов (не врачей) ---
@admin.register(NonDoctorStaffContact)
class NonDoctorStaffContactAdmin(admin.ModelAdmin):
    list_display = ('full_name', 'position', 'photo_preview_list', 'is_visible_on_contacts_page', 'display_order')
    list_filter = ('is_visible_on_contacts_page', 'position')
    search_fields = ('full_name', 'position', 'work_description')
    list_editable = ('is_visible_on_contacts_page', 'display_order')
    readonly_fields = ('photo_preview_form',)

    fieldsets = (
        (None, {
            'fields': ('full_name', 'position', 'is_visible_on_contacts_page', 'display_order')
        }),
        ('Фотография', {
            'fields': ('photo', 'photo_preview_form')
        }),
        ('Дополнительная информация', {
            'fields': ('work_description', 'phone', 'email')
        }),
    )

    def photo_preview_list(self, obj):
        if obj.photo:
            return mark_safe(f'<img src="{obj.photo.url}" style="max-height: 70px;" />')
        return "Нет фото"

    photo_preview_list.short_description = 'Фото'

    def photo_preview_form(self, obj):
        if obj.photo:
            return mark_safe(f'<img src="{obj.photo.url}" style="max-height: 200px;" />')
        return "Фото не загружено"

    photo_preview_form.short_description = 'Превью фото'


# --- Админка для Вакансий ---
@admin.register(Vacancy)
class VacancyAdmin(admin.ModelAdmin):
    list_display = ('title', 'doctor_category_name', 'date_posted', 'is_active')
    list_filter = ('is_active', 'doctor_category', 'date_posted')
    search_fields = ('title', 'short_description', 'full_description', 'contact_info')
    raw_id_fields = ('doctor_category',)  # Если категорий врачей много
    date_hierarchy = 'date_posted'
    list_editable = ('is_active',)

    fieldsets = (
        (None, {
            'fields': ('title', 'doctor_category', 'is_active', 'date_posted')
        }),
        ('Описание вакансии', {
            'fields': ('short_description', 'full_description')
        }),
        ('Условия и контакты', {
            'fields': ('salary_info', 'contact_info')
        }),
    )

    def doctor_category_name(self, obj):
        return obj.doctor_category.name if obj.doctor_category else '-'

    doctor_category_name.short_description = 'Специализация'
    doctor_category_name.admin_order_field = 'doctor_category__name'

@admin.register(PartnerCompany)
class PartnerCompanyAdmin(admin.ModelAdmin):
    list_display = ('name', 'website_url', 'is_active')
    list_filter = ('is_active',)
    search_fields = ('name', 'description')