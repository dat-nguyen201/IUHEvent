import { useLocalSearchParams } from 'expo-router';
import { AdminEventForm } from '@/components/admin/AdminEventForm';

export default function EditAdminEventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <AdminEventForm eventId={typeof id === 'string' ? id : ''} />;
}
