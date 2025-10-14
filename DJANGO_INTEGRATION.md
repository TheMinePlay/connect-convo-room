# Интеграция VideoConnect с Django

## Вариант 1: Production Build (Рекомендуется)

### Шаг 1: Соберите production build
```bash
npm run build
# или
bun run build
```

После сборки в папке `dist/` появятся готовые файлы:
- `dist/index.html` - главный HTML файл
- `dist/assets/` - JS, CSS и другие ассеты

### Шаг 2: Интеграция в Django

#### Вариант 2.1: Статические файлы Django
```python
# settings.py
STATICFILES_DIRS = [
    BASE_DIR / "dist/assets",
]

# Скопируйте dist/index.html в ваш templates/
```

#### Вариант 2.2: Django шаблон
```django
<!-- templates/videoconnect.html -->
{% load static %}
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>VideoConnect</title>
    <!-- Скопируйте все <link> теги из dist/index.html -->
    <link rel="stylesheet" href="{% static 'index-[hash].css' %}">
</head>
<body>
    <div id="root"></div>
    <!-- Скопируйте все <script> теги из dist/index.html -->
    <script type="module" src="{% static 'index-[hash].js' %}"></script>
</body>
</html>
```

#### Вариант 2.3: Django как API backend
```python
# urls.py
from django.urls import path, re_path
from django.views.generic import TemplateView

urlpatterns = [
    # API endpoints
    path('api/rooms/', views.rooms_api),
    path('api/rooms/<str:room_id>/', views.room_detail),
    
    # React SPA (все остальные маршруты)
    re_path(r'^.*$', TemplateView.as_view(template_name='index.html')),
]
```

## Вариант 2: Standalone HTML файлы (Ограниченная функциональность)

Если вам нужны отдельные HTML файлы БЕЗ React (только статический контент):

### Файлы в проекте:
- `src/pages/Index.tsx` - главная страница
- `src/pages/CreateRoom.tsx` - создание комнаты
- `src/pages/VideoRoom.tsx` - видеозвонок
- `src/components/VideoCall.tsx` - компонент видеозвонка
- `src/components/Sidebar.tsx` - боковая панель
- `src/components/DeviceSettings.tsx` - настройки устройств

⚠️ **ВАЖНО**: Эти файлы на React/TypeScript не будут работать как обычные HTML. Нужен production build!

## Вариант 3: Embed в Django

Встройте собранное приложение в iframe:

```django
<iframe 
    src="{% url 'videoconnect' %}" 
    style="width: 100%; height: 100vh; border: none;">
</iframe>
```

## Рекомендуемая архитектура

```
Django (Backend)          React App (Frontend)
├── REST API             ├── UI Components
├── Database             ├── WebRTC Logic
├── Authentication       └── State Management
└── WebSocket (Channels)
```

## Получение файлов

Все файлы уже есть в проекте Lovable:
1. Нажмите на кнопку **Dev Mode** (вверху слева)
2. Откройте нужный файл и скопируйте код
3. Или подключите GitHub и экспортируйте весь проект

## Альтернатива: Деплой на Lovable

Вы можете задеплоить это приложение на Lovable и использовать Django только для API:
1. Нажмите **Publish** (вверху справа)
2. Получите ссылку типа `yourapp.lovable.app`
3. Настройте Django как REST API backend
4. Подключите через CORS

## Нужна помощь?

Если вам нужен конкретный подход к интеграции, опишите вашу архитектуру Django, и я помогу с деталями.