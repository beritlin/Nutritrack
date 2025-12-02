
import React, { useState, useEffect } from 'react';
import { LayoutDashboard, UtensilsCrossed, Settings as SettingsIcon, PlusCircle, CircleUser, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import Dashboard from './components/Dashboard';
import FoodLogger from './components/FoodLogger';
import Settings from './components/Settings';
import { MonthlyReport } from './components/MonthlyReport';
import { UserProfile, FoodItem, WeightLog, MealType, ExerciseItem, WaterLog } from './types';
import { DEFAULT_PROFILE, STORAGE_KEYS } from './constants';
import { calculateNutritionTargets } from './services/geminiService';

function App() {
  // --- State ---
  const [currentView, setCurrentView] = useState<'dashboard' | 'logger' | 'settings'>('dashboard');
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [foodLogs, setFoodLogs] = useState<FoodItem[]>([]);
  const [exerciseLogs, setExerciseLogs] = useState<ExerciseItem[]>([]);
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);
  const [waterLogs, setWaterLogs] = useState<WaterLog[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  
  // Modal State
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  
  const [newWeight, setNewWeight] = useState('');
  const [newBodyFat, setNewBodyFat] = useState('');
  const [newMuscleMass, setNewMuscleMass] = useState('');
  const [newWaistLine, setNewWaistLine] = useState('');

  // --- Effects ---
  // Load data on mount
  useEffect(() => {
    const loadedProfile = localStorage.getItem(STORAGE_KEYS.PROFILE);
    const loadedFoods = localStorage.getItem(STORAGE_KEYS.FOOD_LOGS);
    const loadedExercise = localStorage.getItem(STORAGE_KEYS.EXERCISE_LOGS);
    const loadedWeights = localStorage.getItem(STORAGE_KEYS.WEIGHT_LOGS);
    const loadedWater = localStorage.getItem(STORAGE_KEYS.WATER_LOGS);

    if (loadedProfile) {
        try {
            setProfile(JSON.parse(loadedProfile));
        } catch(e) { console.error("Profile load error", e); }
    }
    if (loadedFoods) {
         try {
            setFoodLogs(JSON.parse(loadedFoods));
         } catch(e) { console.error("Food Logs load error", e); }
    }
    if (loadedExercise) {
         try {
            setExerciseLogs(JSON.parse(loadedExercise));
         } catch(e) { console.error("Exercise Logs load error", e); }
    }
    if (loadedWeights) {
        try {
            setWeightLogs(JSON.parse(loadedWeights));
        } catch(e) { console.error("Weight Logs load error", e); }
    }
    if (loadedWater) {
        try {
            setWaterLogs(JSON.parse(loadedWater));
        } catch(e) { console.error("Water Logs load error", e); }
    }
  }, []);

  // Save data on change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.FOOD_LOGS, JSON.stringify(foodLogs));
  }, [foodLogs]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.EXERCISE_LOGS, JSON.stringify(exerciseLogs));
  }, [exerciseLogs]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.WEIGHT_LOGS, JSON.stringify(weightLogs));
  }, [weightLogs]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.WATER_LOGS, JSON.stringify(waterLogs));
  }, [waterLogs]);

  // --- Handlers ---
  const handleAddFoodLog = (log: FoodItem) => {
    setFoodLogs(prev => [log, ...prev]);
  };

  const handleUpdateFoodLog = (updatedLog: FoodItem) => {
    setFoodLogs(prev => prev.map(log => log.id === updatedLog.id ? updatedLog : log));
  };

  const handleDeleteFoodLog = (id: string) => {
    setFoodLogs(prev => prev.filter(log => log.id !== id));
  };

  const handleAddExerciseLog = (log: ExerciseItem) => {
    setExerciseLogs(prev => [log, ...prev]);
  };

  const handleDeleteExerciseLog = (id: string) => {
    setExerciseLogs(prev => prev.filter(log => log.id !== id));
  };
  
  const handleAddWater = (amount: number) => {
      const newLog: WaterLog = {
          id: crypto.randomUUID(),
          date: selectedDate,
          amount: amount
      };
      setWaterLogs(prev => [...prev, newLog]);
  };

  const handleDeleteLastWater = () => {
     // Find the last log for this date and remove it
     const todays = waterLogs.filter(l => l.date === selectedDate);
     if (todays.length === 0) return;
     const lastLog = todays[todays.length - 1]; // Assuming order is preserved or we just take one
     
     // To be safer, since state order might vary, let's just filter out that specific ID
     setWaterLogs(prev => prev.filter(l => l.id !== lastLog.id));
  };

  const handleUpdateProfile = (newProfile: UserProfile) => {
    setProfile(newProfile);
  };

  const handleAddWeight = () => {
    if (!newWeight) return;
    const weightVal = parseFloat(newWeight);
    if (isNaN(weightVal)) return;

    const newLog: WeightLog = {
      id: crypto.randomUUID(),
      date: selectedDate,
      weight: weightVal,
      bodyFat: newBodyFat ? parseFloat(newBodyFat) : undefined,
      muscleMass: newMuscleMass ? parseFloat(newMuscleMass) : undefined,
      waistLine: newWaistLine ? parseFloat(newWaistLine) : undefined,
    };
    
    // Remove existing log for same day if any, then add new one
    setWeightLogs(prev => [...prev.filter(w => w.date !== selectedDate), newLog]);
    
    // NOTE: Per user request, we DO NOT automatically recalculate TDEE/FFMI here.
    // We only save the record to the log. 
    // If user wants to update their "Profile Stats" (TDEE/Targets), they should go to Settings.

    setShowWeightModal(false);
    // Reset fields
    setNewWeight('');
    setNewBodyFat('');
    setNewMuscleMass('');
    setNewWaistLine('');
  };

  const changeDate = (offset: number) => {
    const dateParts = selectedDate.split('-').map(Number);
    // Note: Month is 0-indexed in Date constructor, so subtract 1
    const date = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
    date.setDate(date.getDate() + offset);
    
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    setSelectedDate(`${y}-${m}-${d}`);
  };

  const getDisplayDate = (isoDate: string) => {
    const dateParts = isoDate.split('-').map(Number);
    const date = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
    return date.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
  };

  const todaysFoodLogs = foodLogs.filter(log => log.date === selectedDate);
  const todaysExerciseLogs = exerciseLogs.filter(log => log.date === selectedDate);
  const todaysWaterLogs = waterLogs.filter(log => log.date === selectedDate);

  // --- Render ---
  return (
    <div className="min-h-screen max-w-md mx-auto bg-gray-50 flex flex-col relative overflow-hidden shadow-2xl">
      
      {/* Top Bar / Date Picker */}
      {/* Added pt-[max(2rem,env(safe-area-inset-top))] to handle iOS Notch */}
      <div className="bg-white px-6 pt-[max(2rem,env(safe-area-inset-top))] pb-4 sticky top-0 z-10 shadow-sm/50 transition-all">
        <div className="flex justify-between items-center mb-4">
            <h1 className="text-xl font-bold text-emerald-800 tracking-tight">NutriTrack AI</h1>
            <div className="flex gap-2">
                <button 
                  onClick={() => setShowWeightModal(true)}
                  className="bg-emerald-50 text-emerald-600 p-2 rounded-full hover:bg-emerald-100 transition shadow-sm"
                  title="紀錄身體數據"
                >
                    <CircleUser className="w-6 h-6" />
                </button>
            </div>
        </div>

        {/* Custom Date Navigator */}
        <div className="flex items-center justify-between bg-gray-50 rounded-2xl p-1 border border-gray-100 relative">
            <button 
                onClick={() => changeDate(-1)} 
                className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-white rounded-xl transition-all active:scale-95"
            >
                <ChevronLeft className="w-5 h-5" />
            </button>
            
            <div 
              className="relative flex items-center gap-2 group cursor-pointer px-4 py-1 rounded-xl hover:bg-gray-50 transition"
              onClick={() => setShowCalendar(true)}
            >
                <Calendar className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
                <span className="text-gray-700 font-bold text-sm tracking-wide group-hover:text-emerald-700 transition-colors">
                    {getDisplayDate(selectedDate)}
                </span>
            </div>

            <button 
                onClick={() => changeDate(1)} 
                className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-white rounded-xl transition-all active:scale-95"
            >
                <ChevronRight className="w-5 h-5" />
            </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-6 scroll-smooth">
        {currentView === 'dashboard' && (
          <Dashboard 
            profile={profile} 
            todaysLogs={todaysFoodLogs} 
            allLogs={foodLogs}
            todaysExerciseLogs={todaysExerciseLogs}
            todaysWaterLogs={todaysWaterLogs}
            weightLogs={weightLogs}
            onUpdateProfile={handleUpdateProfile}
            onAddWater={handleAddWater}
            onDeleteLastWater={handleDeleteLastWater}
          />
        )}
        {currentView === 'logger' && (
          <FoodLogger 
            logs={todaysFoodLogs} 
            exerciseLogs={todaysExerciseLogs}
            onAddLog={handleAddFoodLog} 
            onUpdateLog={handleUpdateFoodLog}
            onDeleteLog={handleDeleteFoodLog}
            onAddExercise={handleAddExerciseLog}
            onDeleteExercise={handleDeleteExerciseLog}
            selectedDate={selectedDate}
            userWeight={profile.currentWeight}
          />
        )}
        {currentView === 'settings' && (
          <Settings 
            profile={profile} 
            onUpdateProfile={handleUpdateProfile}
            logs={foodLogs}
            exerciseLogs={exerciseLogs}
            weightLogs={weightLogs}
            waterLogs={waterLogs}
          />
        )}
      </main>

      {/* Bottom Navigation */}
      {/* Added pb-[max(1.5rem,env(safe-area-inset-bottom))] to handle iOS Home Indicator */}
      <div className="bg-white border-t border-gray-100 p-2 px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sticky bottom-0 z-20 flex justify-between items-center text-xs font-medium text-gray-400 transition-all">
        <button 
          onClick={() => setCurrentView('dashboard')}
          className={`flex flex-col items-center gap-1 p-2 transition ${currentView === 'dashboard' ? 'text-emerald-600' : 'hover:text-gray-600'}`}
        >
          <LayoutDashboard className={`w-6 h-6 ${currentView === 'dashboard' ? 'fill-current' : ''}`} strokeWidth={currentView === 'dashboard' ? 0 : 2} />
          <span>總覽</span>
        </button>

        <div className="relative -top-6">
           <button 
             onClick={() => setCurrentView('logger')}
             className="bg-emerald-600 text-white p-4 rounded-full shadow-lg shadow-emerald-200 hover:scale-105 transition active:scale-95"
           >
             <PlusCircle className="w-7 h-7" />
           </button>
        </div>

        <button 
          onClick={() => setCurrentView('settings')}
          className={`flex flex-col items-center gap-1 p-2 transition ${currentView === 'settings' ? 'text-emerald-600' : 'hover:text-gray-600'}`}
        >
          <SettingsIcon className={`w-6 h-6 ${currentView === 'settings' ? 'fill-current' : ''}`} strokeWidth={currentView === 'settings' ? 0 : 2} />
          <span>設定</span>
        </button>
      </div>

      {/* Body Stats Modal (2x2 Grid) */}
      {showWeightModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in duration-200">
              <h3 className="text-lg font-bold text-gray-800 mb-4 text-center">紀錄身體數據 ({selectedDate.slice(5)})</h3>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                  {/* Weight */}
                  <div>
                    <label className="text-xs text-emerald-600 font-bold ml-1 mb-1 block">體重 (kg)</label>
                    <input 
                        type="number" 
                        value={newWeight}
                        onChange={(e) => setNewWeight(e.target.value)}
                        placeholder="0.0"
                        className="w-full bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-center font-bold text-gray-800 outline-none focus:ring-2 focus:ring-emerald-500"
                        autoFocus
                    />
                  </div>

                  {/* Body Fat */}
                  <div>
                    <label className="text-xs text-orange-600 font-bold ml-1 mb-1 block">體脂率 (%)</label>
                    <input 
                        type="number" 
                        value={newBodyFat}
                        onChange={(e) => setNewBodyFat(e.target.value)}
                        placeholder="選填"
                        className="w-full bg-orange-50 border border-orange-100 rounded-xl p-3 text-center font-bold text-gray-800 outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  {/* Muscle Mass */}
                  <div>
                    <label className="text-xs text-blue-600 font-bold ml-1 mb-1 block">肌肉量 (kg)</label>
                    <input 
                        type="number" 
                        value={newMuscleMass}
                        onChange={(e) => setNewMuscleMass(e.target.value)}
                        placeholder="選填"
                        className="w-full bg-blue-50 border border-blue-100 rounded-xl p-3 text-center font-bold text-gray-800 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Waist Line */}
                  <div>
                    <label className="text-xs text-purple-600 font-bold ml-1 mb-1 block">腰圍 (cm)</label>
                    <input 
                        type="number" 
                        value={newWaistLine}
                        onChange={(e) => setNewWaistLine(e.target.value)}
                        placeholder="選填"
                        className="w-full bg-purple-50 border border-purple-100 rounded-xl p-3 text-center font-bold text-gray-800 outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                 <button 
                  onClick={() => setShowWeightModal(false)}
                  className="py-2.5 rounded-xl font-medium text-gray-500 bg-gray-100 hover:bg-gray-200"
                >
                  取消
                </button>
                <button 
                  onClick={handleAddWeight}
                  className="py-2.5 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-200"
                >
                  儲存
                </button>
              </div>
           </div>
        </div>
      )}

      {/* Monthly Report Calendar Modal */}
      <MonthlyReport 
        isOpen={showCalendar}
        onClose={() => setShowCalendar(false)}
        onSelectDate={(date) => {
            setSelectedDate(date);
            setShowCalendar(false);
        }}
        foodLogs={foodLogs}
        exerciseLogs={exerciseLogs}
        weightLogs={weightLogs}
        profile={profile}
        selectedDate={selectedDate}
      />

    </div>
  );
}

export default App;
