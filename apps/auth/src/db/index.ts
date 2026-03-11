import * as dotenv from 'dotenv';
import { resolve } from 'path'
dotenv.config({ path: resolve(__dirname, '../../../../.env') });

import { Pool } from 'pg'
import fs from 'fs'
import path from 'path'

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
})

export async function initDb(): Promise<void> {
    try{

        const schema = fs.readFileSync(
            path.join(__dirname, 'schema.sql'),
            'utf-8'
        )
        await pool.query(schema)
        console.log('🔐 Auth database initialised')
    }catch(err){
        console.error('Error initializing database:', err)
        throw err
    }
    
}


export interface User {
    id: string
    name: string
    email: string
    password_hash: string
    google_id?: string
    avatar?: string
    created_at: string
}

export async function findUserByEmail(email: string): Promise<User | null> {
    try{
        const resQuery = 'SELECT * FROM users WHERE email = $1'
        const result = await pool.query(resQuery, [email])
        return result.rows[0] ?? null
    }catch(err){
        console.error('Error finding user by email:', err)
        throw err
    }
}

export async function findUserById(id:string): Promise<User | null> {
    try{
        const resQuery = 'SELECT * FROM users WHERE id = $1'
        const result = await pool.query(resQuery, [id])
        return result.rows[0] ?? null
    }catch(err){
        console.error('Error finding user by ID:', err)
        throw err
    }
}

export async function findUserByGoogleId(googleId: string): Promise<User | null> {
   try{

       const resQuery = 'SELECT * FROM users WHERE google_id = $1'
       const result = await pool.query(resQuery, [googleId])
       return result.rows[0] ?? null
   }catch(err){
       console.error('Error finding user by Google ID:', err)
       throw err
   }
}


export async function createUser(data: {
    email:string;
    name:string;
    passwordHash:string;
    googleId?:string;
    avatar?:string;
}): Promise<User> {
    try{
        const dbQuery= `INSERT INTO users (email, name, password_hash, google_id, avatar)
        VALUES ($1, $2, $3, $4, $5) RETURNING *`
        const result = await pool.query(dbQuery, 
            [
                data.email,
                data.name, 
                data.passwordHash,
                data.googleId,
                data.avatar
            ])
        return result.rows[0]
    }catch(err){
        console.error('Error creating user:', err)
        throw err
    }
}

export async function upsertGoogleUser(data:{
    email:string;
    name:string;
    googleId:string;
    avatar?:string;
}):Promise<User>{
    try{
        const dbQuery = `INSERT INTO users (email, name, google_id, avatar)
                        VALUES ($1, $2, $3, $4)
                        ON CONFLICT (email) DO UPDATE SET
                        google_id= EXCLUDED.google_id,
                        avatar = EXCLUDED.avatar
                        update_at = NOW()
                        RETURNING *`
      const result = await pool.query(dbQuery, [data.email, data.name, data.googleId, data.avatar ?? null])
      return result.rows[0]
    }catch(err){
        console.error('Error upserting Google user:', err)
        throw err
    }
}