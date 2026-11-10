import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';
import { ChangeDetectionTickService } from '../services/change-detection.service';

/** Refresca la vista cuando termina una petición (éxito, error o cancelación). */
export const tickInterceptor: HttpInterceptorFn = (req, next) => {
  const tick = inject(ChangeDetectionTickService);
  return next(req).pipe(finalize(() => tick.schedule()));
};
