import { Component, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/service/auth.service';
import { PostService } from '../../../core/service/post.service';
import { Comment, Post } from '../../models/photo.model';

@Component({
  selector: 'app-post-card',
  imports: [CommonModule, FormsModule],
  templateUrl: './post-card.component.html'
})
export class PostCardComponent {
  readonly auth = inject(AuthService);
  private readonly posts = inject(PostService);

  post = input.required<Post>();
  removed = output<string>();

  liked = signal(false);
  likeCount = signal(0);
  commentCount = signal(0);
  showComments = signal(false);
  comments = signal<Comment[]>([]);
  newComment = '';
  busy = signal(false);
  burst = signal(false);

  readonly isOwner = computed(() => this.auth.user()?.id === this.post().user_id);
  readonly initial = computed(() =>
    (this.post().profiles?.username ?? '?').charAt(0).toUpperCase()
  );

  async ngOnInit() {
    const p = this.post();
    this.likeCount.set(p.likes?.[0]?.count ?? 0);
    this.commentCount.set(p.comments?.[0]?.count ?? 0);
    this.liked.set(await this.posts.hasLiked(p.id));
  }

  async toggleLike() {
    const now = await this.posts.toggleLike(this.post().id);
    this.liked.set(now);
    this.likeCount.update((c) => c + (now ? 1 : -1));
    if (now) {
      this.burst.set(true);
      setTimeout(() => this.burst.set(false), 450);
    }
  }

  async openComments() {
    this.showComments.update((v) => !v);
    if (this.showComments() && this.comments().length === 0) {
      this.comments.set(await this.posts.getComments(this.post().id));
    }
  }

  async submitComment() {
    if (!this.newComment.trim()) return;
    this.busy.set(true);
    try {
      const c = await this.posts.addComment(this.post().id, this.newComment.trim());
      this.comments.update((arr) => [...arr, c]);
      this.commentCount.update((n) => n + 1);
      this.newComment = '';
    } finally {
      this.busy.set(false);
    }
  }

  async deleteComment(id: string) {
    await this.posts.deleteComment(id);
    this.comments.update((arr) => arr.filter((c) => c.id !== id));
    this.commentCount.update((n) => n - 1);
  }

  async remove() {
    if (!confirm('¿Eliminar esta foto?')) return;
    this.busy.set(true);
    try {
      await this.posts.deletePost(this.post());
      this.removed.emit(this.post().id);
    } finally {
      this.busy.set(false);
    }
  }
}
