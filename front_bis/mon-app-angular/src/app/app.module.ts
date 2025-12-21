import { HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';

@NgModule({
  declarations: [],
  imports: [
    HttpClientModule,
    CommonModule,
  ],
  bootstrap: [],
  providers: [
    provideRouter(routes) // Utilisation des routes définies dans app.routes.ts
  ]
})
export class AppModule { }
