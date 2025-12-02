import { GoogleGenAI, Type } from "@google/genai";
import { UserProfile, FoodItem, MealType, DietStrategy, CycleDayType, GoalType, FoodCategory, ServingTargets, ExerciseItem, ExerciseType } from "../types";

// Helper to calculate TDEE and Serving Targets
export const calculateNutritionTargets = (profile: UserProfile): { 
  tdee: number, 
  bmr: number,
  bmi: number,
  ffmi: number | undefined,
  targetCalories: number,
  targetServings: ServingTargets,
  waterGoal: number
} => {
  // 1. Calculate BMR (Mifflin-St Jeor)
  let bmr = 10 * profile.currentWeight + 6.25 * profile.height - 5 * profile.age;
  
  if (profile.gender === 'Male') {
    bmr += 5;
  } else {
    bmr -= 161;
  }
  bmr = Math.round(bmr);

  // 2. Calculate TDEE
  const multipliers: Record<string, number> = {
    'Sedentary': 1.2,
    'LightlyActive': 1.375,
    'ModeratelyActive': 1.55,
    'VeryActive': 1.725,
    'SuperActive': 1.9
  };

  const tdee = Math.round(bmr * (multipliers[profile.activityLevel] || 1.2));

  // 3. Calculate BMI
  const heightInMeters = profile.height / 100;
  const bmi = Number((profile.currentWeight / (heightInMeters * heightInMeters)).toFixed(1));

  // 4. Calculate FFMI (if body fat is present)
  let ffmi: number | undefined = undefined;
  if (profile.bodyFat !== undefined) {
    const fatFreeMass = profile.currentWeight * (1 - (profile.bodyFat / 100));
    ffmi = Number((fatFreeMass / (heightInMeters * heightInMeters)).toFixed(1));
  }

  // 5. Target Calorie Calculation
  let targetCalories = tdee;

  if (profile.dietStrategy === DietStrategy.CarbCycling) {
      if (profile.goalType === GoalType.GainMuscle) {
          // 增肌模式 (Gain Muscle)
          if (profile.currentCycleType === CycleDayType.HighCarb) {
              // 高碳日 (訓練日): 顯著熱量盈餘 (+15%) 以支持訓練
              targetCalories = Math.round(tdee * 1.15);
          } else {
              // 低碳日 (休息日): 維持熱量或微幅赤字 (-5%)，確保肌肉修復
              // 修正：原本是 0.75 (減脂設定)，對增肌來說太低了
              targetCalories = Math.round(tdee * 0.95);
          }
      } else {
          // 減脂或維持模式 (Lose Weight / Maintain)
          if (profile.currentCycleType === CycleDayType.HighCarb) {
              // 高碳日: 吃到 TDEE (補碳/Refeed)
              targetCalories = Math.round(tdee * 1.0);
          } else {
              // 低碳日: 較大的熱量赤字 (-25%)
              targetCalories = Math.round(tdee * 0.75);
          }
      }
  } else {
      // 基礎均衡飲食 (Balanced)
      if (profile.goalType === GoalType.LoseWeight) {
          targetCalories = Math.round(tdee * 0.85); // 15% deficit
      } else if (profile.goalType === GoalType.GainMuscle) {
          targetCalories = Math.round(tdee * 1.1); // 10% surplus
      }
  }

  // 6. Distribution into 6 Food Categories (Servings)
  // Base logic approximated from Taiwan Daily Food Guide based on calorie tiers
  // We determine base servings based on the target calories
  let s: ServingTargets = {
      grains: 3, proteins: 5, dairy: 1.5, vegetables: 3, fruits: 2, oils: 5
  };

  const cal = targetCalories;

  if (cal < 1350)      s = { grains: 1.5, proteins: 3, dairy: 1.5, vegetables: 3, fruits: 2, oils: 3 };
  else if (cal < 1650) s = { grains: 2.5, proteins: 4, dairy: 1.5, vegetables: 3, fruits: 2, oils: 4 };
  else if (cal < 1900) s = { grains: 3, proteins: 5, dairy: 1.5, vegetables: 3, fruits: 2, oils: 5 };
  else if (cal < 2100) s = { grains: 3.5, proteins: 6, dairy: 1.5, vegetables: 4, fruits: 3, oils: 6 };
  else if (cal < 2350) s = { grains: 4, proteins: 6, dairy: 1.5, vegetables: 4, fruits: 3.5, oils: 6 };
  else if (cal < 2600) s = { grains: 4.5, proteins: 7, dairy: 1.5, vegetables: 5, fruits: 4, oils: 7 };
  else                 s = { grains: 5, proteins: 8, dairy: 2, vegetables: 5, fruits: 4, oils: 8 };

  // Apply Carb Cycling Modifications to Servings
  if (profile.dietStrategy === DietStrategy.CarbCycling) {
      if (profile.currentCycleType === CycleDayType.HighCarb) {
          // High Carb: Boost Grains & Fruits, Lower Oils slightly
          // 高碳日：重點在碳水，油脂稍微減少以平衡熱量
          s.grains = Math.round(s.grains * 1.3 * 10) / 10;
          s.fruits = Math.round(s.fruits * 1.2 * 10) / 10;
          s.oils = Math.max(3, Math.round(s.oils * 0.8)); 
      } else {
          // Low Carb: Cut Grains & Fruits, Boost Proteins & Veggies & Oils
          // 低碳日：減少碳水，大幅增加蛋白質與油脂
          
          // 如果是增肌，碳水不需要砍得像減脂那麼兇 (0.3 -> 0.5)
          const grainMod = profile.goalType === GoalType.GainMuscle ? 0.5 : 0.3;
          
          s.grains = Math.max(0.5, Math.round(s.grains * grainMod * 10) / 10);
          s.fruits = Math.max(1, Math.round(s.fruits * 0.5 * 10) / 10);
          
          // 補償熱量
          s.proteins = Math.round(s.proteins * 1.4 * 10) / 10;
          s.vegetables = Math.round(s.vegetables * 1.3 * 10) / 10;
          s.oils = Math.round(s.oils * 1.5 * 10) / 10; // 增加油脂攝取
      }
  }

  // 7. Water Goal (Approx 33ml per kg)
  const waterGoal = Math.round(profile.currentWeight * 33);

  return { 
    tdee, 
    bmr,
    bmi,
    ffmi,
    targetCalories, 
    targetServings: s,
    waterGoal
  };
};

