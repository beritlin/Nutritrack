
import { ActivityLevel, GoalType, MealType, UserProfile, Gender, DietStrategy, CycleDayType, FoodCategory } from './types';

export const DEFAULT_SERVINGS = {
  grains: 3,
  proteins: 5,
  vegetables: 3,
  fruits: 2,
  dairy: 1.5,
  oils: 4
};

export const DEFAULT_PROFILE: UserProfile = {
  name: 'User',
  age: 30,
  height: 170,
  currentWeight: 70,
  bodyFat: 20, // Default estimate
  goalWeight: 65,
  gender: Gender.Male,
  activityLevel: ActivityLevel.ModeratelyActive,
  goalType: GoalType.LoseWeight,
  
  dietStrategy: DietStrategy.Balanced,
  currentCycleType: CycleDayType.LowCarb, // Default to Low Carb
  isCustomTargets: false, // Default to auto-calculation

  // Initialize with some sensible defaults so it's not empty if they switch immediately
  customCycleTargets: {
    [CycleDayType.HighCarb]: { 
        targetCalories: 2400, 
        grains: 4, proteins: 6, vegetables: 4, fruits: 3, dairy: 1.5, oils: 4 
    },
    [CycleDayType.LowCarb]: { 
        targetCalories: 1600, 
        grains: 1, proteins: 8, vegetables: 5, fruits: 1, dairy: 1.5, oils: 6 
    },
  },

  tdee: 2200,
  bmr: 1600,
  bmi: 24.2,
  ffmi: 19,
  
  targetCalories: 1800,
  targetServings: DEFAULT_SERVINGS,

  waterGoal: 2300, // Default ~ 70kg * 33

  googleAppsScriptUrl: '',
  lastSyncDate: ''
};

export const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  [ActivityLevel.Sedentary]: 1.2,
  [ActivityLevel.LightlyActive]: 1.375,
  [ActivityLevel.ModeratelyActive]: 1.55,
  [ActivityLevel.VeryActive]: 1.725,
  [ActivityLevel.SuperActive]: 1.9,
};

export const GOAL_MODIFIERS: Record<GoalType, number> = {
  [GoalType.LoseWeight]: 0.85, // 15% deficit
  [GoalType.Maintain]: 1.0,
  [GoalType.GainMuscle]: 1.10, // 10% surplus
};

export const MEAL_TYPES_LIST = [
  MealType.Breakfast,
  MealType.Lunch,
  MealType.Dinner,
  MealType.Snack
];

export const FOOD_CATEGORY_CONFIG: Record<string, { color: string, bg: string, label: string, icon: string, key: FoodCategory }> = {
  [FoodCategory.Grains]: { color: 'text-amber-700', bg: 'bg-amber-100', label: '全榖雜糧', icon: '🍚', key: FoodCategory.Grains },
  [FoodCategory.Proteins]: { color: 'text-rose-700', bg: 'bg-rose-100', label: '豆魚蛋肉', icon: '🥩', key: FoodCategory.Proteins },
  [FoodCategory.Dairy]: { color: 'text-sky-700', bg: 'bg-sky-100', label: '乳品類', icon: '🥛', key: FoodCategory.Dairy },
  [FoodCategory.Vegetables]: { color: 'text-emerald-700', bg: 'bg-emerald-100', label: '蔬菜類', icon: '🥬', key: FoodCategory.Vegetables },
  [FoodCategory.Fruits]: { color: 'text-orange-600', bg: 'bg-orange-100', label: '水果類', icon: '🍎', key: FoodCategory.Fruits },
  [FoodCategory.OilsNuts]: { color: 'text-yellow-700', bg: 'bg-yellow-100', label: '油脂堅果', icon: '🥜', key: FoodCategory.OilsNuts },
};

export const STORAGE_KEYS = {
  PROFILE: 'nutritrack_profile_v2', 
  FOOD_LOGS: 'nutritrack_food_logs_v2',
  EXERCISE_LOGS: 'nutritrack_exercise_logs_v1',
  WEIGHT_LOGS: 'nutritrack_weight_logs',
  WATER_LOGS: 'nutritrack_water_logs'
};
