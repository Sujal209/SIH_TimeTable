import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Clock, MapPin, User, Trash2, Edit } from 'lucide-react';
import { TimetableView, TimeSlot, DAY_NAMES } from '../../types';

interface TimetableGridProps {
  assignments: TimetableView[];
  timeSlots: TimeSlot[];
  onAssignmentClick: (assignment: TimetableView) => void;
  onAssignmentDelete: (assignmentId: string) => void;
  onSlotClick: (timeSlotId: string, dayOfWeek: number) => void;
}

interface TimeSlotCellProps {
  timeSlot: TimeSlot;
  dayOfWeek: number;
  assignment?: TimetableView;
  onAssignmentClick: (assignment: TimetableView) => void;
  onAssignmentDelete: (assignmentId: string) => void;
  onSlotClick: (timeSlotId: string, dayOfWeek: number) => void;
}

function TimeSlotCell({ 
  timeSlot, 
  dayOfWeek, 
  assignment, 
  onAssignmentClick, 
  onAssignmentDelete,
  onSlotClick 
}: TimeSlotCellProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `slot-${timeSlot.id}-${dayOfWeek}`,
    data: {
      type: 'time-slot',
      timeSlotId: timeSlot.id,
      dayOfWeek,
    },
  });

  const handleSlotClick = () => {
    if (!assignment) {
      onSlotClick(timeSlot.id, dayOfWeek);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (assignment) {
      onAssignmentDelete(assignment.id);
    }
  };

  if (timeSlot.is_break_period) {
    return (
      <div 
        ref={setNodeRef}
        className="h-16 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 flex items-center justify-center"
      >
        <span className="text-xs text-gray-500 dark:text-gray-400">Break</span>
      </div>
    );
  }

  return (
    <div 
      ref={setNodeRef}
      onClick={handleSlotClick}
      className={`
        h-16 border border-gray-200 dark:border-gray-600 relative group cursor-pointer
        transition-colors duration-200
        ${isOver ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-500' : ''}
        ${assignment ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'}
      `}
    >
      {assignment ? (
        <div 
          className="h-full p-2 rounded"
          style={{ 
            backgroundColor: assignment.subject_color || '#3B82F6',
            opacity: 0.9 
          }}
          onClick={(e) => {
            e.stopPropagation();
            onAssignmentClick(assignment);
          }}
        >
          <div className="text-white text-xs font-medium truncate">
            {assignment.subject_code}
          </div>
          <div className="text-white text-xs opacity-90 truncate">
            {assignment.subject_name}
          </div>
          <div className="flex items-center justify-between mt-1">
            <div className="flex items-center space-x-1 text-white text-xs opacity-80">
              <User className="h-3 w-3" />
              <span className="truncate">{assignment.teacher_name.split(' ')[0]}</span>
            </div>
            <div className="flex items-center space-x-1 text-white text-xs opacity-80">
              <MapPin className="h-3 w-3" />
              <span>{assignment.classroom_name}</span>
            </div>
          </div>
          
          {/* Action buttons (visible on hover) */}
          <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button
              onClick={handleDeleteClick}
              className="p-1 rounded bg-red-500 hover:bg-red-600 text-white"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        </div>
      ) : (
        <div className="h-full flex items-center justify-center">
          <div className="text-gray-400 dark:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <Clock className="h-4 w-4" />
          </div>
        </div>
      )}
    </div>
  );
}

