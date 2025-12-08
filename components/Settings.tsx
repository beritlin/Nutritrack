
import React, { useState } from 'react';
import { UserProfile, Gender, ActivityLevel, GoalType, DietStrategy, CycleDayType, FoodCategory, ExerciseItem, WeightLog, WaterLog } from '../types';
import { calculateNutritionTargets, getDietAdvice } from '../services/geminiService';
import { Save, User, Target, Sparkles, Loader2, Zap, Lock, Unlock, Flame, Scale, Dumbbell, Droplets, Database, Share2, Check, Weight, Activity, Ruler } from 'lucide-react';
import { FoodItem } from '../types';
import { FOOD_CATEGORY_CONFIG } from '../constants';

interface SettingsProps {
  profile: UserProfile;
  onUpdateProfile: (p: UserProfile) => void;
  logs: FoodItem[]; // For AI advice
  exerciseLogs: ExerciseItem[];
  weightLogs: WeightLog[];
  waterLogs: WaterLog[];
}

const Settings: React.FC<SettingsProps> = ({ profile, onUpdateProfile, logs, exerciseLogs, weightLogs, waterLogs }) => {
  const [editedProfile, setEditedProfile] = useState<UserProfile>(profile);
  const [advice, setAdvice] = useState<string | null>(null);
  const [loadingAdvice, setLoadingAdvice] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // State for which cycle day we are editing in Custom Mode
  const [editingCycleType, setEditingCycleType] = useState<CycleDayType>(CycleDayType.HighCarb);

  const handleChange = (field: keyof UserProfile, value: any) => {
    setEditedProfile(prev => {
      const newProfile = { ...prev, [field]: value };
      
      // Logic for recalculating targets vs body metrics
      if (['height', 'currentWeight', 'age', 'gender', 'activityLevel', 'goalType', 'dietStrategy', 'bodyFat'].includes(field)) {
         const calculated = calculateNutritionTargets(newProfile);
         
         if (prev.isCustomTargets) {
            return {
              ...newProfile,
              tdee: calculated.tdee,
              bmr: calculated.bmr,
              bmi: calculated.bmi,
              ffmi: calculated.ffmi,
              // Keep existing targets, but allow water goal update if it was auto
              waterGoal: prev.waterGoal // Or we could recalc water goal? Let's keep it manual if set.
            };
         } else {
            // If Auto, update everything
            return { ...newProfile, ...calculated };
         }
      }
      return newProfile;
    });
  };

  const toggleCustomTargets = () => {
    setEditedProfile(prev => {
      const newIsCustom = !prev.isCustomTargets;
      let updates: Partial<UserProfile> = { isCustomTargets: newIsCustom };
      
      if (newIsCustom === false) {
        // Switch back to Auto -> Recalculate
        const calculated = calculateNutritionTargets(prev);
        updates = { ...updates, ...calculated };
      } else {
        // Switch to Custom -> Init custom defaults if empty
        if (prev.dietStrategy === DietStrategy.CarbCycling && !prev.customCycleTargets) {
             updates.customCycleTargets = {
                [CycleDayType.HighCarb]: { 
                    targetCalories: 1800, 
                    grains: 12, proteins: 12, vegetables: 3, fruits: 1, dairy: 0, oils: 8.5 
                },
                [CycleDayType.LowCarb]: { 
                    targetCalories: 1600, 
                    grains: 10.5, proteins: 10, vegetables: 3, fruits: 1, dairy: 0, oils: 9 
                },
             };
        }
      }
      return { ...prev, ...updates };
    });
  };

  const handleCustomServingChange = (key: string, value: number) => {
    if (editedProfile.dietStrategy === DietStrategy.CarbCycling && editedProfile.isCustomTargets) {
        setEditedProfile(prev => {
            const updatedTargets = {
                ...prev.customCycleTargets,
                [editingCycleType]: {
                    ...prev.customCycleTargets[editingCycleType],
                    [key]: value
                }
            };
            
            // Sync with current active targets if needed
            let activeUpdates = {};
            if (prev.currentCycleType === editingCycleType) {
                if (key === 'targetCalories') activeUpdates = { targetCalories: value };
                else {
                    activeUpdates = {
                        targetServings: {
                            ...prev.targetServings,
                            [key]: value
                        }
                    };
                }
            }

            return {
                ...prev,
                customCycleTargets: updatedTargets,
                ...activeUpdates
            };
        });
    } else {
        // Balanced or other Custom modes
        if (key === 'targetCalories') {
            handleChange('targetCalories', value);
        } else {
            setEditedProfile(prev => ({
                ...prev,
                targetServings: {
                    ...prev.targetServings,
                    [key]: value
                }
            }));
        }
    }
  };

  const getInputValue = (key: string) => {
    if (editedProfile.dietStrategy === DietStrategy.CarbCycling && editedProfile.isCustomTargets) {
        // @ts-ignore
        return editedProfile.customCycleTargets?.[editingCycleType]?.[key] || 0;
    }
    if (key === 'targetCalories') return editedProfile.targetCalories;
    // @ts-ignore
    return editedProfile.targetServings[key];
  };

  const handleSave = () => {
    onUpdateProfile(editedProfile);
    alert('個人資料已更新！');
  };

  const handleGetAdvice = async () => {
    setLoadingAdvice(true);
    try {
        const result = await getDietAdvice(profile, logs);
        setAdvice(result);
    } catch (e) {
        // @ts-ignore
        setAdvice(`無法獲取建議: ${e.message || "請確認網路或 API Key。"}`);
    } finally {
        setLoadingAdvice(false);
    }
  };

  const handleSyncToGoogleSheets = async () => {
    if (!profile.googleAppsScriptUrl) {
      alert("請先輸入 Google Apps Script 網址");
      return;
    }

    // Basic URL validation
    if (!profile.googleAppsScriptUrl.includes('script.google.com') || !profile.googleAppsScriptUrl.endsWith('exec')) {
        alert('網址格式錯誤！\n請確保您複製的是「部署」後的網址 (以 /exec 結尾)，而不是編輯頁面的網址。');
        setIsSyncing(false);
        return;
    }

    setIsSyncing(true);
    try {
      // Calculate Daily Summary logic
      const allDates = new Set<string>();
      [...logs, ...exerciseLogs, ...weightLogs, ...waterLogs].forEach(l => allDates.add(l.date));
      const sortedDates = Array.from(allDates).sort().reverse();

      const dailySummary = sortedDates.map(date => {
          const dayFoods = logs.filter(l => l.date === date);
          const dayExercises = exerciseLogs.filter(l => l.date === date);
          const dayWeight = weightLogs.find(l => l.date === date);
          const dayWaters = waterLogs.filter(l => l.date === date);

          const caloriesIn = dayFoods.reduce((sum, item) => sum + item.calories, 0);
          const caloriesBurned = dayExercises.reduce((sum, item) => sum + item.caloriesBurned, 0);
          const waterMl = dayWaters.reduce((sum, item) => sum + item.amount, 0);

          const servings = dayFoods.reduce((acc, item) => {
              acc.grains += (item.servings.grains || 0);
              acc.proteins += (item.servings.proteins || 0);
              acc.vegetables += (item.servings.vegetables || 0);
              acc.fruits += (item.servings.fruits || 0);
              acc.dairy += (item.servings.dairy || 0);
              acc.oils += (item.servings.oils || 0);
              return acc;
          }, { grains: 0, proteins: 0, vegetables: 0, fruits: 0, dairy: 0, oils: 0 });

          return {
              date,
              caloriesIn,
              caloriesBurned,
              netCalories: caloriesIn - caloriesBurned,
              waterMl,
              weight: dayWeight?.weight || null,
              bodyFat: dayWeight?.bodyFat || null,
              grains: servings.grains,
              proteins: servings.proteins,
              vegetables: servings.vegetables,
              fruits: servings.fruits,
              dairy: servings.dairy,
              oils: servings.oils
          };
      });

      const payload = {
        profile: {
          ...profile,
          lastSyncDate: new Date().toLocaleString('zh-TW')
        },
        foodLogs: logs,
        exerciseLogs: exerciseLogs,
        weightLogs: weightLogs,
        waterLogs: waterLogs,
        dailySummary: dailySummary
      };

      await fetch(profile.googleAppsScriptUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 
            'Content-Type': 'text/plain;charset=utf-8' 
        },
        body: JSON.stringify(payload)
      });
      
      // Since no-cors returns opaque response, we assume success if no network error thrown
      const now = new Date().toLocaleString('zh-TW');
      handleChange('lastSyncDate', now);
      onUpdateProfile({...editedProfile, lastSyncDate: now});
      
      alert('同步請求已發送！\n若 Google 試算表未更新，請檢查權限是否設為「所有人 (Anyone)」。');
    } catch (error) {
      console.error(error);
      alert('同步失敗，請檢查網路連線。');
    } finally {
      setIsSyncing(false);
    }
  };

  const getBMIStatus = (bmi: number) => {
    if (bmi < 18.5) return { label: '過輕', color: 'text-blue-500' };
    if (bmi < 24) return { label: '標準', color: 'text-emerald-500' };
    if (bmi < 27) return { label: '過重', color: 'text-orange-500' };
    return { label: '肥胖', color: 'text-red-500' };
  };

  const bmiStatus = getBMIStatus(editedProfile.bmi);

  return (
    <div className="pb-24 space-y-6">
      <div className="flex items-center justify-between">
         <h2 className="text-2xl font-bold text-gray-800">設定與個人資料</h2>
         <button 
            onClick={handleSave}
            className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-emerald-700 transition"
         >
            <Save className="w-4 h-4" />
            儲存
         </button>
      </div>

      {/* Basic Info */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-gray-500" /> 基本資料
        </h3>
        <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
                <label className="text-xs text-gray-500 font-medium ml-1">暱稱</label>
                <input 
                    type="text" 
                    value={editedProfile.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-emerald-500 text-gray-800"
                />
            </div>
            <div>
                <label className="text-xs text-gray-500 font-medium ml-1">年齡</label>
                <input 
                    type="number" 
                    value={editedProfile.age}
                    onChange={(e) => handleChange('age', Number(e.target.value))}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-emerald-500 text-gray-800"
                />
            </div>
            <div>
                <label className="text-xs text-gray-500 font-medium ml-1">性別</label>
                <select 
                    value={editedProfile.gender}
                    onChange={(e) => handleChange('gender', e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-emerald-500 appearance-none text-gray-800"
                >
                    <option value={Gender.Male}>男</option>
                    <option value={Gender.Female}>女</option>
                </select>
            </div>
            <div>
                <label className="text-xs text-gray-500 font-medium ml-1">身高 (cm)</label>
                <input 
                    type="number" 
                    value={editedProfile.height}
                    onChange={(e) => handleChange('height', Number(e.target.value))}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-emerald-500 text-gray-800"
                />
            </div>
            <div>
                <label className="text-xs text-gray-500 font-medium ml-1">目前體重 (kg)</label>
                <input 
                    type="number" 
                    value={editedProfile.currentWeight}
                    onChange={(e) => handleChange('currentWeight', Number(e.target.value))}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-emerald-500 text-gray-800"
                />
            </div>
            <div>
                <label className="text-xs text-gray-500 font-medium ml-1">目標體重 (kg)</label>
                <input 
                    type="number" 
                    value={editedProfile.goalWeight}
                    onChange={(e) => handleChange('goalWeight', Number(e.target.value))}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-emerald-500 text-gray-800"
                />
            </div>
             <div>
                <label className="text-xs text-gray-500 font-medium ml-1">體脂率 (%)</label>
                <input 
                    type="number" 
                    value={editedProfile.bodyFat || ''}
                    placeholder="選填"
                    onChange={(e) => handleChange('bodyFat', e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-gray-300 text-gray-800"
                />
            </div>
             <div className="col-span-2">
                <label className="text-xs text-gray-500 font-medium ml-1">活動量</label>
                 <select 
                    value={editedProfile.activityLevel}
                    onChange={(e) => handleChange('activityLevel', e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-emerald-500 mt-1 text-gray-800"
                >
                    <option value={ActivityLevel.Sedentary}>久坐 (辦公室工作 / 幾乎不運動)</option>
                    <option value={ActivityLevel.LightlyActive}>輕度活動 (每週運動 1-3 次)</option>
                    <option value={ActivityLevel.ModeratelyActive}>中度活動 (每週運動 3-5 次)</option>
                    <option value={ActivityLevel.VeryActive}>高度活動 (每週運動 6-7 次)</option>
                    <option value={ActivityLevel.SuperActive}>極高活動 (體力工作 / 職業運動)</option>
                </select>
            </div>
             {/* Muscle Mass & Waistline Inputs */}
            <div>
                <label className="text-xs text-gray-500 font-medium ml-1">肌肉量 (kg)</label>
                <input 
                    type="number" 
                    value={editedProfile.muscleMass || ''}
                    placeholder="選填"
                    onChange={(e) => handleChange('muscleMass', e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-gray-300 text-gray-800"
                />
            </div>
            <div>
                <label className="text-xs text-gray-500 font-medium ml-1">腰圍 (cm)</label>
                <input 
                    type="number" 
                    value={editedProfile.waistLine || ''}
                    placeholder="選填"
                    onChange={(e) => handleChange('waistLine', e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-gray-300 text-gray-800"
                />
            </div>
        </div>
      </div>

      {/* Body Metrics Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden">
          <div className="flex items-center gap-2 mb-2 relative z-10">
             <Weight className="w-4 h-4 text-emerald-500" />
             <span className="text-sm font-bold text-gray-700">BMI 指數</span>
          </div>
          <div className="flex items-baseline gap-2 relative z-10">
             <span className="text-2xl font-bold text-gray-800">{editedProfile.bmi}</span>
             <span className={`text-xs font-bold ${bmiStatus.color}`}>{bmiStatus.label}</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden">
           <div className="flex items-center gap-2 mb-2 relative z-10">
             <Flame className="w-4 h-4 text-orange-500" />
             <span className="text-sm font-bold text-gray-700">BMR 代謝</span>
          </div>
           <div className="flex items-baseline gap-2 relative z-10">
             <span className="text-2xl font-bold text-gray-800">{editedProfile.bmr}</span>
             <span className="text-xs text-gray-400">kcal/day</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden">
           <div className="flex items-center gap-2 mb-2 relative z-10">
             <Zap className="w-4 h-4 text-purple-500" />
             <span className="text-sm font-bold text-gray-700">TDEE 消耗</span>
          </div>
           <div className="flex items-baseline gap-2 relative z-10">
             <span className="text-2xl font-bold text-gray-800">{editedProfile.tdee}</span>
             <span className="text-xs text-gray-400">kcal/day</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden">
           <div className="flex items-center gap-2 mb-2 relative z-10">
             <Dumbbell className="w-4 h-4 text-blue-500" />
             <span className="text-sm font-bold text-gray-700">FFMI 肌肉</span>
          </div>
           <div className="flex items-baseline gap-2 relative z-10">
             <span className="text-2xl font-bold text-gray-800">{editedProfile.ffmi || '-'}</span>
          </div>
        </div>
      </div>

      {/* Strategy and Goals */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-gray-500" /> 目標與策略
        </h3>
        <div className="space-y-4">
             {/* Diet Strategy Selector */}
             <div>
                <label className="text-xs text-gray-500 font-medium ml-1 flex items-center gap-1">
                    <Zap className="w-3 h-3" /> 飲食策略
                </label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                    <button
                        onClick={() => handleChange('dietStrategy', DietStrategy.Balanced)}
                        className={`p-3 rounded-xl text-sm font-medium border transition-all ${editedProfile.dietStrategy === DietStrategy.Balanced ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm' : 'bg-white border-gray-200 text-gray-600'}`}
                    >
                        基礎均衡
                    </button>
                    <button
                        onClick={() => handleChange('dietStrategy', DietStrategy.CarbCycling)}
                        className={`p-3 rounded-xl text-sm font-medium border transition-all ${editedProfile.dietStrategy === DietStrategy.CarbCycling ? 'bg-purple-50 border-purple-500 text-purple-700 shadow-sm' : 'bg-white border-gray-200 text-gray-600'}`}
                    >
                        碳循環
                    </button>
                </div>
             </div>

             {/* Goal Type Selector */}
             <div>
                <label className="text-xs text-gray-500 font-medium ml-1">主要目標</label>
                <div className="grid grid-cols-3 gap-2 mt-1">
                    <button
                        onClick={() => handleChange('goalType', GoalType.LoseWeight)}
                        className={`py-2 rounded-lg text-xs font-bold border transition-all ${editedProfile.goalType === GoalType.LoseWeight ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-white border-gray-200 text-gray-500'}`}
                    >
                        減重
                    </button>
                    <button
                        onClick={() => handleChange('goalType', GoalType.Maintain)}
                        className={`py-2 rounded-lg text-xs font-bold border transition-all ${editedProfile.goalType === GoalType.Maintain ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-white border-gray-200 text-gray-500'}`}
                    >
                        維持
                    </button>
                    <button
                        onClick={() => handleChange('goalType', GoalType.GainMuscle)}
                        className={`py-2 rounded-lg text-xs font-bold border transition-all ${editedProfile.goalType === GoalType.GainMuscle ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-white border-gray-200 text-gray-500'}`}
                    >
                        增肌
                    </button>
                </div>
             </div>
             
             {/* Water Goal */}
             <div>
                <label className="text-xs text-gray-500 font-medium ml-1 flex items-center gap-1">
                   <Droplets className="w-3 h-3 text-sky-500" /> 每日飲水目標 (ml)
                </label>
                <input 
                    type="number" 
                    value={editedProfile.waterGoal || 2000}
                    onChange={(e) => handleChange('waterGoal', Number(e.target.value))}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 mt-1 outline-none focus:ring-2 focus:ring-emerald-500 text-gray-800 font-bold"
                />
            </div>

             {/* Target Settings (Auto / Custom) */}
             <div className="pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-bold text-gray-700 flex items-center gap-2">
                        {editedProfile.isCustomTargets ? <Unlock className="w-4 h-4 text-orange-500" /> : <Lock className="w-4 h-4 text-emerald-500" />}
                        每日攝取目標
                    </span>
                    <button 
                        onClick={toggleCustomTargets}
                        className={`text-xs px-3 py-1.5 rounded-full font-bold transition-colors ${editedProfile.isCustomTargets ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500'}`}
                    >
                        {editedProfile.isCustomTargets ? '自訂模式 (已啟用)' : '自動計算 (點此切換)'}
                    </button>
                </div>

                {/* If Carb Cycling & Custom, show Tabs */}
                {editedProfile.dietStrategy === DietStrategy.CarbCycling && editedProfile.isCustomTargets && (
                    <div className="flex bg-gray-100 p-1 rounded-xl mb-4">
                        {[CycleDayType.HighCarb, CycleDayType.LowCarb].map(type => (
                            <button
                                key={type}
                                onClick={() => setEditingCycleType(type)}
                                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${editingCycleType === type ? 'bg-white shadow text-gray-800' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                {type === CycleDayType.HighCarb ? '高碳日' : '低碳日'}
                            </button>
                        ))}
                    </div>
                )}
                
                {/* Inputs for Targets */}
                <div className="space-y-3">
                    <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl">
                        <span className="text-sm font-bold text-gray-700">目標熱量 (kcal)</span>
                        <input
                            type="number"
                            value={getInputValue('targetCalories')}
                            readOnly={!editedProfile.isCustomTargets}
                            onChange={(e) => handleCustomServingChange('targetCalories', Number(e.target.value))}
                            className={`w-24 text-right bg-transparent outline-none font-bold text-lg ${editedProfile.isCustomTargets ? 'text-orange-600 border-b border-orange-200' : 'text-gray-500'}`}
                        />
                    </div>

                    <p className="text-xs text-gray-400 font-bold mt-2">六大類份數目標</p>
                    <div className="grid grid-cols-2 gap-3">
                        {Object.values(FOOD_CATEGORY_CONFIG).map(cat => (
                            <div key={cat.key} className={`${cat.bg} p-2 rounded-xl flex justify-between items-center`}>
                                <span className={`text-xs font-bold ${cat.color} flex items-center gap-1`}>
                                    {cat.icon} {cat.label}
                                </span>
                                <input
                                    type="number"
                                    step="0.5"
                                    value={getInputValue(cat.key)}
                                    readOnly={!editedProfile.isCustomTargets}
                                    onChange={(e) => handleCustomServingChange(cat.key, Number(e.target.value))}
                                    className={`w-12 text-center bg-white/50 rounded-md outline-none font-bold text-sm ${editedProfile.isCustomTargets ? 'text-gray-800 ring-1 ring-orange-200' : 'text-gray-500'}`}
                                />
                            </div>
                        ))}
                    </div>
                </div>
             </div>
        </div>
      </div>

      {/* AI Advice Section */}
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
            <div className="bg-white/10 rounded-xl p-4 text-sm leading-relaxed backdrop-blur-sm border border-white/10">
                <p className="whitespace-pre-line">{advice}</p>
            </div>
        ) : (
            <p className="text-white/70 text-sm">
                點擊按鈕，讓 AI 根據您的身體數據與最近的飲食紀錄，提供個人化的改善建議。
            </p>
        )}
      </div>

      {/* Google Sheets Sync Section (Moved to Bottom) */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
         <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Database className="w-5 h-5 text-gray-500" /> 資料備份
         </h3>
         <div className="space-y-3">
             <p className="text-xs text-gray-500 leading-relaxed">
                將資料同步到您的 Google 試算表。請建立一個 Google Apps Script 網頁應用程式，並將網址貼在下方。
                <br/>(注意：同步會覆蓋試算表上舊的紀錄)
             </p>
             
             <div>
                 <label className="text-xs text-gray-500 font-medium ml-1">Apps Script 網址 (Web App URL)</label>
                 <input 
                    type="text" 
                    value={editedProfile.googleAppsScriptUrl || ''}
                    onChange={(e) => handleChange('googleAppsScriptUrl', e.target.value)}
                    placeholder="https://script.google.com/macros/s/..."
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-emerald-500 text-gray-800 text-sm"
                />
             </div>

             <div className="flex justify-between items-center pt-2">
                 <span className="text-xs text-gray-400">
                     {editedProfile.lastSyncDate ? `上次同步: ${editedProfile.lastSyncDate}` : '尚未同步'}
                 </span>
                 <button
                    onClick={handleSyncToGoogleSheets}
                    disabled={isSyncing || !editedProfile.googleAppsScriptUrl}
                    className="flex items-center gap-2 bg-emerald-100 text-emerald-700 px-4 py-2 rounded-xl text-sm font-bold hover:bg-emerald-200 transition disabled:opacity-50"
                 >
                    {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
                    {isSyncing ? '同步中...' : '開始同步'}
                 </button>
             </div>
         </div>
      </div>

    </div>
  );
};

export default Settings;
