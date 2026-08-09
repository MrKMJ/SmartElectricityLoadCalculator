import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";

// Wraps every successful response in the documented standard envelope:
// { success: true, data: {}, meta: {} }
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, unknown> {
  intercept(_context: ExecutionContext, next: CallHandler<T>): Observable<unknown> {
    return next.handle().pipe(
      map((payload) => {
        if (
          payload &&
          typeof payload === "object" &&
          "success" in (payload as Record<string, unknown>)
        ) {
          // Already shaped (e.g. streamed/binary responses) — pass through.
          return payload;
        }
        if (payload && typeof payload === "object" && "data" in (payload as Record<string, unknown>) && "meta" in (payload as Record<string, unknown>)) {
          return { success: true, ...(payload as Record<string, unknown>) };
        }
        return { success: true, data: payload ?? null, meta: {} };
      }),
    );
  }
}
