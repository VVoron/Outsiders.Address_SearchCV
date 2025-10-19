/// <reference types="@angular/localize" />

import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));

  // Минуем лицензию кендо
(function () {
  const stdConsoleGroup = console.group;
  const stdConsoleWarn = console.warn;
  console.group = (...label: any[]) => {
    if (label && label.length) {
      if (label[0] === 'Progress Kendo UI for Angular') {
        return;
      }
    }
    stdConsoleGroup(label);
  }
  console.warn = (message?: any, ...optionalParams: any[]) => {
    if (message && typeof message === 'string') {
      if (message.indexOf('License activation failed') > -1 || message.indexOf('Expected numeric value for column width') > -1)
        return;
    }
    stdConsoleWarn(message, optionalParams);
}
})()
