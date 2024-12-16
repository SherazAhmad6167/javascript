import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {mongoose} from "mongoose"
import jwt from "jsonwebtoken";

const generateAccessAndRefreshToken = async(userId) => {
    try{
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({validateBeforeSave: false})
        return {accessToken, refreshToken}
    }
    catch(error){
        throw new ApiError(401, 'something went wrong while generating access and refresh token')
    }
}

const registerUser = asyncHandler( async (req, res) => {
    // get user details from frontend
    // validation - not empty
    // check if user already exists: username, email
    // check for images, check for avatar
    // upload them to cloudinary, avatar
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return res


    const {fullName, email, userName, password } = req.body
    //console.log("email: ", email);

    if (
        [fullName, email, userName, password].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required")
    }

    const existedUser = await User.findOne({
        $or: [{ userName }, { email }]
    })

    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists")
    }
   console.log(req.files);
   
   
    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    console.log(avatarLocalPath);
    

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
        //console.log(coverImageLocalPath);
        
    }
    

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required")
        console.log("function");
        
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    

    if (!avatar) {
        throw new ApiError(400, "Avatar file is missing")
        console.log("uploadding");
        
    }
   

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email, 
        password,
        userName: userName.toLowerCase(),
    })

    const createdUser = await User.findById(user._id).select(
        " -password -refreshToken"
    )

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered Successfully")
    )

} )

const loginUser = asyncHandler( async (req,res) => {
    // req body -> data
    // username or email
    //find the user
    //password check
    //access and referesh token
    //send cookie
const {email, userName, password} = req.body;
console.log(email);

if(!email && !userName){
    throw new ApiError(400, 'email and username is required')
}

const user = await User.findOne({
    $or: [{userName},{email}]
})

if(!user){
    throw new ApiError(404, 'user not found')
}

const isPasswordValid = await user.isPasswordCorrect(password);

if(!isPasswordValid){
    throw new ApiError(401, 'Password is incorrect');
}

const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id);

const loggedInUser = await User.findById(user._id).select( "-password -refreshToken" )

const options = {
        httpOnly : true,
        secure : true
}

return res
.status(200)
.cookie("accessToken",accessToken,options)
.cookie("refreshToken",refreshToken,options)
.json(
    new ApiResponse(
        200, 
        {
            user: loggedInUser,accessToken,refreshToken
        },
        'User loggeIn successfully'
    )
)

})
 export const logOutUser = asyncHandler(async(req,res)=>{
    await User.findByIdAndUpdate(
        req.user._id,
                {
                    $unset:{
                        refreshToken: true,
                    }
                                        
              },
              {
                new: true,
              }       
    )
    const options={
        httpOnly: true,
        secure: true,
    }
    return res
    .status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(200,{},'User Logout Successfully'))
})

const refreshAccessToken = asyncHandler(async (req,res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if(!incomingRefreshToken){
        throw new ApiError(401 , 'Unauthorized request')
    }
   try{
     const decodeToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)

    const user = await User.findById(decodeToken?._id)
    if(!user){
        throw new ApiError(401, 'Invaid Refresh Token')
    }
    if(incomingRefreshToken !== user?.refreshToken){
        throw new ApiError(401, 'Refresh token is expired or used')
    }
    const options = {
        httpOnly: true,
        secure: true
    }
    const{accessToken, newRefreshToken} = await generateAccessAndRefreshToken(user._id)

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie('refreshToken', newRefreshToken, options)
    .json(
        new ApiResponse(
            200,{accessToken,refreshToken:newRefreshToken},'Access token Refreshed'
        )
    )
}
catch(error){
    throw new ApiError(401, error?.message || 'Invalid refresh token')
}
})

 const changeCurrentPassword = asyncHandler( async (req,res)=>{
    const {oldPassword, newPassword} =  req.body
    console.log("password");
    
    const user = await User.findById(req.user._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)
    if(!isPasswordCorrect){
        throw new ApiError(401, 'Invalid old password')
    }
    user.password = newPassword
    await user.save({validateBeforeSave: false})
    
    return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"))
})

