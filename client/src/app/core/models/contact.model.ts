export type ContactStatus = 'LEAD' | 'ACTIVE' | 'INACTIVE';

export interface Contact {
  id:        number;
  name:      string;
  email:     string | null;
  phone:     string | null;
  company:   string | null;
  status:    ContactStatus;
  notes:     string | null;
  createdAt: string;
  _count?: { opportunities: number; activities: number };
}

export interface ContactsPage {
  data:        Contact[];
  total:       number;
  page:        number;
  totalPages:  number;
}

export interface ContactsQuery {
  page?:   number;
  limit?:  number;
  search?: string;
  status?: ContactStatus | '';
}

export interface CreateContactDto {
  name:     string;
  email?:   string;
  phone?:   string;
  company?: string;
  status:   ContactStatus;
  notes?:   string;
}

export type UpdateContactDto = Partial<CreateContactDto>;
