import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PostService } from '../../core/service/post.service';

@Component({
    selector: 'app-upload',
    imports: [FormsModule],
    template: `
    <section class="mx-auto max-w-2xl px-4 py-10">
      <div class="melo-fade-up mb-8 text-center">
        <span class="melo-chip mb-3">📤 Nuevo momento</span>
        <h1 class="font-display text-4xl font-extrabold">
          Sube una <span class="melo-gradient-text">foto</span>
        </h1>
        <p class="mt-2 text-gray-600">Comparte un momento dulce con la comunidad.</p>
      </div>

      <form (ngSubmit)="submit()" class="melo-card melo-fade-up flex flex-col gap-5 p-6">
        <label
          [class.border-fuchsia-400]="dragging()"
          [class.bg-fuchsia-50]="dragging()"
          (dragover)="onDragOver($event)"
          (dragleave)="onDragLeave()"
          (drop)="onDrop($event)"
          class="group relative flex aspect-video cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-gray-300 bg-gradient-to-br from-white to-fuchsia-50 transition hover:border-fuchsia-400"
        >
          @if (preview()) {
            <img
              [src]="preview()"
              alt="preview"
              class="h-full w-full object-cover transition group-hover:scale-[1.02]"
            />
            <button
              type="button"
              (click)="clearFile($event)"
              class="absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-full bg-black/60 text-white backdrop-blur transition hover:bg-black/80"
              title="Quitar"
            >
              ✕
            </button>
          } @else {
            <div class="flex flex-col items-center gap-2 text-center">
              <div
                class="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-pink-400 to-indigo-500 text-2xl text-white shadow-lg shadow-fuchsia-500/30 transition group-hover:scale-110"
              >
                ⬆
              </div>
              <p class="text-sm font-semibold text-gray-800">
                Arrastra una imagen o haz clic para elegir
              </p>
              <p class="text-xs text-gray-500">PNG, JPG, WEBP · hasta 10 MB</p>
            </div>
          }
          <input type="file" accept="image/*" (change)="onFile($event)" class="hidden" />
        </label>

        @if (file()) {
          <div class="melo-pop flex items-center justify-between rounded-xl bg-fuchsia-50 px-3 py-2 text-sm">
            <span class="truncate text-gray-700">
              <strong class="font-semibold">{{ file()!.name }}</strong>
              — {{ (file()!.size / 1024 / 1024).toFixed(2) }} MB
            </span>
          </div>
        }

        <label class="flex flex-col gap-1.5">
          <span class="text-xs font-semibold uppercase tracking-wide text-gray-600">
            Descripción <span class="font-normal text-gray-400">(opcional)</span>
          </span>
          <textarea
            name="caption"
            rows="3"
            [(ngModel)]="caption"
            class="melo-input resize-none"
            placeholder="Escribe algo dulce…"
          ></textarea>
        </label>

        @if (errorMessage()) {
          <p class="melo-pop rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {{ errorMessage() }}
          </p>
        }

        <div class="flex items-center justify-end gap-2">
          <button type="button" (click)="cancel()" class="melo-btn-ghost">Cancelar</button>
          <button type="submit" [disabled]="loading() || !file()" class="melo-btn">
            @if (loading()) {
              <span
                class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
              ></span>
              Subiendo…
            } @else {
              Publicar
              <span>✨</span>
            }
          </button>
        </div>
      </form>
    </section>
  `
})
export class UploadComponent {
    private readonly postService = inject(PostService);
    private readonly router = inject(Router);

    caption = '';
    file = signal<File | null>(null);
    preview = signal<string | null>(null);
    loading = signal(false);
    errorMessage = signal<string | null>(null);
    dragging = signal(false);

    onFile(event: Event) {
        const input = event.target as HTMLInputElement;
        this.applyFile(input.files?.[0] ?? null);
    }

    onDragOver(event: DragEvent) {
        event.preventDefault();
        this.dragging.set(true);
    }

    onDragLeave() {
        this.dragging.set(false);
    }

    onDrop(event: DragEvent) {
        event.preventDefault();
        this.dragging.set(false);
        const f = event.dataTransfer?.files?.[0] ?? null;
        if (f && f.type.startsWith('image/')) this.applyFile(f);
    }

    clearFile(event: Event) {
        event.preventDefault();
        event.stopPropagation();
        this.applyFile(null);
    }

    private applyFile(f: File | null) {
        this.file.set(f);
        this.preview.set(f ? URL.createObjectURL(f) : null);
    }

    cancel() {
        this.router.navigateByUrl('/gallery');
    }

    async submit() {
        const f = this.file();
        if (!f) {
            this.errorMessage.set('Selecciona una imagen.');
            return;
        }
        this.loading.set(true);
        this.errorMessage.set(null);
        try {
            await this.postService.createPost(f, this.caption.trim());
            await this.router.navigateByUrl('/gallery');
        } catch (err: any) {
            this.errorMessage.set(err.message ?? 'Error al subir');
        } finally {
            this.loading.set(false);
        }
    }
}
