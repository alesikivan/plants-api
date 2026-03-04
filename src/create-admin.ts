import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { UsersService } from './users/users.service';
import { Role } from './common/enums/role.enum';

async function bootstrap() {
  const args = process.argv.slice(2);
  const getArg = (flag: string): string | undefined => {
    const idx = args.indexOf(flag);
    return idx !== -1 ? args[idx + 1] : undefined;
  };

  const email = getArg('--email') || 'admin@plants.local';
  const password = getArg('--password') || 'admin123456';
  const name = getArg('--name') || 'Admin';

  console.log('🔧 Создание аккаунта администратора...');
  console.log(`   Email:    ${email}`);
  console.log(`   Имя:      ${name}`);
  console.log(`   Пароль:   ${password}`);
  console.log('');

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  const usersService = app.get(UsersService);

  try {
    const { user } = await usersService.create({
      email,
      password,
      name,
      role: Role.ADMIN,
    }, true);

    console.log('✅ Аккаунт администратора успешно создан!');
    console.log(`   ID: ${user._id.toString()}`);
  } catch (error: any) {
    if (error?.status === 409 || error?.message?.includes('уже существует')) {
      console.log('⚠️  Пользователь с таким email или именем уже существует.');
      console.log('   Попробуйте указать другие данные через флаги:');
      console.log('   --email <email> --password <password> --name <name>');
    } else {
      console.error('❌ Ошибка при создании администратора:', error.message || error);
      process.exit(1);
    }
  }

  await app.close();
  process.exit(0);
}

bootstrap();
