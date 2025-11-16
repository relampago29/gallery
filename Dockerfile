# --------------------------
#  Build do Next.js
# --------------------------
FROM node:20 AS builder
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build


# --------------------------
#  Runner - produção
# --------------------------
FROM node:20 AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

# Copiar apenas os ficheiros necessários
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next

# --- Instalar apenas deps de produção ---
RUN npm install --omit=dev

EXPOSE 8080

CMD ["npm", "run", "start"]
