import Action from "../models/actionsModel.js";
import Permission from "../models/permissionModel.js";

export const actionController = async (req, res) =>{
    const {actions} = req.body;
    const actionExist = await Action.findOne({actions});
    
    if(actionExist){
        res.status(400).json({
            message:"Action Already exists",
            success:false
        })
    }
    const Saveactions = new Action({
        actionName:actions
    })

    await Saveactions.save();

    res.status(200).json({
        message:"Action Saved successfully",
        success:true
    })
}

export const permissionController = async (req, res) =>{
    const {permission, action} = req.body;
    
try {
    
    const savePermission = new Permission({
        permissionName:permission,
        ActionName:action
    })

    await savePermission.save();

    res.status(200).json({
        message:"Permission Saved successfully",
        success:true
    })
} catch (error) {
    console.log(error)
}
}