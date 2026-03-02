import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { GenusService } from './genus/genus.service';
import { VarietyService } from './variety/variety.service';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Genus, GenusDocument } from './genus/schemas/genus.schema';
import * as fs from 'fs';
import * as path from 'path';

interface SeedSpecie {
  specie_ru: string;
  specie_en: string;
}

interface SeedGenus {
  genus_ru: string;
  genus_en: string;
  species: SeedSpecie[];
}

const rawData = fs.readFileSync(path.join(__dirname, '../data/data.json'), 'utf8');
// Убираем trailing commas (файл изначально был .ts, не строгий JSON)
const cleanedData = rawData.replace(/,(\s*[}\]])/g, '$1');
const data: SeedGenus[] = JSON.parse(cleanedData);

async function bootstrap() {
  const args = process.argv.slice(2);
  const force = args.includes('--force');

  console.log('🌱 Запуск сидирования базы данных...');
  if (force) {
    console.log('   Режим: --force (пропуск дубликатов без ошибок)');
  }
  console.log('');

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  const genusService = app.get(GenusService);
  const varietyService = app.get(VarietyService);
  const genusModel = app.get<Model<GenusDocument>>(getModelToken(Genus.name));

  let genusCreated = 0;
  let genusDuplicates = 0;
  let varietyCreated = 0;
  let varietyDuplicates = 0;

  for (const item of data) {
    let genusDoc: GenusDocument | null = null;

    // Создаём или находим род
    try {
      genusDoc = (await genusService.create({
        nameRu: item.genus_ru,
        nameEn: item.genus_en,
      })) as GenusDocument;
      genusCreated++;
      console.log(`✅ Род создан: ${item.genus_ru} (${item.genus_en})`);
    } catch (error: any) {
      if (error?.status === 409 || error?.code === 11000) {
        genusDuplicates++;
        // Найти существующий документ
        genusDoc = await genusModel
          .findOne({ nameRu: item.genus_ru, nameEn: item.genus_en })
          .exec();
        console.log(`⏭️  Род уже существует: ${item.genus_ru} (${item.genus_en})`);
      } else {
        console.error(`❌ Ошибка при создании рода "${item.genus_ru}":`, error.message || error);
        continue;
      }
    }

    if (!genusDoc) {
      console.error(`❌ Не удалось найти или создать род: ${item.genus_ru}`);
      continue;
    }

    const genusId = (genusDoc as any)._id.toString();

    // Создаём разновидности
    for (const specie of item.species) {
      try {
        await varietyService.create({
          nameRu: specie.specie_ru,
          nameEn: specie.specie_en,
          genusId,
        });
        varietyCreated++;
      } catch (error: any) {
        if (error?.status === 409 || error?.code === 11000) {
          varietyDuplicates++;
        } else {
          console.error(
            `❌ Ошибка при создании разновидности "${specie.specie_ru}" (${item.genus_ru}):`,
            error.message || error,
          );
        }
      }
    }
  }

  console.log('');
  console.log('📊 Итоги:');
  console.log(`   Родов создано:           ${genusCreated}`);
  console.log(`   Родов-дубликатов:        ${genusDuplicates}`);
  console.log(`   Разновидностей создано:  ${varietyCreated}`);
  console.log(`   Разновидностей-дубл.:    ${varietyDuplicates}`);
  console.log('');
  console.log('✅ Сидирование завершено!');

  await app.close();
  process.exit(0);
}

bootstrap();
