import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { AppComponent } from './app/app.component';
import { environment } from './environments/environment';

// Enable production mode if needed
if (environment.production) {
  // Import enableProdMode if needed to enable production mode
  // import { enableProdMode } from '@angular/core';
  // enableProdMode();
}

bootstrapApplication(AppComponent, {
  providers: [
    provideHttpClient()
  ]
}).catch(err => console.error('Error bootstrapping app:', err));