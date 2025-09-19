import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Book, Clock, Users } from 'lucide-react';
import { Subject } from '../../types';

interface SubjectCardProps {
  subject: Subject;
  isDragging?: boolean;
}

export function SubjectCard({ subject, isDragging = false }: SubjectCardProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: subject.id,
  });

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
  };

  // Generate a color based on department
  const getDepartmentColor = (department: string): string => {
    const colors: Record<string, string> = {
      'Computer Science': 'bg-blue-100 border-blue-300 text-blue-800 dark:bg-blue-900/30 dark:border-blue-600 dark:text-blue-200',
      'Mathematics': 'bg-green-100 border-green-300 text-green-800 dark:bg-green-900/30 dark:border-green-600 dark:text-green-200',
      'Physics': 'bg-yellow-100 border-yellow-300 text-yellow-800 dark:bg-yellow-900/30 dark:border-yellow-600 dark:text-yellow-200',
      'Chemistry': 'bg-red-100 border-red-300 text-red-800 dark:bg-red-900/30 dark:border-red-600 dark:text-red-200',
      'English': 'bg-indigo-100 border-indigo-300 text-indigo-800 dark:bg-indigo-900/30 dark:border-indigo-600 dark:text-indigo-200',
      'Biology': 'bg-emerald-100 border-emerald-300 text-emerald-800 dark:bg-emerald-900/30 dark:border-emerald-600 dark:text-emerald-200',
      'History': 'bg-amber-100 border-amber-300 text-amber-800 dark:bg-amber-900/30 dark:border-amber-600 dark:text-amber-200',
      'Geography': 'bg-teal-100 border-teal-300 text-teal-800 dark:bg-teal-900/30 dark:border-teal-600 dark:text-teal-200',
    };
    
    return colors[department] || 'bg-gray-100 border-gray-300 text-gray-800 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200';
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`
        p-3 rounded-lg border cursor-grab active:cursor-grabbing
        transition-all duration-200 hover:shadow-md
        ${getDepartmentColor(subject.department)}
        ${isDragging ? 'shadow-lg opacity-50 rotate-2 scale-105' : 'hover:scale-102'}
      `}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium truncate">
            {subject.code}
          </h4>
          <p className="text-xs opacity-80 truncate">
            {subject.name}
          </p>
        </div>
        <div className="ml-2 flex-shrink-0">
          <Book className="h-3 w-3 opacity-60" />
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex items-center text-xs opacity-70">
          <Clock className="h-3 w-3 mr-1 flex-shrink-0" />
          <span className="truncate">
            {subject.hours_per_week}h/week
            {subject.lab_hours_per_week > 0 && ` + ${subject.lab_hours_per_week}h lab`}
          </span>
        </div>

        {subject.teacher && (
          <div className="flex items-center text-xs opacity-70">
            <Users className="h-3 w-3 mr-1 flex-shrink-0" />
            <span className="truncate">{subject.teacher.name}</span>
          </div>
        )}
      </div>

      <div className="mt-2 pt-2 border-t border-current opacity-30">
        <div className="text-xs opacity-60">
          {subject.department} • Sem {subject.semester}
        </div>
      </div>
    </div>
  );
}