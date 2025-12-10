import Account from '@/components/Account';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { supabase } from '@/lib/supabase';
import { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { ActivityIndicator } from 'react-native';

export default function ProfileScreen() {
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    const tintColor = useThemeColor({}, 'tint');

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setLoading(false);
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    if (loading) {
        return (
            <ThemedView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color={tintColor} />
                <ThemedText style={{ marginTop: 16 }}>Loading...</ThemedText>
            </ThemedView>
        );
    }

    if (!session) {
        return (
            <ThemedView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                <ThemedText type="title" style={{ textAlign: 'center', marginBottom: 16 }}>
                    Not Signed In
                </ThemedText>
                <ThemedText style={{ textAlign: 'center', opacity: 0.7 }}>
                    Please sign in to view your profile
                </ThemedText>
            </ThemedView>
        );
    }

    return <Account session={session} />;
}