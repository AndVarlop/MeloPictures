import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PostService } from '../../core/service/post.service';
import { AuthService } from '../../core/service/auth.service';
import { Post } from '../../shared/models/photo.model';
import { PostCardComponent } from '../../shared/components/post-card/post-card.component';

@Component({
    selector: 'app-gallery',
    imports: [CommonModule, RouterLink, PostCardComponent],
    template: `
    <section class="mx-auto max-w-5xl px-4 py-8">
      <header class="melo-fade-up mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <span class="melo-chip melo-chip-green mb-3">Feed</span>
          <h1 class="font-display text-4xl font-extrabold leading-tight">
            Barranquilla en <span class="melo-gradient-text">MeloPictures</span>
          </h1>
          <p class="mt-2 text-gray-600">
            {{ posts().length }} {{ posts().length === 1 ? 'postal' : 'postales' }} de la ciudad — Carnaval, Junior y más.
          </p>
        </div>

        <div class="flex items-center gap-2">
          <button
            type="button"
            (click)="refresh()"
            [disabled]="loading()"
            class="melo-btn-ghost"
            title="Refrescar"
          >
            <span [class.animate-spin]="loading()">↻</span>
            <span class="hidden sm:inline">Refrescar</span>
          </button>
          @if (auth.user()) {
            <a routerLink="/upload" class="melo-btn">
              <span>＋</span> Subir
            </a>
          }
        </div>
      </header>

      @if (loading()) {
        <div class="grid gap-6 md:grid-cols-2">
          @for (s of skeletons; track $index) {
            <div class="melo-card p-4">
              <div class="melo-skeleton h-12 w-32 mb-3"></div>
              <div class="melo-skeleton aspect-square w-full"></div>
              <div class="melo-skeleton mt-3 h-4 w-3/4"></div>
            </div>
          }
        </div>
      } @else if (errorMessage()) {
        <div class="melo-card p-6 text-center">
          <p class="text-rose-600">{{ errorMessage() }}</p>
          <button type="button" (click)="refresh()" class="melo-btn-ghost mt-4">
            Reintentar
          </button>
        </div>
      } @else if (posts().length === 0) {
        <div class="melo-card flex flex-col items-center gap-4 p-10 text-center">
          <div
            class="grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br from-green-200 via-yellow-200 to-red-200 text-3xl"
          >
            🎭
          </div>
          <p class="text-lg font-semibold text-gray-900">Aún no hay postales</p>
          <p class="max-w-sm text-sm text-gray-600">
            ¡Echa la primera! Una foto del Carnaval, un gol del Junior o un atardecer en la Ventana al Mundo.
          </p>
          @if (auth.user()) {
            <a routerLink="/upload" class="melo-btn mt-2">Subir la primera 🎺</a>
          }
        </div>
      } @else {
        <div class="grid gap-6 md:grid-cols-2">
          @for (p of posts(); track p.id; let i = $index) {
            <div class="melo-fade-up" [style.animation-delay]="(i * 60) + 'ms'">
              <app-post-card [post]="p" (removed)="onRemoved($event)" />
            </div>
          }
        </div>
      }
    </section>
  `
})
export class GalleryComponent {
    private readonly postService = inject(PostService);
    readonly auth = inject(AuthService);

    posts = signal<Post[]>([]);
    loading = signal(true);
    errorMessage = signal<string | null>(null);
    readonly skeletons = Array.from({ length: 4 });

    async ngOnInit() {
        await this.refresh();
    }

    async refresh() {
        this.loading.set(true);
        this.errorMessage.set(null);
        try {
            this.posts.set(await this.postService.getFeed());
        } catch (err: any) {
            this.errorMessage.set(err.message ?? 'Error al cargar las fotos');
        } finally {
            this.loading.set(false);
        }
    }

    onRemoved(id: string) {
        this.posts.update((arr) => arr.filter((p) => p.id !== id));
    }
}
