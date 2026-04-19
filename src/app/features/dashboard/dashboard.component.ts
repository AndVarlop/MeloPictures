import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/service/auth.service';
import { PostService } from '../../core/service/post.service';
import { Post } from '../../shared/models/photo.model';
import { PostCardComponent } from '../../shared/components/post-card/post-card.component';

@Component({
    selector: 'app-dashboard',
    imports: [CommonModule, FormsModule, PostCardComponent],
    template: `
    <section class="mx-auto max-w-5xl px-4 py-8">
      <div
        class="melo-fade-up relative overflow-hidden rounded-3xl p-[2px]"
        style="background: linear-gradient(135deg, #16a34a, #facc15 55%, #dc2626);"
      >
        <div class="rounded-[calc(1.5rem-2px)] bg-white/80 p-6 backdrop-blur-md md:p-8">
          <div class="flex flex-col items-center gap-6 md:flex-row md:items-center md:justify-between">
            <div class="flex items-center gap-5">
              @if (avatarUrl) {
                <img
                  [src]="avatarUrl"
                  alt="avatar"
                  class="h-20 w-20 rounded-2xl object-cover shadow-lg ring-2 ring-green-400"
                />
              } @else {
                <div
                  class="grid h-20 w-20 place-items-center rounded-2xl bg-gradient-to-br from-green-500 via-yellow-400 to-red-500 text-2xl font-bold text-white shadow-lg"
                >
                  {{ initial() }}
                </div>
              }
              <div>
                <p class="font-display text-2xl font-extrabold text-gray-900">
                  {{ username || 'Sin nombre' }}
                </p>
                <p class="text-sm text-gray-500">{{ auth.user()?.email }}</p>
                <span class="melo-chip melo-chip-green mt-2">Carnavalero MeloPictures 🎭</span>
              </div>
            </div>

            <div class="grid grid-cols-3 gap-3">
              <div class="rounded-2xl bg-white/70 px-4 py-3 text-center shadow-sm">
                <p class="font-display text-2xl font-extrabold melo-gradient-text">
                  {{ myPosts().length }}
                </p>
                <p class="text-xs text-gray-500">Fotos</p>
              </div>
              <div class="rounded-2xl bg-white/70 px-4 py-3 text-center shadow-sm">
                <p class="font-display text-2xl font-extrabold melo-gradient-text">
                  {{ totalLikes() }}
                </p>
                <p class="text-xs text-gray-500">Likes</p>
              </div>
              <div class="rounded-2xl bg-white/70 px-4 py-3 text-center shadow-sm">
                <p class="font-display text-2xl font-extrabold melo-gradient-text">
                  {{ totalComments() }}
                </p>
                <p class="text-xs text-gray-500">Comentarios</p>
              </div>
            </div>
          </div>

          <div class="mt-6 flex justify-end">
            <button type="button" (click)="logout()" class="melo-btn-ghost">
              <span>↩</span> Cerrar sesión
            </button>
          </div>
        </div>
      </div>

      <div class="mt-8 grid gap-6 md:grid-cols-5">
        <form
          (ngSubmit)="save()"
          class="melo-card melo-fade-up flex flex-col gap-4 p-6 md:col-span-2 md:sticky md:top-20 md:self-start"
        >
          <h3 class="font-display text-lg font-bold text-gray-900">Editar perfil</h3>

          <label class="flex flex-col gap-1.5">
            <span class="text-xs font-semibold uppercase tracking-wide text-gray-600">Usuario</span>
            <input
              type="text"
              name="username"
              required
              [(ngModel)]="username"
              class="melo-input"
            />
          </label>

          <label class="flex flex-col gap-1.5">
            <span class="text-xs font-semibold uppercase tracking-wide text-gray-600">Avatar URL</span>
            <input
              type="url"
              name="avatarUrl"
              [(ngModel)]="avatarUrl"
              class="melo-input"
              placeholder="https://..."
            />
          </label>

          @if (errorMessage()) {
            <p class="melo-pop rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {{ errorMessage() }}
            </p>
          }
          @if (saved()) {
            <p class="melo-pop rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              ¡Perfil actualizado!
            </p>
          }

          <button type="submit" [disabled]="saving()" class="melo-btn">
            @if (saving()) {
              <span
                class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
              ></span>
              Guardando…
            } @else {
              Guardar cambios
            }
          </button>
        </form>

        <div class="md:col-span-3">
          <h2 class="font-display mb-4 text-xl font-bold text-gray-900">Mis fotos</h2>

          @if (loadingPosts()) {
            <div class="flex flex-col gap-4">
              @for (s of skeletons; track $index) {
                <div class="melo-skeleton h-64 w-full"></div>
              }
            </div>
          } @else if (myPosts().length === 0) {
            <div class="melo-card p-8 text-center">
              <div class="mx-auto grid h-16 w-16 place-items-center rounded-full bg-green-100 text-2xl">
                🎭
              </div>
              <p class="mt-3 font-semibold text-gray-900">Aún no has subido fotos</p>
              <p class="mt-1 text-sm text-gray-500">Comparte tu primer carnaval.</p>
            </div>
          } @else {
            <div class="flex flex-col gap-5">
              @for (p of myPosts(); track p.id; let i = $index) {
                <div class="melo-fade-up" [style.animation-delay]="(i * 60) + 'ms'">
                  <app-post-card [post]="p" (removed)="onRemoved($event)" />
                </div>
              }
            </div>
          }
        </div>
      </div>
    </section>
  `
})
export class DashboardComponent {
    readonly auth = inject(AuthService);
    private readonly postService = inject(PostService);
    private readonly router = inject(Router);

    username = '';
    avatarUrl = '';
    saving = signal(false);
    errorMessage = signal<string | null>(null);
    saved = signal(false);

    myPosts = signal<Post[]>([]);
    loadingPosts = signal(true);
    readonly skeletons = Array.from({ length: 2 });

    readonly initial = computed(() => (this.username || '?').charAt(0).toUpperCase());
    readonly totalLikes = computed(() =>
        this.myPosts().reduce((acc, p) => acc + (p.likes?.[0]?.count ?? 0), 0)
    );
    readonly totalComments = computed(() =>
        this.myPosts().reduce((acc, p) => acc + (p.comments?.[0]?.count ?? 0), 0)
    );

    constructor() {
        effect(() => {
            const p = this.auth.profile();
            if (p) {
                this.username = p.username ?? '';
                this.avatarUrl = p.avatar_url ?? '';
            }
        });
    }

    async ngOnInit() {
        const u = this.auth.user();
        if (!u) return;
        this.loadingPosts.set(true);
        try {
            this.myPosts.set(await this.postService.getByUser(u.id));
        } finally {
            this.loadingPosts.set(false);
        }
    }

    async save() {
        this.saving.set(true);
        this.errorMessage.set(null);
        this.saved.set(false);
        try {
            await this.auth.updateProfile({
                username: this.username.trim(),
                avatar_url: this.avatarUrl.trim() || null
            });
            this.saved.set(true);
        } catch (err: any) {
            this.errorMessage.set(err.message ?? 'Error al guardar');
        } finally {
            this.saving.set(false);
        }
    }

    async logout() {
        await this.auth.logout();
        await this.router.navigateByUrl('/');
    }

    onRemoved(id: string) {
        this.myPosts.update((arr) => arr.filter((p) => p.id !== id));
    }
}
