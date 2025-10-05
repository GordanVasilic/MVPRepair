# 3D Vizualizacija Zgrade - Dizajn Dokument

## 1. Pregled Projekta

Kreiranje moderne, interaktivne 3D vizualizacije zgrade koja omogućava:

* Realistični prikaz zgrade sa spratovima

* Prikazivanje kvarova i problema prijavljenih od strane stanara

* Intuitivnu navigaciju kroz spratove

* Upravljanje održavanjem zgrade

**Cilj:** Stvoriti profesionalni alat za upravljanje zgradama koji kombinuje vizuelnu privlačnost sa funkcionalnim mogućnostima.

## 2. Vizuelni Dizajn

### 2.1 Arhitektura Zgrade

**Izometrijski 3D Prikaz:**

* **Perspektiva:** Izometrijska projekcija (30° rotacija)

* **Dimenzije:** Proporcionalne stvarnim zgradama

  * Širina: 200px

  * Dubina: 120px

  * Visina po spratu: 60px

* **Materijali:** Realistični gradijenti i senke

**Struktura Zgrade:**

```
┌─────────────────┐ ← Krov (tamno siva)
│  Sprat N        │
├─────────────────┤
│  Sprat N-1      │
├─────────────────┤
│  ...            │
├─────────────────┤
│  Sprat 1        │
├─────────────────┤
│  Prizemlje      │ ← Ulaz sa vratima
└─────────────────┘
```

### 2.2 Paleta Boja

**Osnovna Paleta:**

* **Zidovi:** `#E5E7EB` (svetlo siva)

* **Okviri:** `#6B7280` (srednje siva)

* **Krov:** `#374151` (tamno siva)

* **Prozori:** `#1E40AF` (plava)

* **Senke:** `rgba(0,0,0,0.2)`

**Indikatori Kvarova:**

* **Kritični kvarovi:** `#EF4444` (crvena)

* **Umeren kvar:** `#F59E0B` (narandžasta)

* **Manji kvar:** `#10B981` (zelena)

* **U toku rešavanja:** `#8B5CF6` (ljubičasta)

### 2.3 Arhitektonski Detalji

**Prozori:**

* 3-4 prozora po spratu na prednjoj strani

* 2 prozora po spratu na bočnoj strani

* Tamno plavi okviri sa staklenim efektom

* Refleksija svetla na staklu

**Ulaz:**

* Glavna vrata na prizemlje (centar)

* Kvačica i okvir vrata

* Stepenice ili rampa

**Krov:**

* Blago nagnuti krov

* Senčenje za dubinu

* Mogući dimnjak ili antena

## 3. Interaktivne Funkcionalnosti

### 3.1 Navigacija po Spratovima

**Hover Efekti:**

* Sprat se osvetljava kada se pređe mišem preko njega

* Tooltip sa informacijama o spratu

* Animacija prelaska (0.3s transition)

**Klik Funkcionalnost:**

* Klik na sprat otvara detaljan prikaz

* Zoom efekat na selektovani sprat

* Bočni panel sa informacijama

**Numeracija:**

* Jasno označeni brojevi spratova

* Pozicionirani u gornjem desnom uglu svakog sprata

* Bela boja sa tamnom senkom za čitljivost

### 3.2 Indikatori Kvarova

**Vizuelni Markeri:**

```
🔴 Kritični kvar (crvena tačka)
🟡 Umeren kvar (žuta tačka)  
🟢 Manji kvar (zelena tačka)
🟣 U rešavanju (ljubičasta tačka)
```

**Pozicioniranje:**

* Markeri se pozicioniraju na odgovarajućem spratu

* Animacija pulsiranja za privlačenje pažnje

* Broj kvarova u maloj oznaci pored markera

**Tooltip Informacije:**

* Tip kvara (vodoinstalacije, elektrika, itd.)

* Datum prijave

* Status rešavanja

* Prioritet

### 3.3 Filtriranje i Pretraga

**Filter Opcije:**

* Po tipu kvara

* Po statusu (novo, u toku, završeno)

* Po prioritetu

* Po datumu prijave

**Pretraga:**

* Pretraga po broju stana

* Pretraga po opisu kvara

* Pretraga po imenu stanara

## 4. Tehnička Implementacija

### 4.1 CSS 3D Transformacije

**Izometrijska Perspektiva:**

```css
.building-container {
  perspective: 1000px;
  transform-style: preserve-3d;
}

.building {
  transform: rotateX(15deg) rotateY(-30deg);
  transform-style: preserve-3d;
}

.floor {
  transform: translateZ(var(--floor-height));
}
```

**Animacije:**

```css
.floor:hover {
  transform: translateZ(var(--floor-height)) scale(1.05);
  transition: all 0.3s ease;
}

.issue-marker {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(1.1); }
}
```

### 4.2 React Komponente

**Struktura Komponenti:**

```
BuildingVisualization/
├── Building3D.tsx          # Glavna 3D zgrada
├── Floor.tsx               # Pojedinačni sprat
├── IssueMarker.tsx         # Marker za kvar
├── FloorTooltip.tsx        # Tooltip informacije
├── IssuePanel.tsx          # Bočni panel sa detaljima
└── BuildingControls.tsx    # Kontrole i filteri
```

