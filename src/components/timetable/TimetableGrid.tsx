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