export interface Technician {
  id: number;
  fullName: string;
  email: string;
  isActive: boolean;
}

export interface ServiceType {
  id: number;
  name: string;
  description: string | null;
  isActive: boolean;
}
