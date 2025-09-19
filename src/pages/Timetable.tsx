import React, { useState, useEffect } from 'react';
import { 
  DndContext, 
  DragEndEvent, 
  DragOverlay, 
  DragStartEvent,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import { 
  Calendar, 
  Plus, 
  Users, 
  MapPin, 
  Clock, 
  AlertTriangle,
  Filter,
  Download,
  RefreshCw
} from 'lucide-react';
import { TimetableService } from '../lib/services/timetableService';
import { TeachersService } from '../lib/services/teachersService';
import { SubjectsService } from '../lib/services/subjectsService';
import { ClassroomsService } from '../lib/services/classroomsService';
import { TimeSlotsService } from '../lib/services/timeSlotsService';
import { 
  TimetableView, 
  Teacher, 
  Subject, 
  Classroom, 
  TimeSlot,
  DAY_NAMES,
  DAYS_OF_WEEK 
} from '../types';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { TimetableGrid } from '../components/timetable/TimetableGrid';
import { SubjectCard } from '../components/timetable/SubjectCard';
import { AssignmentModal } from '../components/timetable/AssignmentModal';
import { TimetableFilters } from '../components/timetable/TimetableFilters';

export function Timetable() {
  const [assignments, setAssignments] = useState<TimetableView[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedSubject, setDraggedSubject] = useState<Subject | null>(null);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{
    timeSlotId: string;
    dayOfWeek: number;
  } | null>(null);
  const [conflictInfo, setConflictInfo] = useState<{
    teacherConflict: boolean;
    classroomConflict: boolean;
  } | null>(null);

  // Filter states
  const [filters, setFilters] = useState({
    department: '',
    teacher: '',
    classroom: '',
    showBreaks: true,
  });

  // Toast notifications are handled by react-hot-toast directly
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [
        assignmentsData,
        teachersData,
        subjectsData,
        classroomsData,
        timeSlotsData,
      ] = await Promise.all([
        TimetableService.getAllWithDetails(),
        TeachersService.getAll(),
        SubjectsService.getAll(),
        ClassroomsService.getAll(),
        TimeSlotsService.getAll(),
      ]);

      setAssignments(assignmentsData);
      setTeachers(teachersData);
      setSubjects(subjectsData);
      setClassrooms(classroomsData);
      setTimeSlots(timeSlotsData);
    } catch (error) {
      console.error('Failed to load timetable data:', error);
      toast.error('Failed to load timetable data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const subject = subjects.find(s => s.id === active.id);
    setDraggedSubject(subject || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || !draggedSubject) {
      setDraggedSubject(null);
      return;
    }

    // Parse the drop zone data
    const dropData = over.data.current;
    if (!dropData || dropData.type !== 'time-slot') {
      setDraggedSubject(null);
      return;
    }

    const { timeSlotId, dayOfWeek } = dropData;
    
    // Check if slot is already occupied
    const existingAssignment = assignments.find(
      a => a.time_slot_id === timeSlotId && a.day_of_week === dayOfWeek
    );

    if (existingAssignment) {
      toast.error('This time slot already has an assignment.');
      setDraggedSubject(null);
      return;
    }

    // Set selected slot and open assignment modal
    setSelectedSlot({ timeSlotId, dayOfWeek });
    setShowAssignmentModal(true);
    setDraggedSubject(null);
  };

  const handleCreateAssignment = async (assignmentData: {
    subjectId: string;
    teacherId: string;
    classroomId: string;
    notes?: string;
  }) => {
    if (!selectedSlot) return;

    try {
      // Check for conflicts
      const conflicts = await TimetableService.checkConflicts(
        assignmentData.teacherId,
        assignmentData.classroomId,
        selectedSlot.timeSlotId,
        selectedSlot.dayOfWeek
      );

      if (conflicts.teacherConflict || conflicts.classroomConflict) {
        setConflictInfo(conflicts);
        toast.error('There are scheduling conflicts. Please review before proceeding.');
        return;
      }

      // Create the assignment
      await TimetableService.create({
        subject_id: assignmentData.subjectId,
        teacher_id: assignmentData.teacherId,
        classroom_id: assignmentData.classroomId,
        time_slot_id: selectedSlot.timeSlotId,
        day_of_week: selectedSlot.dayOfWeek,
        notes: assignmentData.notes,
      });

      toast.success('Timetable assignment created successfully.');

      // Reload data and close modal
      await loadData();
      setShowAssignmentModal(false);
      setSelectedSlot(null);
      setConflictInfo(null);
    } catch (error) {
      console.error('Failed to create assignment:', error);
      toast.error('Failed to create assignment. Please try again.');
    }
  };

  const handleDeleteAssignment = async (assignmentId: string) => {
    try {
      await TimetableService.delete(assignmentId);
      toast.success('Timetable assignment deleted successfully.');
      await loadData();
    } catch (error) {
      console.error('Failed to delete assignment:', error);
      toast.error('Failed to delete assignment. Please try again.');
    }
  };

  // Filter assignments based on current filters
  const filteredAssignments = assignments.filter(assignment => {
    if (filters.department && assignment.subject_department !== filters.department) {
      return false;
    }
    if (filters.teacher && assignment.teacher_id !== filters.teacher) {
      return false;
    }
    if (filters.classroom && assignment.classroom_id !== filters.classroom) {
      return false;
    }
    return true;
  });

  // Filter time slots based on break visibility
  const filteredTimeSlots = timeSlots.filter(slot => {
    if (!filters.showBreaks && slot.is_break_period) {
      return false;
    }
    return true;
  });

  // Get available subjects for dragging (subjects not yet assigned or with room for more assignments)
  const availableSubjects = subjects.filter(subject => {
    const subjectAssignments = assignments.filter(a => a.subject_id === subject.id);
    const totalHours = subject.hours_per_week + subject.lab_hours_per_week;
    return subjectAssignments.length < totalHours; // Simplified logic
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Interactive Timetable
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Drag and drop subjects to create your timetable
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <button
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
          <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
            <Download className="h-4 w-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Calendar className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Total Assignments
                  </dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-white">
                    {assignments.length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Active Teachers
                  </dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-white">
                    {new Set(assignments.map(a => a.teacher_id)).size}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <MapPin className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Classrooms Used
                  </dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-white">
                    {new Set(assignments.map(a => a.classroom_id)).size}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Available Subjects
                  </dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-white">
                    {availableSubjects.length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <TimetableFilters 
        filters={filters} 
        onFiltersChange={setFilters}
        teachers={teachers}
        classrooms={classrooms}
        departments={Array.from(new Set(subjects.map(s => s.department)))}
      />

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Available Subjects Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Available Subjects
              </h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {availableSubjects.map(subject => (
                  <SubjectCard key={subject.id} subject={subject} />
                ))}
                {availableSubjects.length === 0 && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                    No subjects available for scheduling
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Timetable Grid */}
          <div className="lg:col-span-3">
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <TimetableGrid
                assignments={filteredAssignments}
                timeSlots={filteredTimeSlots}
                onAssignmentClick={(assignment) => {
                  // Handle assignment click (e.g., edit or view details)
                  console.log('Assignment clicked:', assignment);
                }}
                onAssignmentDelete={handleDeleteAssignment}
                onSlotClick={(timeSlotId, dayOfWeek) => {
                  setSelectedSlot({ timeSlotId, dayOfWeek });
                  setShowAssignmentModal(true);
                }}
              />
            </div>
          </div>
        </div>

        <DragOverlay>
          {draggedSubject ? (
            <SubjectCard subject={draggedSubject} isDragging />
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Assignment Modal */}
      {showAssignmentModal && selectedSlot && (
        <AssignmentModal
          isOpen={showAssignmentModal}
          onClose={() => {
            setShowAssignmentModal(false);
            setSelectedSlot(null);
            setConflictInfo(null);
          }}
          onSubmit={handleCreateAssignment}
          subjects={subjects}
          teachers={teachers}
          classrooms={classrooms}
          timeSlot={timeSlots.find(ts => ts.id === selectedSlot.timeSlotId)}
          dayOfWeek={selectedSlot.dayOfWeek}
          conflictInfo={conflictInfo}
          defaultSubject={draggedSubject}
        />
      )}
    </div>
  );
}