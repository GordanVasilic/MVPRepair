import React from 'react';
import { IssueMarkerProps, ISSUE_COLORS } from '../../types/building3d';

const IssueMarker: React.FC<IssueMarkerProps> = ({ issue, onClick }) => {
  const getMarkerColor = () => {
    if (issue.status === 'resolved') return ISSUE_COLORS.resolved;
    if (issue.status === 'in_progress') return ISSUE_COLORS.in_progress;
    
    switch (issue.priority) {
      case 'critical': return ISSUE_COLORS.critical;
      case 'high': return ISSUE_COLORS.high;
      case 'medium': return ISSUE_COLORS.medium;
      case 'low': return ISSUE_COLORS.low;
      default: return ISSUE_COLORS.medium;
    }
  };

  const getMarkerIcon = () => {
    switch (issue.type) {
      case 'plumbing': return '🚰';
      case 'electrical': return '⚡';
      case 'heating': return '🔥';
      case 'structural': return '🏗️';
      default: return '⚠️';
    }
  };

  return (
    <div
      className="issue-marker"
      onClick={() => onClick?.(issue.id)}
      style={{
        position: 'absolute',
        right: '8px',
        top: '8px',
        width: '24px',
        height: '24px',
        borderRadius: '50%',
        backgroundColor: getMarkerColor(),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '12px',
        cursor: 'pointer',
        zIndex: 10,
        boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
        animation: issue.status === 'new' ? 'pulse 2s infinite' : 'none',
        border: '2px solid white'
      }}
      title={`${issue.title} - ${issue.priority} priority`}
    >
      {getMarkerIcon()}
    </div>
  );
};

export default IssueMarker;