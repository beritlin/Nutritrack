
import React, { useState } from 'react';
import { FoodItem, ExerciseItem, WeightLog, UserProfile } from '../types';
import { ChevronLeft, ChevronRight, X, Flame, Scale, Dumbbell } from 'lucide-react';

interface MonthlyReportProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDate: (date: string) => void;
  foodLogs: FoodItem[];
  exerciseLogs: ExerciseItem[];
  weightLogs: WeightLog[];
  profile: UserProfile;
  selectedDate: string;
}

export const MonthlyReport: React.FC<MonthlyReportProps> = ({
  isOpen, onClose, onSelectDate, foodLogs, exerciseLogs, weightLogs, profile, selectedDate
}) => {
  if (!isOpen) return null;

  // Initialize with the currently selected date's month
  const [currentYear, setCurrentYear] = useState(parseInt(selectedDate.split('-')[0]));
  const [currentMonth, setCurrentMonth] = useState(parseInt(selectedDate.split('-')[1]) - 1); // 0-indexed

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Sun

  const changeMonth = (offset: number) => {
    let newMonth = currentMonth + offset;
    let newYear = currentYear;
    if (newMonth > 11) { newMonth = 0; newYear++; }
    if (newMonth < 0) { newMonth = 11; newYear--; }
    setCurrentMonth(newMonth);
    setCurrentYear(newYear);
  };

  // Helper to format YYYY-MM-DD
  const formatDate = (day: number) => {
    return `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const renderDays = () => {
    const days = [];
    // Empty slots for previous month
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className="h-24 bg-gray-50/50" />);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = formatDate(d);
      
      // Data Calculation
      const dayFoods = foodLogs.filter(l => l.date === dateStr);
      const dayExercises = exerciseLogs.filter(l => l.date === dateStr);
      const dayWeights = weightLogs.filter(l => l.date === dateStr);

      const totalIn = dayFoods.reduce((sum, item) => sum + item.calories, 0);
      const totalBurned = dayExercises.reduce((sum, item) => sum + item.caloriesBurned, 0);
      // Note: We use the current profile's target as baseline. 
      const netTarget = profile.targetCalories + totalBurned;
      const remaining = netTarget - totalIn;
      
      const hasData = dayFoods.length > 0;
      const isOver = remaining < 0;
      const isSuccess = hasData && !isOver;
      
      const isSelected = dateStr === selectedDate;
      const isToday = dateStr === new Date().toISOString().split('T')[0];

      days.push(
        <button 
          key={d}
          onClick={() => { onSelectDate(dateStr); onClose(); }}
          className={`h-24 border border-gray-100 p-1 relative flex flex-col justify-between transition-all hover:shadow-md text-left
            ${isSelected ? 'ring-2 ring-emerald-500 z-10' : ''}
            ${isToday ? 'bg-emerald-50/30' : 'bg-white'}
          `}
        >
          {/* Header: Day Num & Indicators */}
          <div className="flex justify-between items-start w-full">
            <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full 
               ${isToday ? 'bg-emerald-600 text-white' : 'text-gray-700'}`}>
              {d}
            </span>
            {hasData && (
                <div className={`w-2 h-2 rounded-full ${isSuccess ? 'bg-emerald-400' : 'bg-red-400'}`} />
            )}
          </div>

          {/* Stats Summary */}
          <div className="flex-1 flex flex-col justify-center items-center gap-0.5 w-full">
             {hasData ? (
                 <>
                   <span className="text-[10px] text-gray-400 font-medium">{totalIn}</span>
                   <span className={`text-[10px] font-bold ${isOver ? 'text-red-500' : 'text-emerald-600'}`}>
                       {isOver ? `+${Math.abs(remaining)}` : `${remaining}`}
                   </span>
                 </>
             ) : (
                 <span className="text-[10px] text-gray-300">-</span>
             )}
          </div>

          {/* Icons Row */}
          <div className="flex gap-1 justify-end opacity-70 w-full px-1">
             {dayWeights.length > 0 && <Scale className="w-3 h-3 text-indigo-400" />}
             {dayExercises.length > 0 && <Flame className="w-3 h-3 text-orange-400" />}
          </div>
        </button>
      );
    }
    return days;
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in duration-200">
        {/* Header */}
        <div className="p-4 bg-emerald-600 text-white flex justify-between items-center shrink-0">
            <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-emerald-700 rounded-full transition"><ChevronLeft/></button>
            <h2 className="text-lg font-bold">
                {currentYear}年 {currentMonth + 1}月
            </h2>
            <button onClick={() => changeMonth(1)} className="p-2 hover:bg-emerald-700 rounded-full transition"><ChevronRight/></button>
        </div>
        
        {/* Week Days */}
        <div className="grid grid-cols-7 bg-emerald-50 border-b border-emerald-100 shrink-0">
            {['日', '一', '二', '三', '四', '五', '六'].map(day => (
                <div key={day} className="py-2 text-center text-xs font-bold text-emerald-700">
                    {day}
                </div>
            ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 overflow-y-auto">
            {renderDays()}
        </div>

        {/* Footer / Legend */}
        <div className="p-3 bg-gray-50 flex justify-between items-center border-t border-gray-100 text-xs text-gray-500 shrink-0">
            <div className="flex gap-3">
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-400"/> 達標</div>
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-400"/> 超標</div>
            </div>
            <button onClick={onClose} className="px-4 py-2 bg-white border border-gray-200 rounded-lg font-bold text-gray-600 hover:bg-gray-100">
                關閉
            </button>
        </div>
      </div>
    </div>
  );
};
