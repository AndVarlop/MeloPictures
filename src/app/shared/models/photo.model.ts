export interface Profile {
    id: string;
    username: string | null;
    avatar_url: string | null;
    created_at?: string;
}

export interface Post {
    id: string;
    user_id: string;
    image_url: string;
    storage_path?: string | null;
    caption: string | null;
    created_at: string;
    profiles?: Profile | null;
    likes?: { count: number }[];
    comments?: { count: number }[];
}

export interface Comment {
    id: string;
    post_id: string;
    user_id: string;
    content: string;
    created_at: string;
    profiles?: Profile | null;
}

export interface Like {
    post_id: string;
    user_id: string;
    created_at?: string;
}
