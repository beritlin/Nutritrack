
import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { UserProfile, FoodItem, WeightLog, DietStrategy, CycleDayType, FoodCategory, ExerciseItem, WaterLog } from '../types';
import { Target, Flame, TrendingUp, Zap, Dumbbell, Activity, Ruler, Droplets, Undo2, Sparkles, Loader2, Weight } from 'lucide-react';
import { calculateNutritionTargets, getDietAdvice } from '../services/geminiService';
import { FOOD_CATEGORY_CONFIG } from '../constants';

interface DashboardProps {
  profile: UserProfile;
  todaysLogs: FoodItem[];
  allLogs: FoodItem[]; // Full history for AI advice
  todaysExerciseLogs: ExerciseItem[];
  todaysWaterLogs: WaterLog[];
  weightLogs: WeightLog[];
  onUpdateProfile: (p: UserProfile) => void;
  onAddWater: (amount: number) => void;
  onDeleteLastWater: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ 
    profile, todaysLogs, allLogs, todaysExerciseLogs, todaysWaterLogs, weightLogs, 
    onUpdateProfile, onAddWater, onDeleteLastWater 
}) => {
  const [chartMetric, setChartMetric] = useState<'weight' | 'bodyFat' | 'muscleMass' | 'waistLine'>('weight');
  const [advice, setAdvice] = useState<string | null>(null);
  const [loadingAdvice, setLoadingAdvice] = useState(false);
  const [motivationalMessage, setMotivationalMessage] = useState('');

  // Dynamic Greeting Logic
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 5) return '夜深了';
    if (hour < 12) return '早安';
    if (hour < 18) return '午安';
    return '晚安';
  };

  // Motivational Quotes Effect
  useEffect(() => {
    const standardMsg = profile.dietStrategy === DietStrategy.CarbCycling ? '今日碳循環計畫' : '今日飲食目標';
    
    const quotes = [
      "今天也要加油喔！💪",
      "每一口健康都在塑造更好的你 ✨",
      "堅持就是勝利，你做得到的！🔥",
      "別忘了多喝水，保持代謝好狀態 💧",
      "慢慢來，比較快。健康是一輩子的事 🌿",
      "今天的你比昨天更棒了！",
      "相信過程，改變正在發生。",
      "專注在進步，而不是完美。",
      "你的身體會感謝你的努力 ❤️",
      "休息也是為了走更長遠的路 🌙",
      standardMsg, standardMsg, standardMsg // Increase weight of standard message so it appears more often
    ];

    const randomMsg = quotes[Math.floor(Math.random() * quotes.length)];
    setMotivationalMessage(randomMsg);
  }, [profile.dietStrategy]); // Update if strategy changes or on mount

  const totalCaloriesIn = todaysLogs.reduce((sum, item) => sum + item.calories, 0);
  const totalCaloriesBurned = todaysExerciseLogs.reduce((sum, item) => sum + item.caloriesBurned, 0);
  const totalWaterIntake = todaysWaterLogs.reduce((sum, item) => sum + item.amount, 0);
  
  // Net Calculation: Remaining = Target + Burned - Eaten
  const effectiveBudget = profile.targetCalories + totalCaloriesBurned;
  const remainingCalories = effectiveBudget - totalCaloriesIn;
  const calorieProgress = Math.min((totalCaloriesIn / effectiveBudget) * 100, 100);
  const waterProgress = Math.min((totalWaterIntake / (profile.waterGoal || 2000)) * 100, 100);

  // Calculate totals for each serving category
  const totalServings = {
    [FoodCategory.Grains]: todaysLogs.reduce((sum, item) => sum + (item.servings.grains || 0), 0),
    [FoodCategory.Proteins]: todaysLogs.reduce((sum, item) => sum + (item.servings.proteins || 0), 0),
    [FoodCategory.Vegetables]: todaysLogs.reduce((sum, item) => sum + (item.servings.vegetables || 0), 0),
    [FoodCategory.Fruits]: todaysLogs.reduce((sum, item) => sum + (item.servings.fruits || 0), 0),
    [FoodCategory.Dairy]: todaysLogs.reduce((sum, item) => sum + (item.servings.dairy || 0), 0),
    [FoodCategory.OilsNuts]: todaysLogs.reduce((sum, item) => sum + (item.servings.oils || 0), 0),
  };

  // Prepare chart data (sort by date, take last 7 entries)
  const chartData = [...weightLogs]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-14) // Show last 14 entries for better trend view
    .map(log => ({
      name: log.date.slice(5), // MM-DD
      weight: log.weight,
      bodyFat: log.bodyFat,
      muscleMass: log.muscleMass,
      waistLine: log.waistLine
    }));

  const handleCycleChange = (type: CycleDayType) => {
    let newTargets = {};

    if (profile.isCustomTargets) {
      const customTargets = profile.customCycleTargets?.[type];
      if (customTargets) {
        newTargets = {
          targetCalories: customTargets.targetCalories,
          targetServings: {
              grains: customTargets.grains,
              proteins: customTargets.proteins,
              vegetables: customTargets.vegetables,
              fruits: customTargets.fruits,
              dairy: customTargets.dairy,
              oils: customTargets.oils
          }
        };
      }
    } else {
      const tempProfile = { ...profile, currentCycleType: type };
      const calculated = calculateNutritionTargets(tempProfile);
      newTargets = {
          targetCalories: calculated.targetCalories,
          targetServings: calculated.targetServings
      };
    }

    onUpdateProfile({ 
        ...profile, 
        currentCycleType: type, 
        ...newTargets 
    });
  };

  const handleGetAdvice = async () => {
    setLoadingAdvice(true);
    try {
        const result = await getDietAdvice(profile, allLogs);
        setAdvice(result);
    } catch (e) {
        setAdvice("無法獲取建議，請確認網路或 API Key。");
    } finally {
        setLoadingAdvice(false);
    }
  };

  const getChartConfig = () => {
    switch (chartMetric) {
      case 'bodyFat':
        return { color: '#f97316', label: '體脂率 (%)', key: 'bodyFat', fill: 'bg-orange-500', stop: '#f97316' };
      case 'muscleMass':
        return { color: '#3b82f6', label: '肌肉量 (kg)', key: 'muscleMass', fill: 'bg-blue-500', stop: '#3b82f6' };
      case 'waistLine':
        return { color: '#8b5cf6', label: '腰圍 (cm)', key: 'waistLine', fill: 'bg-purple-500', stop: '#8b5cf6' };
      case 'weight':
      default:
        return { color: '#10b981', label: '體重 (kg)', key: 'weight', fill: 'bg-emerald-500', stop: '#10b981' };
    }
  };

  const chartConfig = getChartConfig();

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">{getGreeting()}, {profile.name}</h2>
          <p className="text-gray-500 text-sm animate-in fade-in slide-in-from-bottom-1 duration-500">
            {motivationalMessage}
          </p>
        </div>
        <div className="bg-emerald-100 p-2 rounded-full">
           <Target className="w-6 h-6 text-emerald-600" />
        </div>
      </div>

      {/* Carb Cycling Toggles */}
      {profile.dietStrategy === DietStrategy.CarbCycling && (
        <div className="bg-white rounded-2xl p-2 shadow-sm border border-gray-100 flex justify-between gap-1">
          {[
            { type: CycleDayType.HighCarb, label: '高碳日', icon: Flame, color: 'text-red-500', bg: 'bg-red-50', activeBg: 'bg-red-500' },
            { type: CycleDayType.LowCarb, label: '低碳日', icon: Zap, color: 'text-blue-500', bg: 'bg-blue-50', activeBg: 'bg-blue-500' },
          ].map((item) => (
            <button
              key={item.type}
              onClick={() => handleCycleChange(item.type)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all duration-300 font-medium text-sm
                ${profile.currentCycleType === item.type 
                  ? `${item.activeBg} text-white shadow-md` 
                  : 'bg-transparent text-gray-500 hover:bg-gray-50'
                }`}
            >
              <item.icon className={`w-4 h-4 ${profile.currentCycleType === item.type ? 'text-white' : item.color}`} />
              {item.label}
            </button>
          ))}
        </div>
      )}

      {/* Main Stats Card */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
        <div className="flex justify-between items-start mb-4">
          <div className="space-y-1">
            <p className="text-gray-500 font-medium text-sm">今日攝取 (Kcal)</p>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-gray-800">{totalCaloriesIn}</span>
              <span className="text-gray-400 text-sm">/ {profile.targetCalories} (目標)</span>
            </div>
          </div>
          <div className="text-right">
             <span className={`text-sm font-bold block ${remainingCalories >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                {remainingCalories >= 0 ? `剩餘 ${remainingCalories}` : `超過 ${Math.abs(remainingCalories)}`}
             </span>
             {totalCaloriesBurned > 0 && (
                <span className="text-xs text-orange-500 flex items-center justify-end gap-1 mt-1">
                    <Flame className="w-3 h-3" />
                    +{totalCaloriesBurned} 消耗
                </span>
             )}
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full bg-gray-100 rounded-full h-4 mb-6 overflow-hidden relative">
          <div 
            className={`h-4 rounded-full transition-all duration-500 ${remainingCalories < 0 ? 'bg-red-400' : 'bg-emerald-500'}`}
            style={{ width: `${calorieProgress}%` }}
          ></div>
          {/* Optional: Marker for base target if user exercised */}
          {totalCaloriesBurned > 0 && (
              <div 
                className="absolute top-0 bottom-0 w-0.5 bg-white/50 z-10" 
                style={{ left: `${Math.min((profile.targetCalories / effectiveBudget) * 100, 100)}%` }} 
              />
          )}
        </div>

        {/* 6 Food Group Servings Grid (Compact) */}
        <div className="grid grid-cols-2 gap-2">
          {Object.values(FOOD_CATEGORY_CONFIG).map((cat) => {
             const current = totalServings[cat.key];
             const target = profile.targetServings[cat.key];
             const percentage = Math.min((current / target) * 100, 100);
             
             return (
              <div key={cat.key} className={`${cat.bg} rounded-xl px-3 py-2 flex flex-col gap-1.5 relative overflow-hidden`}>
                 <div className="flex justify-between items-center z-10">
                    <div className="flex items-center gap-1">
                       <span className="text-base">{cat.icon}</span>
                       <span className={`text-xs font-bold ${cat.color}`}>{cat.label}</span>
                    </div>
                    <span className={`text-xs font-bold ${cat.color}`}>
                       {current} <span className="text-[10px] opacity-70">/ {target}</span>
                    </span>
                 </div>
                 
                 <div className="w-full bg-white/50 h-1.5 rounded-full z-10">
                     <div 
                        className={`h-full rounded-full ${cat.color.replace('text', 'bg')}`} 
                        style={{ width: `${percentage}%` }}
                     ></div>
                 </div>
              </div>
             );
          })}
        </div>
      </div>

      {/* Water Tracking Card */}
      <div className="bg-sky-50 rounded-3xl p-6 shadow-sm border border-sky-100 relative overflow-hidden">
         <div className="flex justify-between items-start mb-4 relative z-10">
             <div className="flex items-center gap-2">
                 <div className="bg-white p-2 rounded-full shadow-sm text-sky-500">
                    <Droplets className="w-5 h-5" />
                 </div>
                 <div>
                     <p className="text-sky-800 font-bold">飲水紀錄</p>
                     <p className="text-sky-600 text-xs font-medium">目標: {profile.waterGoal || 2000} ml</p>
                 </div>
             </div>
             <div className="text-right flex items-center gap-2">
                 <span className="text-3xl font-bold text-sky-900">{totalWaterIntake}</span>
                 {todaysWaterLogs.length > 0 && (
                     <button onClick={onDeleteLastWater} className="text-sky-400 hover:text-red-500 transition">
                         <Undo2 className="w-4 h-4" />
                     </button>
                 )}
             </div>
         </div>

         <div className="w-full bg-white/50 rounded-full h-3 mb-4 overflow-hidden relative z-10">
             <div 
                className="h-full bg-sky-500 rounded-full transition-all duration-500"
                style={{ width: `${waterProgress}%` }}
             ></div>
         </div>

         <div className="grid grid-cols-3 gap-2 relative z-10">
             <button onClick={() => onAddWater(250)} className="bg-white hover:bg-sky-100 text-sky-700 py-2 rounded-xl text-xs font-bold shadow-sm transition-colors border border-sky-100 flex flex-col items-center">
                 <span className="text-[10px] opacity-70">一杯</span>
                 +250ml
             </button>
             <button onClick={() => onAddWater(500)} className="bg-white hover:bg-sky-100 text-sky-700 py-2 rounded-xl text-xs font-bold shadow-sm transition-colors border border-sky-100 flex flex-col items-center">
                 <span className="text-[10px] opacity-70">一瓶</span>
                 +500ml
             </button>
             <button onClick={() => onAddWater(700)} className="bg-white hover:bg-sky-100 text-sky-700 py-2 rounded-xl text-xs font-bold shadow-sm transition-colors border border-sky-100 flex flex-col items-center">
                 <span className="text-[10px] opacity-70">手搖杯</span>
                 +700ml
             </button>
         </div>
      </div>

      {/* AI Advice Section (New on Dashboard) */}
      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl p-6 shadow-lg text-white">
        <div className="flex justify-between items-start mb-4">
            <h3 className="font-bold text-lg flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-yellow-300" />
                AI 營養師建議
            </h3>
            <button 
                onClick={handleGetAdvice}
                disabled={loadingAdvice}
                className="bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 backdrop-blur-sm"
            >
                {loadingAdvice ? <Loader2 className="w-3 h-3 animate-spin" /> : '獲取建議'}
            </button>
        </div>
        
        {advice ? (
            <div className="bg-white/10 rounded-xl p-4 text-sm leading-relaxed backdrop-blur-sm border border-white/10 animate-in fade-in slide-in-from-bottom-2">
                <p className="whitespace-pre-line">{advice}</p>
            </div>
        ) : (
            <p className="text-white/70 text-sm">
                點擊按鈕，讓 AI 根據您目前的數據提供今日的飲食調整建議。
            </p>
        )}
      </div>

      {/* Stats Chart Section */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-gray-600" />
            身體數據趨勢
          </h3>
          {chartMetric === 'weight' && (
            <span className="text-sm font-medium text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                目標: {profile.goalWeight} kg
            </span>
          )}
        </div>

        {/* Chart Toggle Buttons */}
        <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
            <button 
                onClick={() => setChartMetric('weight')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-1 border ${chartMetric === 'weight' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-gray-50 text-gray-500 border-transparent'}`}
            >
                <Weight className="w-3 h-3" /> 體重
            </button>
            <button 
                onClick={() => setChartMetric('bodyFat')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-1 border ${chartMetric === 'bodyFat' ? 'bg-orange-50 text-orange-600 border-orange-200' : 'bg-gray-50 text-gray-500 border-transparent'}`}
            >
                <Activity className="w-3 h-3" /> 體脂
            </button>
            <button 
                onClick={() => setChartMetric('muscleMass')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-1 border ${chartMetric === 'muscleMass' ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-gray-50 text-gray-500 border-transparent'}`}
            >
                <Dumbbell className="w-3 h-3" /> 肌肉
            </button>
             <button 
                onClick={() => setChartMetric('waistLine')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-1 border ${chartMetric === 'waistLine' ? 'bg-purple-50 text-purple-600 border-purple-200' : 'bg-gray-50 text-gray-500 border-transparent'}`}
            >
                <Ruler className="w-3 h-3" /> 腰圍
            </button>
        </div>
        
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorMetric" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chartConfig.stop} stopOpacity={0.2}/>
                  <stop offset="95%" stopColor={chartConfig.stop} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{fontSize: 12, fill: '#94a3b8'}} 
                dy={10}
              />
              <YAxis 
                domain={['dataMin - 1', 'dataMax + 1']} 
                axisLine={false} 
                tickLine={false} 
                tick={{fontSize: 12, fill: '#94a3b8'}}
                width={30}
              />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                labelStyle={{ color: '#64748b' }}
                itemStyle={{ color: chartConfig.color, fontWeight: 'bold' }}
                formatter={(value: number) => [value, chartConfig.label]}
              />
              <Area 
                type="monotone" 
                dataKey={chartConfig.key} 
                stroke={chartConfig.color}
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorMetric)" 
                connectNulls // Allows chart to connect points even if some days have missing data
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
