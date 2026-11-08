import { organizers as defaultOrganizers, type Organizer, type OrganizerType } from '@/data/organizers';
import { getStoredValue, setStoredValue } from '@/services/authStorage';

const CUSTOM_ORGANIZERS_KEY = 'iuh-event-custom-organizers';

export interface CreateOrganizerInput {
  name: string;
  shortName: string;
  type: OrganizerType;
  description: string;
  contactEmail?: string;
  location?: string;
  color?: string;
}

export async function getCustomOrganizers(): Promise<Organizer[]> {
  try {
    const raw = await getStoredValue(CUSTOM_ORGANIZERS_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    if (Array.isArray(list)) {
      return list.map((item: any) => ({
        ...item,
        logo: defaultOrganizers[defaultOrganizers.length - 1].logo,
      }));
    }
  } catch (e) {
    console.warn('Error reading custom organizers:', e);
  }
  return [];
}

export async function getAllOrganizers(): Promise<Organizer[]> {
  const custom = await getCustomOrganizers();
  return [...custom, ...defaultOrganizers];
}

export async function createOrganizer(input: CreateOrganizerInput): Promise<Organizer> {
  const typeLabels: Record<OrganizerType, string> = {
    faculty: 'Khoa chuyên ngành',
    union: 'Tổ chức Đoàn thể',
    club: 'Câu lạc bộ - Đội nhóm',
    center: 'Trung tâm trực thuộc',
  };

  const newOrg: Organizer = {
    id: `org-custom-${Date.now()}`,
    name: input.name.trim(),
    shortName: input.shortName.trim() || input.name.trim(),
    type: input.type,
    typeLabel: typeLabels[input.type] || 'Đơn vị tổ chức',
    description: input.description.trim() || 'Đơn vị tổ chức các hoạt động và sự kiện cho sinh viên IUH.',
    logo: defaultOrganizers[defaultOrganizers.length - 1].logo,
    eventCount: 0,
    followerCount: 1,
    contactEmail: input.contactEmail?.trim(),
    location: input.location?.trim() || 'Trường ĐH Công nghiệp TP.HCM',
    isVerified: true,
    color: input.color || '#0D6EFD',
  };

  const current = await getCustomOrganizers();
  const updated = [newOrg, ...current.filter((o) => o.id !== newOrg.id)];
  await setStoredValue(
    CUSTOM_ORGANIZERS_KEY,
    JSON.stringify(updated.map(({ logo, ...rest }) => rest)),
  );

  return newOrg;
}

export async function deleteCustomOrganizer(id: string): Promise<void> {
  const current = await getCustomOrganizers();
  const updated = current.filter((o) => o.id !== id);
  await setStoredValue(
    CUSTOM_ORGANIZERS_KEY,
    JSON.stringify(updated.map(({ logo, ...rest }) => rest)),
  );
}
