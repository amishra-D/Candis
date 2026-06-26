FROM node:18-alpine
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000 5001 5002 5003 5004 5005
CMD ["npm", "start"]