const FOOD_ANALYSIS_PROMPT_TEMPLATE = `
    1. Estimate the total calories.
    2. Crucial: Break down the content into "Servings" (份) based on the specific Food Exchange List below:

    【Reference for 1 Serving (一份代換參考)】
    
    [全穀雜糧類 (Grains)]
    - 飯: 1/4 碗 (40g 生米 / 約 80g 熟飯)
    - 麵: 1/2 碗 (60g 乾麵)
    - 吐司: 1 片 (薄)
    - 饅頭: 1/4 個
    - 玉米: 6 cm
    - 燕麥片: 3 湯匙
    - 馬鈴薯: 90g | 南瓜: 85g | 芋頭/地瓜: 55g

    [豆魚蛋肉類 (Proteins)] (約 7g 蛋白質)
    - 豆乾: 40g
    - 板豆腐: 80g | 嫩豆腐: 140g
    - 豆漿: 190ml
    - 海鮮: 50g
    - 雞蛋: 1 顆
    - 肉類 (豬/雞/牛): 30g

    [蔬菜類 (Vegetables)]
    - 熟蔬菜: 0.5 碗
    - 生菜: 100g

    [水果類 (Fruits)]
    - 香蕉: 0.5 根 (70g)
    - 鳳梨: 10 片 (110g)
    - 百香果: 2 顆 (140g)
    - 草莓: 16 小顆 (160g)
    - 奇異果: 1.5 顆 (105g)
    - 番茄: 23 顆 (220g)
    - 火龍果: 110g
    - 芭樂: 1 顆 (115g)
    - 木瓜: 1/3 顆 (150g)
    - 蘋果: 1 顆 (130g)
    - 橘子: 1 顆 (150g)
    - 芒果(愛文): 1.5 片 (150g)
    - 葡萄: 13 顆 (85g)

    [乳品類 (Dairy)] & [油脂與堅果 (Oils)]
    - Follow standard estimates (Milk 240ml = 1 serving, Oil 1 tsp = 1 serving) if not specified.
    
    If specific amounts aren't given, make a reasonable guess based on standard portion sizes (e.g., "One Bentou" usually has 3-4 servings of grains, 2-3 proteins, 1-2 veg, 2-3 oils).
    
    Return the name as a short, concise food title in Traditional Chinese.
    Determine the "Main Category" (the one with highest servings or most relevant).
`;

