# Tehnička specifikacija - Upravljanje stanarima

## 1. Pregled funkcionalnosti

Sistem upravljanja stanarima omogućava firmama da pozivaju stanare, povezuju ih sa zgradama i stanovima, a stanarima da prijavljuju kvarove koji se automatski označavaju sa spratom.

### 1.1 Ključne komponente
- **Pozivanje stanara** - Email pozivnice sa registracionim linkovima
- **Upravljanje stanarima** - Lista stanara po zgradama sa mogućnostima uređivanja
- **Automatsko označavanje** - Kvarovi se automatski povezuju sa spratom stanara
- **Bezbednost** - RLS politike za pristup podacima

## 2. Arhitektura baze podataka

### 2.1 Nova tabela: building_tenants
```sql
CREATE TABLE building_tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    building_id UUID REFERENCES buildings(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    apartment_number VARCHAR(10), -- npr. "1A", "2B", "15"
    floor_number INTEGER,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
    invited_by UUID REFERENCES auth.users(id), -- firma koja je pozvala
    invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    joined_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(building_id, user_id) -- jedan korisnik može biti stanar samo jednom u istoj zgradi
);
```

### 2.2 Nova tabela: tenant_invitations
```sql
CREATE TABLE tenant_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    building_id UUID REFERENCES buildings(id) ON DELETE CASCADE,
    apartment_number VARCHAR(10),
    floor_number INTEGER,
    invite_token VARCHAR(255) UNIQUE NOT NULL,
    invited_by UUID REFERENCES auth.users(id),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2.3 RLS politike
```sql
-- building_tenants policies
ALTER TABLE building_tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Companies can manage their building tenants" ON building_tenants
    FOR ALL USING (
        building_id IN (
            SELECT id FROM buildings WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Tenants can view their own records" ON building_tenants
    FOR SELECT USING (user_id = auth.uid());

-- tenant_invitations policies  
ALTER TABLE tenant_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Companies can manage their invitations" ON tenant_invitations
    FOR ALL USING (invited_by = auth.uid());
```

## 3. API endpoints

### 3.1 Pregled stanara
```
GET /api/tenants
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "tenants": [
    {
      "id": "uuid",
      "user": {
        "id": "uuid",
        "name": "Marko Petrović",
        "email": "marko@example.com"
      },
      "building": {
        "id": "uuid",
        "name": "Zgrada A",
        "address": "Bulevar Oslobođenja 123"
      },
      "apartment_number": "2A",
      "floor_number": 2,
      "status": "active",
      "joined_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### 3.2 Pozivanje stanara
```
POST /api/tenants/invite
Authorization: Bearer {token}
Content-Type: application/json
```

**Request:**
```json
{
  "email": "novi.stanar@example.com",
  "building_id": "uuid",
  "apartment_number": "3B",
  "floor_number": 3
}
```

**Response:**
```json
{
  "success": true,
  "invitation": {
    "id": "uuid",
    "email": "novi.stanar@example.com",
    "invite_token": "secure-random-token",
    "expires_at": "2024-01-22T10:30:00Z"
  }
}
```

### 3.3 Registracija preko pozivnice
```
POST /api/tenants/register/:token
Content-Type: application/json
```

**Request:**
```json
{
  "name": "Novi Stanar",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "name": "Novi Stanar",
    "email": "novi.stanar@example.com"
  },
  "tenant": {
    "building_id": "uuid",
    "apartment_number": "3B",
    "floor_number": 3
  }
}
```

## 4. Frontend komponente

### 4.1 Navigacija - Layout.tsx izmjene
```typescript
const adminNavigation = [
  { name: 'Kontrolna tabla', href: '/admin/dashboard', icon: Settings },
  { name: 'Objekti', href: '/buildings', icon: Building2 },
  { name: 'Stanari', href: '/tenants', icon: Users }, // NOVO
]
```

### 4.2 AdminDashboard.tsx izmjene
- Promeniti tab "Korisnici" u "Stanari"
- Dodati funkcionalnosti za pozivanje stanara
- Prikazati stanare grupisane po zgradama

### 4.3 Nova stranica: Tenants.tsx
```typescript
interface Tenant {
  id: string
  user: {
    id: string
    name: string
    email: string
  }
  building: {
    id: string
    name: string
    address: string
  }
  apartment_number: string
  floor_number: number
  status: 'active' | 'inactive' | 'pending'
  joined_at: string
}

export default function Tenants() {
  // Lista stanara sa mogućnostima:
  // - Filtriranje po zgradama
  // - Pozivanje novih stanara
  // - Uređivanje postojećih
  // - Deaktiviranje stanara
}
```

### 4.4 Nova komponenta: InviteTenantModal.tsx
```typescript
interface InviteTenantModalProps {
  isOpen: boolean
  onClose: () => void
  buildings: Building[]
  onInvite: (data: InviteData) => void
}

export default function InviteTenantModal({
  isOpen,
  onClose,
  buildings,
  onInvite
}: InviteTenantModalProps) {
  // Form za pozivanje stanara:
  // - Email input
  // - Odabir zgrade
  // - Unos broja stana
  // - Odabir sprata
}
```

## 5. Email sistem

### 5.1 Template za pozivnicu
```html
<!DOCTYPE html>
<html>
<head>
    <title>Pozivnica za Kućni Majstor</title>
</head>
<body>
    <h2>Pozvani ste da se pridružite aplikaciji Kućni Majstor</h2>
    <p>Poštovani/a,</p>
    <p>{{company_name}} vas poziva da se registrujete kao stanar u zgradi {{building_name}}.</p>
    <p><strong>Vaši podaci:</strong></p>
    <ul>
        <li>Zgrada: {{building_name}}</li>
        <li>Adresa: {{building_address}}</li>
        <li>Stan: {{apartment_number}}</li>
        <li>Sprat: {{floor_number}}</li>
    </ul>
    <p>Kliknite na link ispod da završite registraciju:</p>
    <a href="{{registration_link}}" style="background: #2563EB; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
        Završi registraciju
    </a>
    <p><small>Link ističe za 7 dana.</small></p>
</body>
</html>
```

## 6. Integracija sa postojećim sistemom

### 6.1 ReportIssue.tsx izmjene
```typescript
// Automatski popuni sprat na osnovu stanara
useEffect(() => {
  const fetchTenantInfo = async () => {
    const { data } = await supabase
      .from('building_tenants')
      .select('floor_number, apartment_number, building:buildings(name)')
      .eq('user_id', user.id)
      .single()
    
    if (data) {
      setFloorNumber(data.floor_number)
      setApartmentNumber(data.apartment_number)
    }
  }
  
  fetchTenantInfo()
}, [user.id])
```

### 6.2 Issues tabela izmjene
```sql
-- Dodati kolonu za sprat u issues tabelu
ALTER TABLE issues ADD COLUMN floor_number INTEGER;

-- Update postojećih kvarova sa spratom iz building_tenants
UPDATE issues 
SET floor_number = bt.floor_number
FROM building_tenants bt
WHERE issues.user_id = bt.user_id;
```

### 6.3 Building2D komponenta izmjene
```typescript
// Prikazati kvarove sa označenim spratom
const issuesWithFloor = issues.filter(issue => issue.floor_number)
const issuesByFloor = groupBy(issuesWithFloor, 'floor_number')

// Vizuelno označiti spratove sa kvarovima
floors.map(floor => ({
  ...floor,
  hasIssues: issuesByFloor[floor.number]?.length > 0,
  issueCount: issuesByFloor[floor.number]?.length || 0
}))
```

## 7. Bezbednost i validacija

### 7.1 Validacija pozivnica
- Email format validacija
- Provera da li korisnik već postoji
- Provera da li je već stanar u toj zgradi
- Token expiration provera

### 7.2 Autorizacija
- Samo vlasnici zgrada mogu pozivati stanare
- Stanari mogu videti samo svoje podatke
- Admin može videti sve stanare svojih zgrada

### 7.3 Rate limiting
- Maksimalno 10 pozivnica po satu po firmi
- Maksimalno 3 pokušaja registracije po tokenu

## 8. Testiranje

### 8.1 Demo podaci
```sql
-- Kreirati demo firmu i stanara
INSERT INTO auth.users (email, raw_user_meta_data) VALUES 
('demo@firma.com', '{"name": "Demo Firma", "role": "company"}'),
('demo@stanar.com', '{"name": "Demo Stanar", "role": "tenant"}');

-- Povezati demo stanara sa demo firmom
INSERT INTO building_tenants (building_id, user_id, apartment_number, floor_number, invited_by, status, joined_at)
SELECT 
    b.id,
    (SELECT id FROM auth.users WHERE email = 'demo@stanar.com'),
    '2A',
    2,
    (SELECT id FROM auth.users WHERE email = 'demo@firma.com'),
    'active',
    NOW()
FROM buildings b 
WHERE b.user_id = (SELECT id FROM auth.users WHERE email = 'demo@firma.com')
LIMIT 1;
```

### 8.2 Test scenariji
1. **Pozivanje stanara** - Firma poziva novog stanara
2. **Registracija** - Stanar se registruje preko pozivnice
3. **Prijava kvara** - Stanar prijavljuje kvar sa automatskim spratom
4. **Upravljanje** - Firma upravlja stanarima
5. **Bezbednost** - Testiranje RLS politika

## 9. Deployment

### 9.1 Migracije
```bash
# Kreirati novu migraciju
supabase migration new create_tenant_management_tables

# Primeniti migracije
supabase db push
```

### 9.2 Environment varijable
```env
# Email servis
RESEND_API_KEY=your_resend_api_key
FROM_EMAIL=noreply@kucnimajstor.com

# Frontend URL za registracione linkove
FRONTEND_URL=https://kucnimajstor.com
```

Ova specifikacija pokriva kompletnu implementaciju sistema upravljanja stanarima sa fokusom na bezbednost, skalabilnost i korisnost.