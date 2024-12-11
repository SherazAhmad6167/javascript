import mongoose,{Schema} from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";
const commentSchema = Schema({
    content:{
        type: Schema.Types.ObjectId,
        ref:"User"
    },
    video:{
        type: Schema.Types.ObjectId,
        ref:"User"
    },
    owner:{
        type: Schema.Types.ObjectId,
        ref: "User"
    }
},{timestamps: true})
commentSchema.plugin(mongooseAggregatePaginate)
export const comment = mongoose.model("Comment",commentSchema)