const FOOD_ANALYSIS_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING, description: "Name of the food in Traditional Chinese" },
    calories: { type: Type.NUMBER, description: "Total calories (kcal)" },
    servings: {
        type: Type.OBJECT,
        properties: {
            grains: { type: Type.NUMBER, description: "Servings of Grains" },
            proteins: { type: Type.NUMBER, description: "Servings of Proteins" },
            vegetables: { type: Type.NUMBER, description: "Servings of Vegetables" },
            fruits: { type: Type.NUMBER, description: "Servings of Fruits" },
            dairy: { type: Type.NUMBER, description: "Servings of Dairy" },
            oils: { type: Type.NUMBER, description: "Servings of Oils & Nuts" },
        },
        required: ["grains", "proteins", "vegetables", "fruits", "dairy", "oils"]
    },
    mainCategory: { type: Type.STRING, description: "One of: 全榖雜糧類, 豆魚蛋肉類, 蔬菜類, 水果類, 乳品類, 油脂與堅果種子類, 其他" },
    notes: { type: Type.STRING, description: "Short explanation of the estimation in Traditional Chinese" }
  },
  required: ["name", "calories", "servings", "mainCategory"],
};

export const analyzeFoodWithGemini = async (
  description: string, 
  mealType: MealType
): Promise<Omit<FoodItem, 'id' | 'date'>> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key is missing");

  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `Analyze this food description: "${description}". ${FOOD_ANALYSIS_PROMPT_TEMPLATE}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: FOOD_ANALYSIS_SCHEMA
    }
  });

  const text = response.text;
  if (!text) throw new Error("No response from AI");

  const result = JSON.parse(text);

  return {
    name: result.name,
    calories: result.calories,
    servings: result.servings,
    mealType: mealType,
    mainCategory: result.mainCategory,
    notes: result.notes
  };
};

export const analyzeFoodImageWithGemini = async (
  imageBase64: string,
  mealType: MealType
): Promise<Omit<FoodItem, 'id' | 'date'>> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key is missing");

  const ai = new GoogleGenAI({ apiKey });

  // Dynamically extract the MIME type from the data URL prefix
  const mimeMatch = imageBase64.match(/^data:(image\/\w+);base64,/);
  const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';

  // Remove the data URL prefix if present to get just the base64 string
  const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: mimeType,
            data: base64Data
          }
        },
        {
          text: `Look at this food image. ${FOOD_ANALYSIS_PROMPT_TEMPLATE}`
        }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: FOOD_ANALYSIS_SCHEMA
    }
  });

  const text = response.text;
  if (!text) throw new Error("No response from AI");

  const result = JSON.parse(text);

  return {
    name: result.name,
    calories: result.calories,
    servings: result.servings,
    mealType: mealType,
    mainCategory: result.mainCategory,
    notes: result.notes
  };
};

export const analyzeExerciseWithGemini = async (
  description: string,
  userWeight: number,
  durationMinutes: number
): Promise<Omit<ExerciseItem, 'id' | 'date'>> => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) throw new Error("API Key is missing");

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `
      User Weight: ${userWeight}kg.
      Exercise Activity: "${description}".
      Duration: ${durationMinutes} minutes.

      1. Estimate calories burned (kcal).
      2. Classify as 'Cardio' (Aerobic, e.g., running, swimming, cycling, dancing) or 'Strength' (Anaerobic, e.g., weightlifting, calisthenics, HIIT, sprinting).
      3. Provide a short, standard Traditional Chinese name for the activity.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING },
                    caloriesBurned: { type: Type.NUMBER },
                    type: { type: Type.STRING, enum: ["Cardio", "Strength"] },
                    notes: { type: Type.STRING, description: "Brief calculation basis in Traditional Chinese" }
                },
                required: ["name", "caloriesBurned", "type"]
            }
        }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    const result = JSON.parse(text);

    return {
        name: result.name,
        caloriesBurned: result.caloriesBurned,
        durationMinutes: durationMinutes,
        type: result.type as ExerciseType,
        notes: result.notes
    };
};

export const getDietAdvice = async (profile: UserProfile, logs: FoodItem[]): Promise<string> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return "請先設定 API Key 才能獲取 AI 建議。";

  const ai = new GoogleGenAI({ apiKey });

  const recentLogs = logs.slice(0, 10);
  const logsText = recentLogs.map(l => `${l.name} (${l.calories}kcal, Grains:${l.servings.grains}, Protein:${l.servings.proteins})`).join(", ");

  const prompt = `
    User Profile:
    - Goal: ${profile.goalType}
    - BMI: ${profile.bmi}
    - TDEE: ${profile.tdee}
    - Diet Strategy: ${profile.dietStrategy === DietStrategy.CarbCycling ? 'Carb Cycling (' + profile.currentCycleType + ')' : 'Balanced Diet'}
    - Target Calories: ${profile.targetCalories}
    - Recent Meals: ${logsText || "None recorded yet"}

    Please provide 3 concise, bulleted actionable tips in Traditional Chinese. Focus on "Food Group Servings" (六大類份數) balance.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  });

  return response.text || "目前無法產生建議，請稍後再試。";
};