from django.urls import path

from . import views

urlpatterns = [
    path('', views.splash, name='splash'),
    path('login/', views.login_page, name='login'),
    path('discover/', views.discover, name='discover'),
    path('offers/', views.offers, name='offers'),
    path('my-listings/', views.my_listings, name='my_listings'),
    path('saved/', views.saved, name='saved'),
    path('matches/', views.matches, name='matches'),
    path('listings/new/', views.create_listing, name='create_listing'),
]
