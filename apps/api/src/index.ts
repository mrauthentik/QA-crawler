import express from 'express'
import dotenv from 'dotenv'

dotenv.config({ path: '../../.env'})

const app = express()
app.use(express.json())

const PORT = process.env.API_PORT || 3001

app.get('/health', (req, res) =>{
    res.json({ 
        status: 'ok',
        service: 'qa-detective-api',
        version: '0.1.0'
    })

    app.listen(PORT, ()=> {
        console.log(`🕵️  QA Detective API running on port ${PORT}`)
    })
})