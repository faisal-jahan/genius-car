const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();


const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const verifyJWT = (req,res,next) =>{
    const authHeader = req.headers.authorization;

    if(!authHeader){
        return res.status(401).send({message:'Unauthorized'});
    }
    else{
        const accessToken = authHeader.split(' ')[1];
        jwt.verify(accessToken,process.env.PRIVATE_KEY, (err, decoded) =>{
            if(err){
                res.status(403).send({message: 'Forbidden Access'})
            }
            else{
                req.decoded = decoded;
            }
        })
        next();
    }
}

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.dfbrr.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run(){

    try{
        await client.connect();
        const serviceDb = client.db("serviceDb").collection("services");
        const ordersDb = client.db("serviceDb").collection("orders");

        app.post('/login', async (req,res)=>{
            const user = req.body;
            const accessToken = jwt.sign(user,process.env.PRIVATE_KEY,{
                expiresIn:'1d',
            });
            res.send({accessToken});
        })

        app.get('/services',async(req,res)=>{
            const query = {};
            const cursor = serviceDb.find(query);
            const result = await cursor.toArray();
            res.send(result);
        })

        app.get('/services/:id', async (req,res)=>{
            const id = req.params.id;
            const query = {_id:ObjectId(id)};
            const result = await serviceDb.findOne(query);
            res.send(result);  
        })

        app.post('/services',async(req,res)=>{
            const service = req.body;
            const result = await serviceDb.insertOne(service);
            console.log(result.insertedId)
            res.send({id:result.insertedId});
        })

        app.put('/services/:id', async(req,res)=>{
            const id = req.params.id;
            const update = req.body;
            const filter = {_id:ObjectId(id)};
            const option = {upsert:true};
            const updateService = {
                $set:{
                    name:update.name,
                    price:update.price,
                    description:update.description,
                    img:update.img,
                }
            }
            const result = await serviceDb.updateOne(filter,updateService,option);
            res.send(result);
        })

        app.delete('/services/:id', async(req,res)=>{
            const id = req.params.id;
            const query = {_id:ObjectId(id)};
            const result = await serviceDb.deleteOne(query);

            console.log(result.deletedCount);
            res.send(result);
        })

        app.post('/orders', async(req,res)=>{
            const orderInfo = req.body;
            const date = Date();
            const updatedOrder = {...orderInfo,timestamp:date}
            const result = await ordersDb.insertOne(updatedOrder);
            res.send(result.insertedId);
        })

        // app.get('/orders', async (req,res)=>{
        //     const query = {};
        //     const cursor = ordersDb.find(query);
        //     const result = await cursor.toArray();
        //     console.log(result)
        //     res.send(result);
        // })

        app.get('/orders',verifyJWT, async (req,res)=>{
            const email = req.query.email;
            const decodedEmail = await req.decoded.email;

            if(email === decodedEmail){
                const query = {email:email};
                const cursor = ordersDb.find(query);
                const result = await cursor.toArray();
                console.log('jwt is working')
                res.send(result);
            }
            else{
                res.status(403).send({message:'Unknown User'})
            }
        })

        app.get('/orders/:id', async (req,res)=>{
            const id = req.params.id;
            const query = {_id:ObjectId(id)};
            const result = await ordersDb.findOne(query);
            console.log(result)
            res.send(result);
        })

        app.put('/orders/:id', async (req,res)=>{
            const id = req.params.id;
            const update = req.body;
            const filter = {_id:ObjectId(id)};
            const option = {upsert:true};
            const updateOrder = {
                $set:{
                    name:update.name,
                    email:update.email,
                    serviceName:update.serviceName,
                    address:update.address,
                    phone:update.phone
                }
            }

            const result = await ordersDb.updateOne(filter,updateOrder,option);
            console.log(result)
            res.send(result);
        })

        app.delete(`/orders/:id`, async (req,res)=>{
            const id = req.params.id;
            const filter = {_id:ObjectId(id)};
            const result = ordersDb.deleteOne(filter);
            res.send(result);

        })

    }
    finally{
        // await client.close();
    }
}

run().catch(console.dir);

app.listen(port,()=>{
    console.log('Listening to port:' ,port);
})