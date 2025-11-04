import { defineConfig } from 'cypress'
import { Client } from 'pg'

export default defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      on('task', {
        async 'db:promote'(email) {
          console.log(`Promoting user ${email} to ADMIN`)
          if (!config.env.DATABASE_URL) {
            throw new Error('DATABASE_URL is not set for Cypress task')
          }
          const client = new Client({ connectionString: config.env.DATABASE_URL })
          try {
            await client.connect()
            const res = await client.query(
              `UPDATE "User" SET role = 'ADMIN' WHERE email = $1 RETURNING *`,
              [email],
            )
            return res.rows[0] || null
          } catch (e) {
            console.error('db:promote task failed:', e)
            return null
          } finally {
            await client.end()
          }
        },
      })
      config.env.DATABASE_URL = process.env.DATABASE_URL
      return config
    },
    baseUrl: process.env.CYPRESS_BASE_URL || 'http://localhost:5173',
    video: true,
    screenshotOnRunFailure: true,
  },
})
