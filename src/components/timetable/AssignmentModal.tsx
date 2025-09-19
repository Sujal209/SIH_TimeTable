import React, { useState, useEffect, useMemo } from 'react';
import { X, AlertTriangle, Clock, Calendar, User, MapPin, Book, MessageSquare } from 'lucide-react';
import { Subject, Teacher, Classroom, TimeSlot, DAY_NAMES } from '../../types';

interface AssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    subjectId: string;
    teacherId: string;
    classroomId: string;
    notes?: string;
  }) => void;
  subjects: Subject[];
  teachers: Teacher[];
  classrooms: Classroom[];
  timeSlot?: TimeSlot;
  dayOfWeek: number;
  conflictInfo?: {
    teacherConflict: boolean;
    classroomConflict: boolean;
  } | null;
  defaultSubject?: Subject | null;
}

export function AssignmentModal({
  isOpen,
  onClose,
  onSubmit,
  subjects,
  teachers,
  classrooms,
  timeSlot,
  dayOfWeek,
  conflictInfo,
  defaultSubject
}: AssignmentModalProps) {
  const [formData, setFormData] = useState({
    subjectId: defaultSubject?.id || '',
    teacherId: defaultSubject?.teacher_id || '',
    classroomId: '',
    notes: ''
  });

  // Reset form when modal opens/closes or defaultSubject changes
  useEffect(() => {
    if (isOpen) {
      setFormData({
        subjectId: defaultSubject?.id || '',
        teacherId: defaultSubject?.teacher_id || '',
        classroomId: '',
        notes: ''
      });
    }
  }, [isOpen, defaultSubject]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.subjectId || !formData.teacherId || !formData.classroomId) {
      return;
    }
    onSubmit(formData);
  };

  const formatTime = (time: string) => {
    return new Date(`1970-01-01T${time}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  // Get filtered teachers and classrooms based on selected subject
  const selectedSubject = subjects.find(s => s.id === formData.subjectId);
  
  // Filter classrooms based on subject requirements:
  // - If subject has only lab hours (no theory hours), show only lab rooms
  // - If subject has only theory hours (no lab hours), show lecture and seminar rooms
  // - If subject has both theory and lab hours, show all appropriate rooms
  const availableClassrooms = useMemo(() => {
    if (!selectedSubject) return classrooms;
    
    const hasTheoryHours = selectedSubject.hours_per_week > 0;
    const hasLabHours = selectedSubject.lab_hours_per_week > 0;
    
    if (hasTheoryHours && hasLabHours) {
      // Subject has both theory and lab sessions - show all room types
      return classrooms;
    } else if (hasLabHours && !hasTheoryHours) {
      // Subject has only lab sessions - show only lab rooms
      return classrooms.filter(c => c.type === 'lab');
    } else {
      // Subject has only theory sessions - show lecture and seminar rooms
      return classrooms.filter(c => c.type === 'lecture' || c.type === 'seminar');
    }
  }, [selectedSubject, classrooms]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 transition-opacity" 
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-gray-500 dark:bg-gray-900 opacity-75"></div>
        </div>

        {/* Modal */}
        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Create Assignment
              </h3>
              <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center space-x-1">
                  <Calendar className="h-4 w-4" />
                  <span>{DAY_NAMES[dayOfWeek]}</span>
                </div>
                {timeSlot && (
                  <div className="flex items-center space-x-1">
                    <Clock className="h-4 w-4" />
                    <span>{formatTime(timeSlot.start_time)} - {formatTime(timeSlot.end_time)}</span>
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Conflict Warning */}
          {conflictInfo && (conflictInfo.teacherConflict || conflictInfo.classroomConflict) && (
            <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-md">
              <div className="flex items-start">
                <AlertTriangle className="h-5 w-5 text-yellow-400 mt-0.5 mr-2 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    Scheduling Conflicts Detected
                  </h4>
                  <div className="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
                    {conflictInfo.teacherConflict && (
                      <p>• Teacher is already assigned to another class at this time</p>
                    )}
                    {conflictInfo.classroomConflict && (
                      <p>• Classroom is already occupied at this time</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Subject Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                <Book className="inline h-4 w-4 mr-1" />
                Subject
              </label>
              <select
                required
                value={formData.subjectId}
                onChange={(e) => {
                  const subjectId = e.target.value;
                  const subject = subjects.find(s => s.id === subjectId);
                  setFormData({
                    ...formData,
                    subjectId,
                    teacherId: subject?.teacher_id || ''
                  });
                }}
                className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="">Select a subject</option>
                {subjects.map(subject => (
                  <option key={subject.id} value={subject.id}>
                    {subject.code} - {subject.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Teacher Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                <User className="inline h-4 w-4 mr-1" />
                Teacher
              </label>
              <select
                required
                value={formData.teacherId}
                onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })}
                className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="">Select a teacher</option>
                {teachers.map(teacher => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.name} - {teacher.department}
                  </option>
                ))}
              </select>
            </div>

            {/* Classroom Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                <MapPin className="inline h-4 w-4 mr-1" />
                Classroom
                {selectedSubject && (() => {
                  const hasTheoryHours = selectedSubject.hours_per_week > 0;
                  const hasLabHours = selectedSubject.lab_hours_per_week > 0;
                  
                  if (hasLabHours && !hasTheoryHours) {
                    return (
                      <span className="text-xs text-purple-600 dark:text-purple-400 ml-1">
                        (Lab rooms only)
                      </span>
                    );
                  } else if (hasTheoryHours && !hasLabHours) {
                    return (
                      <span className="text-xs text-blue-600 dark:text-blue-400 ml-1">
                        (Lecture/Seminar rooms)
                      </span>
                    );
                  } else if (hasTheoryHours && hasLabHours) {
                    return (
                      <span className="text-xs text-green-600 dark:text-green-400 ml-1">
                        (All room types available)
                      </span>
                    );
                  }
                  return null;
                })()}
              </label>
              <select
                required
                value={formData.classroomId}
                onChange={(e) => setFormData({ ...formData, classroomId: e.target.value })}
                className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="">Select a classroom</option>
                {availableClassrooms.map(classroom => (
                  <option key={classroom.id} value={classroom.id}>
                    {classroom.name} - {classroom.type} (Cap: {classroom.capacity})
                  </option>
                ))}
              </select>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                <MessageSquare className="inline h-4 w-4 mr-1" />
                Notes (Optional)
              </label>
              <textarea
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Add any additional notes or special instructions..."
                className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>

            {/* Subject Info */}
            {selectedSubject && (
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Subject Information
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-300">
                  <div>Department: {selectedSubject.department}</div>
                  <div>Semester: {selectedSubject.semester}</div>
                  <div>Hours/Week: {selectedSubject.hours_per_week}</div>
                  <div>Lab Hours: {selectedSubject.lab_hours_per_week}</div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!formData.subjectId || !formData.teacherId || !formData.classroomId}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Assignment
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}