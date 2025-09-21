# Rocket Space — Frontend (React + Vite)

SPA-клиент для Rocket Space, демонстрирующий frontend-практики на стеке React 19 + TypeScript + TailwindCSS v4.

## Технологии

| Слой                | Технологии                          |
| ------------------- | ----------------------------------- |
| Фреймворк           | React 19, Vite 7                    |
| Язык                | TypeScript 5 (strict)               |
| Стилизация          | TailwindCSS v4, shadcn/ui, Radix UI |
| Серверное состояние | TanStack Query v5                   |
| Формы               | react-hook-form + Zod               |
| Роутинг             | React Router v7                     |
| Аутентификация      | Firebase Auth (Google OAuth)        |
| Real-time           | Socket.IO Client                    |
| Drag & Drop         | @dnd-kit (core + sortable)          |
| Тосты               | Sonner                              |
| Иконки              | Lucide React                        |

## Архитектура и паттерны

### Серверное состояние — TanStack Query

`WorkspacePage` полностью построен на `useQuery` / `useMutation`:

- Декларативная загрузка с кешированием по ключам (`workItems`, `comments`)
- **Optimistic updates** при смене статуса задачи: `onMutate` мгновенно обновляет кеш, `onError` откатывает к снимку предыдущего состояния
- Точечная инвалидация через `queryClient.invalidateQueries`
- `queryClient.setQueryData` для мгновенного отражения изменений без лишних запросов

### Real-time через WebSocket

Хук `useWorkspaceSocket` (Socket.IO) подписывается на события рабочего пространства и автоматически инвалидирует нужные TanStack Query-кеши. Соединение переиспользуется между рендерами через модульный синглтон — повторное подключение не создаётся при перемонтировании.

### Аутентификация (Firebase Auth)

`AuthContext` реализует полный цикл:

- Google OAuth через `signInWithPopup`
- Авто-восстановление сессии через `onAuthStateChanged`
- Синхронизация Firebase-пользователя с backend-профилем (get-or-create)
- Кеширование `userId` в `localStorage` для ускорения повторных загрузок
- `refreshProfile()` для принудительного обновления профиля после изменений

### Undo-delete паттерн

Удаление задачи разбито на два этапа: немедленное удаление из UI-кеша + отложенный API-вызов через `setTimeout` на 5 секунд. Toast с кнопкой «Отмена» позволяет прервать операцию через `clearTimeout` + `invalidateQueries`.

### Drag & Drop с персистентной сортировкой

`KanbanBoard` на `@dnd-kit` с кастомной логикой:

- **Сортировка внутри колонки** — `reorderWithinStatus` с `arrayMove`
- **Перемещение между колонками** — `moveToStatusPosition` с позиционированием по координатам DOM-элементов (`getBoundingClientRect`)
- Оптимистичное обновление через локальный `ref` во время перетаскивания
- PATCH-запрос `reorderWorkItems` при завершении drag для сохранения порядка в БД
- Синхронизация с внешним `items` prop через `useEffect` при изменениях без активного drag

### Формы с валидацией

`react-hook-form` + `Zod`-схемы во всех формах. В форме редактирования задачи используется `Input ref` + нативный `reportValidity()` для отображения браузерного тултипа валидации без побочных эффектов form submission.

### Компонентная архитектура

- **`UserAvatar`** — переиспользуемый компонент с Radix `AvatarImage` + `AvatarFallback` и иконкой-заглушкой; используется во всех точках приложения вместо дублирующих условных блоков
- **`ResponsiveModal`** — адаптивный диалог: Dialog на desktop, Drawer на мобильных устройствах; используется во всех confirmation-диалогах и формах приложения
- **`PageShell`** — обёртка страниц с заголовком и описанием
- **`AppSidebar`** — боковая навигация на базе shadcn Sidebar с dropdown-меню профиля
- **`ActivityLog`** — журнал активностей пользователя
- **`KanbanBoard`** — Kanban-доска с drag & drop и контекстным меню карточек
- **`UserProfileDrawer`** — боковая панель профиля пользователя с кнопкой перехода в чат

### Интерактивная доска (BoardCanvas)

`BoardCanvasPage` реализует многопользовательскую рисовальную доску на Canvas 2D API:

