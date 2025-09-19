import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Plus } from 'lucide-react';
import { ClassroomFormData, Classroom } from '../../types';
import { ClassroomsService } from '../../lib/services/classroomsService';
import LoadingSpinner from '../ui/LoadingSpinner';
import toast from 'react-hot-toast';

const classroomSchema = z.object({
  name: z.string().min(2, 'Classroom name must be at least 2 characters'),
  capacity: z.number().min(1, 'Capacity must be at least 1').max(500, 'Capacity cannot exceed 500'),
  type: z.enum(['lecture', 'lab', 'seminar'], {
    required_error: 'Please select a classroom type',
  }),
  department: z.string().min(2, 'Department must be at least 2 characters'),
  equipment: z.array(z.string()).default([]),
});

interface ClassroomFormProps {
  classroom?: Classroom | null;
  onSubmit: (success: boolean) => void;
  onCancel: () => void;
}

const ClassroomForm: React.FC<ClassroomFormProps> = ({ classroom, onSubmit, onCancel }) => {
  const [newEquipment, setNewEquipment] = useState('');
  const [equipmentList, setEquipmentList] = useState<string[]>(
    classroom?.equipment || []
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
  } = useForm<ClassroomFormData>({
    resolver: zodResolver(classroomSchema),
    defaultValues: {
      name: classroom?.name || '',
      capacity: classroom?.capacity || 30,
      type: classroom?.type || 'lecture',
      department: classroom?.department || '',
      equipment: classroom?.equipment || [],
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

  const commonEquipment = {
    lecture: [
      'Projector',
      'Whiteboard',
      'Audio System',
      'Air Conditioning',
      'Podium',
      'Microphone',
    ],
    lab: [
      'Computers',
      'Projector',
      'Whiteboard',
      'Air Conditioning',
      'Lab Equipment',
      'Internet Connection',
      'Power Outlets',
      'Safety Equipment',
    ],
    seminar: [
      'Projector',
      'Whiteboard',
      'Audio System',
      'Air Conditioning',
      'Round Tables',
      'Microphone',
      'Video Conference Setup',
    ],
  };

  const selectedType = watch('type');

  const addEquipment = () => {
    if (newEquipment.trim() && !equipmentList.includes(newEquipment.trim())) {
      const updatedList = [...equipmentList, newEquipment.trim()];
      setEquipmentList(updatedList);
      setValue('equipment', updatedList);
      setNewEquipment('');
    }
  };

  const removeEquipment = (index: number) => {
    const updatedList = equipmentList.filter((_, i) => i !== index);
    setEquipmentList(updatedList);
    setValue('equipment', updatedList);
  };

  const addCommonEquipment = (equipment: string) => {
    if (!equipmentList.includes(equipment)) {
      const updatedList = [...equipmentList, equipment];
      setEquipmentList(updatedList);
      setValue('equipment', updatedList);
    }
  };

  const onFormSubmit = async (data: ClassroomFormData) => {
    try {
      const formData = {
        ...data,
        equipment: equipmentList,
      };

      if (classroom) {
        await ClassroomsService.update(classroom.id, formData);
        toast.success('Classroom updated successfully');
      } else {
        await ClassroomsService.create(formData);
        toast.success('Classroom created successfully');
      }
      onSubmit(true);
    } catch (error: any) {
      console.error('Failed to save classroom:', error);
      toast.error(error.message || 'Failed to save classroom');
      onSubmit(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Classroom Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Classroom Name *
          </label>
          <input
            {...register('name')}
            type="text"
            id="name"
            className="input"
            placeholder="e.g., Room 101, Lab A"
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {errors.name.message}
            </p>
          )}
        </div>

        {/* Capacity */}
        <div>
          <label htmlFor="capacity" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Capacity *
          </label>
          <div className="flex items-center space-x-4">
            <input
              {...register('capacity', { valueAsNumber: true })}
              type="number"
              id="capacity"
              min="1"
              max="500"
              className="input w-32"
            />
            <span className="text-sm text-gray-500 dark:text-gray-400">
              students
            </span>
          </div>
          {errors.capacity && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {errors.capacity.message}
            </p>
          )}
        </div>

        {/* Type */}
        <div>
          <label htmlFor="type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Room Type *
          </label>
          <select
            {...register('type')}
            id="type"
            className="input"
          >
            <option value="">Select Type</option>
            <option value="lecture">Lecture Hall</option>
            <option value="lab">Laboratory</option>
            <option value="seminar">Seminar Room</option>
          </select>
          {errors.type && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {errors.type.message}
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
      </div>

      {/* Equipment Section */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Equipment & Facilities
          </label>

          {/* Common Equipment Suggestions */}
          {selectedType && commonEquipment[selectedType] && (
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-2">
                Common equipment for {selectedType} rooms:
              </p>
              <div className="flex flex-wrap gap-2">
                {commonEquipment[selectedType].map((equipment) => (
                  <button
                    key={equipment}
                    type="button"
                    onClick={() => addCommonEquipment(equipment)}
                    className="text-xs px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-800 dark:bg-blue-800 dark:hover:bg-blue-700 dark:text-blue-200 rounded transition-colors"
                    disabled={equipmentList.includes(equipment)}
                  >
                    {equipmentList.includes(equipment) ? '✓ ' : '+ '}
                    {equipment}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Add Custom Equipment */}
          <div className="flex space-x-2">
            <input
              type="text"
              value={newEquipment}
              onChange={(e) => setNewEquipment(e.target.value)}
              placeholder="Add equipment (e.g., Projector, Whiteboard)"
              className="input flex-1"
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addEquipment())}
            />
            <button
              type="button"
              onClick={addEquipment}
              className="btn btn-secondary flex items-center"
              disabled={!newEquipment.trim()}
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Equipment List */}
          {equipmentList.length > 0 && (
            <div className="mt-3">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Added equipment ({equipmentList.length}):
              </p>
              <div className="flex flex-wrap gap-2">
                {equipmentList.map((equipment, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                  >
                    {equipment}
                    <button
                      type="button"
                      onClick={() => removeEquipment(index)}
                      className="ml-2 text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Additional Information */}
      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
        <h4 className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-2">
          Classroom Guidelines
        </h4>
        <ul className="text-xs text-blue-800 dark:text-blue-300 space-y-1">
          <li>• Lecture halls are suitable for theory classes and presentations</li>
          <li>• Labs require special equipment and are used for practical sessions</li>
          <li>• Seminar rooms are designed for small group discussions and workshops</li>
          <li>• Equipment list helps in scheduling appropriate classes to rooms</li>
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
              {classroom ? 'Updating...' : 'Creating...'}
            </>
          ) : (
            classroom ? 'Update Classroom' : 'Create Classroom'
          )}
        </button>
      </div>
    </form>
  );
};

export default ClassroomForm;