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
ENV NODE_ENV=production
ENV PORT=5000

USER appuser

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s CMD wget -qO- http://localhost:${PORT}/api || exit 1

EXPOSE 5000
CMD ["node", "dist/server.js"]