**Props Interface:**

```typescript
interface Building3DProps {
  building: Building;
  floors: Floor[];
  issues: Issue[];
  onFloorClick: (floorId: string) => void;
  onIssueClick: (issueId: string) => void;
}

interface IssueMarker {
  id: string;
  floorNumber: number;
  type: 'plumbing' | 'electrical' | 'structural' | 'other';
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'new' | 'in_progress' | 'resolved';
  position: { x: number; y: number };
}
```

### 4.3 Responsive Dizajn

**Breakpoints:**

* **Desktop (>1024px):** Puna 3D vizualizacija

* **Tablet (768-1024px):** Smanjena zgrada, bočni panel ispod

* **Mobile (<768px):** Lista spratova sa mini 3D pregledom

**Adaptivne Dimenzije:**

```css
@media (max-width: 1024px) {
  .building { transform: scale(0.8); }
}

@media (max-width: 768px) {
  .building { transform: scale(0.6); }
  .building-container { flex-direction: column; }
}
```

## 5. Korisničko Iskustvo (UX)

### 5.1 Workflow za Stanare

1. **Pregled zgrade** - Vide svoju zgradu u 3D
2. **Identifikacija sprata** - Lako pronalaze svoj sprat
3. **Prijava kvara** - Klik na sprat → forma za prijavu
4. **Praćenje statusa** - Vide marker svog kvara na zgradi

### 5.2 Workflow za Upravnike

1. **Pregled svih kvarova** - Svi markeri vidljivi odjednom
2. **Filtriranje po prioritetu** - Fokus na kritične kvarove
3. **Upravljanje zadacima** - Dodela majstorima
4. **Praćenje progresa** - Ažuriranje statusa kvarova

### 5.3 Accessibility

**Keyboard Navigation:**

* Tab navigacija kroz spratove

* Enter za selekciju sprata

* Escape za zatvaranje panela

**Screen Reader Support:**

* Alt tekstovi za sve elemente

* ARIA labeli za interaktivne elemente

* Semantički HTML

**Color Blind Support:**

* Kombinacija boja i simbola za kvarove

* Visok kontrast za tekst

* Pattern overlay opcije

## 6. Integracija sa Sistemom

### 6.1 API Endpoints

**Dobijanje Podataka:**

```typescript
GET /api/buildings/{id}/3d-data
Response: {
  building: Building,
  floors: Floor[],
  issues: Issue[],
  statistics: IssueStatistics
}
```

**Real-time Updates:**

```typescript
// WebSocket konekcija za live updates
ws://localhost:5173/buildings/{id}/issues
```

### 6.2 State Management

**Redux Store Structure:**

```typescript
interface BuildingVisualizationState {
  building: Building | null;
  floors: Floor[];
  issues: Issue[];
  selectedFloor: string | null;
  selectedIssue: string | null;
  filters: IssueFilters;
  loading: boolean;
}
```

## 7. Performance Optimizacija

### 7.1 Rendering Optimizacija

* **React.memo** za Floor komponente

* **useMemo** za kalkulacije pozicija

* **useCallback** za event handlere

* **Virtualizacija** za velike zgrade (>20 spratova)

### 7.2 CSS Optimizacija

* **CSS Grid** za layout

* **CSS Custom Properties** za dinamičke vrednosti

* **will-change** za animirane elemente

* **transform3d** za hardware acceleration

## 8. Testiranje

### 8.1 Unit Testovi

* Komponente renderovanje

* Event handling

* State management

* Utility funkcije

### 8.2 Integration Testovi

* API pozivi

* Real-time updates

* Cross-browser kompatibilnost

* Performance testovi

### 8.3 User Testing

* Usability testiranje sa stvarnim korisnicima

* A/B testiranje različitih dizajna

* Accessibility testiranje

* Mobile experience testiranje

## 9. Buduće Mogućnosti

### 9.1 Napredne Funkcionalnosti

* **VR/AR podrška** za immersive experience

* **3D walkthrough** kroz zgradu

* **Heat mapa** kvarova po zonama

* **Predictive maintenance** AI algoritmi

### 9.2 Integracije

* **IoT senzori** za automatsko otkrivanje problema

* **Smart home** integracija

* **Energy monitoring** vizualizacija

* **Security system** integracija

## 10. Zaključak

Ovaj dizajn dokument definiše sveobuhvatan pristup kreiranju moderne 3D vizualizacije zgrade koja će služiti kao centralni alat za upravljanje zgradama. Fokus je na kombinaciji vizuelne privlačnosti, funkcionalnosti i korisnosti za sve tipove korisnika.

**Ključne prednosti:**

* ✅ Realistična 3D reprezentacija zgrade

* ✅ Intuitivno korisničko iskustvo

* ✅ Real-time praćenje kvarova

* ✅ Responsive dizajn za sve uređaje

* ✅ Skalabilnost za različite tipove zgrada

* ✅ Integracija sa postojećim sistemom

