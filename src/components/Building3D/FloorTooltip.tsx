import React from 'react';
import { FloorTooltipProps } from '../../types/building3d';

const FloorTooltip: React.FC<FloorTooltipProps> = ({ 
  floorNumber, 
  issues, 
  visible, 
  position 
}) => {
  if (!visible) return null;

  const criticalIssues = issues.filter(i => i.priority === 'critical').length;
  const highIssues = issues.filter(i => i.priority === 'high').length;
  const totalIssues = issues.length;

  return (
    <div
      className="floor-tooltip"
      style={{
        position: 'fixed',
        left: position.x + 10,
        top: position.y - 10,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        color: 'white',
        padding: '8px 12px',
        borderRadius: '6px',
        fontSize: '14px',
        zIndex: 1000,
        pointerEvents: 'none',
        whiteSpace: 'nowrap',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
      }}
    >
      <div className="font-semibold">
        {floorNumber === 0 ? 'Prizemlje' : `${floorNumber}. sprat`}
      </div>
      {totalIssues > 0 ? (
        <div className="text-sm mt-1">
          <div>Ukupno kvarova: {totalIssues}</div>
          {criticalIssues > 0 && (
            <div className="text-red-400">Kritični: {criticalIssues}</div>
          )}
          {highIssues > 0 && (
            <div className="text-orange-400">Visoki: {highIssues}</div>
          )}
        </div>
      ) : (
        <div className="text-sm text-green-400 mt-1">Nema kvarova</div>
      )}
    </div>
  );
};

export default FloorTooltip;