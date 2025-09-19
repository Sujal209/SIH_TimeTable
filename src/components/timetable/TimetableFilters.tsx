import React from 'react';
import { Filter, X } from 'lucide-react';
import { Teacher, Classroom } from '../../types';

interface TimetableFiltersProps {
  filters: {
    department: string;
    teacher: string;
    classroom: string;
    showBreaks: boolean;
  };
  onFiltersChange: (filters: {
    department: string;
    teacher: string;
    classroom: string;
    showBreaks: boolean;
  }) => void;
  teachers: Teacher[];
  classrooms: Classroom[];
  departments: string[];
}

export function TimetableFilters({ 
  filters, 
  onFiltersChange, 
  teachers, 
  classrooms, 
  departments 
}: TimetableFiltersProps) {
  const hasActiveFilters = filters.department || filters.teacher || filters.classroom;

  const clearFilters = () => {
    onFiltersChange({
      department: '',
      teacher: '',
      classroom: '',
      showBreaks: filters.showBreaks,
    });
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Filter className="h-5 w-5 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Filters
          </h3>
        </div>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="inline-flex items-center px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <X className="h-4 w-4 mr-1" />
            Clear
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Department Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
            Department
          </label>
          <select
            value={filters.department}
            onChange={(e) => onFiltersChange({ ...filters, department: e.target.value })}
            className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="">All Departments</option>
            {departments.map(department => (
              <option key={department} value={department}>
                {department}
              </option>
            ))}
          </select>
        </div>

        {/* Teacher Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
            Teacher
          </label>
          <select
            value={filters.teacher}
            onChange={(e) => onFiltersChange({ ...filters, teacher: e.target.value })}
            className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="">All Teachers</option>
            {teachers.map(teacher => (
              <option key={teacher.id} value={teacher.id}>
                {teacher.name}
              </option>
            ))}
          </select>
        </div>

        {/* Classroom Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
            Classroom
          </label>
          <select
            value={filters.classroom}
            onChange={(e) => onFiltersChange({ ...filters, classroom: e.target.value })}
            className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="">All Classrooms</option>
            {classrooms.map(classroom => (
              <option key={classroom.id} value={classroom.id}>
                {classroom.name}
              </option>
            ))}
          </select>
        </div>

        {/* Show Breaks Toggle */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
            Options
          </label>
          <div className="flex items-center">
            <input
              id="show-breaks"
              type="checkbox"
              checked={filters.showBreaks}
              onChange={(e) => onFiltersChange({ ...filters, showBreaks: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
            />
            <label htmlFor="show-breaks" className="ml-2 block text-sm text-gray-900 dark:text-white">
              Show break periods
            </label>
          </div>
        </div>
      </div>

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Active filters:</span>
            {filters.department && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200">
                Department: {filters.department}
                <button
                  onClick={() => onFiltersChange({ ...filters, department: '' })}
                  className="ml-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {filters.teacher && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200">
                Teacher: {teachers.find(t => t.id === filters.teacher)?.name}
                <button
                  onClick={() => onFiltersChange({ ...filters, teacher: '' })}
                  className="ml-1 text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {filters.classroom && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200">
                Classroom: {classrooms.find(c => c.id === filters.classroom)?.name}
                <button
                  onClick={() => onFiltersChange({ ...filters, classroom: '' })}
                  className="ml-1 text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-200"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}