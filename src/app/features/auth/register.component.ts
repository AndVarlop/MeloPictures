import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/service/auth.service';

@Component({
    selector: 'app-register',
    imports: [FormsModule, RouterLink],
    templateUrl: './register.component.html'
})
export class RegisterComponent {
    private readonly auth = inject(AuthService);
    private readonly router = inject(Router);

    email = '';
    password = '';
    username = '';
    loading = signal(false);
    errorMessage = signal<string | null>(null);
    info = signal<string | null>(null);

    async submit() {
        this.loading.set(true);
        this.errorMessage.set(null);
        this.info.set(null);
        try {
            const res = await this.auth.register(this.email, this.password, this.username);
            if (res.session) {
                await this.router.navigateByUrl('/gallery');
            } else {
                this.info.set('Revisa tu correo para confirmar la cuenta.');
            }
        } catch (err: any) {
            this.errorMessage.set(err.message ?? 'Error al registrar');
        } finally {
            this.loading.set(false);
        }
    }
}
