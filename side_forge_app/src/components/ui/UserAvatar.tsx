import React, { useEffect, useState } from 'react';
import { Image, Platform, StyleSheet, Text, View } from 'react-native';
import { User } from 'lucide-react-native';
import { useAppTheme } from '@/theme';
import { authApi } from '@/api/authApi';

export interface UserAvatarProps {
  firstName?: string | null;
  lastName?: string | null;
  profilePhotoUrl?: string | null;
  profilePhotoFileId?: number | null;
  photoVersion?: number;
  previewUri?: string | null;
  size?: number;
  highlighted?: boolean;
}

function getInitials(firstName?: string | null, lastName?: string | null): string {
  const f = (firstName ?? '').trim();
  const l = (lastName ?? '').trim();
  if (f && l) {
    return `${f[0] ?? ''}${l[0] ?? ''}`.toUpperCase();
  }
  if (f) {
    return f.slice(0, 2).toUpperCase();
  }
  return '';
}

export function UserAvatar({
  firstName,
  lastName,
  profilePhotoUrl,
  profilePhotoFileId,
  photoVersion = 0,
  previewUri,
  size = 44,
  highlighted = false,
}: UserAvatarProps) {
  const { colors, typography } = useAppTheme();
  const [imageError, setImageError] = useState(false);
  const [webBlobUrl, setWebBlobUrl] = useState<string | null>(null);

  const effectivePhotoPath =
    profilePhotoUrl ??
    (profilePhotoFileId != null ? '/api/me/profile-photo' : null);

  useEffect(() => {
    setImageError(false);
  }, [effectivePhotoPath, photoVersion, previewUri]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (previewUri || !effectivePhotoPath) {
      setWebBlobUrl(null);
      return;
    }

    let cancelled = false;
    let createdObjectUrl: string | null = null;
    const source = authApi.buildAuthorizedUserPhotoSource(
      effectivePhotoPath,
      photoVersion
    );

    if (!source) {
      setWebBlobUrl(null);
      return;
    }

    fetch(source.uri, {
      method: 'GET',
      headers: source.headers,
      credentials: 'include',
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('Photo load failed');
        const blob = await res.blob();
        if (!cancelled && blob.size > 0 && typeof URL !== 'undefined') {
          createdObjectUrl = URL.createObjectURL(blob);
          setWebBlobUrl(createdObjectUrl);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setWebBlobUrl(null);
        }
      });

    return () => {
      cancelled = true;
      if (createdObjectUrl && typeof URL !== 'undefined') {
        URL.revokeObjectURL(createdObjectUrl);
      }
    };
  }, [effectivePhotoPath, photoVersion, previewUri]);

  const resolvedSource = (() => {
    if (previewUri) {
      return { uri: previewUri };
    }
    if (imageError || !effectivePhotoPath) {
      return null;
    }
    if (Platform.OS === 'web') {
      if (webBlobUrl) {
        return { uri: webBlobUrl };
      }
      return null;
    }
    return authApi.buildAuthorizedUserPhotoSource(
      effectivePhotoPath,
      photoVersion
    );
  })();

  const borderRadius = size / 2;
  const initials = getInitials(firstName, lastName);

  if (resolvedSource) {
    return (
      <Image
        source={resolvedSource}
        onError={() => setImageError(true)}
        style={{
          width: size,
          height: size,
          borderRadius,
          borderWidth: highlighted ? 2 : 1.5,
          borderColor: highlighted ? colors.primary : colors.primarySoftBorder,
          backgroundColor: colors.surfaceMuted,
        }}
      />
    );
  }

  return (
    <View
      style={[
        styles.fallbackCircle,
        {
          width: size,
          height: size,
          borderRadius,
          backgroundColor: highlighted ? colors.primary : colors.primarySoft,
          borderColor: highlighted ? colors.primary : colors.primarySoftBorder,
        },
      ]}
    >
      {initials ? (
        <Text
          style={{
            color: highlighted ? colors.textOnPrimary : colors.primaryText,
            fontSize:
              size >= 64
                ? typography.fontSizes.xl
                : size >= 44
                ? typography.fontSizes.base
                : typography.fontSizes.xs,
            fontWeight: typography.fontWeights.bold,
          }}
        >
          {initials}
        </Text>
      ) : (
        <User
          size={Math.round(size * 0.46)}
          color={highlighted ? colors.textOnPrimary : colors.primaryText}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fallbackCircle: {
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
