import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  Plus, 
  Search, 
  Filter, 
  Edit2, 
  Trash2, 
  CheckCircle,
  XCircle,
  AlertCircle,
  User,
  CalendarDays,
  TimeIcon,
  Coffee
} from 'lucide-react';
import { FacultyAvailabilityService } from '../lib/services/facultyAvailabilityService';
import { TeachersService } from '../lib/services/teachersService';
import { 
  FacultyAvailability as FacultyAvailabilityType, 
  FacultyLeave,
  Teacher,
  FacultyAvailabilityFormData,
  FacultyLeaveFormData,
  ShiftType,
  LeaveType,
  LeaveStatus
} from '../types';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Modal from '../components/ui/Modal';
import toast from 'react-hot-toast';

export function FacultyAvailability() {
  // State management
  const [availability, setAvailability] = useState<FacultyAvailabilityType[]>([]);
  const [leaves, setLeaves] = useState<FacultyLeave[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'availability' | 'leaves'>('availability');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState<string>('');
  const [selectedAcademicYear, setSelectedAcademicYear] = useState('2024-25');
  
  // Modal states
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [editingItem, setEditingItem] = useState<FacultyAvailabilityType | FacultyLeave | null>(null);
  
  // Form states
  const [availabilityForm, setAvailabilityForm] = useState<FacultyAvailabilityFormData>({
    teacher_id: '',
    day_of_week: 1, // Monday
    start_time: '09:00',
    end_time: '10:00',
    shift_type: 'morning',
    preference_level: 1,
    is_available: true,
    academic_year: '2024-25',
  });

  const [leaveForm, setLeaveForm] = useState<FacultyLeaveFormData>({
    teacher_id: '',
    leave_type: 'casual',
    start_date: '',
    end_date: '',
    reason: '',
    is_recurring: false,
    academic_year: '2024-25',
  });

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, [selectedTeacher, selectedAcademicYear]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load availability with filters
      const availabilityFilters: any = {};
      if (selectedTeacher) availabilityFilters.teacher_id = selectedTeacher;
      if (selectedAcademicYear) availabilityFilters.academic_year = selectedAcademicYear;
      
      // Load leaves with filters
      const leaveFilters: any = {};
      if (selectedTeacher) leaveFilters.teacher_id = selectedTeacher;
      if (selectedAcademicYear) leaveFilters.academic_year = selectedAcademicYear;
      
      const [availabilityData, leavesData, teachersData] = await Promise.all([
        FacultyAvailabilityService.getAllAvailability(availabilityFilters),
        FacultyAvailabilityService.getAllLeaves(leaveFilters),
        TeachersService.getAll()
      ]);
      
      setAvailability(availabilityData);
      setLeaves(leavesData);
      setTeachers(teachersData);
    } catch (error) {
      console.error('Failed to load faculty availability data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Filter data based on search term
  const filteredAvailability = availability.filter(item =>
    item.teacher?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.teacher?.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredLeaves = leaves.filter(item =>
    item.teacher?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.leave_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.reason?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle availability form submission
  const handleAvailabilitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingItem && 'preference_level' in editingItem) {
        // Update existing availability
        await FacultyAvailabilityService.updateAvailability(editingItem.id, availabilityForm);
        toast.success('Availability updated successfully');
      } else {
        // Create new availability
        await FacultyAvailabilityService.createAvailability(availabilityForm);
        toast.success('Availability created successfully');
      }
      
      setShowAvailabilityModal(false);
      resetAvailabilityForm();
      await loadData();
    } catch (error: any) {
      console.error('Failed to save availability:', error);
      toast.error(error.message || 'Failed to save availability');
    }
  };

  // Handle leave form submission
  const handleLeaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingItem && 'leave_type' in editingItem) {
        // Update existing leave
        await FacultyAvailabilityService.updateLeave(editingItem.id, leaveForm);
        toast.success('Leave updated successfully');
      } else {
        // Create new leave
        await FacultyAvailabilityService.createLeave(leaveForm);
        toast.success('Leave application submitted successfully');
      }
      
      setShowLeaveModal(false);
      resetLeaveForm();
      await loadData();
    } catch (error: any) {
      console.error('Failed to save leave:', error);
      toast.error(error.message || 'Failed to save leave');
    }
  };

  const handleEditAvailability = (item: FacultyAvailabilityType) => {
    setEditingItem(item);
    setAvailabilityForm({
      teacher_id: item.teacher_id,
      day_of_week: item.day_of_week,
      start_time: item.start_time,
      end_time: item.end_time,
      shift_type: item.shift_type,
      preference_level: item.preference_level,
      is_available: item.is_available,
      academic_year: item.academic_year,
    });
    setShowAvailabilityModal(true);
  };

  const handleEditLeave = (item: FacultyLeave) => {
    setEditingItem(item);
    setLeaveForm({
      teacher_id: item.teacher_id,
      leave_type: item.leave_type,
      start_date: item.start_date,
      end_date: item.end_date,
      reason: item.reason || '',
      is_recurring: item.is_recurring,
      recurring_day: item.recurring_day,
      recurring_start_time: item.recurring_start_time || '',
      recurring_end_time: item.recurring_end_time || '',
      academic_year: item.academic_year,
    });
    setShowLeaveModal(true);
  };

  const handleDeleteAvailability = async (item: FacultyAvailabilityType) => {
    if (!confirm('Are you sure you want to delete this availability slot?')) {
      return;
    }

    try {
      await FacultyAvailabilityService.deleteAvailability(item.id);
      toast.success('Availability deleted successfully');
      await loadData();
    } catch (error: any) {
      console.error('Failed to delete availability:', error);
      toast.error(error.message || 'Failed to delete availability');
    }
  };

  const handleDeleteLeave = async (item: FacultyLeave) => {
    if (!confirm('Are you sure you want to delete this leave application?')) {
      return;
    }

    try {
      await FacultyAvailabilityService.deleteLeave(item.id);
      toast.success('Leave deleted successfully');
      await loadData();
    } catch (error: any) {
      console.error('Failed to delete leave:', error);
      toast.error(error.message || 'Failed to delete leave');
    }
  };

  const handleApproveLeave = async (leave: FacultyLeave) => {
    try {
      await FacultyAvailabilityService.approveLeave(leave.id, 'current-admin-id'); // Replace with actual admin ID
      toast.success('Leave approved successfully');
      await loadData();
    } catch (error: any) {
      console.error('Failed to approve leave:', error);
      toast.error(error.message || 'Failed to approve leave');
    }
  };

  const handleRejectLeave = async (leave: FacultyLeave) => {
    try {
      await FacultyAvailabilityService.rejectLeave(leave.id, 'current-admin-id'); // Replace with actual admin ID
      toast.success('Leave rejected');
      await loadData();
    } catch (error: any) {
      console.error('Failed to reject leave:', error);
      toast.error(error.message || 'Failed to reject leave');
    }
  };

  const resetAvailabilityForm = () => {
    setAvailabilityForm({
      teacher_id: '',
      day_of_week: 1,
      start_time: '09:00',
      end_time: '10:00',
      shift_type: 'morning',
      preference_level: 1,
      is_available: true,
      academic_year: '2024-25',
    });
    setEditingItem(null);
  };

  const resetLeaveForm = () => {
    setLeaveForm({
      teacher_id: '',
      leave_type: 'casual',
      start_date: '',
      end_date: '',
      reason: '',
      is_recurring: false,
      academic_year: '2024-25',
    });
    setEditingItem(null);
  };

  const getDayName = (dayOfWeek: number) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayOfWeek];
  };

  const getPreferenceBadge = (level: number) => {
    const colors = {
      1: 'bg-green-100 text-green-800',
      2: 'bg-blue-100 text-blue-800',
      3: 'bg-yellow-100 text-yellow-800',
      4: 'bg-orange-100 text-orange-800',
      5: 'bg-red-100 text-red-800'
    };
    const labels = ['', 'Preferred', 'Good', 'Neutral', 'Not Preferred', 'Avoid'];
    
    return (
      <span className={`px-2 py-1 text-xs rounded-full ${colors[level as keyof typeof colors]}`}>
        {labels[level]}
      </span>
    );
  };

  const getLeaveStatusBadge = (status: LeaveStatus) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    };
    
    return (
      <span className={`px-2 py-1 text-xs rounded-full ${colors[status]}`}>
        {status.toUpperCase()}
      </span>
    );
  };

  const getShiftBadge = (shiftType: ShiftType) => {
    const colors = {
      morning: 'bg-yellow-100 text-yellow-800',
      evening: 'bg-blue-100 text-blue-800',
      full_day: 'bg-purple-100 text-purple-800'
    };
    
    return (
      <span className={`px-2 py-1 text-xs rounded-full ${colors[shiftType]}`}>
        {shiftType.replace('_', ' ').toUpperCase()}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Faculty Availability Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage teacher availability preferences and leave applications
          </p>
        </div>
        <div className="flex gap-2 mt-4 sm:mt-0">
          <button
            onClick={() => setShowAvailabilityModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Clock className="w-4 h-4" />
            Add Availability
          </button>
          <button
            onClick={() => setShowLeaveModal(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Calendar className="w-4 h-4" />
            Apply Leave
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('availability')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'availability'
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <Clock className="w-4 h-4 inline mr-2" />
              Availability ({filteredAvailability.length})
            </button>
            <button
              onClick={() => setActiveTab('leaves')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'leaves'
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <Calendar className="w-4 h-4 inline mr-2" />
              Leaves ({filteredLeaves.length})
            </button>
          </nav>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search faculty or details..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          {/* Teacher Filter */}
          <select
            value={selectedTeacher}
            onChange={(e) => setSelectedTeacher(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">All Teachers</option>
            {teachers.map(teacher => (
              <option key={teacher.id} value={teacher.id}>
                {teacher.name} - {teacher.department}
              </option>
            ))}
          </select>

          {/* Academic Year Filter */}
          <select
            value={selectedAcademicYear}
            onChange={(e) => setSelectedAcademicYear(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="2024-25">2024-25</option>
            <option value="2023-24">2023-24</option>
            <option value="2025-26">2025-26</option>
          </select>
        </div>
      </div>

      {/* Content based on active tab */}
      {activeTab === 'availability' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredAvailability.map((item) => (
            <div
              key={item.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${item.is_available ? 'bg-green-100 dark:bg-green-900/20' : 'bg-red-100 dark:bg-red-900/20'}`}>
                    <User className={`w-4 h-4 ${item.is_available ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {item.teacher?.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {item.teacher?.department}
                    </p>
                  </div>
                </div>
                {item.is_available ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600" />
                )}
              </div>

              {/* Details */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Day:</span>
                  <span className="text-gray-900 dark:text-white font-medium">
                    {getDayName(item.day_of_week)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Time:</span>
                  <span className="text-gray-900 dark:text-white font-medium">
                    {item.start_time} - {item.end_time}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Shift:</span>
                  {getShiftBadge(item.shift_type)}
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Preference:</span>
                  {getPreferenceBadge(item.preference_level)}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleEditAvailability(item)}
                  className="flex-1 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-3 py-2 rounded text-sm font-medium transition-colors"
                >
                  <Edit2 className="w-4 h-4 inline mr-1" />
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteAvailability(item)}
                  className="p-2 text-gray-600 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredLeaves.map((leave) => (
            <div
              key={leave.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/20">
                        <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {leave.teacher?.name}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {leave.teacher?.department}
                        </p>
                      </div>
                    </div>
                    {getLeaveStatusBadge(leave.status)}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Leave Type</p>
                      <p className="font-medium text-gray-900 dark:text-white capitalize">
                        {leave.leave_type}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Start Date</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {new Date(leave.start_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">End Date</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {new Date(leave.end_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Duration</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {Math.ceil((new Date(leave.end_date).getTime() - new Date(leave.start_date).getTime()) / (1000 * 60 * 60 * 24))} days
                      </p>
                    </div>
                  </div>

                  {leave.reason && (
                    <div className="mb-4">
                      <p className="text-sm text-gray-600 dark:text-gray-400">Reason</p>
                      <p className="text-gray-900 dark:text-white">{leave.reason}</p>
                    </div>
                  )}

                  {leave.is_recurring && (
                    <div className="mb-4">
                      <span className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded-full">
                        Recurring Leave
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 ml-4">
                  {leave.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleApproveLeave(leave)}
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm transition-colors"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleRejectLeave(leave)}
                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm transition-colors"
                      >
                        Reject
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => handleEditLeave(leave)}
                    className="p-2 text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteLeave(leave)}
                    className="p-2 text-gray-600 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty States */}
      {activeTab === 'availability' && filteredAvailability.length === 0 && (
        <div className="text-center py-12">
          <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No availability records found
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Start by adding faculty availability preferences
          </p>
          <button
            onClick={() => setShowAvailabilityModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Add Availability
          </button>
        </div>
      )}

      {activeTab === 'leaves' && filteredLeaves.length === 0 && (
        <div className="text-center py-12">
          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No leave applications found
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            No leave applications have been submitted yet
          </p>
          <button
            onClick={() => setShowLeaveModal(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
          >
            Apply for Leave
          </button>
        </div>
      )}

      {/* Availability Modal */}
      <Modal
        isOpen={showAvailabilityModal}
        onClose={() => {
          setShowAvailabilityModal(false);
          resetAvailabilityForm();
        }}
        title={editingItem && 'preference_level' in editingItem ? 'Edit Availability' : 'Add Availability'}
        size="lg"
      >
        <form onSubmit={handleAvailabilitySubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Teacher */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Teacher
              </label>
              <select
                required
                value={availabilityForm.teacher_id}
                onChange={(e) => setAvailabilityForm({ ...availabilityForm, teacher_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">Select Teacher</option>
                {teachers.map(teacher => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.name} - {teacher.department}
                  </option>
                ))}
              </select>
            </div>

            {/* Day of Week */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Day of Week
              </label>
              <select
                required
                value={availabilityForm.day_of_week}
                onChange={(e) => setAvailabilityForm({ ...availabilityForm, day_of_week: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value={1}>Monday</option>
                <option value={2}>Tuesday</option>
                <option value={3}>Wednesday</option>
                <option value={4}>Thursday</option>
                <option value={5}>Friday</option>
                <option value={6}>Saturday</option>
                <option value={0}>Sunday</option>
              </select>
            </div>

            {/* Start Time */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Start Time
              </label>
              <input
                type="time"
                required
                value={availabilityForm.start_time}
                onChange={(e) => setAvailabilityForm({ ...availabilityForm, start_time: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            {/* End Time */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                End Time
              </label>
              <input
                type="time"
                required
                value={availabilityForm.end_time}
                onChange={(e) => setAvailabilityForm({ ...availabilityForm, end_time: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            {/* Shift Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Shift
              </label>
              <select
                required
                value={availabilityForm.shift_type}
                onChange={(e) => setAvailabilityForm({ ...availabilityForm, shift_type: e.target.value as ShiftType })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="morning">Morning</option>
                <option value="evening">Evening</option>
                <option value="full_day">Full Day</option>
              </select>
            </div>

            {/* Preference Level */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Preference Level
              </label>
              <select
                required
                value={availabilityForm.preference_level}
                onChange={(e) => setAvailabilityForm({ ...availabilityForm, preference_level: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value={1}>Preferred</option>
                <option value={2}>Good</option>
                <option value={3}>Neutral</option>
                <option value={4}>Not Preferred</option>
                <option value={5}>Avoid</option>
              </select>
            </div>
          </div>

          {/* Available Toggle */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_available"
              checked={availabilityForm.is_available}
              onChange={(e) => setAvailabilityForm({ ...availabilityForm, is_available: e.target.checked })}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label htmlFor="is_available" className="ml-2 block text-sm text-gray-900 dark:text-white">
              Available during this time slot
            </label>
          </div>

          {/* Academic Year */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Academic Year
            </label>
            <input
              type="text"
              required
              value={availabilityForm.academic_year}
              onChange={(e) => setAvailabilityForm({ ...availabilityForm, academic_year: e.target.value })}
              placeholder="e.g., 2024-25"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          {/* Form Actions */}
          <div className="flex items-center gap-3 pt-4">
            <button
              type="submit"
              className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md font-medium"
            >
              {editingItem && 'preference_level' in editingItem ? 'Update Availability' : 'Add Availability'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAvailabilityModal(false);
                resetAvailabilityForm();
              }}
              className="bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-md font-medium"
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>

      {/* Leave Modal */}
      <Modal
        isOpen={showLeaveModal}
        onClose={() => {
          setShowLeaveModal(false);
          resetLeaveForm();
        }}
        title={editingItem && 'leave_type' in editingItem ? 'Edit Leave Application' : 'Apply for Leave'}
        size="lg"
      >
        <form onSubmit={handleLeaveSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Teacher */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Teacher
              </label>
              <select
                required
                value={leaveForm.teacher_id}
                onChange={(e) => setLeaveForm({ ...leaveForm, teacher_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">Select Teacher</option>
                {teachers.map(teacher => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.name} - {teacher.department}
                  </option>
                ))}
              </select>
            </div>

            {/* Leave Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Leave Type
              </label>
              <select
                required
                value={leaveForm.leave_type}
                onChange={(e) => setLeaveForm({ ...leaveForm, leave_type: e.target.value as LeaveType })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="casual">Casual Leave</option>
                <option value="sick">Sick Leave</option>
                <option value="official">Official Leave</option>
                <option value="maternity">Maternity Leave</option>
                <option value="conference">Conference Leave</option>
              </select>
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Start Date
              </label>
              <input
                type="date"
                required
                value={leaveForm.start_date}
                onChange={(e) => setLeaveForm({ ...leaveForm, start_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                End Date
              </label>
              <input
                type="date"
                required
                value={leaveForm.end_date}
                onChange={(e) => setLeaveForm({ ...leaveForm, end_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Reason
            </label>
            <textarea
              value={leaveForm.reason}
              onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Reason for leave..."
            />
          </div>

          {/* Recurring Toggle */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_recurring"
              checked={leaveForm.is_recurring}
              onChange={(e) => setLeaveForm({ ...leaveForm, is_recurring: e.target.checked })}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label htmlFor="is_recurring" className="ml-2 block text-sm text-gray-900 dark:text-white">
              This is a recurring leave (e.g., weekly time slot)
            </label>
          </div>

          {/* Recurring options */}
          {leaveForm.is_recurring && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Day of Week
                </label>
                <select
                  value={leaveForm.recurring_day || 1}
                  onChange={(e) => setLeaveForm({ ...leaveForm, recurring_day: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value={1}>Monday</option>
                  <option value={2}>Tuesday</option>
                  <option value={3}>Wednesday</option>
                  <option value={4}>Thursday</option>
                  <option value={5}>Friday</option>
                  <option value={6}>Saturday</option>
                  <option value={0}>Sunday</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Start Time
                </label>
                <input
                  type="time"
                  value={leaveForm.recurring_start_time}
                  onChange={(e) => setLeaveForm({ ...leaveForm, recurring_start_time: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  End Time
                </label>
                <input
                  type="time"
                  value={leaveForm.recurring_end_time}
                  onChange={(e) => setLeaveForm({ ...leaveForm, recurring_end_time: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          )}

          {/* Academic Year */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Academic Year
            </label>
            <input
              type="text"
              required
              value={leaveForm.academic_year}
              onChange={(e) => setLeaveForm({ ...leaveForm, academic_year: e.target.value })}
              placeholder="e.g., 2024-25"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          {/* Form Actions */}
          <div className="flex items-center gap-3 pt-4">
            <button
              type="submit"
              className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md font-medium"
            >
              {editingItem && 'leave_type' in editingItem ? 'Update Leave' : 'Submit Application'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowLeaveModal(false);
                resetLeaveForm();
              }}
              className="bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-md font-medium"
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}