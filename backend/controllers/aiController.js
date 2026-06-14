// server/controllers/aiController.js
import dotenv from 'dotenv';
dotenv.config();

import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import Trip from '../models/Trip.js';
import Package from '../models/Package.js';

//Initialize Gemini SDK
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

//AI BUDGET ESTIMATOR

const budgetSchema = z.object({
  estimatedTransportCostPerPerson: z.number().describe("Approximate cost in INR for round-trip transport"),
  estimatedHotelCostPerNight: z.number().describe("Approximate cost in INR for one night"),
  estimatedFoodCostPerPersonPerDay: z.number().describe("Approximate daily food cost in INR"),
  totalEstimatedGroupBudget: z.number().describe("Total budget for the entire group in INR"),
  budgetConfidenceScore: z.enum(["Low", "Medium", "High"]).describe("How confident is this estimate?"),
});

export const generateBudgetEstimate = async (req, res) => {
  try {
    const { source, destination, duration, groupSize, transportType, hotelTier } = req.body;

    const prompt = `
      Act as an expert travel budget estimator for India. Calculate the approximate cost in INR for a group travel plan with these parameters:
      - Source: ${source}
      - Destination: ${destination}
      - Duration: ${duration} Days
      - Group Size: ${groupSize} People
      - Transport Type: ${transportType}
      - Hotel Tier: ${hotelTier}
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: zodToJsonSchema(budgetSchema)
      }
    });

    let responseText = response.text;
    if (responseText.startsWith('```json')) {
      responseText = responseText.replace(/^```json\n/, '').replace(/\n```$/, '');
    }
    const budgetData = budgetSchema.parse(JSON.parse(responseText));

    return res.status(200).json(budgetData);
  } catch (error) {
    console.error("AI Budget Error:", error);
    return res.status(500).json({ error: "Failed to generate budget estimate." });
  }
};


// AI TRAVEL CO-PILOT (CHAT)

export const handleTripCoPilotChat = async (req, res) => {
  try {
    const { tripId } = req.params;
    const { userMessage } = req.body;

    const trip = await Trip.findById(tripId);
    if (!trip) return res.status(404).json({ error: "Trip not found" });

    const contextPrompt = `
      You are an expert travel co-pilot embedded in a group travel app. 
      The users are currently planning a trip to ${trip.destination} from ${trip.startDate} to ${trip.endDate}.
      Here is their current itinerary data: ${JSON.stringify(trip.itinerary)}
      
      The user is asking for advice. Provide brief, highly actionable suggestions based on their specific location and current itinerary schedule. Keep answers concise. Do not use markdown code blocks.
      
      User Message: "${userMessage}"
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: contextPrompt,
    });

    return res.status(200).json({ reply: response.text });
  } catch (error) {
    console.error("Co-Pilot Error:", error);
    return res.status(500).json({ error: "Co-pilot is currently resting." });
  }
};

// AI CUSTOM PACKAGE GENERATOR
const customPackageSchema = z.object({
  title: z.string().describe("Catchy title for the custom travel package"),
  description: z.string().describe("A short enticing description of the overall package"),
  defaultDays: z.number().describe("Total number of days the itinerary spans"),
  itineraryTemplate: z.array(z.object({
    dayNumber: z.number().describe("Day number (e.g. 1, 2)"),
    activities: z.array(z.object({
      time: z.string().describe("Time of the activity e.g., '09:00 AM'"),
      title: z.string().describe("Title of the activity/place"),
      city: z.string().describe("City where the activity takes place"),
      activityType: z.enum(["Transit", "Stay", "Sightseeing", "Food"]).describe("Type of activity"),
      locationCoords: z.object({
        lat: z.number(),
        lng: z.number()
      }).describe("Approximate latitude and longitude")
    }))
  })).describe("The day-by-day itinerary with activities"),
  alternativeActivities: z.array(z.object({
    title: z.string().describe("Title of the alternative activity/place"),
    city: z.string().describe("City of the activity"),
    activityType: z.enum(["Transit", "Stay", "Sightseeing", "Food"]).describe("Type of activity"),
    description: z.string().describe("Short description of the alternative"),
    locationCoords: z.object({
      lat: z.number(),
      lng: z.number()
    }).describe("Approximate latitude and longitude")
  })).describe("List of alternative places/activities the user might want to swap in")
});

export const generateCustomPackage = async (req, res) => {
  try {
    const { cities, totalDays } = req.body; // Expecting an array of city names or a string
    if (!cities || cities.length === 0) {
      return res.status(400).json({ error: "Please provide at least one city." });
    }
    if (!totalDays || totalDays <= 0) {
      return res.status(400).json({ error: "Please provide a valid totalDays." });
    }

    const cityList = Array.isArray(cities) ? cities.join(", ") : cities;

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
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    let responseText = response.text;
    const jsonMatch = responseText.match(/```(?:json)?\n?([\s\S]*?)```/);
    if (jsonMatch) {
      responseText = jsonMatch[1];
    }
    responseText = responseText.trim();
    const parsedData = customPackageSchema.parse(JSON.parse(responseText));

    // Save to database
    const newPackage = new Package({
      title: parsedData.title,
      cities: Array.isArray(cities) ? cities : cities.split(',').map(c => c.trim()),
      defaultDays: parsedData.defaultDays,
      description: parsedData.description,
      itineraryTemplate: parsedData.itineraryTemplate,
      alternativeActivities: parsedData.alternativeActivities,
      createdBy: req.user._id,
      isActive: true,
      tags: ["AI-Generated", "Custom"]
    });

    await newPackage.save();

    return res.status(200).json(newPackage);
  } catch (error) {
    console.error("Custom Package Generation Error:", error.message || error);
    if (error.errors) {
      console.error("Zod Validation Errors:", JSON.stringify(error.errors, null, 2));
    }
    return res.status(500).json({ error: "Failed to generate custom package." });
  }
};

export const generateItineraryForBlankTrip = async (destination, totalDays) => {
  const prompt = `
    Act as an expert travel planner. Create a highly detailed, realistic, and exciting day-by-day travel itinerary for exactly ${totalDays} days in ${destination}.
    Include famous spots, great local restaurants, and necessary transit times.
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
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json"
    }
  });

  let responseText = response.text;
  const jsonMatch = responseText.match(/```(?:json)?\n?([\s\S]*?)```/);
  if (jsonMatch) {
    responseText = jsonMatch[1];
  }
  responseText = responseText.trim();
  return customPackageSchema.parse(JSON.parse(responseText));
};