import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
import Package from './models/Package.js';

async function check() {
  await mongoose.connect(process.env.MONGO_URI);
  const pkgs = await Package.find({ tags: "AI-Generated" });
  console.log(`Found ${pkgs.length} AI-Generated packages.`);
  if (pkgs.length > 0) {
    console.log("Sample:", pkgs[0].title);
  }
  process.exit(0);
}
check();
