from django.urls import path
from . import views

urlpatterns = [
    path('', views.ModuleListView.as_view(), name='module_list'),
    path('<str:module_id>/', views.ModuleDetailView.as_view(), name='module_detail'),
]
