import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { TeacherFormData, Teacher } from '../../types';
import { TeachersService } from '../../lib/services/teachersService';
import LoadingSpinner from '../ui/LoadingSpinner';
import toast from 'react-hot-toast';

const teacherSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  department: z.string().min(2, 'Department must be at least 2 characters'),
  phone: z.string().optional(),
  max_hours_per_day: z.number().min(1, 'Must be at least 1 hour').max(12, 'Cannot exceed 12 hours'),
});

interface TeacherFormProps {
  teacher?: Teacher | null;
  onSubmit: (success: boolean) => void;
  onCancel: () => void;
}

const TeacherForm: React.FC<TeacherFormProps> = ({ teacher, onSubmit, onCancel }) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
  } = useForm<TeacherFormData>({
    resolver: zodResolver(teacherSchema),
    defaultValues: {
      name: teacher?.name || '',
      email: teacher?.email || '',
      department: teacher?.department || '',
      phone: teacher?.phone || '',
      max_hours_per_day: teacher?.max_hours_per_day || 8,
    },
  });

  const departments = [
    'Computer Science',
    'Information Technology',
    'Electronics',
    'Electrical',
    'Mechanical',
    'Civil',
    'Mathematics',
    'Physics',
    'Chemistry',
    'English',
    'Business Administration',
    'Management',
  ];

  const onFormSubmit = async (data: TeacherFormData) => {
    try {
      if (teacher) {
        await TeachersService.update(teacher.id, data);
        toast.success('Teacher updated successfully');
      } else {
        await TeachersService.create(data);
        toast.success('Teacher created successfully');
      }
      onSubmit(true);
    } catch (error: any) {
      console.error('Failed to save teacher:', error);
      toast.error(error.message || 'Failed to save teacher');
      onSubmit(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Full Name *
          </label>
          <input
            {...register('name')}
            type="text"
            id="name"
            className="input"
            placeholder="Enter teacher's full name"
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {errors.name.message}
            </p>
          )}
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Email Address *
          </label>
          <input
            {...register('email')}
            type="email"
            id="email"
            className="input"
            placeholder="Enter email address"
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {errors.email.message}
            </p>
          )}
        </div>

        {/* Department */}
        <div>
          <label htmlFor="department" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Department *
          </label>
          <select
            {...register('department')}
            id="department"
            className="input"
          >
            <option value="">Select Department</option>
            {departments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
          {errors.department && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {errors.department.message}
            </p>
          )}
        </div>

        {/* Phone */}
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Phone Number
          </label>
          <input
            {...register('phone')}
            type="tel"
            id="phone"
            className="input"
            placeholder="Enter phone number (optional)"
          />
          {errors.phone && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {errors.phone.message}
            </p>
          )}
        </div>

        {/* Max Hours Per Day */}
        <div className="md:col-span-2">
          <label htmlFor="max_hours_per_day" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Maximum Hours Per Day *
          </label>
          <div className="flex items-center space-x-4">
            <input
              {...register('max_hours_per_day', { valueAsNumber: true })}
              type="number"
              id="max_hours_per_day"
              min="1"
              max="12"
              className="input w-32"
            />
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Maximum teaching hours allowed per day (1-12 hours)
            </span>
          </div>
          {errors.max_hours_per_day && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {errors.max_hours_per_day.message}
            </p>
          )}
        </div>
      </div>

      {/* Additional Information */}
      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
        <h4 className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-2">
          Additional Information
        </h4>
        <ul className="text-xs text-blue-800 dark:text-blue-300 space-y-1">
          <li>• Teachers can set their preferred time slots and unavailable periods after creation</li>
          <li>• Maximum hours per day helps the timetable algorithm distribute workload evenly</li>
          <li>• Teachers will receive login credentials via email to access their dashboard</li>
        </ul>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={onCancel}
          className="btn btn-secondary"
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="btn btn-primary flex items-center"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <LoadingSpinner size="sm" className="mr-2" />
              {teacher ? 'Updating...' : 'Creating...'}
            </>
          ) : (
            teacher ? 'Update Teacher' : 'Create Teacher'
          )}
        </button>
      </div>
    </form>
  );
};

export default TeacherForm;