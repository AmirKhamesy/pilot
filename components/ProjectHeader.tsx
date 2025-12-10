import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import React from 'react';
import { Linking, StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Fonts } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';

type Props = {
    title: string;
    subtitle?: string;
    showBack?: boolean;
    iconName?: React.ComponentProps<typeof SymbolView>['name'];
    url?: string;
};

export default function ProjectHeader({ title, subtitle, showBack = false, iconName = 'folder.fill', url }: Props) {
    const textColor = useThemeColor({}, 'text');
    const textSecondary = useThemeColor({}, 'textSecondary');
    const buttonPrimary = useThemeColor({}, 'buttonPrimary');
    const tintColor = useThemeColor({}, 'tint');

    const handlePress = () => {
        if (url) {
            Linking.openURL(url);
        }
    };

    return (
        <View style={styles.container}>
            {showBack ? (
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={styles.backButton}
                    activeOpacity={0.7}
                >
                    <IconSymbol name="chevron.left" size={24} color={tintColor} />
                </TouchableOpacity>
            ) : (
                <View style={styles.headerSpacer} />
            )}

            <TouchableOpacity style={styles.center} onPress={handlePress} disabled={!url}>
                <View style={[styles.icon, { backgroundColor: buttonPrimary + '20' }]}>
                    <IconSymbol name={iconName} size={28} color={buttonPrimary} />
                </View>
                <View style={styles.titleWrap}>
                    <ThemedText type="title" style={[styles.title, { color: textColor, fontFamily: Fonts.rounded }]}>
                        {title}
                    </ThemedText>
                    {subtitle ? (
                        <ThemedText style={[styles.subtitle, { color: textSecondary }]}>
                            {subtitle}
                        </ThemedText>
                    ) : null}
                </View>
            </TouchableOpacity>

            <View style={styles.headerSpacer} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 16,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerSpacer: {
        width: 40,
    },
    center: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    icon: {
        width: 48,
        height: 48,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    titleWrap: {
        flex: 1,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 15,
    },
});
