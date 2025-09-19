import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Users, 
  BookOpen, 
  Building, 
  Clock, 
  TrendingUp,
  GraduationCap,
  UserCheck,
  AlertTriangle,
  CheckCircle,
  XCircle,
  PlusCircle,
  BarChart3,
  Activity,
  FileText,
  Settings,
  Bell,
  Coffee,
  MapPin
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { BatchesService } from '../lib/services/batchesService';
import { FacultyAvailabilityService } from '../lib/services/facultyAvailabilityService';
import { TeachersService } from '../lib/services/teachersService';
import { SubjectsService } from '../lib/services/subjectsService';
import { ClassroomsService } from '../lib/services/classroomsService';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import TeacherDashboard from './TeacherDashboard';
import toast from 'react-hot-toast';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    teachers: { total: 0, active: 0 },
    subjects: { total: 0 },
    classrooms: { total: 0 },
    batches: { total: 0, ug: 0, pg: 0, phd: 0 },
    availability: { totalSlots: 0, availableSlots: 0, preferredSlots: 0 },
    leaves: { total: 0, pending: 0, approved: 0, rejected: 0 }
  });

  // Show teacher-specific dashboard for teachers
  if (user?.role === 'teacher') {
    return <TeacherDashboard />;
  }

  // Load dashboard data
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        
        // Load data from all services concurrently
        const [teachersData, subjectsData, classroomsData, batchesData] = await Promise.all([
          TeachersService.getAll().catch(() => []),
          SubjectsService.getAll().catch(() => []),
          ClassroomsService.getAll().catch(() => []),
          BatchesService.getAll().catch(() => [])
        ]);

        // Load availability and leave stats with fallbacks
        const availabilityStats = {
          totalSlots: 0, 
          availableSlots: 0, 
          unavailableSlots: 0, 
          preferredSlots: 0
        };
        
        const leaveStats = {
          totalLeaves: 0, 
          pendingLeaves: 0, 
          approvedLeaves: 0, 
          rejectedLeaves: 0
        };
        
        // Try to get real stats if the methods exist
        try {
          const realAvailabilityStats = await FacultyAvailabilityService.getAvailabilityStatistics?.('2024-25');
          if (realAvailabilityStats) {
            Object.assign(availabilityStats, realAvailabilityStats);
          }
        } catch (error) {
          console.log('Availability stats not available yet');
        }
        
        try {
          const realLeaveStats = await FacultyAvailabilityService.getLeaveStatistics?.('2024-25');
          if (realLeaveStats) {
            Object.assign(leaveStats, realLeaveStats);
          }
        } catch (error) {
          console.log('Leave stats not available yet');
        }

        // Calculate batch statistics
        const batchStats = {
          total: batchesData.length,
          ug: batchesData.filter(b => b.program_type === 'ug').length,
          pg: batchesData.filter(b => b.program_type === 'pg').length,
          phd: batchesData.filter(b => b.program_type === 'phd').length
        };

        // Calculate teacher statistics
        const teacherStats = {
          total: teachersData.length,
          active: teachersData.filter(t => t.is_active).length
        };

        setStats({
          teachers: teacherStats,
          subjects: { total: subjectsData.length },
          classrooms: { total: classroomsData.length },
          batches: batchStats,
          availability: availabilityStats,
          leaves: {
            total: leaveStats.totalLeaves || 0,
            pending: leaveStats.pendingLeaves || 0,
            approved: leaveStats.approvedLeaves || 0,
            rejected: leaveStats.rejectedLeaves || 0
          }
        });
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  const dashboardStats = [
    {
      id: 1,
      name: 'Active Teachers',
      value: (stats.teachers?.active || 0).toString(),
      total: `/${stats.teachers?.total || 0}`,
      icon: Users,
      color: 'bg-blue-500',
      change: `${stats.teachers?.active || 0} active`,
      changeType: 'neutral' as const,
    },
    {
      id: 2,
      name: 'Total Batches',
      value: (stats.batches?.total || 0).toString(),
      total: `UG: ${stats.batches?.ug || 0}, PG: ${stats.batches?.pg || 0}, PhD: ${stats.batches?.phd || 0}`,
      icon: GraduationCap,
      color: 'bg-green-500',
      change: `${(stats.batches?.ug || 0) + (stats.batches?.pg || 0) + (stats.batches?.phd || 0)} programs`,
      changeType: 'positive' as const,
    },
    {
      id: 3,
      name: 'Available Slots',
      value: (stats.availability?.availableSlots || 0).toString(),
      total: `/${stats.availability?.totalSlots || 0}`,
      icon: UserCheck,
      color: 'bg-purple-500',
      change: `${stats.availability?.preferredSlots || 0} preferred`,
      changeType: 'positive' as const,
    },
    {
      id: 4,
      name: 'Pending Leaves',
      value: (stats.leaves?.pending || 0).toString(),
      total: `/${stats.leaves?.total || 0} total`,
      icon: AlertTriangle,
      color: (stats.leaves?.pending || 0) > 0 ? 'bg-orange-500' : 'bg-gray-500',
      change: `${stats.leaves?.approved || 0} approved`,
      changeType: (stats.leaves?.pending || 0) > 0 ? 'warning' as const : 'neutral' as const,
    },
    {
      id: 5,
      name: 'Subjects',
      value: (stats.subjects?.total || 0).toString(),
      total: '',
      icon: BookOpen,
      color: 'bg-indigo-500',
      change: 'Active subjects',
      changeType: 'neutral' as const,
    },
    {
      id: 6,
      name: 'Classrooms',
      value: (stats.classrooms?.total || 0).toString(),
      total: '',
      icon: Building,
      color: 'bg-teal-500',
      change: 'Available rooms',
      changeType: 'neutral' as const,
    },
  ];

  const recentActivities = [
    {
      id: 1,
      action: 'Batch Created',
      description: 'New Computer Science UG batch for 2024-25 created',
      time: '2 hours ago',
      type: 'success',
      icon: GraduationCap
    },
    {
      id: 2,
      action: 'Leave Approved',
      description: 'Dr. Jane Smith\'s conference leave request approved',
      time: '4 hours ago',
      type: 'info',
      icon: CheckCircle
    },
    {
      id: 3,
      action: 'Availability Updated',
      description: 'Prof. Kumar updated availability preferences',
      time: '1 day ago',
      type: 'warning',
      icon: UserCheck
    },
    {
      id: 4,
      action: 'Special Class Scheduled',
      description: 'AI/ML workshop scheduled for next Monday',
      time: '1 day ago',
      type: 'success',
      icon: Calendar
    },
    {
      id: 5,
      action: 'Timetable Generated',
      description: 'Mechanical Engineering Semester 6 timetable completed',
      time: '2 days ago',
      type: 'success',
      icon: FileText
    },
  ];

  const quickActions = [
    {
      id: 1,
      title: 'Generate Timetable',
      description: 'Create automated timetable',
      icon: Calendar,
      color: 'bg-blue-500 hover:bg-blue-600',
      href: '/timetables'
    },
    {
      id: 2,
      title: 'Manage Batches',
      description: 'Add or modify student batches',
      icon: GraduationCap,
      color: 'bg-green-500 hover:bg-green-600',
      href: '/batches'
    },
    {
      id: 3,
      title: 'Faculty Availability',
      description: 'View teacher schedules',
      icon: UserCheck,
      color: 'bg-purple-500 hover:bg-purple-600',
      href: '/faculty-availability'
    },
    {
      id: 4,
      title: 'Add Teacher',
      description: 'Register new faculty',
      icon: Users,
      color: 'bg-orange-500 hover:bg-orange-600',
      href: '/teachers'
    },
    {
      id: 5,
      title: 'Manage Subjects',
      description: 'Add or edit subjects',
      icon: BookOpen,
      color: 'bg-pink-500 hover:bg-pink-600',
      href: '/subjects'
    },
    {
      id: 6,
      title: 'Classroom Setup',
      description: 'Configure classrooms',
      icon: Building,
      color: 'bg-cyan-500 hover:bg-cyan-600',
      href: '/classrooms'
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome section with current date/time */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Welcome back, {user?.name}! 👋
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Here's an overview of your academic timetable management system for AY 2024-25.
            </p>
          </div>
          <div className="hidden md:flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {new Date().toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Academic Year 2024-25
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Stats grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {dashboardStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-all duration-200"
            >
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className={`${stat.color} p-3 rounded-lg shadow-sm`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="ml-4 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                      {stat.name}
                    </dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-bold text-gray-900 dark:text-white flex items-baseline">
                        {stat.value}
                        {stat.total && (
                          <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-1">
                            {stat.total}
                          </span>
                        )}
                      </div>
                    </dd>
                    <dd className="mt-1">
                      <div
                        className={`text-sm ${
                          stat.changeType === 'positive'
                            ? 'text-green-600 dark:text-green-400'
                            : stat.changeType === 'warning'
                            ? 'text-orange-600 dark:text-orange-400'
                            : stat.changeType === 'negative'
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-gray-500 dark:text-gray-400'
                        }`}
                      >
                        {stat.changeType === 'positive' && (
                          <TrendingUp className="inline w-4 h-4 mr-1" />
                        )}
                        {stat.changeType === 'warning' && (
                          <AlertTriangle className="inline w-4 h-4 mr-1" />
                        )}
                        {stat.change}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick actions */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
                <Activity className="w-5 h-5 mr-2" />
                Quick Actions
              </h3>
              <span className="text-xs text-gray-500 dark:text-gray-400 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">
                Admin Panel
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {quickActions.map((action) => {
                const ActionIcon = action.icon;
                return (
                  <a
                    key={action.id}
                    href={action.href}
                    className={`${action.color} text-white p-4 rounded-lg transition-all duration-200 transform hover:scale-105 group`}
                  >
                    <div className="flex items-center mb-2">
                      <ActionIcon className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                      <span className="text-sm font-semibold">{action.title}</span>
                    </div>
                    <p className="text-xs opacity-90">{action.description}</p>
                  </a>
                );
              })}
            </div>
          </div>
        </div>

        {/* System Status */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
            <BarChart3 className="w-5 h-5 mr-2" />
            System Status
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                <span className="text-sm text-gray-600 dark:text-gray-300">Database</span>
              </div>
              <span className="text-xs text-green-600 font-medium">Online</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                <span className="text-sm text-gray-600 dark:text-gray-300">Timetable Engine</span>
              </div>
              <span className="text-xs text-green-600 font-medium">Ready</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-yellow-500 rounded-full mr-3"></div>
                <span className="text-sm text-gray-600 dark:text-gray-300">Backup Status</span>
              </div>
              <span className="text-xs text-yellow-600 font-medium">6h ago</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                <span className="text-sm text-gray-600 dark:text-gray-300">API Services</span>
              </div>
              <span className="text-xs text-green-600 font-medium">Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent activities */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
            <Bell className="w-5 h-5 mr-2" />
            Recent Activities
          </h3>
          <button className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300">
            View All
          </button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            {recentActivities.slice(0, 3).map((activity) => {
              const ActivityIcon = activity.icon;
              return (
                <div key={activity.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <div className={`flex-shrink-0 p-2 rounded-lg ${
                    activity.type === 'success' 
                      ? 'bg-green-100 dark:bg-green-900/20'
                      : activity.type === 'warning' 
                      ? 'bg-yellow-100 dark:bg-yellow-900/20'
                      : 'bg-blue-100 dark:bg-blue-900/20'
                  }`}>
                    <ActivityIcon className={`w-4 h-4 ${
                      activity.type === 'success' 
                        ? 'text-green-600 dark:text-green-400'
                        : activity.type === 'warning' 
                        ? 'text-yellow-600 dark:text-yellow-400'
                        : 'text-blue-600 dark:text-blue-400'
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {activity.action}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {activity.description}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      {activity.time}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="space-y-4">
            {recentActivities.slice(3).map((activity) => {
              const ActivityIcon = activity.icon;
              return (
                <div key={activity.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <div className={`flex-shrink-0 p-2 rounded-lg ${
                    activity.type === 'success' 
                      ? 'bg-green-100 dark:bg-green-900/20'
                      : activity.type === 'warning' 
                      ? 'bg-yellow-100 dark:bg-yellow-900/20'
                      : 'bg-blue-100 dark:bg-blue-900/20'
                  }`}>
                    <ActivityIcon className={`w-4 h-4 ${
                      activity.type === 'success' 
                        ? 'text-green-600 dark:text-green-400'
                        : activity.type === 'warning' 
                        ? 'text-yellow-600 dark:text-yellow-400'
                        : 'text-blue-600 dark:text-blue-400'
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {activity.action}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {activity.description}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      {activity.time}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Notifications Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Tasks */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2" />
            Attention Required
          </h3>
          <div className="space-y-3">
            {(stats.leaves?.pending || 0) > 0 && (
              <div className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                <div className="flex items-center">
                  <Coffee className="w-4 h-4 text-orange-600 mr-2" />
                  <span className="text-sm text-gray-900 dark:text-white">
                    {stats.leaves?.pending || 0} leave requests pending
                  </span>
                </div>
                <a href="/faculty-availability" className="text-xs text-orange-600 hover:text-orange-700">
                  Review →
                </a>
              </div>
            )}
            <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex items-center">
                <Calendar className="w-4 h-4 text-blue-600 mr-2" />
                <span className="text-sm text-gray-900 dark:text-white">
                  Timetable generation due
                </span>
              </div>
              <a href="/timetables" className="text-xs text-blue-600 hover:text-blue-700">
                Generate →
              </a>
            </div>
            <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <div className="flex items-center">
                <GraduationCap className="w-4 h-4 text-purple-600 mr-2" />
                <span className="text-sm text-gray-900 dark:text-white">
                  {stats.batches?.total || 0} batches configured
                </span>
              </div>
              <a href="/batches" className="text-xs text-purple-600 hover:text-purple-700">
                Manage →
              </a>
            </div>
          </div>
        </div>

        {/* System Overview */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
            <Settings className="w-5 h-5 mr-2" />
            System Overview
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-300">Active Teachers</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {stats.teachers?.active || 0}/{stats.teachers?.total || 0}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full" 
                style={{width: `${(stats.teachers?.total || 0) > 0 ? ((stats.teachers?.active || 0) / (stats.teachers?.total || 1)) * 100 : 0}%`}}
              ></div>
            </div>
            
            <div className="flex items-center justify-between mt-4">
              <span className="text-sm text-gray-600 dark:text-gray-300">Available Slots</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {stats.availability?.availableSlots || 0}/{stats.availability?.totalSlots || 0}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full" 
                style={{width: `${(stats.availability?.totalSlots || 0) > 0 ? ((stats.availability?.availableSlots || 0) / (stats.availability?.totalSlots || 1)) * 100 : 0}%`}}
              ></div>
            </div>
            
            <div className="flex items-center justify-between mt-4">
              <span className="text-sm text-gray-600 dark:text-gray-300">Data Health</span>
              <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                Excellent
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div className="bg-green-500 h-2 rounded-full" style={{width: '92%'}}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;