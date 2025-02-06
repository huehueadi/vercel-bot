import mongoose from "mongoose";

const PermissionSchema = new mongoose.Schema({
  permissionName: {
    type: String,
    required: true,
  },
  ActionName: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Actions",
    required: true,
  }
});

const Permission = mongoose.model("Permission", PermissionSchema);
export default Permission;
