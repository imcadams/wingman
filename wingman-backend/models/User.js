const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const jobRequirementsSchema = new mongoose.Schema({
  title: String,
  salaryRange: String,
  workArrangement: String,
  vacationTime: String,
  additionalInstructions: String
}, { _id: false });

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  jobRequirements: jobRequirementsSchema
});

userSchema.pre('save', async function(next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

module.exports = mongoose.model('User', userSchema);
