from django.urls import path

from . import views

urlpatterns = [
    path('', views.splash, name='splash'),
    path('login/', views.login_page, name='login'),
    path('discover/', views.discover, name='discover'),
    path('listings/new/', views.create_listing, name='create_listing'),
]
