import { ApplicationRef, Injectable, inject } from '@angular/core';

/**
 * Sin zone.js, los cambios hechos fuera de eventos de usuario o signals (HTTP, WebSocket,
 * temporizadores) no refrescan la vista. Este servicio programa un único ciclo de detección
 * después de que terminen todos los callbacks pendientes.
 *
 * shortcut: refresca todos los componentes (como hacía zone.js); migrar cada componente a
 * signals/OnPush permitiría eliminarlo.
 */
@Injectable({ providedIn: 'root' })
export class ChangeDetectionTickService {
  private readonly appRef: ApplicationRef = inject(ApplicationRef);
  private pending = false;

  schedule(): void {
    if (this.pending) {
      return;
    }

    this.pending = true;
    setTimeout(() => {
      this.pending = false;
      // tick() no refresca componentes Default con campos mutados a mano sin zone.js; detectChanges() sí.
      this.appRef.components.forEach((root) => root.changeDetectorRef.detectChanges());
    });
  }
}
