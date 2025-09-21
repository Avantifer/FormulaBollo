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

  showError(message: string, error: any) {
    this.messageService.add({ severity: "error", detail: message });
    console.log(error);
  }
}
