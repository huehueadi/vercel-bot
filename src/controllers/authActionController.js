import Action from "../models/actionsModel.js";
import Permission from "../models/permissionModel.js";

export const actionController = async (req, res) => {
    const { actions } = req.body;
    try {
        // Check if the action already exists
        const actionExist = await Action.findOne({ actionName: actions });

        if (actionExist) {
            return res.status(400).json({
                message: "Action already exists",
                success: false
            });
        }

        // Create a new action and save it
        const Saveactions = new Action({
            actionName: actions
        });

        await Saveactions.save();

        // Respond with success
        return res.status(200).json({
            message: "Action saved successfully",
            success: true
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Internal server error",
            success: false
        });
    }
}

export const permissionController = async (req, res) => {
    const { permission, action } = req.body;
    try {
        // Create a new permission and save it
        const savePermission = new Permission({
            permissionName: permission,
            ActionName: action
        });

        await savePermission.save();

        // Respond with success
        return res.status(200).json({
            message: "Permission saved successfully",
            success: true
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Internal server error",
            success: false
        });
    }
}
