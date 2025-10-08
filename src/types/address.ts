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
  isInherited?: boolean; // Da li je adresa nasleđena od objekta (ne može se menjati)
  buildingId?: string; // ID objekta od koga je nasleđena adresa
}

export interface UserProfile {
  name: string;
  email: string;
  phone: string;
  role: 'tenant' | 'technician' | 'admin';
}