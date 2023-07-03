FROM node:14

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json to the container
COPY package*.json .

# Install app dependencies
RUN npm install --production

COPY . .

CMD [ "node", "main.js" ]