import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { SubjectFormData, Subject, Teacher } from '../../types';
import { SubjectsService } from '../../lib/services/subjectsService';
import LoadingSpinner from '../ui/LoadingSpinner';
import toast from 'react-hot-toast';

const subjectSchema = z.object({
  name: z.string().min(2, 'Subject name must be at least 2 characters'),
  code: z.string().min(2, 'Subject code must be at least 2 characters').max(10, 'Subject code cannot exceed 10 characters'),
  department: z.string().min(2, 'Department must be at least 2 characters'),
  semester: z.number().min(1, 'Semester must be between 1 and 8').max(8, 'Semester must be between 1 and 8'),
  hours_per_week: z.number().min(0, 'Theory hours cannot be negative').max(20, 'Theory hours cannot exceed 20'),
  lab_hours_per_week: z.number().min(0, 'Lab hours cannot be negative').max(20, 'Lab hours cannot exceed 20'),
  teacher_id: z.string().min(1, 'Please select a teacher'),
});

interface SubjectFormProps {
  subject?: Subject | null;
  teachers: Teacher[];
  onSubmit: (success: boolean) => void;
  onCancel: () => void;
}

const SubjectForm: React.FC<SubjectFormProps> = ({ subject, teachers, onSubmit, onCancel }) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
  } = useForm<SubjectFormData>({
    resolver: zodResolver(subjectSchema),
    defaultValues: {
      name: subject?.name || '',
      code: subject?.code || '',
      department: subject?.department || '',
      semester: subject?.semester || 1,
      hours_per_week: subject?.hours_per_week || 0,
      lab_hours_per_week: subject?.lab_hours_per_week || 0,
      teacher_id: subject?.teacher_id || '',
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

  const semesters = [1, 2, 3, 4, 5, 6, 7, 8];

  const selectedDepartment = watch('department');

  // Filter teachers by department
  const filteredTeachers = teachers.filter(teacher => 
    !selectedDepartment || teacher.department === selectedDepartment
  );

  const onFormSubmit = async (data: SubjectFormData) => {
    try {
      if (subject) {
        await SubjectsService.update(subject.id, data);
        toast.success('Subject updated successfully');
      } else {
        await SubjectsService.create(data);
        toast.success('Subject created successfully');
      }
      onSubmit(true);
    } catch (error: any) {
      console.error('Failed to save subject:', error);
      toast.error(error.message || 'Failed to save subject');
      onSubmit(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Subject Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Subject Name *
          </label>
          <input
            {...register('name')}
            type="text"
            id="name"
            className="input"
            placeholder="e.g., Data Structures and Algorithms"
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {errors.name.message}
            </p>
          )}
        </div>

        {/* Subject Code */}
        <div>
          <label htmlFor="code" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Subject Code *
          </label>
          <input
            {...register('code')}
            type="text"
            id="code"
            className="input"
            placeholder="e.g., CS301"
          />
          {errors.code && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {errors.code.message}
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

        {/* Semester */}
        <div>
          <label htmlFor="semester" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Semester *
          </label>
          <select
            {...register('semester', { valueAsNumber: true })}
            id="semester"
            className="input"
          >
            <option value="">Select Semester</option>
            {semesters.map((sem) => (
              <option key={sem} value={sem}>
                Semester {sem}
              </option>
            ))}
          </select>
          {errors.semester && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {errors.semester.message}
            </p>
          )}
        </div>

        {/* Teacher */}
        <div className="md:col-span-2">
          <label htmlFor="teacher_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Assigned Teacher *
          </label>
          <select
            {...register('teacher_id')}
            id="teacher_id"
            className="input"
          >
            <option value="">Select Teacher</option>
            {filteredTeachers.length > 0 ? (
              filteredTeachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.name} - {teacher.department}
                </option>
              ))
            ) : selectedDepartment ? (
              <option disabled>No teachers available for {selectedDepartment}</option>
            ) : (
              <option disabled>Select department first</option>
            )}
          </select>
          {errors.teacher_id && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {errors.teacher_id.message}
            </p>
          )}
          {selectedDepartment && filteredTeachers.length === 0 && (
            <p className="mt-1 text-sm text-amber-600 dark:text-amber-400">
              No teachers found for {selectedDepartment} department. Add teachers first.
            </p>
          )}
        </div>

        {/* Theory Hours */}
        <div>
          <label htmlFor="hours_per_week" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Theory Hours per Week *
          </label>
          <div className="flex items-center space-x-4">
            <input
              {...register('hours_per_week', { valueAsNumber: true })}
              type="number"
              id="hours_per_week"
              min="0"
              max="20"
              className="input w-32"
            />
            <span className="text-sm text-gray-500 dark:text-gray-400">
              hours/week
            </span>
          </div>
          {errors.hours_per_week && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {errors.hours_per_week.message}
            </p>
          )}
        </div>

        {/* Lab Hours */}
        <div>
          <label htmlFor="lab_hours_per_week" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Lab Hours per Week *
          </label>
          <div className="flex items-center space-x-4">
            <input
              {...register('lab_hours_per_week', { valueAsNumber: true })}
              type="number"
              id="lab_hours_per_week"
              min="0"
              max="20"
              className="input w-32"
            />
            <span className="text-sm text-gray-500 dark:text-gray-400">
              hours/week
            </span>
          </div>
          {errors.lab_hours_per_week && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {errors.lab_hours_per_week.message}
            </p>
          )}
        </div>
      </div>

      {/* Additional Information */}
      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
        <h4 className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-2">
          Subject Information
        </h4>
        <ul className="text-xs text-blue-800 dark:text-blue-300 space-y-1">
          <li>• Theory hours determine regular lecture slots in the timetable</li>
          <li>• Lab hours require consecutive time slots and lab-type classrooms</li>
          <li>• Teachers will be assigned based on department matching</li>
          <li>• Subject codes should be unique across all subjects</li>
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
          className="btn btn-primary"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <LoadingSpinner size="sm" className="mr-2" />
              {subject ? 'Updating...' : 'Creating...'}
            </>
          ) : (
            subject ? 'Update Subject' : 'Create Subject'
          )}
        </button>
      </div>
    </form>
  );
};

export default SubjectForm;