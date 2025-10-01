// src/main.server.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/app';
import { appConfig } from './app/app.config';

// Не указываем тип параметра context — Angular сам его передаст
export default function bootstrap(context: unknown) {
  return bootstrapApplication(App, appConfig, context as any);
}
