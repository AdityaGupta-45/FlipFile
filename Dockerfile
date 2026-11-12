# Runs the website and the conversion server together, with every program the server needs.
FROM node:22-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    libreoffice-writer libreoffice-calc libreoffice-impress \
    qpdf ocrmypdf tesseract-ocr tesseract-ocr-eng tesseract-ocr-hin \
    fonts-liberation fonts-dejavu-core fonts-crosextra-carlito fonts-crosextra-caladea \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

# Tells the website that the conversion server is available, so server tools are not marked "coming soon".
ENV VITE_HAS_SERVER=true
RUN npm run build

ENV NODE_ENV=production PORT=3001
EXPOSE 3001
CMD ["node", "server/index.js"]
