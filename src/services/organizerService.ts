import { appMode } from '@/constants/app-mode';
import { organizers as defaultOrganizers, type Organizer, type OrganizerType } from '@/data/organizers';
import { getStoredValue, setStoredValue } from '@/services/authStorage';
import { apiRequest } from '@/services/apiClient';
import { createAdminOrganizerAccount, listAdminOrganizers, type AdminOrganizerRecord } from '@/services/adminUserService';
import type { AuthUser } from '@/types/auth';

const CUSTOM_ORGANIZERS_KEY = 'iuh-event-custom-organizers';

const typeLabels: Record<OrganizerType, string> = {
  faculty: 'Khoa chuyên ngành',
  union: 'Tổ chức Đoàn thể',
  club: 'Câu lạc bộ - Đội nhóm',
  center: 'Trung tâm trực thuộc',
};

function fromApiOrganizer(organizer: AdminOrganizerRecord): Organizer {
  return {
    ...organizer,
    typeLabel: typeLabels[organizer.type],
    logo: defaultOrganizers[defaultOrganizers.length - 1].logo,
    eventCount: 0,
    followerCount: 0,
    isVerified: true,
  };
}

export interface CreateOrganizerInput {
  name: string;
  shortName: string;
  type: OrganizerType;
  description: string;
  contactEmail?: string;
  password?: string;
  location?: string;
  color?: string;
}

export interface CreateOrganizerResult {
  organizer: Organizer;
  account: {
    email: string;
    password: string;
    user?: AuthUser;
  };
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

export async function getAllOrganizers(user?: AuthUser | null): Promise<Organizer[]> {
  if (appMode === 'remote') {
    const response = user?.role === 'admin' || user?.role === 'organizer'
      ? await listAdminOrganizers()
      : await apiRequest<{ data: AdminOrganizerRecord[] }>('/api/organizers');
    const remoteOrganizers = response.data.map(fromApiOrganizer);
    if (user?.role === 'organizer') return remoteOrganizers;

    return [...remoteOrganizers, ...defaultOrganizers];
  }

  const custom = await getCustomOrganizers();
  return [...custom, ...defaultOrganizers];
}

export async function createOrganizer(input: CreateOrganizerInput): Promise<CreateOrganizerResult> {
  const cleanShort = (input.shortName || input.name).trim().toLowerCase().replace(/[^a-z0-9]/g, '') || 'org';
  const accountEmail = input.contactEmail?.trim().toLowerCase() || `${cleanShort}@iuh.edu.vn`;
  const accountPassword = input.password?.trim() || 'Organizer12345!';

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
    contactEmail: accountEmail,
    location: input.location?.trim() || 'Trường ĐH Công nghiệp TP.HCM',
    isVerified: true,
    color: input.color || '#0D6EFD',
  };

  if (appMode === 'remote') {
    const result = await createAdminOrganizerAccount({
      name: newOrg.name,
      shortName: newOrg.shortName,
      type: input.type,
      description: newOrg.description,
      email: accountEmail,
      location: newOrg.location || '',
      color: newOrg.color,
    });
    const organizer = fromApiOrganizer(result.organizer);
    return {
      organizer,
      account: {
        email: result.account.email,
        password: result.account.initialPassword,
        user: result.account.user,
      },
    };
  }

  const current = await getCustomOrganizers();
  const updated = [newOrg, ...current.filter((o) => o.id !== newOrg.id)];
  await setStoredValue(
    CUSTOM_ORGANIZERS_KEY,
    JSON.stringify(updated.map(({ logo, ...rest }) => rest)),
  );

  return {
    organizer: newOrg,
    account: {
      email: accountEmail,
      password: accountPassword,
    },
  };
}

export async function deleteCustomOrganizer(id: string): Promise<void> {
  const current = await getCustomOrganizers();
  const updated = current.filter((o) => o.id !== id);
  await setStoredValue(
    CUSTOM_ORGANIZERS_KEY,
    JSON.stringify(updated.map(({ logo, ...rest }) => rest)),
  );
}
