
import React, { useState, useMemo } from 'react';
import { TripReport } from '../types';
import { BackIcon, ChevronRightIcon, ClockIcon, PeakIcon, AlertIcon, SearchIcon } from './icons';
import { Spinner } from './Spinner';

interface HistoryPageProps {
  reports: TripReport[] | null;
  onBack: () => void;
  onSelectReport: (report: TripReport) => void;
}

const TripHistoryCard: React.FC<{ report: TripReport; onSelect: () => void; }> = ({ report, onSelect }) => {
    const tripDate = new Date(report.endTime).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
    const tripTime = new Date(report.endTime).toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
    });
    const durationMinutes = Math.round((report.endTime - report.startTime) / 60000);

    return (
        <button onClick={onSelect} className="w-full bg-slate-800/80 p-4 rounded-xl flex items-center text-left hover:bg-slate-800/60 transition-colors duration-200 border border-slate-700/50">
            <div className="flex-grow">
                <div className="flex justify-between items-center mb-3">
                    <p className="font-bold text-lg text-slate-100">{tripDate}</p>
                    <p className="text-sm text-slate-400">{tripTime}</p>
                </div>
                <div className="flex items-center space-x-4 text-sm text-slate-300">
                    <div className="flex items-center space-x-1.5">
                        <ClockIcon className="w-4 h-4 text-blue-400" />
                        <span>{durationMinutes} min</span>
                    </div>
                     <div className="flex items-center space-x-1.5">
                        <PeakIcon className="w-4 h-4 text-red-400" />
                        <span>Peak: {report.maxDrowsiness}%</span>
                    </div>
                     <div className="flex items-center space-x-1.5">
                        <AlertIcon className="w-4 h-4 text-yellow-400" />
                        <span>{report.alertCount} Alerts</span>
                    </div>
                </div>
            </div>
            <ChevronRightIcon className="w-6 h-6 text-slate-500 ml-4" />
        </button>
    );
};

const HistoryPage: React.FC<HistoryPageProps> = ({ reports, onBack, onSelectReport }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'high_alert'>('all');

  const filteredReports = useMemo(() => {
    if (!reports) return [];
    return reports.filter(report => {
        const dateStr = new Date(report.endTime).toLocaleDateString();
        const matchesSearch = dateStr.includes(searchTerm) || report.maxDrowsiness.toString().includes(searchTerm);
        const matchesFilter = filterType === 'all' || (filterType === 'high_alert' && report.maxDrowsiness > 70);
        return matchesSearch && matchesFilter;
    });
  }, [reports, searchTerm, filterType]);

  return (
    <div className="flex flex-col h-full p-4 bg-pro-gradient overflow-y-auto">
      <header className="flex items-center mb-6 relative">
        <button onClick={onBack} className="p-2 mr-2 rounded-full hover:bg-slate-800 transition">
          <BackIcon className="w-6 h-6"/>
        </button>
        <h1 className="text-2xl font-bold text-slate-100">Trip History</h1>
      </header>

      <div className="w-full max-w-md mx-auto space-y-4">
        {/* Search & Filter Bar */}
        <div className="flex space-x-2">
            <div className="relative flex-grow">
                <input 
                    type="text" 
                    placeholder="Search by date..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 pl-9 pr-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <SearchIcon className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
            </div>
            <select 
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as 'all' | 'high_alert')}
                className="bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-sm text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
                <option value="all">All Trips</option>
                <option value="high_alert">High Fatigue</option>
            </select>
        </div>

        {reports === null ? (
          <div className="flex justify-center items-center h-64">
            <Spinner size="lg" />
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="text-center py-16">
            <h2 className="text-xl font-semibold text-slate-200">No History Found</h2>
            <p className="text-slate-400 mt-2">{searchTerm ? 'Try adjusting your search.' : 'Your past trip reports will appear here.'}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredReports.map((report) => (
              <TripHistoryCard 
                key={report.endTime} 
                report={report} 
                onSelect={() => onSelectReport(report)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryPage;
