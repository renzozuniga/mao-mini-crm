export type ActivityType = 'CALL' | 'EMAIL' | 'MEETING' | 'NOTE';

export interface ActivityContact {
  id:      number;
  name:    string;
  company: string | null;
}

export interface ActivityOpportunity {
  id:    number;
  title: string;
  stage: string;
}

export interface Activity {
  id:            number;
  userId:        number;
  contactId:     number;
  opportunityId: number | null;
  type:          ActivityType;
  description:   string;
  activityDate:  string;
  createdAt:     string;
  contact:       ActivityContact;
  opportunity:   ActivityOpportunity | null;
}

export interface CreateActivityDto {
  contactId:     number;
  opportunityId?: number | null;
  type:          ActivityType;
  description:   string;
  activityDate:  string;
}

export type UpdateActivityDto = Partial<CreateActivityDto>;

// ── Display config per type ───────────────────────────────────────────────────

export interface ActivityTypeCfg {
  key:   ActivityType;
  label: string;
  icon:  string;
  color: string;
  bg:    string;
}

export const ACTIVITY_TYPES: ActivityTypeCfg[] = [
  { key: 'CALL',    label: 'Call',    icon: '📞', color: '#2563eb', bg: 'rgba(37,99,235,.12)'  },
  { key: 'EMAIL',   label: 'Email',   icon: '📧', color: '#7c3aed', bg: 'rgba(124,58,237,.12)' },
  { key: 'MEETING', label: 'Meeting', icon: '🤝', color: '#ea580c', bg: 'rgba(234,88,12,.12)'  },
  { key: 'NOTE',    label: 'Note',    icon: '📝', color: '#6b7280', bg: 'rgba(107,114,128,.12)'},
];

export const ACTIVITY_TYPE_MAP = Object.fromEntries(
  ACTIVITY_TYPES.map(t => [t.key, t]),
) as Record<ActivityType, ActivityTypeCfg>;
