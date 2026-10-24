require('dotenv').config({quiet:true});
const mongoose=require('mongoose');
const {seedFurniturePrices,getDesignCatalog}=require('../src/services/designCatalogService');
(async()=>{
  try {
    if(!process.env.MONGO_URI)throw new Error('MONGO_URI is not configured');
    await mongoose.connect(process.env.MONGO_URI);
    const result=await seedFurniturePrices();
    console.log(JSON.stringify({result,items:(await getDesignCatalog()).filter(item=>item.category==='furniture').map(({key,name,unitPrice})=>({key,name,unitPrice}))},null,2));
  } finally {await mongoose.disconnect();}
})().catch(error=>{console.error('Furniture price seeding failed:',error.name);process.exitCode=1;});
