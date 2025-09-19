import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Settings, User, BookOpen, MapPin } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { TeachersService } from '../lib/services/teachersService';
import { Teacher } from '../types';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import TimetableGrid from '../components/timetable/TimetableGrid';

const TeacherDashboard: React.FC = () => {
  const { user } = useAuth();
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTeacherData();
  }, [user]);

  const loadTeacherData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const teacherData = await TeachersService.getByUserId(user.id);
      setTeacher(teacherData);
    } catch (error) {
      console.error('Failed to load teacher data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!teacher) {
    return (
      <div className="text-center py-12">
        <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          Teacher Profile Not Found
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Please contact your administrator to set up your teacher profile.
        </p>
      </div>
    );
  }

  const todaySchedule = [
    {
      id: '1',
      time: '09:00 - 09:50',
      subject: 'Data Structures',
      room: 'Room 101',
      type: 'theory' as const,
    },
    {
      id: '2',
      time: '11:00 - 12:40',
      subject: 'Database Management Lab',
      room: 'Lab 201',
      type: 'lab' as const,
    },
    {
      id: '3',
      time: '14:30 - 15:20',
      subject: 'Software Engineering',
      room: 'Room 203',
      type: 'theory' as const,
    },
  ];

  const weeklyStats = {
    totalHours: 18,
    totalSubjects: 4,
    labHours: 6,
    theoryHours: 12,
  };

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Welcome, {teacher.name}!
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {teacher.department} Department • {new Date().toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Clock className="w-8 h-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Weekly Hours</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{weeklyStats.totalHours}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <BookOpen className="w-8 h-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Subjects</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{weeklyStats.totalSubjects}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Calendar className="w-8 h-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Theory Hours</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{weeklyStats.theoryHours}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Settings className="w-8 h-8 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Lab Hours</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{weeklyStats.labHours}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Schedule */}
        <div className="card p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
            <Calendar className="w-5 h-5 mr-2" />
            Today's Schedule
          </h3>
          
          {todaySchedule.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-sm text-gray-500 dark:text-gray-400">No classes scheduled for today</p>
            </div>
          ) : (
            <div className="space-y-4">
              {todaySchedule.map((slot) => (
                <div key={slot.id} className="flex items-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex-shrink-0">
                    <Clock className="w-5 h-5 text-primary-600" />
                  </div>
                  <div className="ml-4 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {slot.subject}
                        {slot.type === 'lab' && (
                          <span className="ml-2 px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 text-xs rounded">
                            LAB
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {slot.time}
                      </p>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center mt-1">
                      <MapPin className="w-4 h-4 mr-1" />
                      {slot.room}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Teacher Information */}
        <div className="card p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
            <User className="w-5 h-5 mr-2" />
            Profile Information
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Name</label>
              <p className="text-gray-900 dark:text-white">{teacher.name}</p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Email</label>
              <p className="text-gray-900 dark:text-white">{teacher.email}</p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Department</label>
              <p className="text-gray-900 dark:text-white">{teacher.department}</p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Max Hours/Day</label>
              <p className="text-gray-900 dark:text-white">{teacher.max_hours_per_day} hours</p>
            </div>
            
            {teacher.phone && (
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Phone</label>
                <p className="text-gray-900 dark:text-white">{teacher.phone}</p>
              </div>
            )}
          </div>
          
          <button className="mt-4 btn btn-secondary w-full">
            <Settings className="w-4 h-4 mr-2" />
            Update Preferences
          </button>
        </div>
      </div>

      {/* Weekly Timetable */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
            <Calendar className="w-5 h-5 mr-2" />
            Weekly Timetable
          </h3>
        </div>
        
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Timetable Not Available
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Your weekly timetable will appear here once it's generated by the administrator.
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500">
            Contact your administrator if you need assistance accessing your timetable.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;