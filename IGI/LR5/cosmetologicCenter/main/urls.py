# main/urls.py
from django.urls import path, re_path
from . import views

urlpatterns = [
    re_path(r'^$', views.home_view, name='home'),
    re_path(r'^about/$', views.about_company_view, name='about_company'),
    re_path(r'^articles/$', views.article_list_view, name='article_list'),
    path('articles/<slug:slug>/', views.article_detail_view, name='article_detail'),
    re_path(r'^faq/$', views.faq_list_view, name='faq_list'),
    re_path(r'^contacts/$', views.contacts_view, name='contacts'),
    re_path(r'^privacy-policy/$', views.privacy_policy_view, name='privacy_policy'),
    re_path(r'^register/client/$', views.client_register_view, name='client_register'),
    re_path(r'^vacancies/$', views.vacancy_list_view, name='vacancy_list'),
    re_path(r'^statistics/$', views.public_statistics_view, name='statistics'),
    re_path(r'^register/doctor/$', views.doctor_register_view, name='doctor_register'),
    re_path(r'^login/$', views.user_login_view, name='user_login'),
    re_path(r'^logout/$', views.user_logout_view, name='user_logout'),
    re_path(r'^dashboard/client/$', views.client_dashboard_view, name='client_dashboard'),
    re_path(r'^dashboard/doctor/$', views.doctor_dashboard_view, name='doctor_dashboard'),
    re_path(r'^profile/delete/$', views.delete_profile_view, name='delete_profile'),
    re_path(r'^my-appointments/$', views.client_appointments_view, name='client_appointments'),
    # Маршрут с параметром (appointment_id)
    re_path(r'^cancel-appointment/(?P<appointment_id>[0-9]+)/$', views.cancel_appointment_view, name='cancel_appointment'),
    re_path(r'^services/$', views.service_list_view, name='service_list'),
    path('services/<int:pk>/', views.service_detail_view, name='service_detail'),
    re_path(r'^reviews/$', views.review_list_view, name='review_list'),
    re_path(r'^reviews/add/$', views.add_review_view, name='add_review'),
    re_path(r'^doctor/schedule/$', views.doctor_schedule_view, name='doctor_schedule'),
    re_path(r'^doctor/leave-requests/$', views.doctor_leave_request_view, name='doctor_leave_requests'),
    re_path(r'^doctor/day-off-requests/$', views.doctor_day_off_request_view, name='doctor_day_off_requests'),
    re_path(r'^find-available-slots/$', views.find_available_slots_view, name='find_available_slots'),
    re_path(r'^book/confirm/$', views.booking_confirmation_view, name='booking_confirmation'),
    re_path(r'^book/create/$', views.create_appointment_view, name='create_appointment'),
    re_path(r'^my-promo-codes/$', views.client_applied_promo_codes_view, name='client_applied_promo_codes'),
    re_path(r'^promo-codes/$', views.public_promo_code_list_view, name='public_promo_code_list'),
    re_path(r'^http-cats/$', views.http_cat_view, name='http_cat'),
]