# API для загрузки фотографий растений

## Описание

Добавлена возможность загружать фотографии растений при создании и обновлении записей. Фотографии сохраняются на диск в папку `uploads/plants/`, а путь к файлу сохраняется в базе данных.

## Эндпоинты

### 1. Создание растения с фото

**POST** `/api/plants`

**Content-Type:** `multipart/form-data`

**Headers:**
- `Authorization: Bearer <token>`

**Body (form-data):**
- `genusId` (string, required) - ID рода растения
- `varietyId` (string, optional) - ID сорта растения
- `purchaseDate` (string, optional) - Дата покупки (ISO format)
- `description` (string, optional) - Описание растения
- `photo` (file, optional) - Файл фотографии (jpg, jpeg, png, gif, webp, максимум 5MB)

**Пример (JavaScript/Fetch):**
```javascript
const formData = new FormData();
formData.append('genusId', '507f1f77bcf86cd799439011');
formData.append('varietyId', '507f1f77bcf86cd799439012');
formData.append('purchaseDate', '2024-01-15');
formData.append('description', 'Красивое растение');
formData.append('photo', fileInput.files[0]); // File object

const response = await fetch('http://localhost:3000/api/plants', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
  },
  body: formData,
});

const plant = await response.json();
```

**Пример (curl):**
```bash
curl -X POST http://localhost:3000/api/plants \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "genusId=507f1f77bcf86cd799439011" \
  -F "varietyId=507f1f77bcf86cd799439012" \
  -F "purchaseDate=2024-01-15" \
  -F "description=Красивое растение" \
  -F "photo=@/path/to/photo.jpg"
```

### 2. Обновление растения с фото

**PATCH** `/api/plants/:id`

**Content-Type:** `multipart/form-data`

**Headers:**
- `Authorization: Bearer <token>`

**Body (form-data):**
- `genusId` (string, optional) - ID рода растения
- `varietyId` (string, optional) - ID сорта растения
- `purchaseDate` (string, optional) - Дата покупки (ISO format)
- `description` (string, optional) - Описание растения
- `photo` (file, optional) - Файл новой фотографии

**Примечание:** При загрузке новой фотографии, старая фотография автоматически удаляется с диска.

**Пример (JavaScript/Fetch):**
```javascript
const formData = new FormData();
formData.append('description', 'Обновленное описание');
formData.append('photo', fileInput.files[0]); // New photo

const response = await fetch(`http://localhost:3000/api/plants/${plantId}`, {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${token}`,
  },
  body: formData,
});

const updatedPlant = await response.json();
```

### 3. Получение фотографии

**GET** `/api/plants/photo/:filename`

**Headers:**
- `Authorization: Bearer <token>`

**Пример:**
```
http://localhost:3000/api/plants/photo/plant-1234567890123-456789012.jpg
```

**Пример (img tag):**
```html
<img src="http://localhost:3000/api/plants/photo/plant-1234567890123-456789012.jpg" alt="Plant photo" />
```

### 4. Получение информации о растении

**GET** `/api/plants/:id`

**Response:**
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "genusId": {
    "_id": "507f1f77bcf86cd799439012",
    "name": "Rosa"
  },
  "varietyId": {
    "_id": "507f1f77bcf86cd799439013",
    "name": "Tea Rose"
  },
  "userId": "507f1f77bcf86cd799439014",
  "purchaseDate": "2024-01-15T00:00:00.000Z",
  "photo": "plant-1234567890123-456789012.jpg",
  "description": "Красивое растение",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

Поле `photo` содержит имя файла. Для получения полного URL фотографии используйте:
```javascript
const photoUrl = plant.photo
  ? `http://localhost:3000/api/plants/photo/${plant.photo}`
  : null;
```

### 5. Удаление растения

**DELETE** `/api/plants/:id`

**Примечание:** При удалении растения, его фотография автоматически удаляется с диска.

## Ограничения

- **Разрешенные форматы:** jpg, jpeg, png, gif, webp
- **Максимальный размер файла:** 5MB
- **Директория хранения:** `./uploads/plants/`

## Обработка ошибок

### 400 Bad Request
- Неверный формат файла
- Файл слишком большой

### 401 Unauthorized
- Отсутствует или неверный токен авторизации

### 404 Not Found
- Растение не найдено
- Фотография не найдена

## Примечания

1. Фотография не обязательна при создании/обновлении растения
2. При обновлении растения можно отправить только те поля, которые нужно изменить
3. Старая фотография автоматически удаляется при загрузке новой или удалении растения
4. Имена файлов генерируются автоматически в формате: `plant-{timestamp}-{random}.{ext}`
