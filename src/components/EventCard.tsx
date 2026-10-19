import { router } from 'expo-router';
import { Image, Pressable } from 'react-native';
import { Text, View, useTheme } from '@tamagui/core';

import { ActionButton } from '@/components/ActionButton';
import { Badge } from '@/components/Badge';
import { useAppState } from '@/context/AppStateContext';
import type { StudentEvent } from '@/types/events';
import { formatEventDate } from '@/utils/date';

type EventCardProps = {
  event: StudentEvent;
};

export function EventCard({ event }: EventCardProps) {
  const theme = useTheme();
  const { isEventSaved, saveEvent, unsaveEvent } = useAppState();
  const saved = isEventSaved(event.id);

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/events/[id]', params: { id: event.id } })}
      accessibilityRole="button"
      accessibilityLabel={`Mở sự kiện ${event.title}`}>
      <View
        style={{
          backgroundColor: theme.background.val,
          borderColor: '#E5E7EB',
          borderRadius: 20,
          borderWidth: 1,
          overflow: 'hidden',
        }}>
        <Image source={event.image} style={{ backgroundColor: '#E5E7EB', height: 150, width: '100%' }} />
        <View style={{ gap: 12, padding: 16 }}>
          <View style={{ alignItems: 'center', flexDirection: 'row', gap: 12 }}>
            <Badge label={event.category} />
            {saved ? <Badge label="Đã lưu" tone="success" /> : null}
          </View>
          <Text style={{ color: theme.color.val, fontSize: 19, fontWeight: '900' }}>{event.title}</Text>
          <Text style={{ color: theme.primary.val, fontSize: 14, fontWeight: '800' }}>{formatEventDate(event.startsAt)}</Text>
          <Text style={{ color: theme.color.val, fontSize: 14, opacity: 0.65 }}>{event.location}</Text>
          <Text numberOfLines={2} style={{ color: theme.color.val, fontSize: 14, lineHeight: 20, opacity: 0.65 }}>
            {event.description}
          </Text>
          <View style={{ alignItems: 'center', flexDirection: 'row', gap: 12, justifyContent: 'space-between' }}>
            <Text style={{ color: theme.color.val, flex: 1, fontSize: 13, fontWeight: '700', opacity: 0.65 }}>
              {event.checkedInCount}/{event.capacity} check-in
            </Text>
            <ActionButton
              label={saved ? 'Hủy lưu' : 'Lưu'}
              variant={saved ? 'danger' : 'primary'}
              onPress={(pressEvent) => {
                pressEvent.stopPropagation();
                if (saved) {
                  unsaveEvent(event.id);
                } else {
                  saveEvent(event.id);
                }
              }}
            />
          </View>
        </View>
      </View>
    </Pressable>
  );
}
