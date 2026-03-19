import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AiRecognitionLog, AiRecognitionLogSchema } from './schemas/ai-recognition-log.schema';
import { AiRecognitionLogService } from './ai-recognition-log.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AiRecognitionLog.name, schema: AiRecognitionLogSchema },
    ]),
  ],
  providers: [AiRecognitionLogService],
  exports: [AiRecognitionLogService],
})
export class AiRecognitionLogModule {}
