
export interface ClientWithPolicies {
  clientId: string;
  agentId: string;
  firstName: string;
  surname: string;
  lastName: string;
  fullName: string;
  phoneNumber?: string;
  email?: string;
  address?: string;
  nationalId?: string;
  dateOfBirth?: string;
  isClient: boolean;
  insuranceType?: string;
  clientNotes?: string;
  clientCreatedDate: string;
  clientModifiedDate: string;
  clientIsActive: boolean;
  policies: ClientPolicyLite[];
}

export interface ClientPolicyLite {
  policyId: string;
  policyName: string;
  status: string;
  startDate: string;
  endDate: string;
  notes?: string;
  createdDate: string;
  modifiedDate: string;
  isActive: boolean;
  policyCatalogId: string;
  catalogPolicyName: string;
  typeId: string;
  typeName: string;
  companyId: string;
  companyName: string;
  daysUntilExpiry: number;
}

export interface ClientWithPoliciesFilter {
  agentId?: string;
  clientId?: string;
  includeInactive?: boolean;
}export interface PolicyResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}