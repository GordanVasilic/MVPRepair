export interface Building3DProps {
  building: {
    id: string;
    name: string;
    address: string;
    building_models?: {
      floors_count: number;
      model_config: any;
    }[];
  };
  issues?: Issue3D[];
  onFloorClick?: (floorNumber: number) => void;
  onIssueClick?: (issueId: string) => void;
}

export interface Issue3D {
  id: string;
  title: string;
  description: string;
  status: 'new' | 'in_progress' | 'resolved';
  priority: 'low' | 'medium' | 'high' | 'critical';
  type: 'plumbing' | 'electrical' | 'structural' | 'heating' | 'other';
  floor_number: number;
  apartment_number?: string;
  created_at: string;
  position?: { x: number; y: number };
}

export interface FloorProps {
  floorNumber: number;
  totalFloors: number;
  issues: Issue3D[];
  isSelected?: boolean;
  onFloorClick?: (floorNumber: number) => void;
  onIssueClick?: (issueId: string) => void;
}

export interface IssueMarkerProps {
  issue: Issue3D;
  onClick?: (issueId: string) => void;
}

export interface FloorTooltipProps {
  floorNumber: number;
  issues: Issue3D[];
  visible: boolean;
  position: { x: number; y: number };
}

export interface BuildingDimensions {
  width: number;
  depth: number;
  floorHeight: number;
}

export const BUILDING_COLORS = {
  walls: '#E5E7EB',
  frames: '#6B7280', 
  roof: '#374151',
  windows: '#1E40AF',
  shadows: 'rgba(0,0,0,0.2)',
  door: '#8B4513'
} as const;

export const ISSUE_COLORS = {
  critical: '#EF4444',
  high: '#F59E0B',
  medium: '#10B981',
  low: '#6B7280',
  in_progress: '#8B5CF6',
  resolved: '#10B981'
} as const;

export const DEFAULT_DIMENSIONS: BuildingDimensions = {
  width: 200,
  depth: 120,
  floorHeight: 60
};