import { inject, Injectable } from "@angular/core";
import { MessageService } from "primeng/api";

@Injectable({
  providedIn: "root",
})
export class MessageInfoService {
  private readonly messageService: MessageService = inject(MessageService);

  showSuccess(message: string) {
    this.messageService.add({ severity: "success", detail: message });
  }

  showInfo(message: string) {
    this.messageService.add({ severity: "info", detail: message });
  }

  showWarn(message: string) {
    this.messageService.add({ severity: "warn", detail: message });
  }

  showError(message: unknown, error: any) {
    this.messageService.add({ severity: "error", detail: this.toText(message) });
    console.log(error);
  }

  /** Algunos llamadores pasan el HttpErrorResponse entero: se muestra su mensaje, no "[object Object]". */
  private toText(message: unknown): string {
    if (typeof message === "string") return message;
    const body = (message as { error?: unknown })?.error;
    if (typeof body === "string" && body) return body;
    return (body as { message?: string })?.message ?? (message as { message?: string })?.message ?? "Ha ocurrido un error";
  }
}