- **Инструменты рисования**: перо, линия, прямоугольник, эллипс, текст (с двойным кликом для редактирования)
- **Выделение и трансформация**: перемещение, масштабирование за угловые ручки, вращение через отдельную ручку — всё с сохранением пропорций и фиксацией противоположного угла
- **Цвет и толщина**: палитра из пресетов, произвольный color picker с живым превью без записи в историю (commit только при закрытии), вертикальный слайдер толщины с визуальным превью точки
- **Undo/Redo**: кнопки и клавиши Ctrl+Z / Ctrl+Shift+Z (или Ctrl+Y), история до 50 снимков; учитывает создание, удаление, перемещение, масштабирование, поворот и смену цвета элементов; очищается при полной очистке доски
- **Real-time синхронизация**: все изменения передаются через `useBoardSocket` (Socket.IO); оптимистичные обновления через временный `tmp-` ID заменяются реальным ID из ack-колбэка сервера
- **Управление участниками**: приглашение по email/имени с debounce-поиском, удаление участников (только для владельца), список участников в шапке

### Прямые сообщения (DM Chat)

`ChatPage` реализует полнофункциональный чат между сотрудниками:

- **Real-time через Socket.IO**: входящие сообщения, редактирование, удаление и статус прочтения обновляются мгновенно без перезагрузки страницы
- **Read receipts**: одна/двойная галочка (отправлено / прочитано) с мгновенным обновлением у отправителя через `dm:read` WS-событие
- **Inline editing**: редактирование сообщения с меткой `edited`, отмена по Escape, сохранение по Enter
- **Подтверждение удаления**: диалог через `ResponsiveModal` для удаления отдельного сообщения и всего чата
- **Глобальные toast-уведомления** (`useChatNotifications`): хук живёт в `AuthProtectedRoute` и показывает `sonner`-тост с кнопкой «Open» при получении нового сообщения на любой странице приложения (не только на `/chat`)
- **Адаптивная мобильная верстка**: список чатов и панель сообщений переключаются slide-анимацией (`translate-x` + `transition-transform`); кнопка «Назад» возвращает к списку
- Поиск собеседников по имени/email с debounce; блокировка отправки сообщения самому себе

### Управление темой и настройками

- `ThemeProvider` (next-themes) — светлая/тёмная/системная тема, персистентная через `localStorage`
- `PreferencesContext` — пользовательские настройки (шрифт, размер текста и др.)
- Команд-палитра (`cmdk`) для быстрой навигации по приложению

### Профиль и аватар

- Загрузка аватара: `FileReader` → base64 → crop-превью → сохранение в БД как `text`-поле
- Удаление аватара через отдельный confirmation-диалог с прямым API-вызовом (независимо от основной формы сохранения)
- Определение геолокации через `navigator.geolocation`

### Инструменты качества кода

- ESLint с `@typescript-eslint`, `eslint-plugin-react`, `eslint-plugin-react-hooks`
- Prettier для единого стиля форматирования
- Husky + lint-staged: автоматический lint + format при каждом коммите
- Строгий TypeScript (`strict: true`), path aliases (`@/`)

## Запуск

```bash
# Зависимости
yarn install

# Dev-сервер
yarn dev

# Production build
yarn build

# Lint + format
yarn lint
yarn format
```

## Структура

```text
src/
├── components/
│   ├── ui/                  # shadcn/ui (не редактируются вручную)
│   ├── AppSidebar.tsx
│   ├── ActivityLog.tsx
│   ├── KanbanBoard.tsx
│   ├── UserAvatar.tsx
│   └── ...
├── contexts/
│   ├── AuthContext.tsx       # Firebase Auth + backend-профиль
│   └── PreferencesContext.tsx
├── hooks/
│   ├── use-workspace-socket.ts     # Socket.IO + TanStack Query
│   ├── use-board-socket.ts         # Socket.IO для доски (draw / delete / clear / cursor)
│   └── use-chat-notifications.ts   # Глобальные DM-уведомления
├── pages/
│   ├── Dashboard.tsx        # Профиль, статистика, активность
│   ├── Workspace.tsx        # TanStack Query, optimistic updates, undo-delete
│   ├── BoardCanvas.tsx      # Canvas-доска: рисование, трансформации, undo/redo, real-time
│   ├── Chat.tsx             # DM-чат, Socket.IO, read receipts, мобильная верстка
│   ├── Profile.tsx          # Редактирование профиля, аватар
│   ├── Organizations.tsx
│   ├── Admin.tsx
│   └── Settings.tsx
├── routes/
│   ├── AppRoutes.tsx
│   ├── AuthProtectedRoute.tsx
│   └── AuthRedirectRoute.tsx
└── utils/
    ├── api.tsx              # Типизированные API-функции
    └── request.tsx          # Axios с Bearer-токеном
```
