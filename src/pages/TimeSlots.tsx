import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Clock, Calendar, Coffee, BookOpen } from 'lucide-react';
import { TimeSlot, DayOfWeek } from '../types';
import { TimeSlotsService } from '../lib/services/timeSlotsService';
import Modal from '../components/ui/Modal';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import TimeSlotForm from '../components/admin/TimeSlotForm';
import toast from 'react-hot-toast';

const TimeSlots: React.FC = () => {
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDay, setSelectedDay] = useState<DayOfWeek | 'all'>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTimeSlot, setEditingTimeSlot] = useState<TimeSlot | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [timeSlotToDelete, setTimeSlotToDelete] = useState<TimeSlot | null>(null);

  useEffect(() => {
    loadTimeSlots();
  }, []);

  const loadTimeSlots = async () => {
    try {
      setLoading(true);
      const data = await TimeSlotsService.getAll();
      setTimeSlots(data);
    } catch (error) {
      console.error('Failed to load time slots:', error);
      toast.error('Failed to load time slots');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTimeSlot = () => {
    setEditingTimeSlot(null);
    setIsFormOpen(true);
  };

  const handleEditTimeSlot = (timeSlot: TimeSlot) => {
    setEditingTimeSlot(timeSlot);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (success: boolean) => {
    if (success) {
      await loadTimeSlots();
      setIsFormOpen(false);
      setEditingTimeSlot(null);
    }
  };

  const handleDeleteClick = (timeSlot: TimeSlot) => {
    setTimeSlotToDelete(timeSlot);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!timeSlotToDelete) return;

    try {
      await TimeSlotsService.delete(timeSlotToDelete.id);
      toast.success('Time slot deleted successfully');
      await loadTimeSlots();
    } catch (error) {
      console.error('Failed to delete time slot:', error);
      toast.error('Failed to delete time slot');
    } finally {
      setDeleteConfirmOpen(false);
      setTimeSlotToDelete(null);
    }
  };

  const days: { value: DayOfWeek | 'all'; label: string }[] = [
    { value: 'all', label: 'All Days' },
    { value: 'monday', label: 'Monday' },
    { value: 'tuesday', label: 'Tuesday' },
    { value: 'wednesday', label: 'Wednesday' },
    { value: 'thursday', label: 'Thursday' },
    { value: 'friday', label: 'Friday' },
    { value: 'saturday', label: 'Saturday' },
  ];

  const filteredTimeSlots = timeSlots.filter(slot => {
    const matchesSearch = slot.start_time.includes(searchQuery) || 
                         slot.end_time.includes(searchQuery) ||
                         slot.day.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesDay = selectedDay === 'all' || slot.day === selectedDay;
    
    return matchesSearch && matchesDay;
  });

  const getDayStats = () => {
    const days = timeSlots.reduce((acc, slot) => {
      acc[slot.day] = (acc[slot.day] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return days;
  };

  const getSlotTypeStats = () => {
    return {
      breaks: timeSlots.filter(slot => slot.is_break).length,
      classes: timeSlots.filter(slot => !slot.is_break && slot.duration < 90).length,
      labs: timeSlots.filter(slot => !slot.is_break && slot.duration >= 90).length,
    };
  };

  const dayStats = getDayStats();
  const slotTypeStats = getSlotTypeStats();
  const totalDuration = timeSlots.reduce((acc, slot) => acc + slot.duration, 0);

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const groupSlotsByDay = () => {
    const grouped = timeSlots.reduce((acc, slot) => {
      if (!acc[slot.day]) acc[slot.day] = [];
      acc[slot.day].push(slot);
      return acc;
    }, {} as Record<string, TimeSlot[]>);

    // Sort slots within each day by start time
    Object.keys(grouped).forEach(day => {
      grouped[day].sort((a, b) => a.start_time.localeCompare(b.start_time));
    });

    return grouped;
  };

  const groupedSlots = groupSlotsByDay();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Time Slots Management
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Manage daily schedule and time periods
          </p>
        </div>
        <button
          onClick={handleCreateTimeSlot}
          className="mt-4 sm:mt-0 btn btn-primary flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Time Slot
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Clock className="w-8 h-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Slots</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{timeSlots.length}</p>
            </div>
          </div>
        </div>
        
        <div className="card p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <BookOpen className="w-8 h-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Class Periods</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{slotTypeStats.classes}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Coffee className="w-8 h-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Break Periods</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{slotTypeStats.breaks}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Calendar className="w-8 h-8 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Hours</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {Math.round(totalDuration / 60)}h
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search time slots..."
            className="input pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <select
          value={selectedDay}
          onChange={(e) => setSelectedDay(e.target.value as DayOfWeek | 'all')}
          className="input w-auto"
        >
          {days.map((day) => (
            <option key={day.value} value={day.value}>
              {day.label}
            </option>
          ))}
        </select>
      </div>

      {/* Time Slots Grid */}
      <div className="space-y-6">
        {selectedDay === 'all' ? (
          // Show all days grouped
          days.slice(1).map(({ value: day, label }) => (
            <div key={day} className="card">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                  <Calendar className="w-5 h-5 mr-2" />
                  {label}
                  <span className="ml-2 text-sm font-normal text-gray-600 dark:text-gray-400">
                    ({groupedSlots[day]?.length || 0} slots)
                  </span>
                </h3>
              </div>
              <div className="p-6">
                {groupedSlots[day]?.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {groupedSlots[day].map((slot) => (
                      <div key={slot.id} className={`p-4 rounded-lg border-2 ${
                        slot.is_break 
                          ? 'border-amber-200 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/20' 
                          : 'border-blue-200 bg-blue-50 dark:border-blue-700 dark:bg-blue-900/20'
                      }`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center">
                            {slot.is_break ? (
                              <Coffee className="w-4 h-4 text-amber-600 mr-2" />
                            ) : (
                              <Clock className="w-4 h-4 text-blue-600 mr-2" />
                            )}
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                              slot.is_break
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-800 dark:text-amber-200'
                                : 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-200'
                            }`}>
                              {slot.is_break ? 'Break' : 'Class'}
                            </span>
                          </div>
                          <div className="flex space-x-1">
                            <button
                              onClick={() => handleEditTimeSlot(slot)}
                              className="text-gray-400 hover:text-primary-600 dark:hover:text-primary-400"
                            >
                              <Edit className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleDeleteClick(slot)}
                              className="text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        <div className="text-sm">
                          <div className="font-semibold text-gray-900 dark:text-white">
                            {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                          </div>
                          <div className="text-gray-600 dark:text-gray-400">
                            {slot.duration} minutes
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Clock className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      No time slots for {label.toLowerCase()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          // Show filtered results
          <div className="card">
            <div className="p-6">
              {filteredTimeSlots.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {searchQuery ? 'No time slots found matching your search.' : 'No time slots added yet.'}
                  </p>
                  {!searchQuery && (
                    <button
                      onClick={handleCreateTimeSlot}
                      className="mt-4 btn btn-primary"
                    >
                      Add First Time Slot
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredTimeSlots.map((slot) => (
                    <div key={slot.id} className={`p-4 rounded-lg border-2 ${
                      slot.is_break 
                        ? 'border-amber-200 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/20' 
                        : 'border-blue-200 bg-blue-50 dark:border-blue-700 dark:bg-blue-900/20'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          {slot.is_break ? (
                            <Coffee className="w-4 h-4 text-amber-600 mr-2" />
                          ) : (
                            <Clock className="w-4 h-4 text-blue-600 mr-2" />
                          )}
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                            slot.is_break
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-800 dark:text-amber-200'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-200'
                          }`}>
                            {slot.is_break ? 'Break' : 'Class'}
                          </span>
                        </div>
                        <div className="flex space-x-1">
                          <button
                            onClick={() => handleEditTimeSlot(slot)}
                            className="text-gray-400 hover:text-primary-600 dark:hover:text-primary-400"
                          >
                            <Edit className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(slot)}
                            className="text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <div className="text-sm">
                        <div className="font-semibold text-gray-900 dark:text-white capitalize">
                          {slot.day}
                        </div>
                        <div className="font-semibold text-gray-900 dark:text-white">
                          {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                        </div>
                        <div className="text-gray-600 dark:text-gray-400">
                          {slot.duration} minutes
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Time Slot Form Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingTimeSlot ? 'Edit Time Slot' : 'Add New Time Slot'}
      >
        <TimeSlotForm
          timeSlot={editingTimeSlot}
          onSubmit={handleFormSubmit}
          onCancel={() => setIsFormOpen(false)}
        />
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        title="Delete Time Slot"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Are you sure you want to delete the time slot "{timeSlotToDelete && formatTime(timeSlotToDelete.start_time)} - {timeSlotToDelete && formatTime(timeSlotToDelete.end_time)}" on {timeSlotToDelete?.day}? This action cannot be undone.
          </p>
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setDeleteConfirmOpen(false)}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteConfirm}
              className="btn btn-danger"
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default TimeSlots;