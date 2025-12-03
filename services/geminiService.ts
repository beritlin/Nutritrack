import { GoogleGenerativeAI, Schema } from "@google/generative-ai";
import { 
  UserProfile, FoodItem, MealType, DietStrategy, CycleDayType, 
  GoalType, ServingTargets, ExerciseItem, ExerciseType 
} from "../types";

// ---------------- Nutrition calculation (你的原始程式碼保持不動) ----------------

export const calculateNutritionTargets = (profile: UserProfile) => {
  // 保留你的內容就好
};

// ---------------- Gemini Setup ----------------

const getAI = () => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) throw new Error("Gemini API Key missing");
  return new GoogleGenerativeAI(apiKey);
};

// ---------------- Schemas ----------------

const FOOD_ANALYSIS_SCHEMA: Schema = {
  type: "object",
  properties: {
    name: { type: "string" },
    calories: { type: "number" },
    servings: {
      type: "object",
      properties: {
        grains: { type: "number" },
        proteins: { type: "number" },
        vegetables: { type: "number" },
        fruits: { type: "number" },
        dairy: { type: "number" },
        oils: { type: "number" },
      },
      required: ["grains", "proteins", "vegetables", "fruits", "dairy", "oils"],
    },
    mainCategory: { type: "string" },
    notes: { type: "string" },
  },
  required: ["name", "calories", "servings", "mainCategory"],
};

// ---------------- Food Analysis ----------------

export const analyzeFoodWithGemini = async (description: string, mealType: MealType) => {
  const ai = getAI();

  const model = ai.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: FOOD_ANALYSIS_SCHEMA,
    }
  });

  const response = await model.generateContent(`Analyze this food: ${description}`);

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

// ---------------- Food Image Analysis ----------------

export const analyzeFoodImageWithGemini = async (imageBase64: string, mealType: MealType) => {
  const ai = getAI();

  const model = ai.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: FOOD_ANALYSIS_SCHEMA
    }
  });

  const base64 = imageBase64.replace(/^data:image\/[a-zA-Z]+;base64,/, "");

  const response = await model.generateContent([
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

  const schema: Schema = {
    type: "object",
    properties: {
      name: { type: "string" },
      caloriesBurned: { type: "number" },
      type: { type: "string" },
      notes: { type: "string" }
    },
    required: ["name", "caloriesBurned", "type"]
  };

  const model = ai.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: schema
    }
  });

  const prompt = `
    Weight: ${userWeight}kg
    Exercise: "${description}"
    Duration: ${durationMinutes} minutes
  `;

  const response = await model.generateContent(prompt);

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

  const recent = logs.slice(0, 10)
    .map(l => `${l.name} (${l.calories} kcal)`)
    .join(", ");

  const prompt = `
    BMI: ${profile.bmi}
    TDEE: ${profile.tdee}
    Target Calories: ${profile.targetCalories}
    Strategy: ${profile.dietStrategy}
    Meals: ${recent}
  `;

  const model = ai.getGenerativeModel({ model: "gemini-2.5-flash" });

  const response = await model.generateContent(prompt);

  return response.response.text();
};