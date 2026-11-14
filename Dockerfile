FROM node:22-alpine
WORKDIR /app
COPY . .
ENV NODE_ENV=production TZ=Europe/Istanbul DATA_DIR=/data PORT=3000
RUN mkdir -p /data
EXPOSE 3000
CMD ["node", "--no-warnings", "server.js"]
