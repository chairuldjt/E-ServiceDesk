export interface TimelinePost {
    id: number;
    user_id: number;
    username: string;
    profile_image: string | null;
    content: string;
    images: string; // JSON string
    privacy: 'public' | 'private';
    is_pinned: number | boolean;
    created_at: string;
    updated_at: string;
    is_owner?: number | boolean;
    like_count: number;
    comment_count: number;
    user_liked: boolean | number;
}
