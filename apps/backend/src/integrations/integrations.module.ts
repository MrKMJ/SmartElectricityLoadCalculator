import { Global, Module } from "@nestjs/common";
import { OpenMeteoProvider } from "./weather/open-meteo.provider";
import { NrelPvWattsProvider } from "./solar/nrel-pvwatts.provider";
import { SolarIntegrationService } from "./solar/solar-integration.service";
import { PaymentsProvider } from "./payments/payments.provider";
import { AiAssistantProvider } from "./ai/ai-assistant.provider";
import { OcrProvider } from "./ocr/ocr.provider";
import { EmailProvider } from "./notify/email.provider";
import { SmsProvider } from "./notify/sms.provider";

// Architecture.docx §"API Integration Layer": business logic depends on
// these providers/interfaces, never on a vendor SDK directly, so a
// provider can be swapped (or upgraded from mock to live) in one place.
@Global()
@Module({
  providers: [
    OpenMeteoProvider,
    NrelPvWattsProvider,
    SolarIntegrationService,
    PaymentsProvider,
    AiAssistantProvider,
    OcrProvider,
    EmailProvider,
    SmsProvider,
  ],
  exports: [
    OpenMeteoProvider,
    NrelPvWattsProvider,
    SolarIntegrationService,
    PaymentsProvider,
    AiAssistantProvider,
    OcrProvider,
    EmailProvider,
    SmsProvider,
  ],
})
export class IntegrationsModule {}
