import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Plant, PlantDocument } from '../plants/schemas/plant.schema';
import { Shelf, ShelfDocument } from '../shelves/schemas/shelf.schema';

async function migrate() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const plantModel = app.get<Model<PlantDocument>>(getModelToken(Plant.name));
  const shelfModel = app.get<Model<ShelfDocument>>(getModelToken(Shelf.name));

  console.log('Начало миграции: shelfId -> shelfIds (many-to-many)');

  // 1. Конвертировать shelfId -> shelfIds у растений
  const plantsWithOldField = await plantModel.find({
    shelfId: { $exists: true, $ne: null }
  }).exec();

  console.log(`Найдено растений с shelfId: ${plantsWithOldField.length}`);

  for (const plant of plantsWithOldField) {
    await plantModel.updateOne(
      { _id: plant._id },
      {
        $set: { shelfIds: [(plant as any).shelfId] },
        $unset: { shelfId: '' }
      }
    ).exec();
  }

  // 2. Добавить пустые массивы растениям без полок
  const plantsWithoutShelves = await plantModel.updateMany(
    { shelfIds: { $exists: false } },
    { $set: { shelfIds: [] } }
  ).exec();

  console.log(`Добавлены пустые массивы для ${plantsWithoutShelves.modifiedCount} растений`);

  // 3. Построить обратные связи в полках
  const shelves = await shelfModel.find().exec();
  console.log(`Обработка ${shelves.length} полок`);

  for (const shelf of shelves) {
    const plants = await plantModel.find({ shelfIds: shelf._id }).exec();
    const plantIds = plants.map(p => p._id);

    await shelfModel.updateOne(
      { _id: shelf._id },
      { $set: { plantIds } }
    ).exec();

    console.log(`Полка "${shelf.name}": ${plantIds.length} растений`);
  }

  console.log('Миграция завершена!');
  await app.close();
}

migrate().catch((error) => {
  console.error('Ошибка миграции:', error);
  process.exit(1);
});
