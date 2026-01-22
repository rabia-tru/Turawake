
import React, { useMemo } from 'react';
import { TripReport, DrivingManeuverType } from '../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { BackIcon, ClockIcon, AlertIcon, PeakIcon, BrakeIcon, AccelerationIcon, TurnIcon, YawnIcon, EyeClosedIcon } from './icons';

interface ReportPageProps {
  report: TripReport | null;
  onBack: () => void;
}

const ManeuverIcon: React.FC<{ type: DrivingManeuverType }> = ({ type }) => {
    switch (type) {
        case 'Harsh Braking': return <BrakeIcon className="w-5 h-5 text-red-400" />;
        case 'Sudden Acceleration': return <AccelerationIcon className="w-5 h-5 text-green-400" />;
        case 'Sharp Turn': return <TurnIcon className="w-5 h-5 text-yellow-400" />;
        default: return null;
    }
};

const getDetectionIcon = (cue: string) => {
    const lowerCue = cue.toLowerCase();
    if (lowerCue.includes('yawn')) return <YawnIcon className="w-5 h-5 text-teal-400" />;
    if (lowerCue.includes('eye')) return <EyeClosedIcon className="w-5 h-5 text-blue-400" />;
    return <AlertIcon className="w-5 h-5 text-slate-400" />;
};

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-slate-900/90 border border-slate-700 p-3 rounded-lg shadow-xl backdrop-blur-sm">
                <p className="text-slate-300 text-xs mb-1">{label}</p>
                <p className="text-blue-400 font-bold text-sm">
                    {payload[0].value}% <span className="text-slate-500 font-normal">Drowsiness</span>
                </p>
            </div>
        );
    }
    return null;
};

const ReportPage: React.FC<ReportPageProps> = ({ report, onBack }) => {
  if (!report) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-4">
        <h2 className="text-2xl font-bold mb-4">No Report Available</h2>
        <button onClick={onBack} className="flex items-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition">
            <BackIcon className="w-5 h-5"/>
            <span>Go Back</span>
        </button>
      </div>
    );
  }

  const durationMinutes = Math.round((report.endTime - report.startTime) / 60000);
  const chartData = report.events.map(event => ({
    time: new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    level: event.level,
  }));

  const maneuverCounts = useMemo(() => (report.maneuvers || []).reduce((acc, m) => { acc[m.type] = (acc[m.type] || 0) + 1; return acc; }, {} as Record<DrivingManeuverType, number>), [report.maneuvers]);
  const detectionCounts = useMemo(() => {
    if (!report?.events) return {};
    return report.events.reduce((acc, event) => {
        event.cues.forEach(cue => { acc[cue] = (acc[cue] || 0) + 1; });
        return acc;
    }, {} as Record<string, number>);
  }, [report?.events]);
  
  const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: string | number; accentColor: string }> = ({ icon, label, value, accentColor }) => (
      <div className="bg-slate-800/60 backdrop-blur border border-slate-700/50 p-4 rounded-xl flex items-center space-x-4 relative overflow-hidden group">
          <div className={`absolute left-0 top-0 bottom-0 w-1 ${accentColor}`}></div>
          <div className="p-2 bg-slate-700/50 rounded-full">{icon}</div>
          <div>
              <p className="text-slate-400 text-xs uppercase tracking-wider font-semibold">{label}</p>
              <p className="text-white text-xl font-bold">{value}</p>
          </div>
      </div>
  );

  return (
    <div className="h-full w-full bg-pro-gradient p-4 overflow-y-auto custom-scrollbar">
        <header className="flex items-center mb-6 sticky top-0 bg-slate-950/80 backdrop-blur-md z-20 py-2 -mx-4 px-4 border-b border-slate-800/50">
            <button onClick={onBack} className="p-2 mr-3 rounded-full hover:bg-slate-800 transition bg-slate-800/50">
                <BackIcon className="w-5 h-5"/>
            </button>
            <h1 className="text-xl font-bold text-slate-100">Trip Analysis</h1>
        </header>

        <div className="space-y-6 max-w-2xl mx-auto">
            <div className="grid grid-cols-2 gap-3">
                <StatCard icon={<ClockIcon className="w-5 h-5 text-blue-400"/>} label="Duration" value={`${durationMinutes}m`} accentColor="bg-blue-500" />
                <StatCard icon={<AlertIcon className="w-5 h-5 text-yellow-400"/>} label="Alerts" value={report.alertCount} accentColor="bg-yellow-500" />
                <StatCard icon={<PeakIcon className="w-5 h-5 text-red-400"/>} label="Max Fatigue" value={`${report.maxDrowsiness}%`} accentColor="bg-red-500" />
                <StatCard icon={<YawnIcon className="w-5 h-5 text-teal-400"/>} label="Yawns" value={report.yawnCount ?? 0} accentColor="bg-teal-500" />
            </div>

            <div className="bg-slate-800/40 backdrop-blur border border-slate-700/50 p-5 rounded-2xl shadow-lg">
                <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wide mb-4">Fatigue Timeline</h2>
                <div className="w-full h-56">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                            <XAxis dataKey="time" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} tickMargin={10} minTickGap={30} />
                            <YAxis stroke="#64748b" domain={[0, 100]} fontSize={10} tickLine={false} axisLine={false} width={30} />
                            <Tooltip content={<CustomTooltip />} cursor={{stroke: '#475569', strokeWidth: 1}} />
                            <Line type="monotone" dataKey="level" stroke="#3b82f6" strokeWidth={3} dot={false} activeDot={{r: 6, fill: '#60a5fa'}} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-800/40 backdrop-blur border border-slate-700/50 p-5 rounded-2xl">
                    <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wide mb-3">AI Detection Log</h2>
                    {Object.keys(detectionCounts).length > 0 ? (
                        <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-2">
                            {Object.entries(detectionCounts)
                                .sort((a, b) => (b[1] as number) - (a[1] as number))
                                .map(([cue, count]) => (
                                <div key={cue} className="flex items-center justify-between bg-slate-700/30 p-2.5 rounded-lg border border-slate-700/50">
                                    <div className="flex items-center gap-3">
                                        {getDetectionIcon(cue)}
                                        <span className="text-sm font-medium text-slate-200 capitalize">{cue}</span>
                                    </div>
                                    <span className="text-xs font-bold text-slate-400 bg-slate-800 px-2 py-1 rounded">{count}x</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="h-24 flex items-center justify-center text-slate-500 text-sm">No fatigue signs detected.</div>
                    )}
                </div>

                <div className="bg-slate-800/40 backdrop-blur border border-slate-700/50 p-5 rounded-2xl">
                    <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wide mb-3">Driving Events</h2>
                     {(report.maneuvers || []).length > 0 ? (
                        <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-2">
                            {report.maneuvers.map((maneuver, index) => (
                                 <div key={index} className="flex items-center justify-between bg-slate-700/30 p-2.5 rounded-lg border border-slate-700/50">
                                    <div className="flex items-center gap-3">
                                        <ManeuverIcon type={maneuver.type} />
                                        <span className="text-sm font-medium text-slate-200">{maneuver.type}</span>
                                    </div>
                                    <span className="text-[10px] text-slate-500">{new Date(maneuver.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="h-24 flex items-center justify-center text-slate-500 text-sm">Safe driving detected.</div>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
};

export default ReportPage;
