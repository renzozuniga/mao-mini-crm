export type OpportunityStage =
  | 'LEAD'
  | 'QUALIFIED'
  | 'PROPOSAL'
  | 'NEGOTIATION'
  | 'CLOSED_WON'
  | 'CLOSED_LOST';

export interface OpportunityContact {
  id:      number;
  name:    string;
  company: string | null;
}

export interface Opportunity {
  id:                number;
  contactId:         number;
  title:             string;
  /** Prisma Decimal serialises to string in JSON — always run Number() before arithmetic. */
  value:             number | string;
  stage:             OpportunityStage;
  probability:       number;
  expectedCloseDate: string | null;
  createdAt:         string;
  contact:           OpportunityContact;
}

export interface CreateOpportunityDto {
  contactId:          number;
  title:              string;
  value:              number;
  stage:              OpportunityStage;
  probability:        number;
  expectedCloseDate?: string | null;
}

export type UpdateOpportunityDto = Partial<CreateOpportunityDto>;
