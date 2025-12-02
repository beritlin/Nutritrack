import React, { useState, useRef } from 'react';
import { FoodItem, MealType, ExerciseItem, ExerciseType } from '../types';
import { analyzeFoodWithGemini, analyzeExerciseWithGemini, analyzeFoodImageWithGemini } from '../services/geminiService';
import { Plus, Loader2, Sparkles, Trash2, Dumbbell, Flame, Waves, Utensils, Edit2, Check, X, Camera } from 'lucide-react';
import { MEAL_TYPES_LIST, FOOD_CATEGORY_CONFIG } from '../constants';

interface FoodLoggerProps {
  logs: FoodItem[];
  exerciseLogs: ExerciseItem[];
  onAddLog: (log: FoodItem) => void;
  onUpdateLog: (log: FoodItem) => void;
  onDeleteLog: (id: string) => void;
  onAddExercise: (log: ExerciseItem) => void;
  onDeleteExercise: (id: string) => void;
  selectedDate: string;
  userWeight: number;
}

const FoodLogger: React.FC<FoodLoggerProps> = ({ 
    logs, exerciseLogs, onAddLog, onUpdateLog, onDeleteLog, 
    onAddExercise, onDeleteExercise, selectedDate, userWeight 
}) => {
  const [activeTab, setActiveTab] = useState<'food' | 'exercise'>('food');
  const [isAdding, setIsAdding] = useState(false);
  
  // Food Form State
  const [foodDescription, setFoodDescription] = useState('');
  const [selectedMeal, setSelectedMeal] = useState<MealType>(MealType.Breakfast);
  
  // Exercise Form State
  const [exerciseDescription, setExerciseDescription] = useState('');
  const [duration, setDuration] = useState<number>(30);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Editing State
  const [editingFood, setEditingFood] = useState<FoodItem | null>(null);

  // Image Upload Ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFoodAnalysis = async () => {
    if (!foodDescription.trim()) return;
    setIsLoading(true);
    setError(null);

    try {
      const result = await analyzeFoodWithGemini(foodDescription, selectedMeal);
      
      const newLog: FoodItem = {
        id: crypto.randomUUID(),
        date: selectedDate,
        ...result
      };

      // Instead of adding immediately, open the edit/review modal
      setEditingFood(newLog);
      setIsAdding(false);
      setFoodDescription('');
    } catch (err) {
      console.error(err);
      setError("AI 分析失敗，請檢查 API Key 或重試。");
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);

    const reader = new FileReader();
    reader.onloadend = async () => {
        const base64String = reader.result as string;
        try {
            const result = await analyzeFoodImageWithGemini(base64String, selectedMeal);
            
            const newLog: FoodItem = {
                id: crypto.randomUUID(),
                date: selectedDate,
                ...result
            };

            setEditingFood(newLog);
            setIsAdding(false);
            setFoodDescription('');
        } catch (err) {
            console.error(err);
            setError("圖片分析失敗，請重試或改用文字輸入。");
        } finally {
            setIsLoading(false);
            // Reset input so same file can be selected again if needed
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };
    reader.readAsDataURL(file);
  };

  const triggerCamera = () => {
      fileInputRef.current?.click();
  };

  const handleExerciseAnalysis = async () => {
      if (!exerciseDescription.trim() || duration <= 0) return;
      setIsLoading(true);
      setError(null);

      try {
          const result = await analyzeExerciseWithGemini(exerciseDescription, userWeight, duration);
          const newLog: ExerciseItem = {
              id: crypto.randomUUID(),
              date: selectedDate,
              ...result
          };
          onAddExercise(newLog);
          setIsAdding(false);
          setExerciseDescription('');
          setDuration(30);
      } catch (err) {
          console.error(err);
          setError("AI 分析失敗，請檢查 API Key 或重試。");
      } finally {
          setIsLoading(false);
      }
  };

  const handleSaveEditedFood = () => {
    if (!editingFood) return;

    // Check if this ID already exists in the logs
    const exists = logs.some(log => log.id === editingFood.id);
    
    if (exists) {
        onUpdateLog(editingFood);
    } else {
        onAddLog(editingFood);
    }
    setEditingFood(null);
  };

  const handleEditChange = (field: keyof FoodItem, value: any) => {
      if (!editingFood) return;
      setEditingFood({ ...editingFood, [field]: value });
  };

  const handleEditServing = (key: string, value: number) => {
      if (!editingFood) return;
      setEditingFood({
          ...editingFood,
          servings: {
              ...editingFood.servings,
              [key]: value
          }
      });
  };

  const groupedFoodLogs = MEAL_TYPES_LIST.map(type => ({
    type,
    items: logs.filter(log => log.mealType === type)
  }));

  return (
    <div className="pb-24 space-y-6">
      
      {/* Top Toggle Tabs */}
      <div className="bg-white p-1 rounded-2xl flex border border-gray-100 shadow-sm">
          <button 
            onClick={() => setActiveTab('food')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'food' ? 'bg-emerald-500 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
          >
              <Utensils className="w-4 h-4" /> 飲食
          </button>
          <button 
            onClick={() => setActiveTab('exercise')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'exercise' ? 'bg-orange-500 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
          >
              <Dumbbell className="w-4 h-4" /> 運動
          </button>
      </div>

      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">{activeTab === 'food' ? '飲食紀錄' : '運動紀錄'}</h2>
        <button 
          onClick={() => setIsAdding(true)}
          className={`px-4 py-2 rounded-xl text-sm font-semibold shadow-lg transition flex items-center gap-2 text-white
             ${activeTab === 'food' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200' : 'bg-orange-500 hover:bg-orange-600 shadow-orange-200'}`}
        >
          <Plus className="w-4 h-4" />
          {activeTab === 'food' ? '紀錄飲食' : '紀錄運動'}
        </button>
      </div>

      {/* AI Analysis / Adding Modal */}
      {isAdding && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-800">
              <Sparkles className={`w-5 h-5 ${activeTab === 'food' ? 'text-emerald-500' : 'text-orange-500'}`} />
              AI 智能{activeTab === 'food' ? '飲食' : '運動'}分析
            </h3>
            
            <div className="space-y-4">
              {activeTab === 'food' ? (
                  // Food Input
                  <>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">餐點類型</label>
                        <div className="flex gap-2 overflow-x-auto pb-2">
                        {MEAL_TYPES_LIST.map(type => (
                            <button
                            key={type}
                            onClick={() => setSelectedMeal(type)}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                                selectedMeal === type 
                                ? 'bg-emerald-100 text-emerald-700 border-emerald-200 border' 
                                : 'bg-gray-50 text-gray-600 border border-transparent'
                            }`}
                            >
                            {type}
                            </button>
                        ))}
                        </div>
                    </div>

                    <div className="flex flex-col gap-3">
                         {/* Hidden File Input */}
                        <input 
                            type="file" 
                            accept="image/*" 
                            capture="environment"
                            ref={fileInputRef}
                            className="hidden"
                            onChange={handleImageUpload}
                        />

                        {/* Camera Button */}
                        <button 
                            onClick={triggerCamera}
                            disabled={isLoading}
                            className="w-full py-3 bg-blue-50 text-blue-600 rounded-xl border border-blue-100 font-bold flex items-center justify-center gap-2 hover:bg-blue-100 transition"
                        >
                            <Camera className="w-5 h-5" />
                            拍照辨識
                        </button>
                        
                        <div className="relative flex items-center py-1">
                            <div className="flex-grow border-t border-gray-200"></div>
                            <span className="flex-shrink-0 mx-4 text-gray-400 text-xs">或輸入文字</span>
                            <div className="flex-grow border-t border-gray-200"></div>
                        </div>

                        <div>
                            <textarea
                            value={foodDescription}
                            onChange={(e) => setFoodDescription(e.target.value)}
                            placeholder="例如：一碗牛肉麵和一杯無糖綠茶..."
                            className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none resize-none h-24 bg-gray-50 text-gray-800"
                            />
                        </div>
                    </div>
                  </>
              ) : (
                  // Exercise Input
                  <>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">運動持續時間 (分鐘)</label>
                        <input
                            type="number"
                            value={duration}
                            onChange={(e) => setDuration(Number(e.target.value))}
                            className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none bg-gray-50 text-gray-800 font-bold"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">做了什麼運動？</label>
                        <textarea
                        value={exerciseDescription}
                        onChange={(e) => setExerciseDescription(e.target.value)}
                        placeholder="例如：慢跑 5 公里，或者是 啞鈴臥推 5 組..."
                        className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none resize-none h-32 bg-gray-50 text-gray-800"
                        />
                    </div>
                  </>
              )}

              {error && (
                <p className="text-red-500 text-sm bg-red-50 p-3 rounded-lg">{error}</p>
              )}

              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setIsAdding(false)}
                  className="flex-1 py-3 rounded-xl font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition"
                  disabled={isLoading}
                >
                  取消
                </button>
                <button 
                  onClick={activeTab === 'food' ? handleFoodAnalysis : handleExerciseAnalysis}
                  disabled={isLoading || (activeTab === 'food' ? !foodDescription.trim() : !exerciseDescription.trim())}
                  className={`flex-1 py-3 rounded-xl font-semibold text-white transition flex items-center justify-center gap-2 disabled:opacity-50
                    ${activeTab === 'food' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-orange-500 hover:bg-orange-600'}`}
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                  {isLoading ? '分析中...' : '文字分析'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit/Review Food Modal */}
      {editingFood && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6 shadow-2xl animate-in zoom-in duration-200">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                          <Edit2 className="w-5 h-5 text-emerald-500" />
                          編輯食物紀錄
                      </h3>
                      <button onClick={() => setEditingFood(null)} className="text-gray-400 hover:text-gray-600">
                          <X className="w-6 h-6" />
                      </button>
                  </div>
                  
                  <div className="space-y-4">
                      <div>
                          <label className="text-xs text-gray-500 font-bold ml-1 mb-1 block">食物名稱</label>
                          <input 
                              type="text" 
                              value={editingFood.name}
                              onChange={(e) => handleEditChange('name', e.target.value)}
                              className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-emerald-500 text-gray-800 font-medium"
                          />
                      </div>
                      
                      <div>
                          <label className="text-xs text-gray-500 font-bold ml-1 mb-1 block">總熱量 (kcal)</label>
                          <input 
                              type="number" 
                              value={editingFood.calories}
                              onChange={(e) => handleEditChange('calories', Number(e.target.value))}
                              className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-emerald-500 text-gray-800 font-bold text-lg"
                          />
                      </div>

                      <div className="border-t border-gray-100 pt-3">
                          <p className="text-sm font-bold text-gray-700 mb-3">六大類份數調整</p>
                          <div className="grid grid-cols-2 gap-3">
                                {Object.values(FOOD_CATEGORY_CONFIG).map(cat => (
                                    <div key={cat.key} className="bg-gray-50 rounded-xl p-2 border border-gray-100">
                                        <label className={`text-xs ${cat.color} font-bold mb-1 flex items-center gap-1`}>
                                            {cat.icon} {cat.label}
                                        </label>
                                        <input 
                                            type="number"
                                            step="0.5" 
                                            // @ts-ignore
                                            value={editingFood.servings[cat.key] || 0}
                                            onChange={(e) => handleEditServing(cat.key, Number(e.target.value))}
                                            className={`w-full bg-white border border-gray-200 rounded-lg p-2 outline-none text-center font-bold text-gray-800 focus:ring-1 focus:ring-emerald-500`}
                                        />
                                    </div>
                                ))}
                          </div>
                      </div>

                      <div className="flex gap-3 pt-2">
                          <button 
                              onClick={() => setEditingFood(null)}
                              className="flex-1 py-3 rounded-xl font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition"
                          >
                              取消
                          </button>
                          <button 
                              onClick={handleSaveEditedFood}
                              className="flex-1 py-3 rounded-xl font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition flex items-center justify-center gap-2"
                          >
                              <Check className="w-5 h-5" />
                              確認儲存
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* List Display */}
      {activeTab === 'food' ? (
         <div className="space-y-6">
            {groupedFoodLogs.map(group => (
            <div key={group.type} className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center justify-between">
                {group.type}
                <span className="text-sm font-normal text-gray-400">
                    {group.items.reduce((acc, curr) => acc + curr.calories, 0)} kcal
                </span>
                </h3>
                
                {group.items.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                    尚未紀錄
                </p>
                ) : (
                <div className="space-y-3">
                    {group.items.map(item => (
                    <div 
                        key={item.id} 
                        className="flex justify-between items-start group cursor-pointer hover:bg-gray-50 p-2 -mx-2 rounded-xl transition-colors"
                        onClick={() => setEditingFood(item)}
                    >
                        <div>
                        <p className="font-medium text-gray-800">{item.name}</p>
                        
                        {/* Show servings tags */}
                        <div className="flex flex-wrap gap-1 mt-1">
                            {Object.entries(item.servings).map(([key, value]) => {
                                if ((value as number) <= 0) return null;
                                const config = Object.values(FOOD_CATEGORY_CONFIG).find(c => c.key === key);
                                if (!config) return null;
                                return (
                                    <span key={key} className={`text-[10px] px-1.5 py-0.5 rounded-full ${config.bg} ${config.color}`}>
                                        {config.icon} {(value as number)}
                                    </span>
                                );
                            })}
                        </div>

                        {item.notes && <p className="text-xs text-gray-400 mt-1">{item.notes}</p>}
                        </div>
                        <div className="flex items-center gap-3">
                        <span className="font-bold text-emerald-600 text-sm">{item.calories}</span>
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                onDeleteLog(item.id);
                            }}
                            className="text-gray-300 hover:text-red-500 transition p-1"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                        </div>
                    </div>
                    ))}
                </div>
                )}
            </div>
            ))}
         </div>
      ) : (
        // Exercise List
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
             <h3 className="font-bold text-gray-800 mb-4 flex items-center justify-between">
                今日運動
                <span className="text-sm font-normal text-orange-500 flex items-center gap-1">
                    <Flame className="w-4 h-4" />
                    {exerciseLogs.reduce((acc, curr) => acc + curr.caloriesBurned, 0)} kcal 消耗
                </span>
            </h3>

            {exerciseLogs.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                    今天還沒運動喔，起來動一動吧！
                </p>
            ) : (
                <div className="space-y-4">
                    {exerciseLogs.map(item => (
                        <div key={item.id} className="flex justify-between items-center group bg-gray-50 p-3 rounded-2xl border border-gray-100">
                             <div className="flex items-center gap-3">
                                 <div className={`w-10 h-10 rounded-full flex items-center justify-center ${item.type === ExerciseType.Cardio ? 'bg-sky-100 text-sky-500' : 'bg-purple-100 text-purple-500'}`}>
                                    {item.type === ExerciseType.Cardio ? <Waves className="w-5 h-5" /> : <Dumbbell className="w-5 h-5" />}
                                 </div>
                                 <div>
                                     <p className="font-bold text-gray-800">{item.name}</p>
                                     <p className="text-xs text-gray-500">{item.durationMinutes} 分鐘 • {item.type === ExerciseType.Cardio ? '有氧' : '無氧'}</p>
                                 </div>
                             </div>
                             <div className="flex items-center gap-3">
                                <span className="font-bold text-orange-500 text-sm flex items-center gap-1">
                                    -{item.caloriesBurned} <span className="text-xs font-normal text-gray-400">kcal</span>
                                </span>
                                <button 
                                    onClick={() => onDeleteExercise(item.id)}
                                    className="text-gray-300 hover:text-red-500 transition p-1"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                             </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
      )}

    </div>
  );
};

export default FoodLogger;