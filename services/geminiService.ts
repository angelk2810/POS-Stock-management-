
import { GoogleGenAI, Type } from "@google/genai";

export async function processNLQuery(query: string, context: any) {
  try {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      return "Please set VITE_GEMINI_API_KEY in your .env file to use this feature.";
    }
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `System Role: Expert Retail Accountant & Stock Analyst for an Electrical Shop.
      User Query: "${query}"
      
      Live System Context:
      - Current Stock Valuation: ₹${context.stats.totalValuation}
      - Today's Revenue: ₹${context.stats.todayRevenue}
      - Today's Profit: ₹${context.stats.profitToday}
      - Low Stock Count: ${context.stats.lowStockCount}
      - Products Array Sample: ${JSON.stringify(context.products.slice(0, 5))}
      - Recent Sales Sample: ${JSON.stringify(context.recentSales)}
      
      Task: Answer the query using ONLY the data provided. Be professional, concise, and helpful. 
      If asked for a report (e.g. "show low stock"), describe the items clearly.
      Format: Use Markdown for lists or emphasis. No JSON in output.`,
    });
    return response.text;
  } catch (error) {
    console.error("NL Reporting Error:", error);
    return "I'm having trouble accessing the live database. Please try again in a moment.";
  }
}
