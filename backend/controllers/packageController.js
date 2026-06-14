// server/controllers/packageController.js
import Package from '../models/Package.js';

// GET: Smart Search for Users
export const searchPackages = async (req, res) => {
  try {
    const { search, days } = req.query;
    let query = { isActive: true };

    if (search) {
      // Search across title, cities array, and description
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { cities: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    let packages = await Package.find(query).lean();

    // Sort by proximity to requested days
    if (days) {
      const targetDays = Number(days);
      packages.sort((a, b) => {
        return Math.abs(a.defaultDays - targetDays) - Math.abs(b.defaultDays - targetDays);
      });
    }

    return res.status(200).json(packages);
  } catch (error) {
    return res.status(500).json({ error: "Failed to search packages" });
  }
};

// GET: All Packages for Admin
export const getAdminPackages = async (req, res) => {
  try {
    const packages = await Package.find().sort({ createdAt: -1 });
    return res.status(200).json(packages);
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch admin packages" });
  }
};

// POST: Create new package (Admin)
export const createPackage = async (req, res) => {
  try {
    const { itineraryTemplate } = req.body;
    if (itineraryTemplate) {
      for (const day of itineraryTemplate) {
        if (day.activities && day.activities.length > 5) {
          return res.status(400).json({ error: `Day ${day.dayNumber} exceeds the maximum of 5 locations per day.` });
        }
      }
    }
    const newPackage = new Package({ ...req.body, createdBy: req.user._id });
    await newPackage.save();
    return res.status(201).json(newPackage);
  } catch (error) {
    return res.status(500).json({ error: "Failed to create package" });
  }
};

// PUT: Update existing package (Admin)
export const updatePackage = async (req, res) => {
  try {
    const { itineraryTemplate } = req.body;
    if (itineraryTemplate) {
      for (const day of itineraryTemplate) {
        if (day.activities && day.activities.length > 5) {
          return res.status(400).json({ error: `Day ${day.dayNumber} exceeds the maximum of 5 locations per day.` });
        }
      }
    }
    const updatedPackage = await Package.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true }
    );
    return res.status(200).json(updatedPackage);
  } catch (error) {
    return res.status(500).json({ error: "Failed to update package" });
  }
};

// DELETE: Remove package (Admin)
export const deletePackage = async (req, res) => {
  try {
    await Package.findByIdAndDelete(req.params.id);
    return res.status(200).json({ message: "Package deleted successfully" });
  } catch (error) {
    return res.status(500).json({ error: "Failed to delete package" });
  }
};