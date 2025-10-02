export interface Address {
  id: string;
  name: string; // "Adresa 1", "Kuća", "Stan", itd.
  address: string;
  city: string;
  apartment: string;
  floor: string;
  entrance: string;
  notes: string;
  isDefault: boolean;
}

export interface UserProfile {
  name: string;
  email: string;
  phone: string;
  role: 'tenant' | 'technician' | 'admin';
}