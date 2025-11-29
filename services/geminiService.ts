import { GoogleGenAI } from "@google/genai";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("API Key not found in environment variables.");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const getRedoxExplanation = async (prompt?: string): Promise<string> => {
  const ai = getClient();
  if (!ai) {
    return "請設定 API Key 以啟用 AI 導師功能。";
  }

  const finalPrompt = prompt || "請用繁體中文，向高中生簡單解釋鈉(Na)和氯(Cl)形成氯化鈉(NaCl)的氧化還原反應過程。";

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `身為一位專業的化學老師，${finalPrompt} 請將解釋控制在 150 字以內，語氣生動有趣。`,
      config: {
        thinkingConfig: { thinkingBudget: 0 }
      }
    });
    return response.text || "無法產生解釋，請稍後再試。";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "AI 服務暫時無法使用，請檢查網路或 API Key。";
  }
};
