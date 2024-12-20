import { Router } from "express";
import {registerUser,
    loginUser,
    logOutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory } from "../controller/user.controller.js";
import {upload} from "../middleware/multer.middleware.js"
import { verifyJWT } from "../middleware/auth.middleware.js";

const router = Router()

router.route('/register').post(
    upload.fields([{
            name : "avatar",
            maxCount: 1
    },{
        name: "coverImage",
        maxCount : 1
    }
]), 
    registerUser)

 router.route('/login').post(loginUser)
 router.route('/logout').post(verifyJWT, logOutUser)
 router.route('/refreshToken').post(refreshAccessToken)
 router.route('/changePassword').post(verifyJWT,changeCurrentPassword)
 router.route('/currentUser').get(verifyJWT,getCurrentUser)
 router.route('/updateAccount').patch(verifyJWT,updateAccountDetails)
 router.route('/avatar').patch(verifyJWT,upload.single("avatar"),updateUserAvatar)
 router.route('/coverImage').patch(verifyJWT,upload.single("coverImage"),updateUserCoverImage)
 router.route('/channel/:userName').get(verifyJWT,getUserChannelProfile)
 router.route('/history').get(verifyJWT,getWatchHistory)


export  default router;