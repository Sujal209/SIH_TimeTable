import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Building2, Users, Monitor, Settings } from 'lucide-react';
import { Classroom } from '../types';
import { ClassroomsService } from '../lib/services/classroomsService';
import Modal from '../components/ui/Modal';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ClassroomForm from '../components/admin/ClassroomForm';
import toast from 'react-hot-toast';

const Classrooms: React.FC = () => {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingClassroom, setEditingClassroom] = useState<Classroom | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [classroomToDelete, setClassroomToDelete] = useState<Classroom | null>(null);

  useEffect(() => {
    loadClassrooms();
  }, []);

  const loadClassrooms = async () => {
    try {
      setLoading(true);
      const data = await ClassroomsService.getAll();
      setClassrooms(data);
    } catch (error) {
      console.error('Failed to load classrooms:', error);
      toast.error('Failed to load classrooms');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClassroom = () => {
    setEditingClassroom(null);
    setIsFormOpen(true);
  };

  const handleEditClassroom = (classroom: Classroom) => {
    setEditingClassroom(classroom);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (success: boolean) => {
    if (success) {
      await loadClassrooms();
      setIsFormOpen(false);
      setEditingClassroom(null);
    }
  };

  const handleDeleteClick = (classroom: Classroom) => {
    setClassroomToDelete(classroom);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!classroomToDelete) return;

    try {
      await ClassroomsService.delete(classroomToDelete.id);
      toast.success('Classroom deleted successfully');
      await loadClassrooms();
    } catch (error) {
      console.error('Failed to delete classroom:', error);
      toast.error('Failed to delete classroom');
    } finally {
      setDeleteConfirmOpen(false);
      setClassroomToDelete(null);
    }
  };

  const filteredClassrooms = classrooms.filter(classroom =>
    classroom.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    classroom.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
    classroom.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getTypeStats = () => {
    const types = classrooms.reduce((acc, classroom) => {
      acc[classroom.type] = (acc[classroom.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return types;
  };

  const getDepartmentStats = () => {
    const departments = classrooms.reduce((acc, classroom) => {
      acc[classroom.department] = (acc[classroom.department] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return departments;
  };

  const typeStats = getTypeStats();
  const departmentStats = getDepartmentStats();
  const totalCapacity = classrooms.reduce((acc, c) => acc + c.capacity, 0);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'lecture': return <Building2 className="w-5 h-5 text-blue-600" />;
      case 'lab': return <Monitor className="w-5 h-5 text-green-600" />;
      case 'seminar': return <Users className="w-5 h-5 text-purple-600" />;
      default: return <Building2 className="w-5 h-5 text-gray-600" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'lecture': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'lab': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'seminar': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

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
            Classrooms Management
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Manage classroom facilities and equipment
          </p>
        </div>
        <button
          onClick={handleCreateClassroom}
          className="mt-4 sm:mt-0 btn btn-primary flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Classroom
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Building2 className="w-8 h-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Classrooms</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{classrooms.length}</p>
            </div>
          </div>
        </div>
        
        <div className="card p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Users className="w-8 h-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Capacity</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{totalCapacity}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Monitor className="w-8 h-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Lab Rooms</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{typeStats.lab || 0}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Settings className="w-8 h-8 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Departments</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {Object.keys(departmentStats).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search classrooms..."
            className="input pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Classrooms Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filteredClassrooms.length === 0 ? (
          <div className="col-span-full">
            <div className="card p-12 text-center">
              <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {searchQuery ? 'No classrooms found matching your search.' : 'No classrooms added yet.'}
              </p>
              {!searchQuery && (
                <button
                  onClick={handleCreateClassroom}
                  className="mt-4 btn btn-primary"
                >
                  Add First Classroom
                </button>
              )}
            </div>
          </div>
        ) : (
          filteredClassrooms.map((classroom) => (
            <div key={classroom.id} className="card p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  {getTypeIcon(classroom.type)}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {classroom.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {classroom.department}
                    </p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEditClassroom(classroom)}
                    className="text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteClick(classroom)}
                    className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {/* Type Badge */}
                <div className="flex items-center justify-between">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(classroom.type)}`}>
                    {classroom.type.charAt(0).toUpperCase() + classroom.type.slice(1)}
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Capacity: {classroom.capacity}
                  </span>
                </div>

                {/* Equipment */}
                {classroom.equipment.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Equipment:</p>
                    <div className="flex flex-wrap gap-1">
                      {classroom.equipment.slice(0, 3).map((item, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                        >
                          {item}
                        </span>
                      ))}
                      {classroom.equipment.length > 3 && (
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                          +{classroom.equipment.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Classroom Form Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingClassroom ? 'Edit Classroom' : 'Add New Classroom'}
      >
        <ClassroomForm
          classroom={editingClassroom}
          onSubmit={handleFormSubmit}
          onCancel={() => setIsFormOpen(false)}
        />
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        title="Delete Classroom"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Are you sure you want to delete "{classroomToDelete?.name}"? This action cannot be undone.
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

export default Classrooms;