// common/interceptors/transform.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  data: T;
  meta?: any;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  Response<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    return next.handle().pipe(
      map((res) => {
        // If the service already returns data and meta (e.g., for pagination), use it.
        // Otherwise, wrap the single object/array in a data property.
        if (res && res.data !== undefined) {
          return {
            data: res.data,
            ...(res.meta && { meta: res.meta }),
          };
        }
        return { data: res };
      }),
    );
  }
}
