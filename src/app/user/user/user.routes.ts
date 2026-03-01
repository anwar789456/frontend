import { Routes } from '@angular/router';
import { ProfileComponent } from './pages/profile/profile.component';
import { RegisterComponent } from './pages/register/register.component';

export const USER_ROUTES: Routes = [
  { path: '', component: ProfileComponent },
  { path: 'register', component: RegisterComponent }
];
