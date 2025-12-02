
export enum Gender {
  Male = 'Male',
  Female = 'Female',
  Other = 'Other'
}

export enum ActivityLevel {
  Sedentary = 'Sedentary', // Little or no exercise
  LightlyActive = 'LightlyActive', // Light exercise 1-3 days/week
  ModeratelyActive = 'ModeratelyActive', // Moderate exercise 3-5 days/week
  VeryActive = 'VeryActive', // Hard exercise 6-7 days/week
  SuperActive = 'SuperActive' // Very hard exercise & physical job
}

export enum GoalType {
  LoseWeight = 'LoseWeight',
  Maintain = 'Maintain',
  GainMuscle = 'GainMuscle'
}

export enum MealType {
  Breakfast = '早餐',
  Lunch = '午餐',
  Dinner = '晚餐',
  Snack = '點心'
}

export enum DietStrategy {
  Balanced = 'Balanced',       // 基礎均衡
  CarbCycling = 'CarbCycling'  // 碳循環
}

export enum CycleDayType {
  HighCarb = 'HighCarb',
  LowCarb = 'LowCarb'
}

// Ensure these match the keys in ServingTargets for easier mapping
export enum FoodCategory {
  Grains = 'grains',        // 全榖雜糧
  Proteins = 'proteins',    // 豆魚蛋肉
  Vegetables = 'vegetables',// 蔬菜
  Fruits = 'fruits',        // 水果
  Dairy = 'dairy',          // 乳品
  OilsNuts = 'oils'         // 油脂與堅果
}

export enum ExerciseType {
  Cardio = 'Cardio',       // 有氧
  Strength = 'Strength'    // 無氧/重訓
}

export interface ServingTargets {
  grains: number;     // 碗/份
  proteins: number;   // 份
  vegetables: number; // 份
  fruits: number;     // 份
  dairy: number;      // 杯/份
  oils: number;       // 茶匙/份
}

export interface UserProfile {
  name: string;
  age: number;
  height: number; // cm
  currentWeight: number; // kg
  bodyFat?: number; // percentage
  muscleMass?: number; // kg
  waistLine?: number; // cm
  goalWeight: number; // kg
  gender: Gender;
  activityLevel: ActivityLevel;
  goalType: GoalType;
  
  // New Fields for Diet Strategy
  dietStrategy: DietStrategy;
  currentCycleType: CycleDayType; // For Carb Cycling
  
  // Flag for Custom Targets
  isCustomTargets: boolean; // If true, targets are manual. If false, auto-calculated.
  
  // Store custom targets for each cycle day type
  customCycleTargets: Record<CycleDayType, ServingTargets & { targetCalories: number }>;

  // Calculated Targets & Metrics
  tdee: number; // Total Daily Energy Expenditure
  bmr: number; // Basal Metabolic Rate
  bmi: number; // Body Mass Index
  ffmi?: number; // Fat-Free Mass Index
  
  // Current Active Targets
  targetCalories: number;
  targetServings: ServingTargets;
  
  // Water
  waterGoal: number; // ml

  // Sync Settings
  googleAppsScriptUrl?: string;
  lastSyncDate?: string;
}

export interface FoodItem {
  id: string;
  name: string;
  calories: number;
  
  // Servings breakdown
  servings: ServingTargets;
  
  mealType: MealType;
  mainCategory: string; // Just for display label of the dominant category
  date: string; // ISO Date string YYYY-MM-DD
  notes?: string;
}

export interface ExerciseItem {
  id: string;
  name: string;
  caloriesBurned: number;
  durationMinutes: number;
  type: ExerciseType;
  date: string; // ISO Date string YYYY-MM-DD
  notes?: string;
}

export interface WeightLog {
  id: string;
  date: string; // ISO Date string YYYY-MM-DD
  weight: number;
  bodyFat?: number;   // %
  muscleMass?: number; // kg
  waistLine?: number; // cm
}

export interface WaterLog {
  id: string;
  date: string; // ISO Date string YYYY-MM-DD
  amount: number; // ml
}

export interface AppState {
  profile: UserProfile;
  foodLogs: FoodItem[];
  exerciseLogs: ExerciseItem[];
  weightLogs: WeightLog[];
  waterLogs: WaterLog[];
  isOnboarding: boolean;
}