export function TimetableGrid({ 
  assignments, 
  timeSlots, 
  onAssignmentClick, 
  onAssignmentDelete,
  onSlotClick 
}: TimetableGridProps) {
  // Filter out break periods and sort time slots
  const classTimeSlots = timeSlots
    .filter(slot => !slot.is_break_period)
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

  // Working days (Monday to Saturday)
  const workingDays = [1, 2, 3, 4, 5, 6];

  // Create a map for quick assignment lookup
  const assignmentMap = new Map<string, TimetableView>();
  assignments.forEach(assignment => {
    const key = `${assignment.time_slot_id}-${assignment.day_of_week}`;
    assignmentMap.set(key, assignment);
  });

  const formatTime = (time: string) => {
    return new Date(`1970-01-01T${time}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="overflow-x-auto">
      <div className="min-w-full">
        {/* Header */}
        <div className="grid grid-cols-8 gap-px bg-gray-200 dark:bg-gray-600">
          <div className="bg-gray-100 dark:bg-gray-700 p-3 text-center">
            <span className="text-sm font-medium text-gray-900 dark:text-white">Time</span>
          </div>
          {workingDays.map(dayIndex => (
            <div key={dayIndex} className="bg-gray-100 dark:bg-gray-700 p-3 text-center">
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {DAY_NAMES[dayIndex]}
              </span>
            </div>
          ))}
        </div>

        {/* Time slots */}
        <div className="bg-gray-200 dark:bg-gray-600">
          {classTimeSlots.map(timeSlot => (
            <div key={timeSlot.id} className="grid grid-cols-8 gap-px">
              {/* Time column */}
              <div className="bg-gray-50 dark:bg-gray-700 p-3 text-center border-r border-gray-200 dark:border-gray-600">
                <div className="text-xs text-gray-600 dark:text-gray-300">
                  {formatTime(timeSlot.start_time)}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {formatTime(timeSlot.end_time)}
                </div>
                <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  {timeSlot.duration_minutes}min
                </div>
              </div>

              {/* Day columns */}
              {workingDays.map(dayOfWeek => {
                const key = `${timeSlot.id}-${dayOfWeek}`;
                const assignment = assignmentMap.get(key);
                
                return (
                  <TimeSlotCell
                    key={key}
                    timeSlot={timeSlot}
                    dayOfWeek={dayOfWeek}
                    assignment={assignment}
                    onAssignmentClick={onAssignmentClick}
                    onAssignmentDelete={onAssignmentDelete}
                    onSlotClick={onSlotClick}
                  />
                );
              })}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
            Instructions
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-300">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              <span>Drag subjects from sidebar to schedule</span>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="h-3 w-3" />
              <span>Click empty slots to manually add assignments</span>
            </div>
            <div className="flex items-center space-x-2">
              <Trash2 className="h-3 w-3" />
              <span>Hover over assignments to delete</span>
            </div>
            <div className="flex items-center space-x-2">
              <Edit className="h-3 w-3" />
              <span>Click assignments to edit details</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface TimeSlotCellProps {
  id: string;
  entries: TimetableEntry[];
  timeSlot: TimeSlot;
  day: DayOfWeek;
  readOnly: boolean;
  onEntryClick?: (entry: TimetableEntry) => void;
}

const TimeSlotCell: React.FC<TimeSlotCellProps> = ({
  id,
  entries,
  timeSlot,
  day,
  readOnly,
  onEntryClick
}) => {
  const {
    setNodeRef,
    isOver,
  } = useSortable({
    id,
    disabled: readOnly,
  });

  return (
    <div
      ref={setNodeRef}
      className={`
        min-h-[80px] p-2 border-r border-gray-200 dark:border-gray-700 last:border-r-0
        transition-colors duration-200
        ${isOver ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-white dark:bg-gray-900'}
        ${!readOnly ? 'cursor-pointer' : ''}
      `}
    >
      <div className="space-y-1">
        {entries.map(entry => (
          <TimetableEntryCard
            key={entry.id}
            entry={entry}
            readOnly={readOnly}
            onClick={() => onEntryClick?.(entry)}
          />
        ))}
      </div>
    </div>
  );
};

interface TimetableEntryCardProps {
  entry: TimetableEntry;
  isDragging?: boolean;
  readOnly?: boolean;
  onClick?: () => void;
}

const TimetableEntryCard: React.FC<TimetableEntryCardProps> = ({
  entry,
  isDragging = false,
  readOnly = false,
  onClick
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({
    id: entry.id,
    disabled: readOnly,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const getEntryColor = (entry: TimetableEntry) => {
    if (entry.is_lab) {
      return 'bg-purple-100 border-purple-300 text-purple-900 dark:bg-purple-900/30 dark:border-purple-600 dark:text-purple-200';
    }
    
    // Color based on subject department
    const colorMap: Record<string, string> = {
      'Computer Science': 'bg-blue-100 border-blue-300 text-blue-900 dark:bg-blue-900/30 dark:border-blue-600 dark:text-blue-200',
      'Mathematics': 'bg-green-100 border-green-300 text-green-900 dark:bg-green-900/30 dark:border-green-600 dark:text-green-200',
      'Physics': 'bg-yellow-100 border-yellow-300 text-yellow-900 dark:bg-yellow-900/30 dark:border-yellow-600 dark:text-yellow-200',
      'Chemistry': 'bg-red-100 border-red-300 text-red-900 dark:bg-red-900/30 dark:border-red-600 dark:text-red-200',
      'English': 'bg-indigo-100 border-indigo-300 text-indigo-900 dark:bg-indigo-900/30 dark:border-indigo-600 dark:text-indigo-200',
    };
    
    return colorMap[entry.subject?.department || ''] || 'bg-gray-100 border-gray-300 text-gray-900 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200';
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`
        relative p-2 rounded border text-xs cursor-pointer transition-all duration-200 hover:shadow-md
        ${getEntryColor(entry)}
        ${isDragging ? 'shadow-lg rotate-3 scale-105' : ''}
        ${readOnly ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'}
      `}
    >
      <div className="flex items-start justify-between mb-1">
        <div className="font-medium truncate flex-1">
          {entry.subject?.code || entry.subject?.name}
        </div>
        {entry.is_lab && (
          <span className="ml-1 px-1 py-0.5 bg-purple-200 dark:bg-purple-700 text-purple-800 dark:text-purple-200 text-xs rounded">
            LAB
          </span>
        )}
      </div>
      
      <div className="space-y-1 text-xs opacity-80">
        <div className="flex items-center truncate">
          <Users className="w-3 h-3 mr-1 flex-shrink-0" />
          <span className="truncate">{entry.teacher?.name}</span>
        </div>
        
        <div className="flex items-center truncate">
          <MapPin className="w-3 h-3 mr-1 flex-shrink-0" />
          <span className="truncate">{entry.classroom?.name}</span>
        </div>
      </div>

      {entry.consecutive_slots && entry.consecutive_slots > 1 && (
        <div className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
          {entry.consecutive_slots}
        </div>
      )}
    </div>
  );
};

export default TimetableGrid;