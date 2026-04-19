import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../../core/service/auth.service';

const waitReady = (auth: AuthService) =>
  new Promise<void>((resolve) => {
    if (auth.ready()) return resolve();
    const id = setInterval(() => {
      if (auth.ready()) {
        clearInterval(id);
        resolve();
      }
    }, 30);
  });

export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await waitReady(auth);
  if (auth.user()) return true;
  router.navigateByUrl('/');
  return false;
};

export const guestGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await waitReady(auth);
  if (!auth.user()) return true;
  router.navigateByUrl('/gallery');
  return false;
};
