import { Injectable, inject, signal } from '@angular/core';
import { Session, User } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';
import { Profile } from '../../shared/models/photo.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
    private readonly sb = inject(SupabaseService);

    readonly session = signal<Session | null>(null);
    readonly user = signal<User | null>(null);
    readonly profile = signal<Profile | null>(null);
    readonly ready = signal(false);

    constructor() {
        this.sb.client.auth.getSession().then(({ data }) => {
            this.applySession(data.session);
            this.ready.set(true);
        });

        this.sb.client.auth.onAuthStateChange((_event, session) => {
            this.applySession(session);
        });
    }

    private async applySession(session: Session | null) {
        this.session.set(session);
        this.user.set(session?.user ?? null);
        if (session?.user) {
            await this.loadProfile(session.user.id);
        } else {
            this.profile.set(null);
        }
    }

    async loadProfile(userId: string) {
        const { data } = await this.sb.client
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .maybeSingle();
        this.profile.set(data as Profile | null);
    }

    async login(email: string, password: string) {
        const { data, error } = await this.sb.client.auth.signInWithPassword({
            email,
            password
        });
        if (error) throw error;
        return data;
    }

    async register(email: string, password: string, username: string) {
        const cleanUsername = username.trim();
        const { data, error } = await this.sb.client.auth.signUp({
            email,
            password,
            options: { data: { username: cleanUsername } }
        });
        if (error) throw error;
        return data;
    }

    async logout() {
        await this.sb.client.auth.signOut();
    }

    async updateProfile(patch: Partial<Profile>) {
        const u = this.user();
        if (!u) throw new Error('No autenticado');
        const { data, error } = await this.sb.client
            .from('profiles')
            .update(patch)
            .eq('id', u.id)
            .select()
            .single();
        if (error) throw error;
        this.profile.set(data as Profile);
    }
}
