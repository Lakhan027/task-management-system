import { getRedis } from "../config/redis.js";

export const addSession=async (userId:number,token:string,expiresInSeconds:number):
Promise<void> => {
    const client = getRedis();
    if(!client) return;

    const key=`session:${userId}`;
    const expiryTimestamp =Date.now()+expiresInSeconds * 1000;

    await client.hSet(key,token, String(expiryTimestamp));
    await client.expire(key, expiresInSeconds); 

}


export const removeSession=async (userId:number,token:string):Promise<void>=>{
   const client= getRedis();
   if(!client) return;

   const key=`session:${userId}`;
   await client.hDel(key,token);

}

export const getAllSessionTokens= async (userId:number):Promise<string[]>=>{
    const client= getRedis();
    if(!client) return [];

    const key=`session:${userId}`;
    const token = await client.hGetAll(key);
    const tokens = Object.keys(token);

    await client.del(key);
    return tokens;
   

    
 
    

   
}