const getCurrentUser = asyncHandler(async (req, res) => {
    return res
    .status(200)
    .json(
        new ApiResponse(200, req.user ,"User fetched successfully")
    )
})
    const updateAccountDetails = asyncHandler(async (req, res)=>{
        const {fullName, email} = req.body
        if(!fullName || !email){
            throw new ApiError(400, 'All fields are required')
        }
        const user = await User.findByIdAndDelete(
            req.user?._id,
            {
                $set:{
                    fullName,
                    email : email
                }
            },{
                new: true
            }

        ).select('-password')
        return res
        .status(200)
        .json(new ApiResponse(
            200,user, 'Account Detailed updated Successfully')
        )
    })

    const updateUserAvatar = asyncHandler(async (req, res)=>{
        const avatarLocalPath = req.file?.path
        if(!avatarLocalPath){
            throw new ApiError(401, 'avatar file is missing')
        }
        const avatar = await uploadOnCloudinary(avatarLocalPath)
        if(!avatar.url){
            throw new ApiError(401, 'Error while uuploading avatar file')
        }
        const user = User.findByIdAndUpdate(
            req.user?._id,
            {
                $set:{
                    avatar: avatar.url
                }        
            },{
                new: true
            }
        ).select('-password')
        return res 
        .status(200)
        .json(
            new ApiResponse(200, user,  "Avatar updated")
        )
    })

    const updateUserCoverImage = asyncHandler(async(req, res)=>{
        const coverImageLocalPath = req.file?.path
        if(!coverImageLocalPath){
            throw new ApiError(401, 'coverImage is required')
        }
        const coverImage = uploadOnCloudinary(coverImageLocalPath)
        if(!coverImage){
            throw new ApiError(401, 'coverImage is missing')
        }
        const user = await User.findByIdAndUpdate(
            req.user?._id,
            {
                $set:{
                    coverImage: coverImage.url
                }
            },
            {
                new: true
            }
        ).select('-password')
        return res
        .status(200)
        .json(
            new ApiResponse(200, user , 'Cover Image updated successfully')
        )
    })

    const getUserChannelProfile = asyncHandler (async (req, res)=>{
        const {userName} = req.params

        if(!userName){
            throw new ApiError(400 , 'UserName is missing')
        }
        console.log("missing");
        
        // if (!req.user || !req.user._id) {
        //     throw new ApiError(401, 'Unauthorized user');
        // }
        // console.log("user correcct");
        
        const channel = await User.aggregate([
            {
                $match: {
                    userName: userName?.toLowerCase()
                }            
            },
            {
                $lookup: {
                    from: "subscriptions",
                    localField: "_id",
                    foreignField: "channel",
                    as: "subscribers"
                }
            },{
                $lookup: {
                    from: "subscriptions",
                    localField: "_id",
                    foreignField: "subscriber",
                    as: "subscribedTo"
                }
            },{
                $addFields: {
                    subscriberCount: {
                        $size : "$subscribers"
                    },
                    channelsSubscribedToCount:{
                        $size : "$subscribedTo"
                    },
                    isSubscribed: {
                        $cond : {
                            if: {$in : [req.user?._id, "$subscribers.subscriber"]},
                            then: true,
                            else: false,
                        }
                    }
                }
            },{
                $project : {
                    fullName: 1,
                    userName: 1,
                    email: 1,
                    isSubscribed: 1,
                    subscriberCount: 1,
                    channelsSubscribedToCount: 1,
                    avatar: 1,
                    coverImage: 1
                }
            }
        ])
        
        if(!channel?.length){
            throw new ApiError(400, 'Channel doesnot exist')
        }
        return res
        .status(200)
        .json(
            new ApiResponse(200 , channel[0], 'Channel fetched successfully')
        )
    })

    const getWatchHistory = asyncHandler (async (req, res )=> {
        const user = await User.aggregate([
            {
                $match: {
                    _id: new mongoose.Types.ObjectId(req.user._id)         
                }
        },{
            $lookup: {
                from : "Videos",
                localField:"watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline:[
                    {
                        $lookup: {
                            from :"users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline:[
                                {
                                    $project:{
                                        fullName: 1,
                                        userName: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },{
                        $addFields:{
                            owner: {
                                $first : "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])
    return res
    .status(200)
    .json(
        new ApiResponse(200 , user[0].watchHistory , 'Watch History Fetched Successfully')
    )
    })
export{
    registerUser,
    loginUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory,
}