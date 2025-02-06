import mongoose from "mongoose";

const roleSchema = new mongoose.Schema({
  roleName: {
    type: String,
    required: true,
    unique: true
  },
  Permission: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Permission",
    required: true
  }
});

const Role = mongoose.model("Role", roleSchema);
export default Role;
