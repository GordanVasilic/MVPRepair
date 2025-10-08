export interface Building2DProps {
  building: {
    id: string;
    name: string;
    address: string;
    garage_levels?: number;
    building_models?: {
      floors_count: number;
      model_config: any;
    }[];
  };
  issues?: Issue2D[];
  onFloorClick?: (floorNumber: number) => void;
  onIssueClick?: (issueId: string) => void;
}

export interface Issue2D {
  id: string;
  title: string;
  description: string;
  status: 'new' | 'in_progress' | 'resolved';
  priority: 'low' | 'medium' | 'high' | 'critical';
  type: 'plumbing' | 'electrical' | 'structural' | 'heating' | 'other';
  category?: string;
  floor_number: number;
  apartment_number?: string;
  created_at: string;
  position?: { x: number; y: number };
}

export interface Floor2DProps {
  floorNumber: number;
  totalFloors: number;
  issues: Issue2D[];
  isSelected?: boolean;
  onFloorClick?: (floorNumber: number) => void;
  onIssueClick?: (issueId: string) => void;
  isBasement?: boolean;
  isGroundFloor?: boolean;
  isGarage?: boolean;
}

export interface IssueMarker2DProps {
  issue: Issue2D;
  onClick?: (issueId: string) => void;
  x: number;
  y: number;
}

export interface FloorTooltip2DProps {
  floorNumber: number;
  issues: Issue2D[];
  visible: boolean;
  position: { x: number; y: number };
}

export const BUILDING_2D_COLORS = {
  basement: '#0f172a',
  garage: '#1e293b',
  groundFloor: '#fffbeb',
  groundFloorBorder: '#fef3c7',
  regularFloor: '#ffffff',
  regularFloorBorder: '#e6e9ef',
  hoverFill: '#f0f9ff',
  hoverStroke: '#bfdbfe',
  windows: '#f8fafc',
  windowsBorder: '#e6eef8',
  door: '#8b4513',
  ground: '#d1d5db'
} as const;

export const ISSUE_2D_COLORS = {
  critical: '#ef4444',
  high: '#f59e0b',
  medium: '#eab308',
  low: '#6b7280',
  in_progress: '#8b5cf6',
  resolved: '#10b981'
} as const;

export const BUILDING_2D_DIMENSIONS = {
  width: 400,
  height: 428,
  floorHeight: 60,
  windowWidth: 34,
  windowHeight: 20,
  doorWidth: 40,
  doorHeight: 30,
  groundHeight: 8
} as const;