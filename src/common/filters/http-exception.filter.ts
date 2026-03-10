import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  ValidationError,
} from '@nestjs/common';
import { Response } from 'express';
import { I18nContext, I18nValidationException } from 'nestjs-i18n';

function flattenI18nValidationMessages(errors: ValidationError[], i18n: I18nContext): string[] {
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

      return String(i18n.translate(translationKey, {
        lang: i18n.lang,
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

    return [...ownMessages, ...flattenI18nValidationMessages(error.children ?? [], i18n)];
  });
}

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();

    if (exception instanceof I18nValidationException) {
      const i18n = I18nContext.current();
      const message = i18n
        ? flattenI18nValidationMessages(exception.errors ?? [], i18n)
        : [];

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
