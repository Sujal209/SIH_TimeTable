import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  Filter, 
  Edit2, 
  Trash2, 
  BookOpen,
  GraduationCap,
  Clock,
  UserCheck,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { BatchesService } from '../lib/services/batchesService';
import { SubjectsService } from '../lib/services/subjectsService';
import { 
  Batch, 
  BatchSubject, 
  Subject,
  BatchFormData, 
  ProgramType, 
  ShiftType 
} from '../types';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Modal from '../components/ui/Modal';
import toast from 'react-hot-toast';

export function Batches() {
  // State management
  const [batches, setBatches] = useState<Batch[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [selectedProgramType, setSelectedProgramType] = useState<ProgramType | ''>('');
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>('2024-25');
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSubjectsModal, setShowSubjectsModal] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [batchSubjects, setBatchSubjects] = useState<BatchSubject[]>([]);
  
  // Form state
  const [formData, setFormData] = useState<BatchFormData>({
    name: '',
    department: '',
    program_type: 'UG',
    year: 1,
    semester: 1,
    strength: 0,
    shift_type: 'morning',
    academic_year: '2024-25',
    notes: '',
  });

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, [selectedDepartment, selectedProgramType, selectedAcademicYear]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load batches with filters
      const filters: any = {};
      if (selectedDepartment) filters.department = selectedDepartment;
      if (selectedProgramType) filters.program_type = selectedProgramType;
      if (selectedAcademicYear) filters.academic_year = selectedAcademicYear;
      
      const [batchesData, subjectsData] = await Promise.all([
        BatchesService.getAll(filters),
        SubjectsService.getAll()
      ]);
      
      setBatches(batchesData);
      setSubjects(subjectsData);
    } catch (error) {
      console.error('Failed to load batches:', error);
      toast.error('Failed to load batches data');
    } finally {
      setLoading(false);
    }
  };

  // Filter batches based on search term
  const filteredBatches = batches.filter(batch =>
    batch.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    batch.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get unique departments
  const departments = Array.from(new Set(batches.map(batch => batch.department)));

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (selectedBatch) {
        // Update existing batch
        await BatchesService.update(selectedBatch.id, formData);
        toast.success('Batch updated successfully');
        setShowEditModal(false);
      } else {
        // Create new batch
        await BatchesService.create(formData);
        toast.success('Batch created successfully');
        setShowCreateModal(false);
      }
      
      await loadData();
      resetForm();
    } catch (error: any) {
      console.error('Failed to save batch:', error);
      toast.error(error.message || 'Failed to save batch');
    }
  };

  const handleEdit = (batch: Batch) => {
    setSelectedBatch(batch);
    setFormData({
      name: batch.name,
      department: batch.department,
      program_type: batch.program_type,
      year: batch.year,
      semester: batch.semester,
      strength: batch.strength,
      shift_type: batch.shift_type,
      academic_year: batch.academic_year,
      notes: batch.notes || '',
    });
    setShowEditModal(true);
  };

  const handleDelete = async (batch: Batch) => {
    if (!confirm(`Are you sure you want to delete batch "${batch.name}"?`)) {
      return;
    }

    try {
      await BatchesService.delete(batch.id);
      toast.success('Batch deleted successfully');
      await loadData();
    } catch (error: any) {
      console.error('Failed to delete batch:', error);
      toast.error(error.message || 'Failed to delete batch');
    }
  };

  const handleViewSubjects = async (batch: Batch) => {
    try {
      setSelectedBatch(batch);
      const subjects = await BatchesService.getBatchSubjects(batch.id);
      setBatchSubjects(subjects);
      setShowSubjectsModal(true);
    } catch (error: any) {
      console.error('Failed to load batch subjects:', error);
      toast.error('Failed to load batch subjects');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      department: '',
      program_type: 'UG',
      year: 1,
      semester: 1,
      strength: 0,
      shift_type: 'morning',
      academic_year: '2024-25',
      notes: '',
    });
    setSelectedBatch(null);
  };

  const getProgramIcon = (programType: ProgramType) => {
    switch (programType) {
      case 'UG': return <Users className="w-4 h-4 text-blue-600" />;
      case 'PG': return <GraduationCap className="w-4 h-4 text-green-600" />;
      case 'PhD': return <BookOpen className="w-4 h-4 text-purple-600" />;
    }
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
            Batches Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage student groups and their subject assignments
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="mt-4 sm:mt-0 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Batch
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search batches..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          {/* Department Filter */}
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">All Departments</option>
            {departments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>

          {/* Program Type Filter */}
          <select
            value={selectedProgramType}
            onChange={(e) => setSelectedProgramType(e.target.value as ProgramType | '')}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">All Programs</option>
            <option value="UG">Undergraduate</option>
            <option value="PG">Postgraduate</option>
            <option value="PhD">Doctorate</option>
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

      {/* Batches Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredBatches.map((batch) => (
          <div
            key={batch.id}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow"
          >
            {/* Batch Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                {getProgramIcon(batch.program_type)}
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {batch.name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {batch.department}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {batch.is_active ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-gray-400" />
                )}
              </div>
            </div>

            {/* Batch Details */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Year/Semester:</span>
                <span className="text-gray-900 dark:text-white font-medium">
                  Year {batch.year}, Sem {batch.semester}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Strength:</span>
                <span className="text-gray-900 dark:text-white font-medium">
                  {batch.strength} students
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Shift:</span>
                {getShiftBadge(batch.shift_type)}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleViewSubjects(batch)}
                className="flex-1 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-3 py-2 rounded text-sm font-medium transition-colors"
              >
                <BookOpen className="w-4 h-4 inline mr-1" />
                Subjects
              </button>
              <button
                onClick={() => handleEdit(batch)}
                className="p-2 text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDelete(batch)}
                className="p-2 text-gray-600 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredBatches.length === 0 && (
        <div className="text-center py-12">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No batches found
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {searchTerm || selectedDepartment || selectedProgramType
              ? 'Try adjusting your filters or search term'
              : 'Get started by creating your first batch'
            }
          </p>
          {!searchTerm && !selectedDepartment && !selectedProgramType && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg"
            >
              Create Batch
            </button>
          )}
        </div>
      )}

      {/* Create/Edit Batch Modal */}
      <Modal
        isOpen={showCreateModal || showEditModal}
        onClose={() => {
          setShowCreateModal(false);
          setShowEditModal(false);
          resetForm();
        }}
        title={selectedBatch ? 'Edit Batch' : 'Create New Batch'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Batch Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Batch Name
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., CSE-A-2024"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            {/* Department */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Department
              </label>
              <input
                type="text"
                required
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                placeholder="e.g., Computer Science"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            {/* Program Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Program Type
              </label>
              <select
                required
                value={formData.program_type}
                onChange={(e) => setFormData({ ...formData, program_type: e.target.value as ProgramType })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="UG">Undergraduate</option>
                <option value="PG">Postgraduate</option>
                <option value="PhD">Doctorate</option>
              </select>
            </div>

            {/* Year */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Year
              </label>
              <select
                required
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {[1, 2, 3, 4, 5, 6].map(year => (
                  <option key={year} value={year}>Year {year}</option>
                ))}
              </select>
            </div>

            {/* Semester */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Semester
              </label>
              <select
                required
                value={formData.semester}
                onChange={(e) => setFormData({ ...formData, semester: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(sem => (
                  <option key={sem} value={sem}>Semester {sem}</option>
                ))}
              </select>
            </div>

            {/* Strength */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Student Strength
              </label>
              <input
                type="number"
                required
                min="1"
                max="200"
                value={formData.strength}
                onChange={(e) => setFormData({ ...formData, strength: parseInt(e.target.value) })}
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
                value={formData.shift_type}
                onChange={(e) => setFormData({ ...formData, shift_type: e.target.value as ShiftType })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="morning">Morning</option>
                <option value="evening">Evening</option>
                <option value="full_day">Full Day</option>
              </select>
            </div>

            {/* Academic Year */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Academic Year
              </label>
              <input
                type="text"
                required
                value={formData.academic_year}
                onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })}
                placeholder="e.g., 2024-25"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Additional notes about this batch..."
            />
          </div>

          {/* Form Actions */}
          <div className="flex items-center gap-3 pt-4">
            <button
              type="submit"
              className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md font-medium"
            >
              {selectedBatch ? 'Update Batch' : 'Create Batch'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowCreateModal(false);
                setShowEditModal(false);
                resetForm();
              }}
              className="bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-md font-medium"
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>

      {/* Batch Subjects Modal */}
      <Modal
        isOpen={showSubjectsModal}
        onClose={() => setShowSubjectsModal(false)}
        title={`Subjects - ${selectedBatch?.name}`}
        size="lg"
      >
        <div className="space-y-4">
          {batchSubjects.length > 0 ? (
            <div className="space-y-3">
              {batchSubjects.map((batchSubject) => (
                <div
                  key={batchSubject.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <BookOpen className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {batchSubject.subject?.name}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {batchSubject.subject?.code}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {batchSubject.is_mandatory && (
                      <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                        Mandatory
                      </span>
                    )}
                    {batchSubject.is_elective && (
                      <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                        Elective
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                No subjects assigned to this batch yet.
              </p>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}