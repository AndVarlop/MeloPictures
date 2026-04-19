import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './shared/guards/auth.guard';

export const routes: Routes = [
    {
        path: '',
        pathMatch: 'full',
        canActivate: [guestGuard],
        loadComponent: () =>
            import('./features/auth/login.component').then((m) => m.LoginComponent)
    },
    {
        path: 'register',
        canActivate: [guestGuard],
        loadComponent: () =>
            import('./features/auth/register.component').then((m) => m.RegisterComponent)
    },
    {
        path: 'gallery',
        canActivate: [authGuard],
        loadComponent: () =>
            import('./features/gallery/gallery.component').then((m) => m.GalleryComponent)
    },
    {
        path: 'upload',
        canActivate: [authGuard],
        loadComponent: () =>
            import('./features/gallery/upload.component').then((m) => m.UploadComponent)
    },
    {
        path: 'dashboard',
        canActivate: [authGuard],
        loadComponent: () =>
            import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent)
    },
    { path: '**', redirectTo: '' }
];
