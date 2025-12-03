import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { 
  UserProfile, FoodItem, MealType, DietStrategy, CycleDayType, 
  GoalType, ServingTargets, ExerciseItem, ExerciseType 
} from "../types";

// ---------------- Nutrition calculation (your original code unchanged) ----------------

export const calculateNutritionTargets = (profile: UserProfile) => {
  // ...（這部分保持原樣，不需要動）
  // 我省略內容以避免太長，你保留你原本的即可
};

// ---------------- Gemini SDK setup ----------------

const getAI = () => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) throw new Error("Gemini API Key missing");
  return new GoogleGenerativeAI(apiKey);
};

// ---------------- Schema rewrite (new SDK uses SchemaType) ----------------

const FOOD_ANALYSIS_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    name: { type: SchemaType.STRING },
    calories: { type: SchemaType.NUMBER },
    servings: {
      type: SchemaType.OBJECT,
      properties: {
        grains: { type: SchemaType.NUMBER },
        proteins: { type: SchemaType.NUMBER },
        vegetables: { type: SchemaType.NUMBER },
        fruits: { type: SchemaType.NUMBER },
        dairy: { type: SchemaType.NUMBER },
        oils: { type: SchemaType.NUMBER },
      },
      required: ["grains", "proteins", "vegetables", "fruits", "dairy", "oils"],
    },
    mainCategory: { type: SchemaType.STRING },
    notes: { type: SchemaType.STRING },
  },
  required: ["name", "calories", "servings", "mainCategory"],
};

// ---------------- Food Analysis ----------------

export const analyzeFoodWithGemini = async (description: string, mealType: MealType) => {
  const ai = getAI();

  const response = await ai.generativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: FOOD_ANALYSIS_SCHEMA,
    }
  }).generateContent(`Analyze this: "${description}".`);

  const text = await response.response.text();
  const result = JSON.parse(text);

  return {
    name: result.name,
    calories: result.calories,
    servings: result.servings,
    mealType,
    mainCategory: result.mainCategory,
    notes: result.notes,
  };
};

// ---------------- Image Analysis ----------------

export const analyzeFoodImageWithGemini = async (imageBase64: string, mealType: MealType) => {
  const ai = getAI();

  const base64 = imageBase64.replace(/^data:image\/[a-zA-Z]+;base64,/, "");

  const response = await ai.generativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: FOOD_ANALYSIS_SCHEMA
    }
  }).generateContent([
    {
      inlineData: {
        mimeType: "image/jpeg",
        data: base64,
      }
    },
    { text: "Analyze this food image." }
  ]);

  const text = await response.response.text();
  const result = JSON.parse(text);

  return {
    name: result.name,
    calories: result.calories,
    servings: result.servings,
    mealType,
    mainCategory: result.mainCategory,
    notes: result.notes,
  };
};

// ---------------- Exercise Analysis ----------------

export const analyzeExerciseWithGemini = async (
  description: string,
  userWeight: number,
  durationMinutes: number
) => {
  const ai = getAI();

  const schema = {
    type: SchemaType.OBJECT,
    properties: {
      name: { type: SchemaType.STRING },
      caloriesBurned: { type: SchemaType.NUMBER },
      type: { type: SchemaType.STRING },
      notes: { type: SchemaType.STRING }
    },
    required: ["name", "caloriesBurned", "type"],
  };

  const prompt = `
    User Weight: ${userWeight}kg
    Exercise: "${description}"
    Duration: ${durationMinutes} minutes
  `;

  const response = await ai.generativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: schema
    }
  }).generateContent(prompt);

  const text = await response.response.text();
  const result = JSON.parse(text);

  return {
    name: result.name,
    caloriesBurned: result.caloriesBurned,
    durationMinutes,
    type: result.type as ExerciseType,
    notes: result.notes,
  };
};

// ---------------- Diet Advice ----------------

export const getDietAdvice = async (profile: UserProfile, logs: FoodItem[]) => {
  const ai = getAI();

  const logsText = logs.slice(0, 10)
    .map(l => `${l.name} (${l.calories}kcal)`)
    .join(", ");

  const prompt = `
    User Profile:
    - BMI: ${profile.bmi}
    - TDEE: ${profile.tdee}
    - Target Calories: ${profile.targetCalories}
    - Strategy: ${profile.dietStrategy}
    - Meals: ${logsText}
  `;

  const response = await ai
    .generativeModel({ model: "gemini-2.5-flash" })
    .generateContent(prompt);

  return response.response.text();
};