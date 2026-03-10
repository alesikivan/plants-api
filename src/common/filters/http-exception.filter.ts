import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  ValidationError,
  Injectable,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { I18nContext, I18nValidationException, I18nService } from 'nestjs-i18n';

function flattenI18nValidationMessages(
  errors: ValidationError[],
  translate: (key: string, options: object) => string,
  lang: string,
): string[] {
  return errors.flatMap((error) => {
    const ownMessages = Object.values(error.constraints ?? {}).map((constraint): string => {
      const [translationKey, argsString] = constraint.split('|');
      const parsedArgs = (argsString ? JSON.parse(argsString) : {}) as Record<string, unknown> & {
        constraints?: unknown[];
      };
      const constraints = Array.isArray(parsedArgs.constraints)
        ? parsedArgs.constraints.reduce((acc: Record<string, unknown>, value, index) => {
            acc[index.toString()] = value;
            return acc;
          }, {})
        : {};

      return String(translate(translationKey, {
        lang,
        args: {
          property: error.property,
          value: error.value,
          target: error.target,
          contexts: error.contexts,
          ...parsedArgs,
          constraints,
        },
      }));
    });

    return [...ownMessages, ...flattenI18nValidationMessages(error.children ?? [], translate, lang)];
  });
}

@Injectable()
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly i18nService: I18nService) {}

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();

    if (exception instanceof I18nValidationException) {
      const i18nCtx = I18nContext.current();
      const lang =
        i18nCtx?.lang ||
        (request.headers['accept-language'] ?? '').split(',')[0].split('-')[0] ||
        'ru';

      const translate = (key: string, options: object) =>
        i18nCtx
          ? String(i18nCtx.translate(key, options))
          : String(this.i18nService.translate(key as any, options));

      const message = flattenI18nValidationMessages(exception.errors ?? [], translate, lang);

      response.status(status).json({
        statusCode: status,
        timestamp: new Date().toISOString(),
        message,
      });

      return;
    }

    const exceptionResponse = exception.getResponse();
    const message =
      typeof exceptionResponse === 'object' && 'message' in exceptionResponse
        ? exceptionResponse.message
        : exception.message;

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      message,
    };

    response.status(status).json(errorResponse);
  }
}
