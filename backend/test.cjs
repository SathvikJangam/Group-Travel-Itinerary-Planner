require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');
const { z } = require('zod');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const customPackageSchema = z.object({
  title: z.string().describe('Catchy title for the custom travel package'),
  description: z.string().describe('A short enticing description of the overall package'),
  defaultDays: z.number().describe('Total number of days the itinerary spans'),
  itineraryTemplate: z.array(z.object({
    dayNumber: z.number().describe('Day number (e.g. 1, 2)'),
    activities: z.array(z.object({
      time: z.string().describe('Time of the activity e.g., 09:00 AM'),
      title: z.string().describe('Title of the activity/place'),
      city: z.string().describe('City where the activity takes place'),
      activityType: z.enum(['Transit', 'Stay', 'Sightseeing', 'Food']).describe('Type of activity'),
      locationCoords: z.object({
        lat: z.number(),
        lng: z.number()
      }).describe('Approximate latitude and longitude')
    }))
  })).describe('The day-by-day itinerary with activities'),
  alternativeActivities: z.array(z.object({
    title: z.string().describe('Title of the alternative activity/place'),
    city: z.string().describe('City of the activity'),
    activityType: z.enum(['Transit', 'Stay', 'Sightseeing', 'Food']).describe('Type of activity'),
    description: z.string().describe('Short description of the alternative'),
    locationCoords: z.object({
      lat: z.number(),
      lng: z.number()
    }).describe('Approximate latitude and longitude')
  })).describe('List of alternative places/activities the user might want to swap in')
});

async function run() {
  try {
    const totalDays = 3;
    const cityList = 'Mumbai, Pune';
    const prompt = `
      Act as an expert travel planner. Create a highly detailed, realistic, and exciting day-by-day travel itinerary package for exactly ${totalDays} days covering the following cities: ${cityList}.
      Include famous spots, great local restaurants, and necessary transit times between places or cities. 
      Also provide some alternative activities in these cities that the user could choose to swap in.
      Ensure the coordinates (lat/lng) are roughly accurate for these locations so we can show them on a map later.

      CRITICAL RULES:
      - You MUST return a single JSON object containing EXACTLY these keys: "title", "description", "defaultDays", "itineraryTemplate" (array of days), and "alternativeActivities" (array).
      - Do NOT return an array as the root element. Return a JSON object.
      - For Day 1, the very 1st activity MUST have the title exactly "Checkin - Reach to that town" and have activityType set to "Transit".
      - For the final day (Day ${totalDays}), the very last activity MUST have the title exactly "Checkout" and have activityType set to "Stay".
      - Use "Transit" strictly for travel/flights/trains. (This enables the ConfirmTKT booking link on our UI).
      - Use "Stay" strictly for hotels/accommodation. (This enables the Booking.com link on our UI).
      - Use "Food" for dining and "Sightseeing" for everything else.
      - You MUST provide at least 3 alternative scenic spots/activities for EACH city in the "alternativeActivities" array. Ensure these alternative spots are in the exact SAME city/region so they can be reasonably swapped by the user.

      IMPORTANT: Your response must be ONLY valid JSON matching this exact structure:
      {
        "title": "Amazing 3-Day Trip",
        "description": "A wonderful journey...",
        "defaultDays": 3,
        "itineraryTemplate": [
          {
            "dayNumber": 1,
            "activities": [
              {
                "time": "09:00 - 10:00",
                "title": "Checkin - Reach to that town",
                "city": "Mumbai",
                "activityType": "Transit",
                "locationCoords": { "lat": 19.0760, "lng": 72.8777 }
              }
            ]
          }
        ],
        "alternativeActivities": [
          {
            "title": "Gateway of India",
            "city": "Mumbai",
            "activityType": "Sightseeing",
            "description": "Historical monument...",
            "locationCoords": { "lat": 18.9220, "lng": 72.8347 }
          }
        ]
      }
    `;
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    let responseText = response.text;
    console.log("RAW RESPONSE TEXT START\n" + responseText + "\nRAW RESPONSE TEXT END");
    responseText = responseText.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
    const parsedData = customPackageSchema.parse(JSON.parse(responseText));
    console.log("PARSED SUCCESSFULLY");
  } catch (err) {
    console.error("CAUGHT ERROR:");
    console.error(err);
  }
}
run();
