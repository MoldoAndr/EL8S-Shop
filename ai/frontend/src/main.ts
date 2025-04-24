// src/main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { AppComponent } from './app/app.component';
import { environment } from './environments/environment';

if (environment.production) {
  // Enable production mode
  // This disables Angular's development mode and improves performance
  // import { enableProdMode } from '@angular/core';
  // enableProdMode();
}

bootstrapApplication(AppComponent, {
  providers: [
    provideHttpClient()
  ]
})
  .catch(err => console.error(err));