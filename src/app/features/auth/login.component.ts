import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/service/auth.service';

@Component({
    selector: 'app-login',
    imports: [FormsModule, RouterLink],
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.css']
})
export class LoginComponent {
    private readonly auth = inject(AuthService);
    private readonly router = inject(Router);

    email = '';
    password = '';
    loading = signal(false);
    errorMessage = signal<string | null>(null);
    readonly tiles = Array.from({ length: 9 });

    async login() {
        this.loading.set(true);
        this.errorMessage.set(null);
        try {
            await this.auth.login(this.email, this.password);
            await this.router.navigateByUrl('/gallery');
        } catch (err: any) {
            this.errorMessage.set(err.message ?? 'Error al iniciar sesión');
        } finally {
            this.loading.set(false);
        }
    }
}
