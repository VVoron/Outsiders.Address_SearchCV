import { Routes } from '@angular/router';
import { LoginComponent } from './login/login';
import { LayoutComponent } from './layout/layout.component';
import { RecognitionComponent } from './recognition/recognition.component';
import { AdminComponent } from './admin/admin.component';
import {MapComponent} from './map/map.component'
import { AuthGuard } from './auth.guard';
import { RequestComponent } from './request/request.component';
import {RegisterComponent} from './register/register'

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  {
    path: '',
    component: LayoutComponent,
    children: [
      { path: 'recognition', component: RecognitionComponent },
      { path: 'admin', component: AdminComponent },
      { path: '', redirectTo: 'recognition', pathMatch: 'full' },
      { path: 'map', component: MapComponent },
      { path: 'request', component: RequestComponent }
    ]
  },
  { path: '**', redirectTo: '' }
];
