import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

const baseElement = document.querySelector('base');
if (baseElement && !baseElement.getAttribute('href')) {
  const path = window.location.pathname.startsWith('/ai-service') 
    ? '/ai-service/' 
    : '/';
  baseElement.setAttribute('href', path);
}

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error('Error bootstrapping app:', err));