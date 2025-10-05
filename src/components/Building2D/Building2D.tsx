import React, { useState, useMemo } from 'react';
import { Building2DProps, BUILDING_2D_DIMENSIONS, BUILDING_2D_COLORS, ISSUE_2D_COLORS } from '../../types/building2d';

const Building2D: React.FC<Building2DProps> = ({ 
  building, 
  issues = [], 
  onFloorClick, 
  onIssueClick 
}) => {
  const [selectedFloor, setSelectedFloor] = useState<number | null>(null);
  const [hoveredFloor, setHoveredFloor] = useState<number | null>(null);

  // Add null checks for building and building_models
  if (!building) {
    return (
      <div className="building-2d-container">
        <div className="building-title mb-4">
          <h3 className="text-lg font-semibold text-gray-800">
            2D Prikaz objekta
          </h3>
          <p className="text-sm text-gray-600">
            Učitavanje...
          </p>
        </div>
        <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
          <div className="text-gray-500">Učitavanje 2D prikaza...</div>
        </div>
      </div>
    );
  }

  const floorsCount = useMemo(() => {
    return building?.building_models?.[0]?.floors_count || 3;
  }, [building?.building_models]);

  const garageCount = useMemo(() => {
    return building?.garage_levels || 0;
  }, [building?.garage_levels]);

  const handleFloorClick = (floorNumber: number) => {
    setSelectedFloor(floorNumber === selectedFloor ? null : floorNumber);
    onFloorClick?.(floorNumber);
  };

  const handleIssueClick = (issueId: string) => {
    onIssueClick?.(issueId);
  };

  const getFloorColor = (floorNumber: number) => {
    if (floorNumber < 0) return BUILDING_2D_COLORS.garage; // Garaže/podrumi (ispod 0)
    if (floorNumber === 0) return BUILDING_2D_COLORS.groundFloor; // Prizemlje
    return BUILDING_2D_COLORS.regularFloor; // Ostali spratovi
  };

  const getFloorStroke = (floorNumber: number) => {
    if (floorNumber === 0) return BUILDING_2D_COLORS.groundFloorBorder;
    return BUILDING_2D_COLORS.regularFloorBorder;
  };

  const getFloorY = (floorIndex: number, totalFloors: number) => {
    // Floors are rendered from top to bottom
    // Ensure we have enough space for all floors with proper spacing
    const maxHeight = BUILDING_2D_DIMENSIONS.height - BUILDING_2D_DIMENSIONS.groundHeight - 40; // Leave space for ground and margins
    const minFloorHeight = 45; // Minimum height to prevent overlapping
    const actualFloorHeight = Math.max(minFloorHeight, Math.min(BUILDING_2D_DIMENSIONS.floorHeight, maxHeight / totalFloors));
    
    return 20 + floorIndex * actualFloorHeight;
  };

  const renderFloor = (floorNumber: number, floorIndex: number, totalFloors: number) => {
    const y = getFloorY(floorIndex, totalFloors);
    const floorIssues = issues.filter(issue => issue.floor_number === floorNumber);
    const isHovered = hoveredFloor === floorNumber;
    const isSelected = selectedFloor === floorNumber;
    
    return (
      <g key={floorNumber} className="floor">
        {/* Floor rectangle */}
        <rect
          x="50"
          y={y}
          width="300"
          height={Math.max(40, Math.min(BUILDING_2D_DIMENSIONS.floorHeight - 5, (BUILDING_2D_DIMENSIONS.height - BUILDING_2D_DIMENSIONS.groundHeight - 40) / totalFloors - 5))}
          fill={isHovered ? BUILDING_2D_COLORS.hoverFill : getFloorColor(floorNumber)}
          stroke={isHovered ? BUILDING_2D_COLORS.hoverStroke : getFloorStroke(floorNumber)}
          strokeWidth="2"
          rx="4"
          style={{
            cursor: 'pointer',
            transition: 'all 150ms ease',
            transform: isHovered ? 'translate(0, -2px)' : 'translate(0, 0)',
            filter: isSelected ? 'brightness(1.1)' : 'none'
          }}
          onMouseEnter={() => setHoveredFloor(floorNumber)}
          onMouseLeave={() => setHoveredFloor(null)}
          onClick={() => handleFloorClick(floorNumber)}
        />
        
        {/* Floor label */}
        <text
          x="66"
          y={y + Math.max(40, Math.min(BUILDING_2D_DIMENSIONS.floorHeight - 5, (BUILDING_2D_DIMENSIONS.height - BUILDING_2D_DIMENSIONS.groundHeight - 40) / totalFloors - 5)) / 2 + 5}
          fill={floorNumber < 0 ? "#9CA3AF" : "#374151"}
          fontSize="14"
          fontWeight="bold"
          textAnchor="start"
          dominantBaseline="middle"
          style={{ pointerEvents: 'none' }}
        >
          {floorNumber < 0 ? `Podrum ${Math.abs(floorNumber)}` : 
           floorNumber === 0 ? 'Prizemlje' : 
           `${floorNumber}. sprat`}
        </text>

        {/* Windows */}
        {floorNumber > 0 && (
          <>
            <rect
              x="130"
              y={y + 10}
              width={BUILDING_2D_DIMENSIONS.windowWidth}
              height={BUILDING_2D_DIMENSIONS.windowHeight}
              rx="3"
              fill={BUILDING_2D_COLORS.windows}
              stroke={BUILDING_2D_COLORS.windowsBorder}
            />
            <rect
              x="210"
              y={y + 10}
              width={BUILDING_2D_DIMENSIONS.windowWidth}
              height={BUILDING_2D_DIMENSIONS.windowHeight}
              rx="3"
              fill={BUILDING_2D_COLORS.windows}
              stroke={BUILDING_2D_COLORS.windowsBorder}
            />
            <rect
              x="290"
              y={y + 10}
              width={BUILDING_2D_DIMENSIONS.windowWidth}
              height={BUILDING_2D_DIMENSIONS.windowHeight}
              rx="3"
              fill={BUILDING_2D_COLORS.windows}
              stroke={BUILDING_2D_COLORS.windowsBorder}
            />
          </>
        )}

        {/* Door for ground floor */}
        {floorNumber === 0 && (
          <rect
            x="180"
            y={y + BUILDING_2D_DIMENSIONS.floorHeight - BUILDING_2D_DIMENSIONS.doorHeight - 2}
            width={BUILDING_2D_DIMENSIONS.doorWidth}
            height={BUILDING_2D_DIMENSIONS.doorHeight}
            fill={BUILDING_2D_COLORS.door}
            stroke="#654321"
            strokeWidth="2"
            rx="4"
          />
        )}

        {/* Issue markers */}
        {floorIssues.map((issue, index) => (
          <g key={issue.id}>
            <circle
              cx={320 + (index * 15)}
              cy={y + 15}
              r="6"
              fill={ISSUE_2D_COLORS[issue.priority]}
              stroke="#ffffff"
              strokeWidth="2"
              style={{ cursor: 'pointer' }}
              onClick={(e) => {
                e.stopPropagation();
                handleIssueClick(issue.id);
              }}
            />
            <text
              x={320 + (index * 15)}
              y={y + 19}
              fill="#ffffff"
              fontSize="10"
              fontWeight="bold"
              textAnchor="middle"
              style={{ pointerEvents: 'none' }}
            >
              !
            </text>
          </g>
        ))}
      </g>
    );
  };

  // Create array of floor numbers (including garage levels, basement, ground floor, and upper floors)
  const floorNumbers = [];
  
  // Add all basement/garage levels (negative numbers starting from -1)
  for (let i = 1; i <= garageCount; i++) {
    floorNumbers.push(-i); // -1, -2, -3, etc.
  }
  
  // Add ground floor (0)
  floorNumbers.push(0);
  
  // Add upper floors (1, 2, 3, etc.)
  for (let i = 1; i <= floorsCount; i++) {
    floorNumbers.push(i);
  }

  return (
    <div className="building-2d-container">
      {/* Building Title */}
      <div className="building-title mb-4">
        <h3 className="text-lg font-semibold text-gray-800">
          2D Prikaz objekta
        </h3>
        <p className="text-sm text-gray-600">
          Objekat sa {floorsCount} spratova{garageCount > 0 ? ` i ${garageCount} podrumskih nivoa` : ''}
        </p>
      </div>

      {/* 2D Building Visualization */}
      <div className="building-2d-wrapper bg-gradient-to-b from-blue-50 to-blue-100 rounded-lg p-6">
        <svg
          viewBox={`0 0 ${BUILDING_2D_DIMENSIONS.width} ${BUILDING_2D_DIMENSIONS.height}`}
          className="w-full h-auto max-w-md mx-auto"
          style={{ maxHeight: '500px' }}
        >
          {/* Render floors from top to bottom */}
          {[...floorNumbers].reverse().map((floorNumber, index) => 
            renderFloor(floorNumber, index, floorNumbers.length)
          )}
          
          {/* Ground marker */}
          <rect
            x="0"
            y={BUILDING_2D_DIMENSIONS.height - BUILDING_2D_DIMENSIONS.groundHeight}
            width={BUILDING_2D_DIMENSIONS.width}
            height={BUILDING_2D_DIMENSIONS.groundHeight}
            fill={BUILDING_2D_COLORS.ground}
          />
        </svg>

        {/* Legend */}
        <div className="legend mt-4 flex flex-wrap gap-4 justify-center text-sm">
          {garageCount > 0 && (
            <div className="flex items-center gap-2">
              <div 
                className="w-4 h-4 rounded" 
                style={{ backgroundColor: BUILDING_2D_COLORS.garage }}
              />
              <span className="text-gray-600">Podrumi</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <div 
              className="w-4 h-4 rounded border" 
              style={{ 
                backgroundColor: BUILDING_2D_COLORS.groundFloor,
                borderColor: BUILDING_2D_COLORS.groundFloorBorder
              }}
            />
            <span className="text-gray-600">Prizemlje</span>
          </div>
          <div className="flex items-center gap-2">
            <div 
              className="w-4 h-4 rounded border" 
              style={{ 
                backgroundColor: BUILDING_2D_COLORS.regularFloor,
                borderColor: BUILDING_2D_COLORS.regularFloorBorder
              }}
            />
            <span className="text-gray-600">Spratovi</span>
          </div>
        </div>

        {/* Issue legend */}
        {issues.length > 0 && (
          <div className="issue-legend mt-4 flex flex-wrap gap-3 justify-center text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ISSUE_2D_COLORS.critical }} />
              <span className="text-gray-600">Kritično</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ISSUE_2D_COLORS.high }} />
              <span className="text-gray-600">Visoko</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ISSUE_2D_COLORS.medium }} />
              <span className="text-gray-600">Srednje</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ISSUE_2D_COLORS.low }} />
              <span className="text-gray-600">Nisko</span>
            </div>
          </div>
        )}

        {/* Building statistics */}
        <div className="building-stats mt-4 text-center">
          <div className="bg-white/80 rounded-lg p-3 inline-block">
            <div className="text-xs text-gray-600">
              Spratova: {floorsCount} {garageCount > 0 && `| Garaža: ${garageCount}`} | Problema: {issues.length}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Building2D;