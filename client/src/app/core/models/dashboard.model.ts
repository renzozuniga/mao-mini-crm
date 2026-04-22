export type ActivityType     = 'CALL' | 'EMAIL' | 'MEETING' | 'NOTE';
export type OpportunityStage =
  | 'LEAD' | 'QUALIFIED' | 'PROPOSAL'
  | 'NEGOTIATION' | 'CLOSED_WON' | 'CLOSED_LOST';

export interface DashboardKpis {
  totalContacts:      number;
  openOpportunities:  number;
  pipelineValue:      number;
  activitiesThisWeek: number;
}

export interface PipelineStage {
  stage: OpportunityStage;
  count: number;
  value: number;
}

export interface ContactsByStatus {
  ACTIVE:   number;
  LEAD:     number;
  INACTIVE: number;
}

export interface ActivityTrendPoint {
  date:  string;   // YYYY-MM-DD
  label: string;   // "Apr 8"
  count: number;
}

export interface TopOpportunity {
  title:   string;
  value:   number;
  stage:   OpportunityStage;
  contact: string;
}

export interface RecentActivity {
  id:           number;
  type:         ActivityType;
  description:  string;
  activityDate: string;
  contact: {
    name:    string;
    company: string;
  };
}

export interface DashboardSummary {
  kpis:              DashboardKpis;
  pipelineByStage:   PipelineStage[];
  contactsByStatus:  ContactsByStatus;
  activityTrend:     ActivityTrendPoint[];
  topOpportunities:  TopOpportunity[];
  recentActivities:  RecentActivity[];
}
