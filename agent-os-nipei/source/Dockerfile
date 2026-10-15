FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build
EXPOSE 3333
ENV PORT=3333
ENV HOSTNAME="0.0.0.0"
CMD ["npm", "run", "start"]
