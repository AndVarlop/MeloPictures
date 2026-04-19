import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { Comment, Post } from '../../shared/models/photo.model';

@Injectable({ providedIn: 'root' })
export class PostService {
    private readonly sb = inject(SupabaseService);
    private readonly auth = inject(AuthService);

    private extractStoragePathFromUrl(imageUrl: string): string | null {
        try {
            const url = new URL(imageUrl);
            const markers = [
                `/storage/v1/object/public/${this.sb.bucket}/`,
                `/storage/v1/object/sign/${this.sb.bucket}/`,
                `/storage/v1/object/authenticated/${this.sb.bucket}/`
            ];
            for (const marker of markers) {
                const i = url.pathname.indexOf(marker);
                if (i === -1) continue;
                const raw = url.pathname.slice(i + marker.length);
                return decodeURIComponent(raw);
            }
            return null;
        } catch {
            return null;
        }
    }

    private async withSignedImageUrls(posts: Post[]): Promise<Post[]> {
        // If there's no session, we can't create signed URLs from the client.
        if (!this.auth.session()) return posts;

        const expiresInSeconds = 60 * 60; // 1h

        return await Promise.all(
            posts.map(async (post) => {
                const path = post.storage_path ?? this.extractStoragePathFromUrl(post.image_url);
                if (!path) return post;

                try {
                    const { data, error } = await this.sb.client.storage
                        .from(this.sb.bucket)
                        .createSignedUrl(path, expiresInSeconds);

                    if (error || !data?.signedUrl) {
                        return { ...post, storage_path: post.storage_path ?? path };
                    }

                    return { ...post, storage_path: post.storage_path ?? path, image_url: data.signedUrl };
                } catch {
                    return { ...post, storage_path: post.storage_path ?? path };
                }
            })
        );
    }

    private isMissingColumnError(error: unknown, table: string, column: string): boolean {
        if (!error || typeof error !== 'object') return false;
        const message = (error as any).message;
        if (typeof message !== 'string') return false;
        return (
            message.includes(`'${column}'`) &&
            message.includes(`'${table}'`) &&
            message.toLowerCase().includes('schema cache')
        );
    }

    async getFeed(): Promise<Post[]> {
        const { data, error } = await this.sb.client
            .from('posts')
            .select('*, profiles(*), likes(count), comments(count)')
            .order('created_at', { ascending: false });
        if (error) throw error;
        return await this.withSignedImageUrls((data ?? []) as Post[]);
    }

    async getByUser(userId: string): Promise<Post[]> {
        const { data, error } = await this.sb.client
            .from('posts')
            .select('*, profiles(*), likes(count), comments(count)')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        if (error) throw error;
        return await this.withSignedImageUrls((data ?? []) as Post[]);
    }

    async createPost(file: File, caption: string): Promise<Post> {
        const user = this.auth.user();
        if (!user) throw new Error('No autenticado');

        const ext = file.name.split('.').pop() ?? 'jpg';
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`;

        const { error: upErr } = await this.sb.client.storage
            .from(this.sb.bucket)
            .upload(path, file, { contentType: file.type });
        if (upErr) throw upErr;

        const { data: pub } = this.sb.client.storage
            .from(this.sb.bucket)
            .getPublicUrl(path);

        const imageUrl = pub.publicUrl;

        const insert = async (payload: Record<string, unknown>) =>
            this.sb.client.from('posts').insert(payload).select('*, profiles(*)').single();

        let result = await insert({ user_id: user.id, image_url: imageUrl, storage_path: path, caption });

        if (result.error && this.isMissingColumnError(result.error, 'posts', 'storage_path')) {
            result = await insert({ user_id: user.id, image_url: imageUrl, caption });
        }

        if (result.error) {
            // Best-effort cleanup to avoid orphaned files when DB insert fails.
            await this.sb.client.storage.from(this.sb.bucket).remove([path]);
            throw result.error;
        }

        return result.data as Post;
    }

    async deletePost(post: Post): Promise<void> {
        const path = post.storage_path ?? (post.image_url ? this.extractStoragePathFromUrl(post.image_url) : null);
        if (path) await this.sb.client.storage.from(this.sb.bucket).remove([path]);
        const { error } = await this.sb.client.from('posts').delete().eq('id', post.id);
        if (error) throw error;
    }

    async toggleLike(postId: string): Promise<boolean> {
        const user = this.auth.user();
        if (!user) throw new Error('No autenticado');

        const { data: existing } = await this.sb.client
            .from('likes')
            .select('post_id')
            .eq('post_id', postId)
            .eq('user_id', user.id)
            .maybeSingle();

        if (existing) {
            await this.sb.client
                .from('likes')
                .delete()
                .eq('post_id', postId)
                .eq('user_id', user.id);
            return false;
        }

        await this.sb.client.from('likes').insert({ post_id: postId, user_id: user.id });
        return true;
    }

    async hasLiked(postId: string): Promise<boolean> {
        const user = this.auth.user();
        if (!user) return false;
        const { data } = await this.sb.client
            .from('likes')
            .select('post_id')
            .eq('post_id', postId)
            .eq('user_id', user.id)
            .maybeSingle();
        return !!data;
    }

    async getComments(postId: string): Promise<Comment[]> {
        const { data, error } = await this.sb.client
            .from('comments')
            .select('*, profiles(*)')
            .eq('post_id', postId)
            .order('created_at', { ascending: true });
        if (error) throw error;
        return (data ?? []) as Comment[];
    }

    async addComment(postId: string, content: string): Promise<Comment> {
        const user = this.auth.user();
        if (!user) throw new Error('No autenticado');
        const { data, error } = await this.sb.client
            .from('comments')
            .insert({ post_id: postId, user_id: user.id, content })
            .select('*, profiles(*)')
            .single();
        if (error) throw error;
        return data as Comment;
    }

    async deleteComment(id: string): Promise<void> {
        const { error } = await this.sb.client.from('comments').delete().eq('id', id);
        if (error) throw error;
    }
}
