import mongoose from "mongoose";

const actionModel = new mongoose.Schema({
    actionName:{
        type:String, 
        required:true
    }
})

const Action = mongoose.model('Action', actionModel);
export default Action