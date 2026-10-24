const mongoose=require('mongoose');
const schema=new mongoose.Schema({owner:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true,index:true},url:{type:String,required:true,unique:true},mimeType:{type:String,required:true},bytes:{type:Number,required:true,min:1}},{timestamps:true});
module.exports=mongoose.model('MediaUpload',schema);
