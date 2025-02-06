import Role from "../models/roleModel.js";

export const createRole = async (req, res) => {
    const {roleName, permissionId} = req.body;

   try {
    const roleExist = await Role.findOne({roleName})
    if(roleExist){
        res.status(400).json({
            message:"Role exists",
            success:"False"

        })
    }
    const saveRole = new Role({
        roleName:roleName,
        Permission:permissionId
    })
    await saveRole.save();
    res.status(200).json({
        message:"Role saved successfully",
        success:"true"

    })
   } catch (error) {
    console.log(error);
    
   }
}