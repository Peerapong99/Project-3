require('dotenv').config();
const mongoose=require('mongoose');
const {seedPlans}=require('../src/services/subscriptionService');
(async()=>{try {await mongoose.connect(process.env.MONGO_URI);await seedPlans();console.log('Subscription plans ready (existing prices preserved)');} finally {await mongoose.disconnect();}})().catch(e=>{console.error(e.message);process.exitCode=1;});

