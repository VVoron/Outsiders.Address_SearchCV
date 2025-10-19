import { Routes } from '@angular/router';
import { ImageListComponent } from './image-list/image-list.component';
import { UserListComponent } from './user-list/user-list.component';
import { MapViewComponent } from './map-view/map-view';
import { MapComponent } from './map/map';
import { LoginComponent } from './auth/login/login.component';
import { RegisterComponent } from './auth/register/register.component';
import { authRequired, redirectIfAuth } from './auth/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    canMatch: [redirectIfAuth],
    loadComponent: () => import('./auth/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'register',
    canMatch: [redirectIfAuth],
    loadComponent: () => import('./auth/register/register.component').then(m => m.RegisterComponent),
  },

  {
    path: '',
    canMatch: [authRequired],
    children: [
      { path: '', redirectTo: '/image-list', pathMatch: 'full' },
      { path: 'image-list', component: ImageListComponent },
      { path: 'map', component: MapComponent },
      { path: 'user-list', component: UserListComponent },
      { path: '**', redirectTo: '/image-list' },
    ],
  },
];
