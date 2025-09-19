import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { TimeSlotFormData, TimeSlot } from '../../types';
import { TimeSlotsService } from '../../lib/services/timeSlotsService';
import LoadingSpinner from '../ui/LoadingSpinner';
import toast from 'react-hot-toast';

const timeSlotSchema = z.object({
  day: z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'], {
    required_error: 'Please select a day',
  }),
  start_time: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please enter a valid time (HH:mm)'),
  end_time: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please enter a valid time (HH:mm)'),
  slot_type: z.enum(['class', 'break', 'lab']).default('class'),
}).refine((data) => {
  const startTime = new Date(`2000-01-01 ${data.start_time}`);
  const endTime = new Date(`2000-01-01 ${data.end_time}`);
  return startTime < endTime;
}, {
  message: 'End time must be after start time',
  path: ['end_time'],
});

interface TimeSlotFormProps {
  timeSlot?: TimeSlot | null;
  onSubmit: (success: boolean) => void;
  onCancel: () => void;
}

const TimeSlotForm: React.FC<TimeSlotFormProps> = ({ timeSlot, onSubmit, onCancel }) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
  } = useForm<TimeSlotFormData>({
    resolver: zodResolver(timeSlotSchema),
    defaultValues: {
      day: timeSlot?.day || 'monday',
      start_time: timeSlot?.start_time || '',
      end_time: timeSlot?.end_time || '',
      slot_type: timeSlot?.is_break ? 'break' : 'class',
    },
  });

  const days = [
    { value: 'monday', label: 'Monday' },
    { value: 'tuesday', label: 'Tuesday' },
    { value: 'wednesday', label: 'Wednesday' },
    { value: 'thursday', label: 'Thursday' },
    { value: 'friday', label: 'Friday' },
    { value: 'saturday', label: 'Saturday' },
  ];

  const commonTimeSlots = [
    { start: '09:00', end: '09:50', label: '9:00 - 9:50 AM (50 min)' },
    { start: '10:00', end: '10:50', label: '10:00 - 10:50 AM (50 min)' },
    { start: '11:00', end: '11:50', label: '11:00 - 11:50 AM (50 min)' },
    { start: '12:00', end: '12:50', label: '12:00 - 12:50 PM (50 min)' },
    { start: '13:30', end: '14:20', label: '1:30 - 2:20 PM (50 min)' },
    { start: '14:30', end: '15:20', label: '2:30 - 3:20 PM (50 min)' },
    { start: '15:30', end: '16:20', label: '3:30 - 4:20 PM (50 min)' },
    { start: '16:30', end: '17:20', label: '4:30 - 5:20 PM (50 min)' },
  ];

  const commonBreaks = [
    { start: '09:50', end: '10:00', label: '9:50 - 10:00 AM (10 min break)' },
    { start: '10:50', end: '11:00', label: '10:50 - 11:00 AM (10 min break)' },
    { start: '11:50', end: '12:00', label: '11:50 - 12:00 PM (10 min break)' },
    { start: '12:50', end: '13:30', label: '12:50 - 1:30 PM (Lunch - 40 min)' },
    { start: '14:20', end: '14:30', label: '2:20 - 2:30 PM (10 min break)' },
    { start: '15:20', end: '15:30', label: '3:20 - 3:30 PM (10 min break)' },
    { start: '16:20', end: '16:30', label: '4:20 - 4:30 PM (10 min break)' },
  ];

  const commonLabSlots = [
    { start: '09:00', end: '11:00', label: '9:00 - 11:00 AM (2 hours lab)' },
    { start: '11:00', end: '13:00', label: '11:00 - 1:00 PM (2 hours lab)' },
    { start: '13:30', end: '15:30', label: '1:30 - 3:30 PM (2 hours lab)' },
    { start: '14:00', end: '16:00', label: '2:00 - 4:00 PM (2 hours lab)' },
    { start: '15:00', end: '17:00', label: '3:00 - 5:00 PM (2 hours lab)' },
  ];

  const slotTypeValue = watch('slot_type');
  const isBreak = slotTypeValue === 'break';
  const isLab = slotTypeValue === 'lab';

  const calculateDuration = (startTime: string, endTime: string) => {
    if (!startTime || !endTime) return 0;
    
    const start = new Date(`2000-01-01 ${startTime}`);
    const end = new Date(`2000-01-01 ${endTime}`);
    const diffMs = end.getTime() - start.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    return diffMins > 0 ? diffMins : 0;
  };

  const startTime = watch('start_time');
  const endTime = watch('end_time');
  const duration = calculateDuration(startTime, endTime);

  const useCommonSlot = (start: string, end: string) => {
    setValue('start_time', start);
    setValue('end_time', end);
  };

  const onFormSubmit = async (data: TimeSlotFormData) => {
    try {
      const formData = {
        day: data.day,
        start_time: data.start_time,
        end_time: data.end_time,
        is_break: data.slot_type === 'break',
        duration: calculateDuration(data.start_time, data.end_time),
      };

      if (timeSlot) {
        await TimeSlotsService.update(timeSlot.id, formData);
        toast.success('Time slot updated successfully');
      } else {
        await TimeSlotsService.create(formData);
        toast.success('Time slot created successfully');
      }
      onSubmit(true);
    } catch (error: any) {
      console.error('Failed to save time slot:', error);
      toast.error(error.message || 'Failed to save time slot');
      onSubmit(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Day */}
        <div>
          <label htmlFor="day" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Day *
          </label>
          <select
            {...register('day')}
            id="day"
            className="input"
          >
            <option value="">Select Day</option>
            {days.map((day) => (
              <option key={day.value} value={day.value}>
                {day.label}
              </option>
            ))}
          </select>
          {errors.day && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {errors.day.message}
            </p>
          )}
        </div>

        {/* Slot Type */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Slot Type
          </label>
          <div className="flex items-center space-x-6">
            <label className="flex items-center">
              <input
                {...register('slot_type')}
                type="radio"
                value="class"
                className="radio mr-2"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Class Period</span>
              <span className="text-xs text-gray-500 ml-1">(50 min)</span>
            </label>
            <label className="flex items-center">
              <input
                {...register('slot_type')}
                type="radio"
                value="break"
                className="radio mr-2"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Break Period</span>
              <span className="text-xs text-gray-500 ml-1">(10-40 min)</span>
            </label>
            <label className="flex items-center">
              <input
                {...register('slot_type')}
                type="radio"
                value="lab"
                className="radio mr-2"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Lab Session</span>
              <span className="text-xs text-gray-500 ml-1">(120 min)</span>
            </label>
          </div>
        </div>

        {/* Start Time */}
        <div>
          <label htmlFor="start_time" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Start Time *
          </label>
          <input
            {...register('start_time')}
            type="time"
            id="start_time"
            className="input"
          />
          {errors.start_time && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {errors.start_time.message}
            </p>
          )}
        </div>

        {/* End Time */}
        <div>
          <label htmlFor="end_time" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            End Time *
          </label>
          <input
            {...register('end_time')}
            type="time"
            id="end_time"
            className="input"
          />
          {errors.end_time && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {errors.end_time.message}
            </p>
          )}
        </div>
      </div>

      {/* Duration Display */}
      {duration > 0 && (
        <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
          <p className="text-sm font-medium text-green-900 dark:text-green-200">
            Duration: {duration} minutes
          </p>
        </div>
      )}

      {/* Common Time Slots */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Common {isLab ? 'Lab' : isBreak ? 'Break' : 'Class'} Slots
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {(isLab ? commonLabSlots : isBreak ? commonBreaks : commonTimeSlots).map((slot) => (
              <button
                key={`${slot.start}-${slot.end}`}
                type="button"
                onClick={() => useCommonSlot(slot.start, slot.end)}
                className={`text-left text-xs px-3 py-2 rounded border transition-colors ${
                  isLab
                    ? 'bg-purple-50 hover:bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:hover:bg-purple-900/50 dark:text-purple-200 dark:border-purple-700'
                    : isBreak
                    ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:hover:bg-amber-900/50 dark:text-amber-200 dark:border-amber-700'
                    : 'bg-blue-50 hover:bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 dark:text-blue-200 dark:border-blue-700'
                }`}
              >
                {slot.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Additional Information */}
      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
        <h4 className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-2">
          Time Slot Guidelines
        </h4>
        <ul className="text-xs text-blue-800 dark:text-blue-300 space-y-1">
          <li>• <strong>Class periods</strong> are typically 50 minutes long for theory subjects</li>
          <li>• <strong>Lab sessions</strong> are 2 hours (120 minutes) long for practical work</li>
          <li>• <strong>Short breaks</strong> are usually 10 minutes between classes</li>
          <li>• <strong>Lunch break</strong> should be 30-40 minutes long</li>
          <li>• Avoid scheduling overlapping time slots for the same day</li>
          <li>• Lab sessions require consecutive slots and appropriate lab facilities</li>
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
              {timeSlot ? 'Updating...' : 'Creating...'}
            </>
          ) : (
            timeSlot ? 'Update Time Slot' : 'Create Time Slot'
          )}
        </button>
      </div>
    </form>
  );
};

export default TimeSlotForm;