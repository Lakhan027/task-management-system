# ═══════════════════════════════════════════════════════════════
# STAGE 1 — "builder"
#   Iska kaam sirf ek hai: TypeScript ko compile karna aur Prisma
#   Client generate karna. Isme har tool chahiye (TS compiler,
#   devDependencies, prisma CLI) — kyunki BUILD karna hai, chalana nahi.
#   Ye poori stage FINAL image me kabhi nahi jaayegi — sirf iska
#   OUTPUT (dist/) Stage 2 me churaya jaayega.
# ═══════════════════════════════════════════════════════════════
FROM node:20-slim AS builder
WORKDIR /app

# package.json ko SOURCE CODE se ALAG copy kiya — jaan-boojh ke.
# Docker har COPY/RUN line ko "layer" ki tarah cache karta hai.
# Agar sirf src/ ki ek file badle (package.json nahi), Docker is
# 'npm ci' wali layer ko dobara nahi chalayega — cache se le lega.
# Agar hum "COPY . ." ek hi line me karte, TOH KOI BHI file badalne
# par 'npm ci' HAR BAAR dobara chalta — bahut slow build hota.
COPY package.json package-lock.json ./
RUN npm ci

# Ab asli source code copy karo (package.json ke baad, taaki upar
# wali cache-friendly layering kaam kare)
COPY tsconfig.json .
COPY prisma ./prisma
COPY src ./src

# Prisma Client schema se generate hota hai — isliye 'prisma ./prisma'
# COPY hone ke BAAD chalana zaroori hai (jo file chahiye, wo pehle
# andar honi chahiye)
RUN npx prisma generate --schema=./prisma/schema.prisma

# TypeScript → JavaScript. package.json ka "build": "tsc" script
# chalta hai, output "dist/" folder me jaata hai (tsconfig.json me
# outDir set hai)
  RUN npm run build


# ═══════════════════════════════════════════════════════════════
# STAGE 2 — "runner"
#   Ye ek NAYA, KHAALI container hai — Stage 1 se koi automatic
#   connection nahi. Sirf 'COPY --from=builder' se hi Stage 1 se
#   cheezein li jaa sakti hain. Yahan sirf CHALANE ke liye chahiye —
#   compile karne ke tools nahi. Isliye final image chhoti rehti hai.
# ═══════════════════════════════════════════════════════════════
FROM node:20-slim AS runner
WORKDIR /app

# Stage 2 ka apna, LEAN node_modules — sirf production dependencies
# (--omit=dev se devDependencies jaise TypeScript compiler chhod diye)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Security: root user se app chalana risky hai (container compromise
# hua to attacker root access le lega). Isliye ek normal user banao.
RUN useradd --uid 1001 --create-home --shell /bin/bash appuser

# Stage 1 se SIRF compiled JavaScript churao — poora source code (src/)
# ya TypeScript compiler nahi chahiye, sirf output chahiye
COPY --from=builder /app/dist ./dist

# node_modules Stage 1 se COPY NAHI kiya — agar karte, Stage 1 ka
# BADA node_modules (devDependencies samet) is lean wale ko
# OVERWRITE kar deta, aur upar wali --omit=dev mehnat bekaar jaati.
# Isliye schema dobara copy karke, prisma generate DOBARA chalate hain —
# ab generated client is Stage ke apne CHHOTE node_modules ke andar
# banta hai. 'prisma' CLI khud devDependency hai, isliye 'npx' use
# waqt temporarily internet se download karega, chalayega, phir
# permanently install nahi karega — final image me nahi rahega.
COPY prisma ./prisma
RUN npx prisma generate --schema=./prisma/schema.prisma

# Ye variables container ke andar hamesha available rahenge.
# PORT yahan set kiya taaki neeche HEALTHCHECK isi value ko ${PORT}
# se use kar sake — ek jagah badlo, sab jagah update ho jaaye.
ENV NODE_ENV=production
ENV PORT=5000

# Sabse AAKHIR me user switch kiya — is se pehle ka sab kaam
# (npm ci, useradd, COPY, prisma generate) ROOT se hua, kyunki
# root ko file/folder banane me kabhi permission ki dikkat nahi
# hoti. Ab jab sirf APP CHALANA baaki hai, tab non-root user pe
# switch kiya — taaki agar app compromise ho, attacker ko root
# access na mile. Files root ke banaye hue hain lekin appuser
# unhe READ + EXECUTE kar sakta hai (WRITE ki zaroorat nahi hai
# app chalane ke liye), isliye ye order kaam karta hai.
USER appuser

# Docker ise har 30 second me chalayega, container start hone ke
# 10 second baad se (--start-period). Agar ye command fail ho
# (exit code non-zero), Docker container ko "unhealthy" mark
# karega — crash nahi karega, lekin monitoring/orchestration tools
# (jaise ECS, Kubernetes) ise dekh ke container replace kar sakte hain.
#
# 'wget' node:20-slim me installed NAHI hai (isliye pehle
# "wget: not found" error aaya tha — docker inspect se pakda gaya).
# Ek extra package install karne ki jagah, Node ke apne built-in
# 'http' module se hi ek chhota check likh diya — koi naya
# dependency nahi chahiye, Node to already container me hai.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD node -e "require('http').get('http://localhost:${PORT}/api', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

# Sirf DOCUMENTATION hai — batata hai "app is port pe sunta hai".
# Bahar se access karne ke liye 'docker run -p' se hi port khulta hai,
# EXPOSE khud kuch nahi kholta.
EXPOSE 5000

# Container START hote hi ye command chalti hai. Stage 1 ki
# 'npm run build' ne 'dist/server.js' banaya tha — yehi ab chalega.
CMD ["node", "dist/server.js"]