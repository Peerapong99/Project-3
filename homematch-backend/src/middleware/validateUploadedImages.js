const fs=require('fs/promises');
const {imageType}=require('../services/imageTypeService');
module.exports=async (req,res,next)=>{
  const files=req.file?[req.file]:Object.values(req.files || {}).flat();
  try {
    for(const file of files) {
      const handle=await fs.open(file.path,'r');
      let header;
      try {header=Buffer.alloc(16);const {bytesRead}=await handle.read(header,0,16,0);header=header.subarray(0,bytesRead);} finally {await handle.close();}
      const type=imageType(header);
      if(!type || type.mimeType!==file.mimetype) throw Object.assign(new Error('ไฟล์รูปภาพไม่ตรงกับประเภทที่ระบุ'),{status:400,code:'INVALID_IMAGE'});
    }
    next();
  } catch(error) {
    await Promise.all(files.map(file=>fs.unlink(file.path).catch(()=>{})));
    next(error);
  }
};
