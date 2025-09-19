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
  AlertTriangle,
  MapPin,
  Users,
  Monitor,
  BookOpen,
  Star,
  Repeat,
  User
} from 'lucide-react';
import { SpecialClassesService } from '../lib/services/specialClassesService';
import { TeachersService } from '../lib/services/teachersService';
import { ClassroomsService } from '../lib/services/classroomsService';
import { BatchesService } from '../lib/services/batchesService';
import { 
  SpecialClass, 
  SpecialClassFormData,
  Teacher,
  Classroom,
  Batch,
  ClassType,
  Priority
} from '../types';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Modal from '../components/ui/Modal';
import toast from 'react-hot-toast';

export function SpecialClasses() {
  // State management
  const [specialClasses, setSpecialClasses] = useState<SpecialClass[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<ClassType | ''>('');
  const [filterPriority, setFilterPriority] = useState<string>('');
  const [selectedAcademicYear, setSelectedAcademicYear] = useState('2024-25');
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingClass, setEditingClass] = useState<SpecialClass | null>(null);
  
  // Form state
  const [form, setForm] = useState<SpecialClassFormData>({
    title: '',
    description: '',
    class_type: 'lab',
    teacher_id: '',
    classroom_id: '',
    batch_id: '',
    date: '',
    start_time: '09:00',
    end_time: '10:00',
    priority: 1, // Default priority as number
    max_students: 30,
    is_recurring: false,
    academic_year: '2024-25',
  });

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, [selectedAcademicYear, filterType, filterPriority]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load data from all services concurrently
      const filters: any = {};
      if (selectedAcademicYear) filters.academic_year = selectedAcademicYear;
      if (filterType) filters.class_type = filterType;
      if (filterPriority) filters.priority = filterPriority;
      
      const [classesData, teachersData, classroomsData, batchesData] = await Promise.all([
        SpecialClassesService.getAll(filters),
        TeachersService.getAll(),
        ClassroomsService.getAll(),
        BatchesService.getAll()
      ]);
      
      setSpecialClasses(classesData);
      setTeachers(teachersData);
      setClassrooms(classroomsData);
      setBatches(batchesData);
    } catch (error) {
      console.error('Failed to load special classes data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Filter data based on search term
  const filteredClasses = specialClasses.filter(specialClass =>
    specialClass.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    specialClass.special_requirements?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    specialClass.teacher?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    specialClass.classroom?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingClass) {
        // Update existing class
        await SpecialClassesService.update(editingClass.id, form);
        toast.success('Special class updated successfully');
      } else {
        // Create new class
        await SpecialClassesService.create(form);
        toast.success('Special class created successfully');
      }
      
      setShowModal(false);
      resetForm();
      await loadData();
    } catch (error: any) {
      console.error('Failed to save special class:', error);
      toast.error(error.message || 'Failed to save special class');
    }
  };

  const handleEdit = (specialClass: SpecialClass) => {
    setEditingClass(specialClass);
    // Convert database fields to form fields
    const dateFromDayOfWeek = new Date(specialClass.start_date);
    
    setForm({
      title: specialClass.name, // DB 'name' -> UI 'title'
      description: specialClass.special_requirements || '', // DB 'special_requirements' -> UI 'description'
      class_type: specialClass.class_type,
      subject_id: specialClass.subject_id,
      teacher_id: specialClass.teacher_id || '',
      classroom_id: specialClass.classroom_id,
      batch_id: specialClass.batch_id || '',
      date: specialClass.start_date, // DB 'start_date' -> UI 'date'
      start_time: specialClass.start_time,
      end_time: specialClass.end_time,
      is_recurring: specialClass.is_recurring,
      recurring_pattern: specialClass.recurrence_pattern,
      recurring_end_date: specialClass.end_date,
      required_equipment: specialClass.required_equipment,
      special_requirements: specialClass.special_requirements,
      max_students: specialClass.max_students,
      is_mandatory: specialClass.is_mandatory,
      priority: specialClass.priority,
      shift_type: specialClass.shift_type,
      academic_year: specialClass.academic_year,
      notes: specialClass.notes,
    });
    setShowModal(true);
  };

  const handleDelete = async (specialClass: SpecialClass) => {
    if (!confirm('Are you sure you want to delete this special class?')) {
      return;
    }

    try {
      await SpecialClassesService.delete(specialClass.id);
      toast.success('Special class deleted successfully');
      await loadData();
    } catch (error: any) {
      console.error('Failed to delete special class:', error);
      toast.error(error.message || 'Failed to delete special class');
    }
  };

  const resetForm = () => {
    setForm({
      title: '',
      description: '',
      class_type: 'lab',
      teacher_id: '',
      classroom_id: '',
      batch_id: '',
      date: '',
      start_time: '09:00',
      end_time: '10:00',
      priority: 1, // Default priority as number
      max_students: 30,
      is_recurring: false,
      academic_year: '2024-25',
    });
    setEditingClass(null);
  };

  const getClassTypeIcon = (type: ClassType) => {
    switch (type) {
      case 'lab': return Monitor;
      case 'seminar': return BookOpen;
      case 'workshop': return Users;
      case 'guest_lecture': return Star;
      case 'exam': return AlertTriangle;
      default: return Calendar;
    }
  };

  const getClassTypeBadge = (type: ClassType) => {
    const colors = {
      lab: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
      seminar: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
      workshop: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300',
      guest_lecture: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300',
      exam: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
    };
    
    return (
      <span className={`px-2 py-1 text-xs rounded-full font-medium ${colors[type]}`}>
        {type.replace('_', ' ').toUpperCase()}
      </span>
    );
  };

  const getPriorityBadge = (priority: number) => {
    const getPriorityInfo = (priority: number) => {
      if (priority <= 3) {
        return { color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300', label: 'LOW' };
      } else if (priority <= 7) {
        return { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300', label: 'MEDIUM' };
      } else {
        return { color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300', label: 'HIGH' };
      }
    };
    
    const info = getPriorityInfo(priority);
    
    return (
      <span className={`px-2 py-1 text-xs rounded-full font-medium ${info.color}`}>
        {info.label} ({priority})
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
            Special Classes Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Schedule labs, seminars, workshops, and guest lectures
          </p>
        </div>
        <div className="flex gap-2 mt-4 sm:mt-0">
          <button
            onClick={() => setShowModal(true)}
            className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Schedule Special Class
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search classes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          {/* Type Filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as ClassType | '')}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">All Types</option>
            <option value="lab">Lab</option>
            <option value="seminar">Seminar</option>
            <option value="workshop">Workshop</option>
            <option value="guest_lecture">Guest Lecture</option>
            <option value="exam">Exam</option>
          </select>

          {/* Priority Filter */}
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">All Priorities</option>
            <option value="1">Low Priority (1-3)</option>
            <option value="5">Medium Priority (4-7)</option>
            <option value="9">High Priority (8-10)</option>
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

      {/* Classes Grid */}
      {filteredClasses.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredClasses.map((specialClass) => {
            const TypeIcon = getClassTypeIcon(specialClass.class_type);
            return (
              <div
                key={specialClass.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary-100 dark:bg-primary-900/20">
                      <TypeIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {specialClass.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        {getClassTypeBadge(specialClass.class_type)}
                        {getPriorityBadge(specialClass.priority)}
                      </div>
                    </div>
                  </div>
                  {specialClass.is_recurring && (
                    <Repeat className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  )}
                </div>

                {/* Description */}
                {specialClass.special_requirements && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    {specialClass.special_requirements}
                  </p>
                )}

                {/* Details */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm">
                    <User className="w-4 h-4 text-gray-400 mr-2" />
                    <span className="text-gray-900 dark:text-white">
                      {specialClass.teacher?.name || 'No teacher assigned'}
                    </span>
                  </div>
                  <div className="flex items-center text-sm">
                    <MapPin className="w-4 h-4 text-gray-400 mr-2" />
                    <span className="text-gray-900 dark:text-white">
                      {specialClass.classroom?.name || 'No classroom assigned'}
                    </span>
                  </div>
                  <div className="flex items-center text-sm">
                    <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                    <span className="text-gray-900 dark:text-white">
                      {new Date(specialClass.start_date).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center text-sm">
                    <Clock className="w-4 h-4 text-gray-400 mr-2" />
                    <span className="text-gray-900 dark:text-white">
                      {specialClass.start_time} - {specialClass.end_time}
                    </span>
                  </div>
                  {specialClass.max_students && (
                    <div className="flex items-center text-sm">
                      <Users className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="text-gray-900 dark:text-white">
                        Max {specialClass.max_students} students
                      </span>
                    </div>
                  )}
                </div>

                {/* Equipment Requirements */}
                {specialClass.required_equipment && specialClass.required_equipment.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Equipment:</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {specialClass.required_equipment.join(', ')}
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEdit(specialClass)}
                    className="flex-1 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-3 py-2 rounded text-sm font-medium transition-colors"
                  >
                    <Edit2 className="w-4 h-4 inline mr-1" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(specialClass)}
                    className="p-2 text-gray-600 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No special classes found
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Start by scheduling your first special class
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg"
          >
            Schedule Special Class
          </button>
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title={editingClass ? 'Edit Special Class' : 'Schedule Special Class'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Title */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Class Title *
              </label>
              <input
                type="text"
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="e.g., Database Lab Session"
              />
            </div>

            {/* Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Class Type *
              </label>
              <select
                required
                value={form.class_type}
                onChange={(e) => setForm({ ...form, class_type: e.target.value as ClassType })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="lab">Lab</option>
                <option value="seminar">Seminar</option>
                <option value="workshop">Workshop</option>
                <option value="guest_lecture">Guest Lecture</option>
                <option value="exam">Exam</option>
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Priority * (1=Low, 10=High)
              </label>
              <select
                required
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="1">1 - Lowest Priority</option>
                <option value="2">2 - Low Priority</option>
                <option value="3">3 - Low Priority</option>
                <option value="4">4 - Medium-Low Priority</option>
                <option value="5">5 - Medium Priority</option>
                <option value="6">6 - Medium Priority</option>
                <option value="7">7 - Medium-High Priority</option>
                <option value="8">8 - High Priority</option>
                <option value="9">9 - High Priority</option>
                <option value="10">10 - Highest Priority</option>
              </select>
            </div>

            {/* Teacher */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Teacher *
              </label>
              <select
                required
                value={form.teacher_id}
                onChange={(e) => setForm({ ...form, teacher_id: e.target.value })}
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

            {/* Classroom */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Classroom *
              </label>
              <select
                required
                value={form.classroom_id}
                onChange={(e) => setForm({ ...form, classroom_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">Select Classroom</option>
                {classrooms.map(classroom => (
                  <option key={classroom.id} value={classroom.id}>
                    {classroom.name} (Capacity: {classroom.capacity})
                  </option>
                ))}
              </select>
            </div>

            {/* Batch */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Batch *
              </label>
              <select
                required
                value={form.batch_id}
                onChange={(e) => setForm({ ...form, batch_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">Select Batch</option>
                {batches.map(batch => (
                  <option key={batch.id} value={batch.id}>
                    {batch.name} ({batch.department})
                  </option>
                ))}
              </select>
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Date *
              </label>
              <input
                type="date"
                required
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            {/* Start Time */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Start Time *
              </label>
              <input
                type="time"
                required
                value={form.start_time}
                onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            {/* End Time */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                End Time *
              </label>
              <input
                type="time"
                required
                value={form.end_time}
                onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            {/* Max Students */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Maximum Students
              </label>
              <input
                type="number"
                min="1"
                value={form.max_students || ''}
                onChange={(e) => setForm({ ...form, max_students: parseInt(e.target.value) || undefined })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="30"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Brief description of the special class..."
            />
          </div>

          {/* Equipment Requirements */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Equipment Requirements
            </label>
            <textarea
              value={form.required_equipment?.join(', ') || ''}
              onChange={(e) => setForm({ ...form, required_equipment: e.target.value.split(',').map(item => item.trim()).filter(item => item) })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Projector, Whiteboard, Lab equipment, etc..."
            />
          </div>

          {/* Recurring */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_recurring"
              checked={form.is_recurring}
              onChange={(e) => setForm({ ...form, is_recurring: e.target.checked })}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label htmlFor="is_recurring" className="ml-2 block text-sm text-gray-900 dark:text-white">
              This is a recurring special class
            </label>
          </div>

          {/* Recurring options */}
          {form.is_recurring && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Recurrence Pattern
                </label>
                <select
                  value={form.recurring_pattern || 'weekly'}
                  onChange={(e) => setForm({ ...form, recurring_pattern: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Bi-weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={form.recurring_end_date || ''}
                  onChange={(e) => setForm({ ...form, recurring_end_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          )}

          {/* Academic Year */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Academic Year *
            </label>
            <input
              type="text"
              required
              value={form.academic_year}
              onChange={(e) => setForm({ ...form, academic_year: e.target.value })}
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
              {editingClass ? 'Update Special Class' : 'Schedule Special Class'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowModal(false);
                resetForm();
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