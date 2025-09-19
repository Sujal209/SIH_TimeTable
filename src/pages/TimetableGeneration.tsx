import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  Play, 
  RefreshCw, 
  Download, 
  AlertTriangle, 
  CheckCircle,
  XCircle,
  Settings,
  Users,
  BookOpen,
  Building,
  User,
  BarChart3,
  FileText,
  Zap,
  Target,
  TrendingUp
} from 'lucide-react';
import { TimetableService } from '../lib/services/timetableService';
import { BatchesService } from '../lib/services/batchesService';
import { 
  Batch, 
  TimetableGenerationOptions,
  TimetableGenerationResult,
  TimetableConflict
} from '../types';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Modal from '../components/ui/Modal';
import toast from 'react-hot-toast';

export function TimetableGeneration() {
  // State management
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedBatches, setSelectedBatches] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [generationResults, setGenerationResults] = useState<Map<string, TimetableGenerationResult>>(new Map());
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [showResultsModal, setShowResultsModal] = useState(false);
  
  // Generation options
  const [options, setOptions] = useState<TimetableGenerationOptions>({
    academicYear: '2024-25',
    clearExisting: true,
    maxTeacherHoursPerDay: 6,
    includeLunchBreak: true,
    respectFacultyAvailability: true,
    includeSpecialClasses: true
  });

  // UI state
  const [activeTab, setActiveTab] = useState<'selection' | 'options' | 'results'>('selection');

  // Load available batches
  useEffect(() => {
    loadBatches();
  }, [options.academicYear]);

  const loadBatches = async () => {
    try {
      const batchesData = await BatchesService.getAll({
        academic_year: options.academicYear
      });
      setBatches(batchesData);
    } catch (error) {
      console.error('Failed to load batches:', error);
      toast.error('Failed to load batches');
    }
  };

  // Handle batch selection
  const handleBatchSelection = (batchId: string, selected: boolean) => {
    if (selected) {
      setSelectedBatches(prev => [...prev, batchId]);
    } else {
      setSelectedBatches(prev => prev.filter(id => id !== batchId));
    }
  };

  const selectAllBatches = () => {
    setSelectedBatches(batches.map(b => b.id));
  };

  const clearAllBatches = () => {
    setSelectedBatches([]);
  };

  // Generate timetables
  const handleGenerateTimetables = async () => {
    if (selectedBatches.length === 0) {
      toast.error('Please select at least one batch');
      return;
    }

    try {
      setLoading(true);
      setActiveTab('results');
      
      toast.loading('Generating timetables...', { id: 'generation' });
      
      const results = await TimetableService.generateTimetableForMultipleBatches(
        selectedBatches,
        options
      );
      
      setGenerationResults(results);
      
      // Count success/failures
      const successCount = Array.from(results.values()).filter(r => r.success).length;
      const totalCount = results.size;
      
      toast.dismiss('generation');
      
      if (successCount === totalCount) {
        toast.success(`Successfully generated ${successCount} timetables!`);
      } else {
        toast.error(`Generated ${successCount}/${totalCount} timetables. Some failed.`);
      }
      
    } catch (error) {
      console.error('Timetable generation failed:', error);
      toast.dismiss('generation');
      toast.error('Timetable generation failed');
    } finally {
      setLoading(false);
    }
  };

  // Get generation statistics
  const getGenerationStats = () => {
    const results = Array.from(generationResults.values());
    const successful = results.filter(r => r.success).length;
    const failed = results.length - successful;
    const totalConflicts = results.reduce((sum, r) => sum + (r.conflicts?.length || 0), 0);
    
    return { successful, failed, total: results.length, totalConflicts };
  };

  // Export results
  const handleExportResults = async () => {
    try {
      // Implementation for exporting results
      toast.success('Export functionality will be implemented soon');
    } catch (error) {
      toast.error('Export failed');
    }
  };

  const getConflictTypeColor = (type: string) => {
    const colors = {
      'TEACHER_CONFLICT': 'text-red-600 bg-red-100',
      'CLASSROOM_CONFLICT': 'text-orange-600 bg-orange-100',
      'INSUFFICIENT_PERIODS': 'text-yellow-600 bg-yellow-100',
      'SPECIAL_CLASS_CONFLICT': 'text-purple-600 bg-purple-100',
      'TEACHER_OVERLOAD': 'text-red-600 bg-red-100'
    };
    return colors[type as keyof typeof colors] || 'text-gray-600 bg-gray-100';
  };

  const stats = getGenerationStats();

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              🚀 Automatic Timetable Generation
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Generate conflict-free timetables with intelligent constraint resolution
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right text-sm">
              <p className="text-gray-900 dark:text-white font-medium">Academic Year</p>
              <p className="text-gray-500 dark:text-gray-400">{options.academicYear}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="mb-8">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('selection')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'selection'
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <Users className="w-4 h-4 inline mr-2" />
              Batch Selection ({selectedBatches.length})
            </button>
            <button
              onClick={() => setActiveTab('options')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'options'
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <Settings className="w-4 h-4 inline mr-2" />
              Generation Options
            </button>
            <button
              onClick={() => setActiveTab('results')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'results'
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <BarChart3 className="w-4 h-4 inline mr-2" />
              Results & Analytics ({stats.total})
            </button>
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'selection' && (
        <div className="space-y-6">
          {/* Batch Selection Controls */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Select Batches for Timetable Generation
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={selectAllBatches}
                  className="px-3 py-1 text-sm bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded transition-colors"
                >
                  Select All
                </button>
                <button
                  onClick={clearAllBatches}
                  className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded transition-colors"
                >
                  Clear All
                </button>
              </div>
            </div>

            {/* Batch Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {batches.map((batch) => (
                <div
                  key={batch.id}
                  className={`border rounded-lg p-4 cursor-pointer transition-all ${
                    selectedBatches.includes(batch.id)
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                  onClick={() => handleBatchSelection(batch.id, !selectedBatches.includes(batch.id))}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {batch.name}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {batch.department} • {batch.program_type.toUpperCase()}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span>Students: {batch.strength}</span>
                        <span>Semester: {batch.semester}</span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={selectedBatches.includes(batch.id)}
                      onChange={() => {}}
                      className="mt-1"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Generation Preview */}
          {selectedBatches.length > 0 && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Ready to Generate Timetables
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">
                    {selectedBatches.length} batches selected for generation
                  </p>
                </div>
                <button
                  onClick={handleGenerateTimetables}
                  disabled={loading}
                  className="bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-colors"
                >
                  {loading ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <Zap className="w-5 h-5" />
                  )}
                  {loading ? 'Generating...' : 'Generate Timetables'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'options' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
              Generation Options & Constraints
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Academic Year */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Academic Year
                </label>
                <input
                  type="text"
                  value={options.academicYear}
                  onChange={(e) => setOptions({ ...options, academicYear: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="e.g., 2024-25"
                />
              </div>

              {/* Max Teacher Hours */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Max Teacher Hours per Day
                </label>
                <input
                  type="number"
                  min="4"
                  max="10"
                  value={options.maxTeacherHoursPerDay}
                  onChange={(e) => setOptions({ ...options, maxTeacherHoursPerDay: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            {/* Constraint Options */}
            <div className="mt-6 space-y-4">
              <h3 className="text-md font-medium text-gray-900 dark:text-white">
                Scheduling Constraints
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={options.clearExisting}
                    onChange={(e) => setOptions({ ...options, clearExisting: e.target.checked })}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Clear existing timetables before generation
                  </span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={options.includeLunchBreak}
                    onChange={(e) => setOptions({ ...options, includeLunchBreak: e.target.checked })}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Include 25-30 minute lunch break
                  </span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={options.respectFacultyAvailability}
                    onChange={(e) => setOptions({ ...options, respectFacultyAvailability: e.target.checked })}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Respect faculty availability preferences
                  </span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={options.includeSpecialClasses}
                    onChange={(e) => setOptions({ ...options, includeSpecialClasses: e.target.checked })}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Include special classes (labs, seminars)
                  </span>
                </label>
              </div>
            </div>

            {/* Constraint Information */}
            <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                🎯 Built-in Constraints
              </h4>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                <li>• No teacher or classroom double-booking</li>
                <li>• Lab sessions get 2 consecutive periods (110 minutes)</li>
                <li>• 10-minute gap maintained between lab periods</li>
                <li>• Automatic breaks after 3-4 continuous hours</li>
                <li>• Each subject gets required periods per week</li>
                <li>• Variable daily hours (5-8 hours instead of fixed 7-8)</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'results' && (
        <div className="space-y-6">
          {/* Results Overview */}
          {stats.total > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-center">
                  <CheckCircle className="w-8 h-8 text-green-600 mr-3" />
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {stats.successful}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Successful</p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-center">
                  <XCircle className="w-8 h-8 text-red-600 mr-3" />
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {stats.failed}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Failed</p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-center">
                  <AlertTriangle className="w-8 h-8 text-yellow-600 mr-3" />
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {stats.totalConflicts}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Conflicts</p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-center">
                  <TrendingUp className="w-8 h-8 text-blue-600 mr-3" />
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {stats.total > 0 ? Math.round((stats.successful / stats.total) * 100) : 0}%
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Success Rate</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Generation Results */}
          {generationResults.size > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Generation Results
                </h2>
                <button
                  onClick={handleExportResults}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Export Results
                </button>
              </div>

              {Array.from(generationResults.entries()).map(([batchId, result]) => {
                const batch = batches.find(b => b.id === batchId);
                return (
                  <div
                    key={batchId}
                    className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-6 ${
                      result.success 
                        ? 'border-green-200 dark:border-green-800' 
                        : 'border-red-200 dark:border-red-800'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          {result.success ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-600" />
                          )}
                          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                            {batch?.name}
                          </h3>
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {batch?.department} • {batch?.program_type.toUpperCase()}
                          </span>
                        </div>

                        {result.error && (
                          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4">
                            <p className="text-red-800 dark:text-red-200 text-sm">
                              <AlertTriangle className="w-4 h-4 inline mr-1" />
                              {result.error}
                            </p>
                          </div>
                        )}

                        {result.statistics && (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            <div className="text-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
                              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                {result.statistics.subjects}
                              </p>
                              <p className="text-xs text-gray-600 dark:text-gray-400">Subjects</p>
                            </div>
                            <div className="text-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
                              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                {result.statistics.teachers}
                              </p>
                              <p className="text-xs text-gray-600 dark:text-gray-400">Teachers</p>
                            </div>
                            <div className="text-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
                              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                {result.statistics.classrooms}
                              </p>
                              <p className="text-xs text-gray-600 dark:text-gray-400">Classrooms</p>
                            </div>
                            <div className="text-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
                              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                {result.statistics.utilization}%
                              </p>
                              <p className="text-xs text-gray-600 dark:text-gray-400">Utilization</p>
                            </div>
                          </div>
                        )}

                        {/* Conflicts */}
                        {result.conflicts && result.conflicts.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="font-medium text-gray-900 dark:text-white">
                              Conflicts ({result.conflicts.length})
                            </h4>
                            <div className="max-h-32 overflow-y-auto space-y-1">
                              {result.conflicts.map((conflict, index) => (
                                <div
                                  key={index}
                                  className={`text-xs px-2 py-1 rounded ${getConflictTypeColor(conflict.type)}`}
                                >
                                  {conflict.description}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="text-right text-xs text-gray-500 dark:text-gray-400">
                        <p>Generated at</p>
                        <p>{new Date(result.generatedAt).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No generation results yet
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Select batches and generate timetables to see results here
              </p>
              <button
                onClick={() => setActiveTab('selection')}
                className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg"
              >
                Go to Batch Selection
              </button>
            </div>
          )}
        </div>
      )}

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm w-full mx-4">
            <div className="text-center">
              <LoadingSpinner size="lg" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mt-4">
                Generating Timetables
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                This may take a few minutes...
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}