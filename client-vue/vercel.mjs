// Vercel evaluates this at build time. No serverless proxy or routing middleware is used.
// Programmatic config is documented at https://vercel.com/docs/project-configuration/vercel-ts
import { createDeploymentConfig } from './deployment-config.mjs'
export const config = createDeploymentConfig(process.env)
