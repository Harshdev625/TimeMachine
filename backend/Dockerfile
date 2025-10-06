#Node.js runtime as a parent image
FROM node:18-slim

#Create app directory
WORKDIR /usr/src/app

#Install app dependencies
COPY package*.json ./

# Install dependencies
RUN npm install

#Bundle app source
COPY . .

#Make port 3000 available to the world outside this container
EXPOSE 3000

#Define the command to run the app
CMD [ "npm", "start" ]