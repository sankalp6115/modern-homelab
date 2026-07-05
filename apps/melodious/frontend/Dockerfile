# Stage 1: Build the React application
FROM node:20-alpine AS build

WORKDIR /app

# Copy package files and install dependencies
COPY frontend/package.json frontend/package-lock.json* /app/
RUN npm install

# Copy frontend source files
COPY frontend/ /app/

# Build the application
RUN npm run build

# Stage 2: Serve the built static files with Nginx
FROM nginx:alpine

# Copy the Nginx configuration
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Copy the built assets from the build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Ensure all files are readable by Nginx
RUN chmod -R 755 /usr/share/nginx/html

# Expose port 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
